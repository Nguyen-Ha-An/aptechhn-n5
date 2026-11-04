import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAutosave } from './useAutosave';
import * as queries from './queries';

vi.mock('./queries', () => ({
  useUpdateNote: vi.fn(),
  useSyncLinks: vi.fn(),
}));

describe('useAutosave', () => {
  let queryClient: QueryClient;
  const mockMutateUpdate = vi.fn();
  const mockMutateSync = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    vi.clearAllMocks();
    mockMutateUpdate.mockResolvedValue({});
    mockMutateSync.mockResolvedValue({});

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // Return a fresh object literal on every render (reproducing real useMutation behavior)
    vi.mocked(queries.useUpdateNote).mockImplementation(() => ({
      mutateAsync: mockMutateUpdate,
    } as never));

    vi.mocked(queries.useSyncLinks).mockImplementation(() => ({
      mutateAsync: mockMutateSync,
    } as never));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('debounces saves by 800ms and calls update once with latest content despite re-renders', async () => {
    const { result } = renderHook(
      () =>
        useAutosave({
          noteId: 'test-note',
          initialTitle: 'Initial',
        }),
      { wrapper },
    );

    expect(result.current.saveStatus.state).toBe('saved');

    // Make rapid changes
    act(() => {
      result.current.setTitle('Draft 1');
    });
    expect(result.current.saveStatus.state).toBe('saving');
    expect(mockMutateUpdate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
      result.current.setTitle('Draft 2');
    });
    expect(mockMutateUpdate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
      result.current.setTitle('Draft Final');
      result.current.setContent(
        {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'pageLink', attrs: { id: 'linked-p1', label: 'P1' } }],
            },
          ],
        },
        'P1',
      );
    });

    // Before 800ms elapsed from last change, update must NOT have been called
    expect(mockMutateUpdate).not.toHaveBeenCalled();

    // Advance 799ms - still not called
    await act(async () => {
      await vi.advanceTimersByTimeAsync(799);
    });
    expect(mockMutateUpdate).not.toHaveBeenCalled();

    // Advance 1ms more (reaching 800ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(mockMutateUpdate).toHaveBeenCalledTimes(1);
    expect(mockMutateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-note',
        title: 'Draft Final',
        content_text: 'P1',
      }),
    );
    expect(mockMutateSync).toHaveBeenCalledWith({
      noteId: 'test-note',
      targetIds: ['linked-p1'],
    });

    expect(result.current.saveStatus.state).toBe('saved');
  });

  it('flushes pending save on unmount', async () => {
    const { result, unmount } = renderHook(
      () =>
        useAutosave({
          noteId: 'test-note-unmount',
          initialTitle: 'Before',
        }),
      { wrapper },
    );

    act(() => {
      result.current.setTitle('Unsaved On Unmount');
    });

    expect(mockMutateUpdate).not.toHaveBeenCalled();

    // Trigger unmount
    await act(async () => {
      unmount();
    });

    expect(mockMutateUpdate).toHaveBeenCalledTimes(1);
    expect(mockMutateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-note-unmount',
        title: 'Unsaved On Unmount',
      }),
    );
  });
});
