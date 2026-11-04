import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FocusPage } from '@/features/focus/FocusPage';
import { FocusProvider } from '@/features/focus/useFocusSession';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
  isSupabaseConfigured: true,
}));

vi.mock('@/features/auth', () => ({
  useSession: () => ({
    user: { id: 'u1' },
    status: 'signed-in',
  }),
}));

vi.mock('@/features/profile/queries', () => ({
  useProfile: () => ({
    data: { focus_minutes: 25 },
  }),
}));

describe('Focus Route Component', () => {
  it('renders FocusPage properly', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <FocusProvider>
          <FocusPage />
        </FocusProvider>
      </QueryClientProvider>
    );

    expect(screen.getByRole('button', { name: 'Start focus session' })).toBeInTheDocument();
    expect(screen.getByText('Focus mode')).toBeInTheDocument();
  });
});
