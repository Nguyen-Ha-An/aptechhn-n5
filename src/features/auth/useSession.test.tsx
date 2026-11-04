import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { supabase } from '@/lib/supabase';
import { AuthProvider, useSession } from './useSession';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
  isSupabaseConfigured: true,
}));

describe('useSession', () => {
  const unsubscribeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock,
          id: 'test-sub',
          callback: vi.fn(),
        },
      },
    });
  });

  it('resolves signed-in status when a session is present', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockSession = { user: mockUser, access_token: 'xyz' };

    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: mockSession as never },
      error: null,
    });

    const { result } = renderHook(() => useSession(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.status).toBe('signed-in');
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.session).toEqual(mockSession);
  });

  it('resolves signed-out status when session is null', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useSession(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.status).toBe('signed-out');
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('unsubscribes on unmount', () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    const { unmount } = renderHook(() => useSession(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
