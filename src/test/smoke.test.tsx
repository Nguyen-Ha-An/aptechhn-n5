import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../main';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(),
  },
  isSupabaseConfigured: true,
}));

describe('Smoke test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
          id: 'mock-sub',
          callback: vi.fn(),
        },
      },
    });
  });

  it('renders login wordmark when unauthenticated', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    render(<App />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('FocusLearn');
  });

  it('renders app shell with today page when authenticated', async () => {
    const mockUser = { id: 'u1', email: 'student@example.com' };
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { user: mockUser } as never },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    } as never);

    render(<App />);
    // When authenticated, sidebar nav links are present
    expect(await screen.findByRole('link', { name: /^Today$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Todos$/i })).toBeInTheDocument();
  });
});
