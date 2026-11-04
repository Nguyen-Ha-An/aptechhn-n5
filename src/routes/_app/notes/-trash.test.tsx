import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Route as TrashRoute } from './trash';

const TrashComponent = TrashRoute.options.component!;

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: true,
}));

describe('TrashPage', () => {
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

  function renderTrashRoute() {
    const rootRoute = createRootRoute({
      component: () => <TrashComponent />,
    });

    const route = createRoute({
      getParentRoute: () => rootRoute,
      path: '/notes/trash',
      component: () => <TrashComponent />,
    });

    const router = createRouter({
      routeTree: rootRoute.addChildren([route]),
      history: createMemoryHistory({ initialEntries: ['/notes/trash'] }),
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
  }

  it('renders loading skeleton while query is in-flight', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        not: () => ({
          order: () => new Promise(() => {}),
        }),
      }),
    } as never);

    renderTrashRoute();
    const skeletons = await screen.findAllByRole('status', { name: 'Loading content' });
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when trash is empty', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        not: () => ({
          order: async () => ({ data: [], error: null }),
        }),
      }),
    } as never);

    renderTrashRoute();

    expect(await screen.findByText('Trash is empty')).toBeInTheDocument();
  });

  it('renders archived notes with title, icon, and actions', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        not: () => ({
          order: async () => ({
            data: [
              {
                id: 'trash-1',
                title: 'Old Research',
                icon: '📚',
                archived_at: '2026-11-01T10:00:00Z',
                parent_id: null,
              },
            ],
            error: null,
          }),
        }),
      }),
    } as never);

    renderTrashRoute();

    expect(await screen.findByText('Old Research')).toBeInTheDocument();
    expect(screen.getByText('📚')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete forever' })).toBeInTheDocument();
  });

  it('renders error state and retries on button click', async () => {
    const user = userEvent.setup();
    const orderMock = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      });

    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        not: () => ({
          order: orderMock,
        }),
      }),
    } as never);

    renderTrashRoute();

    expect(await screen.findByText('Database error')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: 'Try again' });
    await user.click(retryBtn);

    expect(await screen.findByText('Trash is empty')).toBeInTheDocument();
  });
});
