import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TodoRow } from './TodoRow';
import type { Todo } from './queries';

// Mock supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: {}, error: null }),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        })),
      })),
    })),
  },
}));

// Mock router navigation
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

function createTestTodo(partial: Partial<Todo> = {}): Todo {
  return {
    id: partial.id || 'todo-123',
    user_id: 'user-1',
    title: partial.title || 'Buy study notebook',
    done: partial.done ?? false,
    due_date: partial.due_date ?? '2026-11-04',
    priority: partial.priority ?? 'none',
    position: partial.position ?? 1,
    completed_at: partial.completed_at ?? null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  };
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('TodoRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders native checkbox with label matching todo title and toggles completion', async () => {
    const user = userEvent.setup();
    const todo = createTestTodo({ title: 'Read Chapter 4', done: false });

    renderWithClient(<TodoRow todo={todo} tz="Asia/Ho_Chi_Minh" />);

    const checkbox = screen.getByRole('checkbox', { name: 'Read Chapter 4' });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    // After clicking, updateTodo mutation is triggered
  });

  it('enters inline edit mode, and Esc cancels edit reverting changes', async () => {
    const user = userEvent.setup();
    const todo = createTestTodo({ title: 'Complete calculus homework' });

    renderWithClient(<TodoRow todo={todo} tz="Asia/Ho_Chi_Minh" />);

    const titleButton = screen.getByRole('button', {
      name: 'Edit title: Complete calculus homework',
    });
    expect(titleButton).toBeInTheDocument();

    // Click to enter inline edit mode
    await user.click(titleButton);

    const input = screen.getByRole('textbox', { name: 'Edit todo title' });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Complete calculus homework');

    // Type extra text
    await user.type(input, ' and submit it');
    expect(input).toHaveValue('Complete calculus homework and submit it');

    // Press Escape to cancel
    await user.keyboard('{Escape}');

    // Edit input should be gone, original title should remain
    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: 'Edit todo title' })).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: 'Edit title: Complete calculus homework' }),
    ).toBeInTheDocument();
  });

  it('more actions menu button has accessible name', () => {
    const todo = createTestTodo({ title: 'Prepare presentation slides' });

    renderWithClient(<TodoRow todo={todo} tz="Asia/Ho_Chi_Minh" />);

    const menuButton = screen.getByRole('button', {
      name: 'More actions for Prepare presentation slides',
    });
    expect(menuButton).toBeInTheDocument();
  });

  it('triggers onMoveUp and onMoveDown via Alt+Arrow keys on focused row', async () => {
    const user = userEvent.setup();
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    const todo = createTestTodo({ title: 'Reorderable task' });

    renderWithClient(
      <TodoRow
        todo={todo}
        tz="Asia/Ho_Chi_Minh"
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        canMoveUp={true}
        canMoveDown={true}
      />,
    );

    const titleButton = screen.getByRole('button', {
      name: 'Edit title: Reorderable task',
    });

    titleButton.focus();

    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(onMoveUp).toHaveBeenCalledTimes(1);

    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(onMoveDown).toHaveBeenCalledTimes(1);
  });
});
