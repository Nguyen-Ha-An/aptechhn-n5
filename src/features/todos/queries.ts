import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { useSession } from '@/features/auth';
import { notifyAchievements } from '@/features/achievements/notifyAchievements';
import type { Database } from '@/lib/database.types';

export type Todo = Database['public']['Tables']['todos']['Row'];
export type TodoPriority = 'none' | 'low' | 'medium' | 'high';

export interface AddTodoInput {
  title: string;
  due_date?: string | null;
  priority?: TodoPriority;
}

export interface UpdateTodoInput {
  id: string;
  title?: string;
  due_date?: string | null;
  priority?: TodoPriority;
  done?: boolean;
}

export interface MoveTodoInput {
  todo: Todo;
  neighbour: Todo;
}

export function useTodos() {
  const { user, status } = useSession();

  return useQuery({
    queryKey: qk.todos,
    queryFn: async (): Promise<Todo[]> => {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('position', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: status === 'signed-in' && Boolean(user?.id),
  });
}

export function useAddTodo() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: async (input: AddTodoInput): Promise<Todo> => {
      if (!user?.id) {
        throw new Error('You must be signed in to add a todo.');
      }

      const { data: currentTodos } = await supabase
        .from('todos')
        .select('position')
        .order('position', { ascending: false })
        .limit(1);

      const maxPosition = currentTodos && currentTodos.length > 0 && currentTodos[0]
        ? currentTodos[0].position
        : 0;

      const newPosition = maxPosition + 1;

      const { data, error } = await supabase
        .from('todos')
        .insert({
          user_id: user.id,
          title: input.title.trim(),
          due_date: input.due_date ?? null,
          priority: input.priority ?? 'none',
          position: newPosition,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onMutate: async (newTodo) => {
      await queryClient.cancelQueries({ queryKey: qk.todos });
      const previousTodos = queryClient.getQueryData<Todo[]>(qk.todos) || [];

      const maxPos = previousTodos.length > 0
        ? Math.max(...previousTodos.map((t) => t.position))
        : 0;

      const optimisticTodo: Todo = {
        id: crypto.randomUUID(),
        user_id: user?.id || 'temp-user',
        title: newTodo.title.trim(),
        done: false,
        due_date: newTodo.due_date ?? null,
        priority: newTodo.priority ?? 'none',
        position: maxPos + 1,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Todo[]>(qk.todos, [...previousTodos, optimisticTodo]);
      return { previousTodos };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(qk.todos, context.previousTodos);
      }
      toast.error('Could not save. Your change was undone.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.todos });
    },
  });
}

export function useUpdateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTodoInput): Promise<Todo> => {
      const payload: Database['public']['Tables']['todos']['Update'] = {
        updated_at: new Date().toISOString(),
      };

      if (input.title !== undefined) {
        payload.title = input.title.trim();
      }
      if (input.due_date !== undefined) {
        payload.due_date = input.due_date;
      }
      if (input.priority !== undefined) {
        payload.priority = input.priority;
      }
      if (input.done !== undefined) {
        payload.done = input.done;
        payload.completed_at = input.done ? new Date().toISOString() : null;
      }

      const { data, error } = await supabase
        .from('todos')
        .update(payload)
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: qk.todos });
      const previousTodos = queryClient.getQueryData<Todo[]>(qk.todos) || [];

      const updatedTodos = previousTodos.map((todo) => {
        if (todo.id !== updates.id) {
          return todo;
        }

        const nextTodo: Todo = {
          ...todo,
          updated_at: new Date().toISOString(),
        };

        if (updates.title !== undefined) {
          nextTodo.title = updates.title.trim();
        }
        if (updates.due_date !== undefined) {
          nextTodo.due_date = updates.due_date;
        }
        if (updates.priority !== undefined) {
          nextTodo.priority = updates.priority;
        }
        if (updates.done !== undefined) {
          nextTodo.done = updates.done;
          nextTodo.completed_at = updates.done ? new Date().toISOString() : null;
        }

        return nextTodo;
      });

      queryClient.setQueryData<Todo[]>(qk.todos, updatedTodos);
      return { previousTodos };
    },
    onSuccess: async (_data, variables) => {
      if (variables.done === true) {
        await notifyAchievements(queryClient);
      }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(qk.todos, context.previousTodos);
      }
      toast.error('Could not save. Your change was undone.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.todos });
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (error) {
        throw new Error(error.message);
      }
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: qk.todos });
      const previousTodos = queryClient.getQueryData<Todo[]>(qk.todos) || [];
      queryClient.setQueryData<Todo[]>(
        qk.todos,
        previousTodos.filter((t) => t.id !== id),
      );
      return { previousTodos };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(qk.todos, context.previousTodos);
      }
      toast.error('Could not save. Your change was undone.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.todos });
    },
  });
}

export function useRestoreTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (todo: Todo): Promise<Todo> => {
      const { data, error } = await supabase
        .from('todos')
        .insert({
          id: todo.id,
          user_id: todo.user_id,
          title: todo.title,
          done: todo.done,
          due_date: todo.due_date,
          priority: todo.priority,
          position: todo.position,
          completed_at: todo.completed_at,
          created_at: todo.created_at,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onMutate: async (todo) => {
      await queryClient.cancelQueries({ queryKey: qk.todos });
      const previousTodos = queryClient.getQueryData<Todo[]>(qk.todos) || [];
      const restored = [...previousTodos, todo].sort((a, b) => a.position - b.position);
      queryClient.setQueryData<Todo[]>(qk.todos, restored);
      return { previousTodos };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(qk.todos, context.previousTodos);
      }
      toast.error('Could not save. Your change was undone.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.todos });
    },
  });
}

export function useClearCompleted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await supabase.from('todos').delete().eq('done', true);
      if (error) {
        throw new Error(error.message);
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: qk.todos });
      const previousTodos = queryClient.getQueryData<Todo[]>(qk.todos) || [];
      queryClient.setQueryData<Todo[]>(
        qk.todos,
        previousTodos.filter((t) => !t.done),
      );
      return { previousTodos };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(qk.todos, context.previousTodos);
      }
      toast.error('Could not save. Your change was undone.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.todos });
    },
  });
}

export function useMoveTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ todo, neighbour }: MoveTodoInput): Promise<void> => {
      const [resA, resB] = await Promise.all([
        supabase
          .from('todos')
          .update({ position: neighbour.position, updated_at: new Date().toISOString() })
          .eq('id', todo.id),
        supabase
          .from('todos')
          .update({ position: todo.position, updated_at: new Date().toISOString() })
          .eq('id', neighbour.id),
      ]);

      if (resA.error) {
        throw new Error(resA.error.message);
      }
      if (resB.error) {
        throw new Error(resB.error.message);
      }
    },
    onMutate: async ({ todo, neighbour }) => {
      await queryClient.cancelQueries({ queryKey: qk.todos });
      const previousTodos = queryClient.getQueryData<Todo[]>(qk.todos) || [];

      const updated = previousTodos.map((t) => {
        if (t.id === todo.id) {
          return { ...t, position: neighbour.position };
        }
        if (t.id === neighbour.id) {
          return { ...t, position: todo.position };
        }
        return t;
      });

      updated.sort((a, b) => a.position - b.position);
      queryClient.setQueryData<Todo[]>(qk.todos, updated);
      return { previousTodos };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(qk.todos, context.previousTodos);
      }
      toast.error('Could not save. Your change was undone.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.todos });
    },
  });
}
