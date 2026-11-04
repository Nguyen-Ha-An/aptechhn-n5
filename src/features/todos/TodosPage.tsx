import { useState, useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import {
  EmptyState,
  ErrorState,
  Skeleton,
  Button,
  ConfirmDialog,
} from '@/components/ui';
import { browserTimeZone } from '@/lib/dates';
import { useProfile } from '@/features/profile/queries';
import {
  useTodos,
  useAddTodo,
  useClearCompleted,
  useMoveTodo,
  type Todo,
} from '@/features/todos/queries';
import { groupTodos } from '@/features/todos/groupTodos';
import { TodoRow } from '@/features/todos/TodoRow';

export function TodosPage() {
  const { data: profile } = useProfile();
  const tz = profile?.timezone || browserTimeZone();

  const { data: todos, isLoading, isError, error, refetch } = useTodos();
  const addTodo = useAddTodo();
  const clearCompleted = useClearCompleted();
  const moveTodo = useMoveTodo();

  const [newTitle, setNewTitle] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) {
      return;
    }
    addTodo.mutate({ title: trimmed });
    setNewTitle('');
    addInputRef.current?.focus();
  };

  const handleClearCompleted = async () => {
    await clearCompleted.mutateAsync();
  };

  const allTodos = todos || [];
  const grouped = groupTodos(allTodos, tz);
  const totalTodosCount = allTodos.length;

  const renderTodoItem = (todo: Todo) => {
    const currentIndex = allTodos.findIndex((t) => t.id === todo.id);
    const canMoveUp = currentIndex > 0;
    const canMoveDown = currentIndex < allTodos.length - 1;

    return (
      <TodoRow
        key={todo.id}
        todo={todo}
        tz={tz}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        onMoveUp={() => {
          const prev = allTodos[currentIndex - 1];
          if (prev) {
            moveTodo.mutate({ todo, neighbour: prev });
          }
        }}
        onMoveDown={() => {
          const next = allTodos[currentIndex + 1];
          if (next) {
            moveTodo.mutate({ todo, neighbour: next });
          }
        }}
      />
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Todos" />

      {/* Inline add row at top */}
      <form onSubmit={handleAddSubmit} className="relative">
        <label htmlFor="add-todo-input" className="sr-only">
          Add a todo
        </label>
        <input
          id="add-todo-input"
          ref={addInputRef}
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a todo and press Enter..."
          className="w-full rounded-[6px] border border-rule bg-surface/50 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted transition-colors focus-visible:outline-2 focus-visible:outline-accent"
        />
      </form>

      {/* States: Loading / Error / Empty / Content */}
      {isLoading ? (
        <div className="space-y-4 pt-2">
          <Skeleton rows={5} />
        </div>
      ) : isError ? (
        <ErrorState
          title="Could not load todos"
          message={error instanceof Error ? error.message : 'Please check your connection and try again.'}
          onRetry={() => refetch()}
        />
      ) : totalTodosCount === 0 ? (
        <EmptyState
          title="No todos yet"
          body="Add the first thing you want to get done today."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => addInputRef.current?.focus()}
            >
              Add a todo
            </Button>
          }
        />
      ) : (
        <div className="space-y-6 pt-1">
          {/* Overdue section */}
          {grouped.overdue.length > 0 && (
            <section aria-labelledby="heading-overdue" className="space-y-1">
              <h2
                id="heading-overdue"
                className="font-serif text-base font-semibold text-danger pb-1"
              >
                Overdue
              </h2>
              <div className="divide-y divide-rule/30">
                {grouped.overdue.map(renderTodoItem)}
              </div>
            </section>
          )}

          {/* Today section */}
          {grouped.today.length > 0 && (
            <section aria-labelledby="heading-today" className="space-y-1">
              <h2
                id="heading-today"
                className="font-serif text-base font-semibold text-ink pb-1"
              >
                Today
              </h2>
              <div className="divide-y divide-rule/30">
                {grouped.today.map(renderTodoItem)}
              </div>
            </section>
          )}

          {/* Upcoming section */}
          {grouped.upcoming.length > 0 && (
            <section aria-labelledby="heading-upcoming" className="space-y-1">
              <h2
                id="heading-upcoming"
                className="font-serif text-base font-semibold text-ink pb-1"
              >
                Upcoming
              </h2>
              <div className="divide-y divide-rule/30">
                {grouped.upcoming.map(renderTodoItem)}
              </div>
            </section>
          )}

          {/* No date section */}
          {grouped.noDate.length > 0 && (
            <section aria-labelledby="heading-nodate" className="space-y-1">
              <h2
                id="heading-nodate"
                className="font-serif text-base font-semibold text-ink pb-1"
              >
                No date
              </h2>
              <div className="divide-y divide-rule/30">
                {grouped.noDate.map(renderTodoItem)}
              </div>
            </section>
          )}

          {/* Done section (collapsed via details with count) */}
          {grouped.done.length > 0 && (
            <section aria-label="Completed todos" className="pt-2">
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer font-serif text-base font-semibold text-muted hover:text-ink select-none focus-visible:outline-2 focus-visible:outline-accent rounded-[4px] py-1">
                  <span>Done ({grouped.done.length})</span>
                </summary>
                <div className="mt-2 divide-y divide-rule/30">
                  {grouped.done.map(renderTodoItem)}
                </div>
                <div className="mt-3">
                  <ConfirmDialog
                    title="Clear completed todos?"
                    description="This will permanently delete all completed todos."
                    confirmText="Clear completed"
                    variant="danger"
                    onConfirm={handleClearCompleted}
                    trigger={
                      <Button variant="ghost" size="sm" className="text-danger hover:bg-surface">
                        Clear completed
                      </Button>
                    }
                  />
                </div>
              </details>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
