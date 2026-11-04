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
import { ConversationList } from '@/features/chat';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: true,
}));

describe('ConversationList integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  function renderList(initialEntry = '/chat') {
    const rootRoute = createRootRoute({
      component: () => <ConversationList />,
    });

    const chatRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/chat',
      component: () => <ConversationList />,
    });

    const chatDetailRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/chat/$conversationId',
      component: () => <div>Conversation Detail</div>,
    });

    const router = createRouter({
      routeTree: rootRoute.addChildren([chatRoute, chatDetailRoute]),
      history: createMemoryHistory({ initialEntries: [initialEntry] }),
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
  }

  it('renders empty state when there are no conversations', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        order: async () => ({ data: [], error: null }),
      }),
    } as never);

    renderList();

    expect(await screen.findByText('No chats yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start a chat' })).toBeInTheDocument();
  });

  it('creates new chat and navigates to detail route', async () => {
    const user = userEvent.setup();

    const insertMock = vi.fn().mockReturnValue({
      select: () => ({
        single: async () => ({
          data: { id: 'new-conv-uuid', title: 'New chat' },
          error: null,
        }),
      }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        order: async () => ({ data: [], error: null }),
      }),
      insert: insertMock,
    } as never);

    renderList();

    const startBtn = await screen.findByRole('button', { name: 'Start a chat' });
    await user.click(startBtn);

    expect(insertMock).toHaveBeenCalledWith({ title: 'New chat' });
  });

  it('renames a conversation through Rename dialog', async () => {
    const user = userEvent.setup();

    const updateMock = vi.fn().mockReturnValue({
      eq: () => ({
        select: () => ({
          single: async () => ({
            data: { id: 'conv-1', title: 'Updated Title' },
            error: null,
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        order: async () => ({
          data: [{ id: 'conv-1', title: 'Old Title', updated_at: '2026-11-04T00:00:00Z' }],
          error: null,
        }),
      }),
      update: updateMock,
    } as never);

    renderList();

    expect(await screen.findByText('Old Title')).toBeInTheDocument();

    // Open menu
    const menuBtn = screen.getByRole('button', { name: 'Conversation options' });
    await user.click(menuBtn);

    // Click Rename
    const renameItem = await screen.findByRole('menuitem', { name: /Rename/i });
    await user.click(renameItem);

    // Dialog opens with title field
    const field = await screen.findByLabelText(/Chat title/i);
    await user.clear(field);
    await user.type(field, 'Updated Title');

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    await user.click(saveBtn);

    expect(updateMock).toHaveBeenCalledWith({ title: 'Updated Title' });
  });

  it('deletes a conversation through ConfirmDialog', async () => {
    const user = userEvent.setup();

    const deleteMock = vi.fn().mockReturnValue({
      eq: async () => ({ error: null }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({
        order: async () => ({
          data: [{ id: 'conv-2', title: 'To Delete', updated_at: '2026-11-04T00:00:00Z' }],
          error: null,
        }),
      }),
      delete: deleteMock,
    } as never);

    renderList();

    expect(await screen.findByText('To Delete')).toBeInTheDocument();

    const menuBtn = screen.getByRole('button', { name: 'Conversation options' });
    await user.click(menuBtn);

    const deleteItem = await screen.findByRole('menuitem', { name: /Delete/i });
    await user.click(deleteItem);

    // Confirm dialog opens
    expect(await screen.findByText('Delete conversation?')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalled();
    });
  });
});
