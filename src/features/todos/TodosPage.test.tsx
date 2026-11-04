import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TodosPage } from './TodosPage';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
      <a href={to} className={className}>
        {children}
      </a>
    ),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'user-1', timezone: 'Asia/Ho_Chi_Minh' },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === 'todos') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'todo-new',
                  user_id: 'user-1',
                  title: 'New created task',
                  done: false,
                  due_date: null,
                  priority: 'none',
                  position: 1,
                  completed_at: null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                error: null,
              }),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: {}, error: null }),
              })),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      };
    }),
  },
  isSupabaseConfigured: true,
}));

vi.mock('@/features/auth', () => ({
  useSession: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    status: 'signed-in',
  }),
}));

function renderTodosPage(initialTodos?: unknown[]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  if (initialTodos !== undefined) {
    queryClient.setQueryData(['todos'], initialTodos);
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <TodosPage />
    </QueryClientProvider>,
  );
}

describe('Todos page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders PageHeader and EmptyState when no todos exist', async () => {
    renderTodosPage([]);

    expect(screen.getByRole('heading', { level: 1, name: 'Todos' })).toBeInTheDocument();
    expect(await screen.findByText('No todos yet')).toBeInTheDocument();
    expect(
      screen.getByText('Add the first thing you want to get done today.'),
    ).toBeInTheDocument();
  });

  it('allows adding a new todo through the top inline input', async () => {
    const user = userEvent.setup();
    renderTodosPage([]);

    const input = screen.getByPlaceholderText('Add a todo and press Enter...');
    expect(input).toBeInTheDocument();

    await user.type(input, 'Finish physics assignment{Enter}');

    // Input should be cleared and remain focused
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
    expect(input).toHaveFocus();
  });

  it('renders grouped sections when todos exist', async () => {
    const mockTodos = [
      {
        id: '1',
        user_id: 'user-1',
        title: 'Overdue assignment',
        done: false,
        due_date: '2020-01-01',
        priority: 'high',
        position: 1,
        completed_at: null,
        created_at: '2020-01-01',
        updated_at: '2020-01-01',
      },
      {
        id: '2',
        user_id: 'user-1',
        title: 'Completed item',
        done: true,
        due_date: null,
        priority: 'none',
        position: 2,
        completed_at: '2026-11-04',
        created_at: '2026-11-04',
        updated_at: '2026-11-04',
      },
    ];

    renderTodosPage(mockTodos);

    expect(await screen.findByText('Overdue assignment')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Overdue' })).toBeInTheDocument();
    expect(screen.getByText('Done (1)')).toBeInTheDocument();
  });
});
