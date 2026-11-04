import type { Database } from '@/lib/database.types';
import { todayKey } from '@/lib/dates';

export type Todo = Database['public']['Tables']['todos']['Row'];

export interface GroupedTodos {
  overdue: Todo[];
  today: Todo[];
  upcoming: Todo[];
  noDate: Todo[];
  done: Todo[];
}

export function groupTodos(todos: Todo[], tz: string): GroupedTodos {
  const result: GroupedTodos = {
    overdue: [],
    today: [],
    upcoming: [],
    noDate: [],
    done: [],
  };

  const today = todayKey(tz);

  for (const todo of todos) {
    if (todo.done) {
      result.done.push(todo);
    } else if (!todo.due_date) {
      result.noDate.push(todo);
    } else if (todo.due_date < today) {
      result.overdue.push(todo);
    } else if (todo.due_date === today) {
      result.today.push(todo);
    } else {
      result.upcoming.push(todo);
    }
  }

  return result;
}
