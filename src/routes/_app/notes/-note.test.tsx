import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
import { Route as NoteRoute } from './$noteId';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: true,
}));

describe('NotePlaceholderPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  function renderNoteRoute(noteId = 'test-note-1') {
    const rootRoute = createRootRoute({
      component: () => <NoteRoute.options.component />,
    });

    const route = createRoute({
      getParentRoute: () => rootRoute,
      path: '/notes/$noteId',
      component: () => <NoteRoute.options.component />,
    });

    const router = createRouter({
      routeTree: rootRoute.addChildren([route]),
      history: createMemoryHistory({ initialEntries: [`/notes/${noteId}`] }),
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
        eq: () => ({
          maybeSingle: () => new Promise(() => {}), // never resolves
        }),
      }),
    } as never);

    renderNoteRoute();
    const skeletons = await screen.findAllByRole('status', { name: 'Loading content' });
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders not found empty state when note is missing or null', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    } as never);

    renderNoteRoute('missing-note');

    expect(
      await screen.findByText('This page does not exist or was moved to trash.'),
    ).toBeInTheDocument();
  });

  it('renders error state and retries on button click', async () => {
    const user = userEvent.setup();
    const maybeSingleMock = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      })
      .mockResolvedValueOnce({
        data: { id: 'n1', title: 'Calculus Notes', icon: '📐' },
        error: null,
      });

    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: maybeSingleMock,
        }),
      }),
    } as never);

    renderNoteRoute('n1');

    expect(await screen.findByText('Database connection failed')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: 'Try again' });
    await user.click(retryBtn);

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Calculus Notes',
    );
  });

  it('renders PageHeader with note title and icon', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: 'n2', title: 'Biology Notes', icon: '🧬' },
            error: null,
          }),
        }),
      }),
    } as never);

    renderNoteRoute('n2');

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Biology Notes',
    );
    expect(screen.getByText('🧬')).toBeInTheDocument();
  });
});
