import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAllUserData, triggerDownloadJson } from './exportData';
import { deleteUserAccount } from './deleteAccount';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

describe('exportData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchAllUserData queries all 11 tables/views with RLS', async () => {
    const queriedTables: string[] = [];
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      queriedTables.push(table);
      return {
        select: vi.fn().mockResolvedValue({
          data: [{ id: `${table}-row-1` }],
          error: null,
        }),
      } as unknown as ReturnType<typeof supabase.from>;
    });

    const result = await fetchAllUserData();
    expect(result.version).toBe(1);
    expect(result.exported_at).toBeDefined();

    // Verify all 11 tables/views were fetched
    expect(queriedTables).toContain('profiles');
    expect(queriedTables).toContain('todos');
    expect(queriedTables).toContain('notes');
    expect(queriedTables).toContain('note_links');
    expect(queriedTables).toContain('focus_sessions');
    expect(queriedTables).toContain('distractions');
    expect(queriedTables).toContain('user_achievements');
    expect(queriedTables).toContain('conversations');
    expect(queriedTables).toContain('messages');
    expect(queriedTables).toContain('ai_usage');
    expect(queriedTables).toContain('user_stats');

    expect(result.profiles).toEqual([{ id: 'profiles-row-1' }]);
    expect(result.todos).toEqual([{ id: 'todos-row-1' }]);
    expect(result.notes).toEqual([{ id: 'notes-row-1' }]);
    expect(result.user_stats).toEqual([{ id: 'user_stats-row-1' }]);
  });

  it('triggerDownloadJson creates a Blob and triggers anchor click', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLMock;
    globalThis.URL.revokeObjectURL = revokeObjectURLMock;

    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = origCreateElement(tagName);
      if (tagName === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    triggerDownloadJson({ test: true }, 'export-test.json');

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
  });
});

describe('deleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-publishable-key');
  });

  it('calls delete-account function with auth token and apikey, then signs out', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'valid-jwt-token' } as unknown as Session },
      error: null,
    });
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    });
    globalThis.fetch = fetchMock;

    await deleteUserAccount();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/delete-account'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-jwt-token',
          apikey: expect.any(String),
        }),
      }),
    );
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('throws error if user session is missing', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await expect(deleteUserAccount()).rejects.toThrow(/You must be signed in/);
  });

  it('throws error if edge function returns error status', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'valid-jwt-token' } as unknown as Session },
      error: null,
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ error: 'Database error occurred' }),
    });

    await expect(deleteUserAccount()).rejects.toThrow('Database error occurred');
  });
});
