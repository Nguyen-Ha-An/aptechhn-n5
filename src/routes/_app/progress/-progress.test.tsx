import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ProgressPage } from '@/features/progress';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: true,
}));

vi.mock('@/features/auth', () => ({
  useSession: () => ({
    user: { id: 'user-1' },
    session: { user: { id: 'user-1' } },
    status: 'signed-in',
  }),
}));

vi.mock('@/features/profile/queries', () => ({
  useProfile: () => ({
    data: { timezone: 'Asia/Ho_Chi_Minh' },
    isLoading: false,
  }),
}));

describe('ProgressPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  function renderProgressRoute() {
    const rootRoute = createRootRoute({
      component: () => <Outlet />,
    });

    const route = createRoute({
      getParentRoute: () => rootRoute,
      path: '/progress',
      component: () => <ProgressPage />,
    });

    const sessionsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/progress/sessions',
      component: () => <div>Sessions Route</div>,
    });

    const focusRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/focus',
      component: () => <div>Focus Route</div>,
    });

    const router = createRouter({
      routeTree: rootRoute.addChildren([route, sessionsRoute, focusRoute]),
      history: createMemoryHistory({ initialEntries: ['/progress'] }),
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
  }

  it('renders empty state when user has zero focus sessions', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'user_stats') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  user_id: 'user-1',
                  sessions_count: 0,
                  total_focus_minutes: 0,
                  current_streak: 0,
                  best_streak: 0,
                  todos_done: 0,
                  notes_count: 0,
                  has_undistracted: false,
                },
                error: null,
              }),
            }),
          }),
        } as never;
      }
      if (table === 'focus_sessions') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                gte: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        } as never;
      }
      if (table === 'user_achievements') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: [], error: null }),
            }),
          }),
        } as never;
      }
      return {} as never;
    });

    renderProgressRoute();

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Progress');
    expect(await screen.findByText('No sessions yet')).toBeInTheDocument();

    const startBtn = screen.getByRole('link', { name: 'Start focus session' });
    expect(startBtn).toBeInTheDocument();
    expect(startBtn).toHaveAttribute('href', '/focus');
  });

  it('renders empty state when user stats record is null', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'user_stats') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        } as never;
      }
      if (table === 'focus_sessions') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                gte: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        } as never;
      }
      if (table === 'user_achievements') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: [], error: null }),
            }),
          }),
        } as never;
      }
      return {} as never;
    });

    renderProgressRoute();

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Progress');
    expect(await screen.findByText('No sessions yet')).toBeInTheDocument();
  });

  it('renders summary line, charts, and achievements when user has session stats', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'user_stats') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  user_id: 'user-1',
                  sessions_count: 12,
                  total_focus_minutes: 2520, // 42 hours
                  current_streak: 3,
                  best_streak: 7,
                  todos_done: 10,
                  notes_count: 5,
                  has_undistracted: true,
                },
                error: null,
              }),
            }),
          }),
        } as never;
      }
      if (table === 'focus_sessions') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                gte: async () => ({
                  data: [
                    {
                      id: 's1',
                      user_id: 'user-1',
                      started_at: '2026-11-04T08:00:00Z',
                      ended_at: '2026-11-04T08:45:00Z',
                      focused_seconds: 2700,
                      paused_seconds: 0,
                      mode: 'timed',
                      distractions: [
                        { id: 'd1', category: 'Phone', note: null, occurred_at: '2026-11-04T08:15:00Z' },
                      ],
                      todos: { title: 'Study Calculus' },
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        } as never;
      }
      if (table === 'user_achievements') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({
                data: [
                  { achievement_id: 'first_session', unlocked_at: '2026-11-01T10:00:00Z' },
                ],
                error: null,
              }),
            }),
          }),
        } as never;
      }
      return {} as never;
    });

    renderProgressRoute();

    // Summary line computed from user_stats:
    // "Current streak 3 days. Best 7. 42 hours focused in total."
    expect(
      await screen.findByText('Current streak 3 days. Best 7. 42 hours focused in total.'),
    ).toBeInTheDocument();

    // Sections
    expect(screen.getByRole('heading', { name: 'Focus minutes per day' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'When you focus' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What distracts you' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Achievements' })).toBeInTheDocument();

    // Distractions
    expect(screen.getAllByText('Phone').length).toBeGreaterThan(0);

    // Achievements list
    expect(screen.getByText('First steps')).toBeInTheDocument();
    expect(screen.getByText(/Unlocked/)).toBeInTheDocument();
    expect(screen.getByText('Focus marathon')).toBeInTheDocument();
    expect(screen.getAllByText('Locked').length).toBeGreaterThan(0);

    // Header link to sessions
    const allSessionsLink = screen.getByRole('link', { name: 'All sessions' });
    expect(allSessionsLink).toHaveAttribute('href', '/progress/sessions');
  });

  it('renders error state and retries on button click', async () => {
    const user = userEvent.setup();
    let fail = true;

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'user_stats') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                if (fail) {
                  return { data: null, error: { message: 'Database error' } };
                }
                return {
                  data: {
                    user_id: 'user-1',
                    sessions_count: 0,
                    total_focus_minutes: 0,
                    current_streak: 0,
                    best_streak: 0,
                  },
                  error: null,
                };
              },
            }),
          }),
        } as never;
      }
      if (table === 'focus_sessions') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                gte: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        } as never;
      }
      if (table === 'user_achievements') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: [], error: null }),
            }),
          }),
        } as never;
      }
      return {} as never;
    });

    renderProgressRoute();

    expect(await screen.findByText('Database error')).toBeInTheDocument();
    fail = false;

    const retryBtn = screen.getByRole('button', { name: 'Try again' });
    await user.click(retryBtn);

    expect(await screen.findByText('No sessions yet')).toBeInTheDocument();
  });
});
