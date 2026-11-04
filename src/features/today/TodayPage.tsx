import { Link } from '@tanstack/react-router';
import { FileText } from '@phosphor-icons/react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { formatLongDate, browserTimeZone } from '@/lib/dates';
import { useProfile } from '@/features/profile/queries';
import { useTodos, useMoveTodo } from '@/features/todos/queries';
import { groupTodos } from '@/features/todos/groupTodos';
import { TodoRow } from '@/features/todos/TodoRow';
import { useTodayFocus, useRecentNotes } from '@/features/today/queries';
import { ImportBanner } from '@/features/import/ImportBanner';

function getGreeting(tz: string, displayName?: string | null): string {
  const hourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  }).format(new Date());
  const hour = Number(hourStr);
  const name = displayName?.trim() || 'there';

  let timeOfDay = 'evening';
  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning';
  } else if (hour >= 12 && hour < 18) {
    timeOfDay = 'afternoon';
  }

  return `Good ${timeOfDay}, ${name}`;
}

export function TodayPage() {
  const { data: profile } = useProfile();
  const tz = profile?.timezone || browserTimeZone();
  const dateTitle = formatLongDate(new Date(), tz);
  const greeting = getGreeting(tz, profile?.display_name);

  // Queries for the three sections
  const {
    data: todos,
    isLoading: isTodosLoading,
    isError: isTodosError,
    error: todosError,
    refetch: refetchTodos,
  } = useTodos();

  const {
    data: todayFocus,
    isLoading: isFocusLoading,
    isError: isFocusError,
    error: focusError,
    refetch: refetchFocus,
  } = useTodayFocus(tz);

  const {
    data: recentNotes,
    isLoading: isNotesLoading,
    isError: isNotesError,
    error: notesError,
    refetch: refetchNotes,
  } = useRecentNotes();

  const moveTodo = useMoveTodo();

  const allTodos = todos || [];
  const grouped = groupTodos(allTodos, tz);
  // Due today includes overdue + today
  const dueTodayTodos = [...grouped.overdue, ...grouped.today];

  return (
    <div className="space-y-8">
      <PageHeader title={dateTitle} meta={greeting} />

      <ImportBanner />

      {/* Focal point: Primary button */}
      <div>
        <Link
          to="/focus"
          className="inline-flex items-center justify-center font-medium rounded-[6px] transition-colors duration-120 ease-out select-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 text-sm px-3.5 py-2 min-h-[44px] md:min-h-[38px] gap-2 bg-accent text-accent-ink hover:opacity-90 active:opacity-95 shadow-none cursor-pointer"
        >
          Start focus session
        </Link>
      </div>

      <div className="space-y-8 pt-2">
        {/* Section 1: Due today */}
        <section aria-labelledby="heading-due-today" className="space-y-3">
          <div className="flex items-center justify-between border-b border-rule pb-2">
            <h2 id="heading-due-today" className="font-serif text-base font-semibold text-ink">
              Due today
            </h2>
            <Link
              to="/todos"
              className="text-xs text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-accent rounded-[4px] px-1 py-0.5"
            >
              All todos
            </Link>
          </div>

          {isTodosLoading ? (
            <Skeleton rows={3} />
          ) : isTodosError ? (
            <ErrorState
              title="Could not load todos"
              message={todosError instanceof Error ? todosError.message : 'Please try again.'}
              onRetry={() => refetchTodos()}
            />
          ) : dueTodayTodos.length === 0 ? (
            <EmptyState title="Nothing due today." body="You have no overdue or today tasks." />
          ) : (
            <div className="divide-y divide-rule/30">
              {dueTodayTodos.map((todo, currentIndex) => {
                const canMoveUp = currentIndex > 0;
                const canMoveDown = currentIndex < dueTodayTodos.length - 1;

                return (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    tz={tz}
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                    onMoveUp={() => {
                      const prev = dueTodayTodos[currentIndex - 1];
                      if (prev) {
                        moveTodo.mutate({ todo, neighbour: prev });
                      }
                    }}
                    onMoveDown={() => {
                      const next = dueTodayTodos[currentIndex + 1];
                      if (next) {
                        moveTodo.mutate({ todo, neighbour: next });
                      }
                    }}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Section 2: Focus today */}
        <section aria-labelledby="heading-focus-today" className="space-y-3">
          <div className="border-b border-rule pb-2">
            <h2 id="heading-focus-today" className="font-serif text-base font-semibold text-ink">
              Focus today
            </h2>
          </div>

          {isFocusLoading ? (
            <Skeleton rows={2} />
          ) : isFocusError ? (
            <ErrorState
              title="Could not load focus session"
              message={focusError instanceof Error ? focusError.message : 'Please try again.'}
              onRetry={() => refetchFocus()}
            />
          ) : !todayFocus || todayFocus.totalMinutes === 0 ? (
            <EmptyState
              title="No focus time yet today."
              body="Start a timer session to build your study streak."
            />
          ) : (
            <div className="rounded-[6px] border border-rule/60 bg-surface/40 p-4">
              <p className="font-serif text-lg font-semibold text-ink">
                {todayFocus.totalMinutes} {todayFocus.totalMinutes === 1 ? 'minute' : 'minutes'}
              </p>
              <p className="mt-1 text-xs text-muted">
                Completed across {todayFocus.sessionCount}{' '}
                {todayFocus.sessionCount === 1 ? 'session' : 'sessions'} today.
              </p>
            </div>
          )}
        </section>

        {/* Section 3: Recently edited pages */}
        <section aria-labelledby="heading-recent-notes" className="space-y-3">
          <div className="border-b border-rule pb-2">
            <h2 id="heading-recent-notes" className="font-serif text-base font-semibold text-ink">
              Recently edited pages
            </h2>
          </div>

          {isNotesLoading ? (
            <Skeleton rows={3} />
          ) : isNotesError ? (
            <ErrorState
              title="Could not load pages"
              message={notesError instanceof Error ? notesError.message : 'Please try again.'}
              onRetry={() => refetchNotes()}
            />
          ) : !recentNotes || recentNotes.length === 0 ? (
            <EmptyState title="No pages yet." body="Pages you edit will appear here for quick access." />
          ) : (
            <div className="divide-y divide-rule/30">
              {recentNotes.map((note) => (
                <Link
                  key={note.id}
                  to="/notes/$noteId"
                  params={{ noteId: note.id }}
                  className="flex items-center gap-2.5 rounded-[6px] px-3 py-2 text-sm text-ink transition-colors duration-120 hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span className="flex h-5 w-5 items-center justify-center text-base" aria-hidden="true">
                    {note.icon || <FileText size={16} className="text-muted" />}
                  </span>
                  <span className="truncate font-medium">{note.title || 'Untitled'}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
