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
import { SessionsPage } from '@/features/progress';

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

describe('SessionsPage', () => {
  let queryClient: QueryClient;

  const mockSessions = [
    {
      id: 'session-1',
      user_id: 'user-1',
      todo_id: 'todo-1',
      mode: 'timed',
      started_at: '2026-11-04T02:00:00Z', // 09:00 in HCM
      ended_at: '2026-11-04T02:45:00Z', // 09:45 in HCM
      planned_seconds: 2700,
      focused_seconds: 2700,
      paused_seconds: 300,
      phase_count: 1,
      focus_rating: 4,
      reflection: 'Good session with steady focus.',
      created_at: '2026-11-04T02:45:00Z',
      todos: { title: 'Calculus Assignment' },
      distractions: [
        {
          id: 'd1',
          category: 'Phone',
          note: 'Checked message',
          occurred_at: '2026-11-04T02:20:00Z',
        },
      ],
    },
    {
      id: 'session-2',
      user_id: 'user-1',
      todo_id: null,
      mode: 'open',
      started_at: '2026-11-04T04:00:00Z', // 11:00 in HCM
      ended_at: '2026-11-04T04:30:00Z', // 11:30 in HCM
      planned_seconds: null,
      focused_seconds: 1800,
      paused_seconds: 0,
      phase_count: 1,
      focus_rating: null,
      reflection: null,
      created_at: '2026-11-04T04:30:00Z',
      todos: null,
      distractions: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  function renderSessionsRoute() {
    const rootRoute = createRootRoute({
      component: () => <Outlet />,
    });

    const route = createRoute({
      getParentRoute: () => rootRoute,
      path: '/progress/sessions',
      component: () => <SessionsPage />,
    });

    const progressRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/progress',
      component: () => <div>Progress Index</div>,
    });

    const router = createRouter({
      routeTree: rootRoute.addChildren([route, progressRoute]),
      history: createMemoryHistory({ initialEntries: ['/progress/sessions'] }),
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
  }

  it('renders loading skeleton while sessions query is in-flight', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({
            gte: () => new Promise(() => {}),
          }),
        }),
      }),
    } as never);

    renderSessionsRoute();
    const skeletons = await screen.findAllByRole('status', { name: 'Loading content' });
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no sessions are found in range', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({
            gte: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    } as never);

    renderSessionsRoute();
    expect(await screen.findByText('No sessions in this range.')).toBeInTheDocument();
  });

  it('renders sessions grouped by day with day headings and session rows', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({
            gte: async () => ({ data: mockSessions, error: null }),
          }),
        }),
      }),
    } as never);

    renderSessionsRoute();

    // Day heading
    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent(/Wednesday, 4 November/i);

    // Both sessions should be visible
    expect(screen.getByText('Calculus Assignment')).toBeInTheDocument();
    expect(screen.getByText('45 min')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('Rating: 4/5')).toBeInTheDocument();
  });

  it('filters sessions by mode when clicking mode filters', async () => {
    const user = userEvent.setup();

    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({
            gte: async () => ({ data: mockSessions, error: null }),
          }),
        }),
      }),
    } as never);

    renderSessionsRoute();

    await screen.findByText('Calculus Assignment');

    // Click Timed filter
    const timedBtn = screen.getByRole('button', { name: 'Timed' });
    await user.click(timedBtn);

    // session-1 is timed, session-2 is open
    expect(screen.getByText('Calculus Assignment')).toBeInTheDocument();
    expect(screen.queryByText('30 min')).not.toBeInTheDocument();

    // Click Open filter
    const openBtn = screen.getByRole('button', { name: 'Open' });
    await user.click(openBtn);

    expect(screen.queryByText('Calculus Assignment')).not.toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
  });

  it('opens dialog on row click and allows editing rating and reflection', async () => {
    const user = userEvent.setup();

    const updateMock = vi.fn().mockReturnValue({
      select: () => ({
        single: async () => ({ data: { id: 'session-1' }, error: null }),
      }),
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'focus_sessions') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                gte: async () => ({ data: mockSessions, error: null }),
              }),
            }),
          }),
          update: (...args: unknown[]) => ({
            eq: (...eqArgs: unknown[]) => updateMock(...args, ...eqArgs),
          }),
        } as never;
      }
      return {} as never;
    });

    renderSessionsRoute();

    // Click on session row
    const sessionRow = await screen.findByText('Calculus Assignment');
    await user.click(sessionRow);

    // Dialog opens
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Session details' })).toBeInTheDocument();

    // Metadata verified
    expect(screen.getByText('45 minutes')).toBeInTheDocument();
    expect(screen.getByText('5 minutes')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('(Checked message)')).toBeInTheDocument();

    // Editable reflection textarea
    const textarea = screen.getByLabelText('Reflection');
    expect(textarea).toHaveValue('Good session with steady focus.');

    await user.clear(textarea);
    await user.type(textarea, 'Updated reflection note.');

    // Click rating button "5"
    const rating5Btn = screen.getByRole('radio', { name: '5' });
    expect(rating5Btn).toHaveClass('min-h-[44px]');
    expect(rating5Btn).toHaveClass('min-w-[44px]');
    await user.click(rating5Btn);
    expect(rating5Btn).toHaveClass('bg-ink');
    expect(rating5Btn).toHaveClass('text-paper');

    // Click "Save changes"
    const saveBtn = screen.getByRole('button', { name: 'Save changes' });
    await user.click(saveBtn);

    expect(updateMock).toHaveBeenCalled();
  });

  it('displays error alert when session save fails', async () => {
    const user = userEvent.setup();

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'focus_sessions') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                gte: async () => ({ data: mockSessions, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({ data: null, error: { message: 'Failed to update session record' } }),
              }),
            }),
          }),
        } as never;
      }
      return {} as never;
    });

    renderSessionsRoute();

    const sessionRow = await screen.findByText('Calculus Assignment');
    await user.click(sessionRow);

    const saveBtn = await screen.findByRole('button', { name: 'Save changes' });
    await user.click(saveBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to update session record');
  });

  it('opens delete confirm dialog and deletes session on confirmation', async () => {
    const user = userEvent.setup();

    const deleteEqMock = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'focus_sessions') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                gte: async () => ({ data: mockSessions, error: null }),
              }),
            }),
          }),
          delete: () => ({
            eq: deleteEqMock,
          }),
        } as never;
      }
      return {} as never;
    });

    renderSessionsRoute();

    const sessionRow = await screen.findByText('Calculus Assignment');
    await user.click(sessionRow);

    // Click "Delete session" inside dialog
    const deleteBtn = await screen.findByRole('button', { name: 'Delete session' });
    await user.click(deleteBtn);

    // Confirm dialog appears
    expect(screen.getByText('Are you sure you want to delete this focus session? This action cannot be undone.')).toBeInTheDocument();

    // Click confirmation button in AlertDialog
    const confirmButtons = screen.getAllByRole('button', { name: 'Delete session' });
    const finalConfirmBtn = confirmButtons[confirmButtons.length - 1]!;
    await user.click(finalConfirmBtn);

    expect(deleteEqMock).toHaveBeenCalledWith('id', 'session-1');
  });
});
