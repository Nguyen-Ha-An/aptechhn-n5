import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TodoRow } from './TodoRow';
import type { Todo } from './queries';

// Mock supabase module with inspectable mocks
const mockUpdate = vi.fn(() => ({
  eq: vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  })),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: vi.fn(() => ({
      update: mockUpdate,
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

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          done: true,
          completed_at: expect.any(String),
        }),
      );
    });
  });

  it('saves title once on Enter and does not double-save when blurred', async () => {
    const user = userEvent.setup();
    const todo = createTestTodo({ title: 'Complete calculus homework' });

    renderWithClient(<TodoRow todo={todo} tz="Asia/Ho_Chi_Minh" />);

    const titleButton = screen.getByRole('button', {
      name: 'Edit title: Complete calculus homework',
    });
    await user.click(titleButton);

    const input = screen.getByRole('textbox', { name: 'Edit todo title' });
    await user.clear(input);
    await user.type(input, 'New homework title{Enter}');

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New homework title',
        }),
      );
    });
  });

  it('cancels edit on Escape and does not save on blur', async () => {
    const user = userEvent.setup();
    const todo = createTestTodo({ title: 'Original title' });

    renderWithClient(<TodoRow todo={todo} tz="Asia/Ho_Chi_Minh" />);

    const titleButton = screen.getByRole('button', {
      name: 'Edit title: Original title',
    });
    await user.click(titleButton);

    const input = screen.getByRole('textbox', { name: 'Edit todo title' });
    await user.clear(input);
    await user.type(input, 'Changed title');

    // Press Escape to cancel
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: 'Edit todo title' })).not.toBeInTheDocument();
    });

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Edit title: Original title' }),
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

  it('triggers onMoveUp and onMoveDown via Alt+Arrow keys from any focused control in row', async () => {
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

    // Also verify from checkbox
    const checkbox = screen.getByRole('checkbox', { name: 'Reorderable task' });
    checkbox.focus();

    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(onMoveUp).toHaveBeenCalledTimes(2);
  });
});
