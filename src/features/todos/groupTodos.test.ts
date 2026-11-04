import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { groupTodos, type Todo } from './groupTodos';

function createTodo(partial: Partial<Todo> = {}): Todo {
  return {
    id: partial.id || crypto.randomUUID(),
    user_id: 'user-1',
    title: partial.title || 'Test todo',
    done: partial.done ?? false,
    due_date: partial.due_date ?? null,
    priority: partial.priority ?? 'none',
    position: partial.position ?? 1,
    completed_at: partial.completed_at ?? null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  };
}

describe('groupTodos', () => {
  beforeEach(() => {
    // 00:30 UTC on Nov 4 = 07:30 Nov 4 in Asia/Ho_Chi_Minh (+7), 19:30 Nov 3 in America/New_York (-5)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T00:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('correctly groups overdue, today, upcoming, noDate, and done in Asia/Ho_Chi_Minh', () => {
    const todos: Todo[] = [
      createTodo({ id: '1', title: 'Overdue task', due_date: '2026-11-03' }),
      createTodo({ id: '2', title: 'Today task', due_date: '2026-11-04' }),
      createTodo({ id: '3', title: 'Upcoming task', due_date: '2026-11-05' }),
      createTodo({ id: '4', title: 'No date task', due_date: null }),
      createTodo({ id: '5', title: 'Done task', done: true, due_date: '2026-11-01' }),
    ];

    const grouped = groupTodos(todos, 'Asia/Ho_Chi_Minh');

    expect(grouped.overdue.map((t) => t.id)).toEqual(['1']);
    expect(grouped.today.map((t) => t.id)).toEqual(['2']);
    expect(grouped.upcoming.map((t) => t.id)).toEqual(['3']);
    expect(grouped.noDate.map((t) => t.id)).toEqual(['4']);
    expect(grouped.done.map((t) => t.id)).toEqual(['5']);
  });

  it('respects timezone boundary shift in America/New_York', () => {
    // In NY, the local date is 2026-11-03
    const todos: Todo[] = [
      createTodo({ id: '1', title: 'Overdue task in NY', due_date: '2026-11-02' }),
      createTodo({ id: '2', title: 'Today task in NY', due_date: '2026-11-03' }),
      createTodo({ id: '3', title: 'Upcoming task in NY', due_date: '2026-11-04' }),
    ];

    const grouped = groupTodos(todos, 'America/New_York');

    expect(grouped.overdue.map((t) => t.id)).toEqual(['1']);
    expect(grouped.today.map((t) => t.id)).toEqual(['2']);
    expect(grouped.upcoming.map((t) => t.id)).toEqual(['3']);
  });

  it('always places completed todos into done group regardless of due date', () => {
    const todos: Todo[] = [
      createTodo({ id: '1', title: 'Done overdue', done: true, due_date: '2026-11-01' }),
      createTodo({ id: '2', title: 'Done today', done: true, due_date: '2026-11-04' }),
      createTodo({ id: '3', title: 'Done upcoming', done: true, due_date: '2026-11-10' }),
      createTodo({ id: '4', title: 'Done no date', done: true, due_date: null }),
    ];

    const grouped = groupTodos(todos, 'Asia/Ho_Chi_Minh');

    expect(grouped.done.map((t) => t.id)).toEqual(['1', '2', '3', '4']);
    expect(grouped.overdue).toHaveLength(0);
    expect(grouped.today).toHaveLength(0);
    expect(grouped.upcoming).toHaveLength(0);
    expect(grouped.noDate).toHaveLength(0);
  });

  it('returns empty lists for empty input', () => {
    const grouped = groupTodos([], 'Asia/Ho_Chi_Minh');
    expect(grouped.overdue).toEqual([]);
    expect(grouped.today).toEqual([]);
    expect(grouped.upcoming).toEqual([]);
    expect(grouped.noDate).toEqual([]);
    expect(grouped.done).toEqual([]);
  });
});
