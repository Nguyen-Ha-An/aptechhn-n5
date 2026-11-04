import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { supabase } from '@/lib/supabase';
import { notifyAchievements } from '@/features/achievements/notifyAchievements';
import {
  useCreateNote,
  useArchiveNote,
  useRestoreNote,
  useDeleteNoteForever,
  useSyncLinks,
} from './queries';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: true,
}));

vi.mock('@/features/achievements/notifyAchievements', () => ({
  notifyAchievements: vi.fn(),
}));

describe('notes queries and mutations', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('useCreateNote inserts note with default fields and triggers notifyAchievements', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: { id: 'new-note-id' },
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });

    vi.mocked(supabase.from).mockReturnValue({
      insert: insertMock,
    } as never);

    const { result } = renderHook(() => useCreateNote(), { wrapper });

    await result.current.mutateAsync({ title: 'New Page', parentId: 'parent-1' });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Page',
        parent_id: 'parent-1',
        content: { type: 'doc', content: [] },
        content_text: '',
      }),
    );
    expect(notifyAchievements).toHaveBeenCalled();
  });

  it('useArchiveNote archives a note and all its recursive descendants', async () => {
    const isMock = vi.fn().mockResolvedValue({
      data: [
        { id: 'root', parent_id: null },
        { id: 'child-1', parent_id: 'root' },
        { id: 'child-2', parent_id: 'root' },
        { id: 'grandchild-1', parent_id: 'child-1' },
        { id: 'other', parent_id: null },
      ],
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ is: isMock });

    const inMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ in: inMock });

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      update: updateMock,
    } as never);

    const { result } = renderHook(() => useArchiveNote(), { wrapper });

    await result.current.mutateAsync('root');

    expect(inMock).toHaveBeenCalledWith('id', expect.arrayContaining(['root', 'child-1', 'child-2', 'grandchild-1']));
    const archivedIds = inMock.mock.calls[0]![1] as string[];
    expect(archivedIds).not.toContain('other');
  });

  it('useRestoreNote clears archived_at and resets parent_id if parent was archived', async () => {
    const selectMock = vi.fn().mockResolvedValue({
      data: [
        { id: 'parent', parent_id: null, archived_at: '2026-01-01' },
        { id: 'child', parent_id: 'parent', archived_at: '2026-01-01' },
      ],
      error: null,
    });

    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({
      eq: eqMock,
      in: vi.fn().mockResolvedValue({ error: null }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      update: updateMock,
    } as never);

    const { result } = renderHook(() => useRestoreNote(), { wrapper });

    await result.current.mutateAsync('child');

    // Because 'parent' was archived, 'child' is restored to root with parent_id: null
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ archived_at: null, parent_id: null }),
    );
    expect(eqMock).toHaveBeenCalledWith('id', 'child');
  });

  it('useDeleteNoteForever deletes the note by id', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });

    vi.mocked(supabase.from).mockReturnValue({
      delete: deleteMock,
    } as never);

    const { result } = renderHook(() => useDeleteNoteForever(), { wrapper });

    await result.current.mutateAsync('note-to-delete');

    expect(deleteMock).toHaveBeenCalled();
    expect(eqMock).toHaveBeenCalledWith('id', 'note-to-delete');
  });

  it('useSyncLinks deletes old links and inserts valid new links', async () => {
    const delEqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: delEqMock });

    const inMock = vi.fn().mockResolvedValue({
      data: [{ id: 'target-1' }], // target-2 does not exist
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ in: inMock });

    const insertMock = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'note_links') {
        return {
          delete: deleteMock,
          insert: insertMock,
        } as never;
      }
      if (table === 'notes') {
        return {
          select: selectMock,
        } as never;
      }
      return {} as never;
    });

    const { result } = renderHook(() => useSyncLinks(), { wrapper });

    await result.current.mutateAsync({
      noteId: 'source-1',
      targetIds: ['target-1', 'target-2', 'source-1'], // source-1 filtered out
    });

    expect(deleteMock).toHaveBeenCalled();
    expect(delEqMock).toHaveBeenCalledWith('source_id', 'source-1');
    expect(insertMock).toHaveBeenCalledWith([
      { source_id: 'source-1', target_id: 'target-1' },
    ]);
  });
});
