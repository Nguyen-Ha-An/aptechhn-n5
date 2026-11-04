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
import { SidebarPages } from './SidebarPages';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: true,
}));

describe('SidebarPages', () => {
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

  function renderSidebarPages(initialPath = '/') {
    const rootRoute = createRootRoute({
      component: () => <SidebarPages />,
    });

    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => <div>Home</div>,
    });

    const noteRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/notes/$noteId',
      component: () => <div>Note</div>,
    });

    const trashRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/notes/trash',
      component: () => <div>Trash</div>,
    });

    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, noteRoute, trashRoute]),
      history: createMemoryHistory({ initialEntries: [initialPath] }),
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
  }

  it('renders section header with action buttons and empty message when no pages exist', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        is: () => ({
          order: async () => ({ data: [], error: null }),
        }),
      }),
    } as never);

    renderSidebarPages();

    expect(await screen.findByText('Pages')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search pages' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New page' })).toBeInTheDocument();
    expect(await screen.findByText('No pages yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trash' })).toHaveAttribute(
      'href',
      '/notes/trash',
    );
  });

  it('renders tree hierarchy with icons and expand/collapse button', async () => {
    const user = userEvent.setup();

    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        is: () => ({
          order: async () => ({
            data: [
              {
                id: 'parent-1',
                parent_id: null,
                title: 'Parent Page',
                icon: '📁',
                position: 1,
              },
              {
                id: 'child-1',
                parent_id: 'parent-1',
                title: 'Child Page',
                icon: null,
                position: 1,
              },
            ],
            error: null,
          }),
        }),
      }),
    } as never);

    renderSidebarPages();

    expect(await screen.findByText('Parent Page')).toBeInTheDocument();
    expect(screen.getByText('📁')).toBeInTheDocument();

    // Child is initially not visible because parent is collapsed
    expect(screen.queryByText('Child Page')).not.toBeInTheDocument();

    // Click expand button
    const expandBtn = screen.getByRole('button', { name: 'Expand Parent Page' });
    await user.click(expandBtn);

    // Child should now be visible
    expect(await screen.findByText('Child Page')).toBeInTheDocument();
  });
});
