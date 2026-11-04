import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeImport, ImportError } from './executeImport';
import type { MapLegacyResult } from './mapLegacy';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => {
  const fromMock = vi.fn();
  return {
    supabase: {
      from: fromMock,
    },
  };
});

describe('executeImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockMappedData: MapLegacyResult = {
    counts: {
      todos: 2,
      notes: 1,
      note_links: 1,
      focus_sessions: 1,
      distractions: 1,
      conversations: 1,
      messages: 1,
      achievements: 1,
      total: 9,
    },
    skipped: [],
    payloads: {
      todos: [
        { id: 'todo-1', title: 'Todo 1' },
        { id: 'todo-2', title: 'Todo 2' },
      ],
      notes: [{ id: 'note-1', title: 'Note 1' }],
      note_links: [{ source_id: 'note-1', target_id: 'note-2' }],
      focus_sessions: [
        {
          id: 'session-1',
          started_at: '2026-11-01T08:00:00Z',
          ended_at: '2026-11-01T08:25:00Z',
          focused_seconds: 1500,
          mode: 'timed',
        },
      ],
      distractions: [
        {
          id: 'dist-1',
          session_id: 'session-1',
          category: 'phone',
          occurred_at: '2026-11-01T08:10:00Z',
        },
      ],
      conversations: [{ id: 'conv-1', title: 'Chat 1' }],
      messages: [
        {
          id: 'msg-1',
          conversation_id: 'conv-1',
          role: 'user',
          content: 'Hello',
        },
      ],
      achievements: [{ achievement_id: 'first_session' }],
    },
    idMap: {},
  };

  it('inserts tables in the required order and updates profile on completion', async () => {
    const tableOrder: string[] = [];

    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (tableName: string) => {
        tableOrder.push(tableName);
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      },
    );

    const progressLogs: string[] = [];
    await executeImport(mockMappedData, {
      userId: 'test-user-id',
      onProgress: (msg) => progressLogs.push(msg),
      batchSize: 500,
    });

    // Required order:
    // 1. notes
    // 2. note_links
    // 3. todos
    // 4. focus_sessions
    // 5. distractions
    // 6. conversations
    // 7. messages
    // 8. user_achievements
    // 9. profiles (update)
    expect(tableOrder).toEqual([
      'notes',
      'note_links',
      'todos',
      'focus_sessions',
      'distractions',
      'conversations',
      'messages',
      'user_achievements',
      'profiles',
    ]);

    expect(progressLogs.length).toBeGreaterThan(0);
    expect(progressLogs).toContain('Finalizing import...');
  });

  it('throws ImportError with table name when insert fails', async () => {
    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (tableName: string) => {
        if (tableName === 'todos') {
          return {
            insert: vi
              .fn()
              .mockResolvedValue({ error: { message: 'DB connection lost' } }),
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      },
    );

    await expect(
      executeImport(mockMappedData, {
        userId: 'test-user-id',
      }),
    ).rejects.toThrow(ImportError);

    await expect(
      executeImport(mockMappedData, {
        userId: 'test-user-id',
      }),
    ).rejects.toThrow(/Failed while importing todos/);
  });
});
