import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
} from '@tanstack/react-router';
import { AppShell } from './AppShell';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
    },
  },
  isSupabaseConfigured: true,
}));

vi.mock('@/features/auth', () => ({
  useSession: () => ({
    session: null,
    user: { email: 'student@example.com' },
    status: 'signed-in',
  }),
}));

describe('AppShell', () => {
  function renderWithRouter(initialPath = '/') {
    const rootRoute = createRootRoute({
      component: () => (
        <AppShell>
          <div data-testid="page-content">Workspace content</div>
        </AppShell>
      ),
    });

    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => <div>Index</div>,
    });

    const todosRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/todos',
      component: () => <div>Todos</div>,
    });

    const focusRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/focus',
      component: () => <div>Focus</div>,
    });

    const chatRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/chat',
      component: () => <div>Chat</div>,
    });

    const progressRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/progress',
      component: () => <div>Progress</div>,
    });

    const settingsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/settings',
      component: () => <div>Settings</div>,
    });

    const router = createRouter({
      routeTree: rootRoute.addChildren([
        indexRoute,
        todosRoute,
        focusRoute,
        chatRoute,
        progressRoute,
        settingsRoute,
      ]),
      history: createMemoryHistory({ initialEntries: [initialPath] }),
    });

    return render(<RouterProvider router={router} />);
  }

  it('renders all six nav links with correct hrefs', async () => {
    renderWithRouter('/');

    // Check desktop navigation items
    const todayLink = await screen.findByRole('link', { name: /^Today$/i });
    expect(todayLink).toHaveAttribute('href', '/');

    const todosLink = screen.getByRole('link', { name: /^Todos$/i });
    expect(todosLink).toHaveAttribute('href', '/todos');

    const focusLink = screen.getByRole('link', { name: /^Focus$/i });
    expect(focusLink).toHaveAttribute('href', '/focus');

    const chatLink = screen.getByRole('link', { name: /^Chat$/i });
    expect(chatLink).toHaveAttribute('href', '/chat');

    const progressLink = screen.getByRole('link', { name: /^Progress$/i });
    expect(progressLink).toHaveAttribute('href', '/progress');

    const settingsLink = screen.getByRole('link', { name: /^Settings$/i });
    expect(settingsLink).toHaveAttribute('href', '/settings');
  });

  it('provides an accessible name on the mobile menu button', async () => {
    renderWithRouter('/');

    const menuButton = await screen.findByRole('button', {
      name: 'Open navigation menu',
    });
    expect(menuButton).toBeInTheDocument();
    expect(menuButton).toHaveAttribute('aria-label', 'Open navigation menu');
  });

  it('renders skip to content link targeting main', async () => {
    renderWithRouter('/');

    const skipLink = await screen.findByRole('link', { name: 'Skip to content' });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main');
  });
});
