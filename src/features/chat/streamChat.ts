import { supabase } from '@/lib/supabase';

export type ChatStreamErrorType = 'quota' | 'unauthorized' | 'network' | 'upstream';

export class ChatStreamError extends Error {
  constructor(
    public readonly type: ChatStreamErrorType,
    message?: string,
  ) {
    super(message ?? type);
    this.name = 'ChatStreamError';
  }
}

export type ChatSSEEvent =
  | { delta: string }
  | { done: true; messageId: string }
  | { error: string };

export function parseSSEChunks(
  buffer: string,
  newChunk: string,
): { events: ChatSSEEvent[]; remaining: string } {
  const combined = buffer + newChunk;
  const parts = combined.split(/\r?\n\r?\n/);
  const remaining = parts.pop() ?? '';
  const events: ChatSSEEvent[] = [];

  for (const part of parts) {
    const lines = part.split(/\r?\n/);
    let dataPayload = '';
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const content = line.slice(5).trim();
        dataPayload += content;
      }
    }
    if (dataPayload) {
      try {
        const parsed = JSON.parse(dataPayload) as ChatSSEEvent;
        events.push(parsed);
      } catch {
        // Skip malformed JSON
      }
    }
  }

  return { events, remaining };
}

export interface StreamChatParams {
  conversationId: string;
  message: string;
  attachNoteIds?: string[];
  includeToday?: boolean;
  signal?: AbortSignal;
  onDelta: (delta: string) => void;
  onDone?: (messageId: string) => void;
}

export async function streamChat(params: StreamChatParams): Promise<string> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new ChatStreamError('unauthorized', 'Not authenticated');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const functionUrl = `${supabaseUrl}/functions/v1/chat`;

  let response: Response;
  try {
    response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: params.conversationId,
        message: params.message,
        attachNoteIds: params.attachNoteIds,
        includeToday: params.includeToday,
      }),
      signal: params.signal,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    throw new ChatStreamError('network', (err as Error)?.message ?? 'Network error');
  }

  if (response.status === 401) {
    throw new ChatStreamError('unauthorized', 'Unauthorized');
  }

  if (response.status === 429) {
    throw new ChatStreamError('quota', 'AI quota exceeded');
  }

  if (!response.ok) {
    let errType: ChatStreamErrorType = 'network';
    try {
      const errJson = (await response.json()) as { error?: string };
      if (errJson?.error === 'ai_quota_exceeded') {
        errType = 'quota';
      }
    } catch {
      // not json
    }
    throw new ChatStreamError(errType, `Request failed with status ${response.status}`);
  }

  if (!response.body) {
    throw new ChatStreamError('network', 'No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullAssistantText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const textChunk = decoder.decode(value, { stream: true });
      const { events, remaining } = parseSSEChunks(buffer, textChunk);
      buffer = remaining;

      for (const event of events) {
        if ('error' in event) {
          throw new ChatStreamError('upstream', event.error);
        }
        if ('delta' in event) {
          fullAssistantText += event.delta;
          params.onDelta(event.delta);
        }
        if ('done' in event && event.done) {
          params.onDone?.(event.messageId);
        }
      }
    }

    if (buffer.trim()) {
      const { events } = parseSSEChunks(buffer, '\n\n');
      for (const event of events) {
        if ('error' in event) {
          throw new ChatStreamError('upstream', event.error);
        }
        if ('delta' in event) {
          fullAssistantText += event.delta;
          params.onDelta(event.delta);
        }
        if ('done' in event && event.done) {
          params.onDone?.(event.messageId);
        }
      }
    }

    return fullAssistantText;
  } catch (err: unknown) {
    if (err instanceof ChatStreamError) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    throw new ChatStreamError('network', (err as Error)?.message ?? 'Stream reading error');
  }
}
