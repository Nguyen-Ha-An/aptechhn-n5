import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseSSEChunks, streamChat, ChatStreamError } from './streamChat';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe('parseSSEChunks', () => {
  it('parses a single complete event', () => {
    const { events, remaining } = parseSSEChunks('', 'data: {"delta": "hello"}\n\n');
    expect(events).toEqual([{ delta: 'hello' }]);
    expect(remaining).toBe('');
  });

  it('handles event split mid-field across chunks', () => {
    // Chunk 1: "dat"
    const step1 = parseSSEChunks('', 'dat');
    expect(step1.events).toEqual([]);
    expect(step1.remaining).toBe('dat');

    // Chunk 2: "a: {\"delta\": \"hello\"}\n\n"
    const step2 = parseSSEChunks(step1.remaining, 'a: {"delta": "hello"}\n\n');
    expect(step2.events).toEqual([{ delta: 'hello' }]);
    expect(step2.remaining).toBe('');
  });

  it('handles event split mid-json across chunks', () => {
    // Chunk 1: 'data: {"del'
    const step1 = parseSSEChunks('', 'data: {"del');
    expect(step1.events).toEqual([]);
    expect(step1.remaining).toBe('data: {"del');

    // Chunk 2: 'ta": "split world"}\n\n'
    const step2 = parseSSEChunks(step1.remaining, 'ta": "split world"}\n\n');
    expect(step2.events).toEqual([{ delta: 'split world' }]);
    expect(step2.remaining).toBe('');
  });

  it('handles chunk boundaries split at newlines', () => {
    const step1 = parseSSEChunks('', 'data: {"delta": "part1"}\n');
    expect(step1.events).toEqual([]);
    expect(step1.remaining).toBe('data: {"delta": "part1"}\n');

    const step2 = parseSSEChunks(step1.remaining, '\ndata: {"delta": "part2"}\n\n');
    expect(step2.events).toEqual([{ delta: 'part1' }, { delta: 'part2' }]);
    expect(step2.remaining).toBe('');
  });

  it('parses multiple events in a single chunk', () => {
    const chunk =
      'data: {"delta": "first "}\n\ndata: {"delta": "second"}\n\ndata: {"done": true, "messageId": "msg-99"}\n\n';
    const { events, remaining } = parseSSEChunks('', chunk);
    expect(events).toEqual([
      { delta: 'first ' },
      { delta: 'second' },
      { done: true, messageId: 'msg-99' },
    ]);
    expect(remaining).toBe('');
  });

  it('supports windows style \\r\\n newlines', () => {
    const chunk = 'data: {"delta": "crlf"}\r\n\r\n';
    const { events, remaining } = parseSSEChunks('', chunk);
    expect(events).toEqual([{ delta: 'crlf' }]);
    expect(remaining).toBe('');
  });

  it('parses upstream error events', () => {
    const chunk = 'data: {"error": "upstream_error"}\n\n';
    const { events, remaining } = parseSSEChunks('', chunk);
    expect(events).toEqual([{ error: 'upstream_error' }]);
    expect(remaining).toBe('');
  });
});

describe('streamChat', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-test-token',
        } as never,
      },
      error: null,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('throws unauthorized error if user has no session', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    await expect(
      streamChat({
        conversationId: '550e8400-e29b-41d4-a716-446655440000',
        message: 'hello',
        onDelta: vi.fn(),
      }),
    ).rejects.toThrow(ChatStreamError);
  });

  it('throws quota error on 429 response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'ai_quota_exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    try {
      await streamChat({
        conversationId: '550e8400-e29b-41d4-a716-446655440000',
        message: 'hello',
        onDelta: vi.fn(),
      });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ChatStreamError);
      expect((err as ChatStreamError).type).toBe('quota');
    }
  });

  it('streams deltas and signals done with messageId', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"delta": "Hello "}\n\n'));
        controller.enqueue(encoder.encode('data: {"delta": "student!"}\n\n'));
        controller.enqueue(encoder.encode('data: {"done": true, "messageId": "msg-123"}\n\n'));
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );

    const onDelta = vi.fn();
    const onDone = vi.fn();

    const full = await streamChat({
      conversationId: '550e8400-e29b-41d4-a716-446655440000',
      message: 'test message',
      onDelta,
      onDone,
    });

    expect(full).toBe('Hello student!');
    expect(onDelta).toHaveBeenCalledWith('Hello ');
    expect(onDelta).toHaveBeenCalledWith('student!');
    expect(onDone).toHaveBeenCalledWith('msg-123');
  });

  it('throws upstream error if upstream error event is received', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"delta": "Half "}\n\n'));
        controller.enqueue(encoder.encode('data: {"error": "upstream_error"}\n\n'));
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );

    try {
      await streamChat({
        conversationId: '550e8400-e29b-41d4-a716-446655440000',
        message: 'trigger error',
        onDelta: vi.fn(),
      });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ChatStreamError);
      expect((err as ChatStreamError).type).toBe('upstream');
    }
  });
});
