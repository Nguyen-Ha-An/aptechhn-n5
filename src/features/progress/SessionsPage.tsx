import { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { PageHeader } from '@/components/PageHeader';
import {
  EmptyState,
  ErrorState,
  Skeleton,
  Button,
  Dialog,
  ConfirmDialog,
  Field,
} from '@/components/ui';
import {
  useSessionsRange,
  useUpdateSession,
  useDeleteSession,
  type SessionWithDetails,
  type SessionsRange,
} from '@/features/progress';
import { useProfile } from '@/features/profile/queries';
import { formatLongDate, formatTime, localDayKey } from '@/lib/dates';

type ModeFilter = 'all' | 'timed' | 'open';

export function SessionsPage() {
  const [range, setRange] = useState<SessionsRange>(7);
  const [mode, setMode] = useState<ModeFilter>('all');

  const { data: profile } = useProfile();
  const tz = profile?.timezone || 'Asia/Ho_Chi_Minh';

  const {
    data: sessions,
    isLoading,
    isError,
    error,
    refetch,
  } = useSessionsRange(range);

  // Selected session for editing dialog
  const [selectedSession, setSelectedSession] = useState<SessionWithDetails | null>(null);

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    if (mode === 'all') return sessions;
    return sessions.filter((s) => s.mode.toLowerCase() === mode);
  }, [sessions, mode]);

  const groupedByDay = useMemo(() => {
    const map = new Map<
      string,
      {
        dayLabel: string;
        totalMinutes: number;
        sessions: SessionWithDetails[];
      }
    >();

    for (const session of filteredSessions) {
      const dayKey = localDayKey(session.started_at, tz);
      let group = map.get(dayKey);
      if (!group) {
        group = {
          dayLabel: formatLongDate(session.started_at, tz),
          totalMinutes: 0,
          sessions: [],
        };
        map.set(dayKey, group);
      }
      group.totalMinutes += Math.round(session.focused_seconds / 60);
      group.sessions.push(session);
    }

    return Array.from(map.entries()).map(([dayKey, group]) => ({
      dayKey,
      ...group,
    }));
  }, [filteredSessions, tz]);

  return (
    <div className="pb-16">
      <PageHeader
        title="Sessions"
        actions={
          <Link
            to="/progress"
            className="inline-flex min-h-[44px] md:min-h-0 items-center justify-center rounded-[6px] border border-rule px-3.5 py-1.5 text-sm font-medium text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent transition-colors"
          >
            Progress
          </Link>
        }
      />

      {/* Filters row */}
      <div className="pt-6 pb-4 flex flex-wrap items-center justify-between gap-4 border-b border-rule">
        {/* Range filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-medium">Range:</span>
          <div
            role="group"
            aria-label="Filter sessions by range"
            className="inline-flex rounded-[6px] border border-rule p-0.5 bg-surface text-xs font-medium"
          >
            {(
              [
                { id: 7, label: '7 days' },
                { id: 30, label: '30 days' },
                { id: 'all', label: 'All' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRange(opt.id)}
                aria-pressed={range === opt.id}
                className={`min-h-[44px] md:min-h-0 px-2.5 py-1 rounded-[4px] cursor-pointer transition-colors ${
                  range === opt.id
                    ? 'bg-paper text-ink font-semibold shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mode filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-medium">Mode:</span>
          <div
            role="group"
            aria-label="Filter sessions by mode"
            className="inline-flex rounded-[6px] border border-rule p-0.5 bg-surface text-xs font-medium"
          >
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'timed', label: 'Timed' },
                { id: 'open', label: 'Open' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMode(opt.id)}
                aria-pressed={mode === opt.id}
                className={`min-h-[44px] md:min-h-0 px-2.5 py-1 rounded-[4px] cursor-pointer transition-colors ${
                  mode === opt.id
                    ? 'bg-paper text-ink font-semibold shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main session content */}
      {isLoading && (
        <div className="py-8">
          <Skeleton rows={8} />
        </div>
      )}

      {!isLoading && isError && (
        <div className="py-8">
          <ErrorState
            title="Failed to load sessions"
            message={
              error instanceof Error
                ? error.message
                : error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string'
                  ? (error as { message: string }).message
                  : 'An error occurred while fetching your sessions history.'
            }
            onRetry={() => refetch()}
          />
        </div>
      )}

      {!isLoading && !isError && filteredSessions.length === 0 && (
        <div className="py-8">
          <EmptyState
            title="No sessions in this range."
            body="Try selecting a different time range or mode filter."
          />
        </div>
      )}

      {!isLoading && !isError && filteredSessions.length > 0 && (
        <div className="space-y-8 pt-6">
          {groupedByDay.map((group) => (
            <section key={group.dayKey} aria-labelledby={`day-heading-${group.dayKey}`}>
              <div className="flex items-baseline justify-between border-b border-rule pb-2 mb-3">
                <h2
                  id={`day-heading-${group.dayKey}`}
                  className="font-serif text-lg font-semibold text-ink"
                >
                  {group.dayLabel}
                </h2>
                <span className="text-xs text-muted tabular-nums">
                  {group.totalMinutes} {group.totalMinutes === 1 ? 'minute' : 'minutes'}
                </span>
              </div>

              <div className="space-y-2">
                {group.sessions.map((session) => {
                  const startTime = formatTime(session.started_at, tz);
                  const endTime = formatTime(session.ended_at, tz);
                  const focusedMinutes = Math.round(session.focused_seconds / 60);
                  const distractionCount = session.distractions.length;

                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setSelectedSession(session)}
                      className="w-full text-left p-3.5 rounded-[6px] border border-rule/60 hover:bg-surface hover:border-rule flex items-center justify-between gap-4 transition-colors focus-visible:outline-2 focus-visible:outline-accent cursor-pointer min-h-[44px]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-ink tabular-nums">
                            {startTime} - {endTime}
                          </span>
                          <span className="text-xs text-muted capitalize">
                            ({session.mode})
                          </span>
                        </div>
                        {session.todos?.title && (
                          <p className="text-xs text-ink/80 truncate mt-1">
                            {session.todos.title}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-semibold text-ink tabular-nums block">
                          {focusedMinutes} min
                        </span>
                        <div className="flex items-center justify-end gap-2 text-xs text-muted mt-0.5">
                          {distractionCount > 0 && (
                            <span>
                              {distractionCount} {distractionCount === 1 ? 'distraction' : 'distractions'}
                            </span>
                          )}
                          {session.focus_rating != null && (
                            <span>Rating: {session.focus_rating}/5</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Session Details Dialog */}
      {selectedSession && (
        <SessionEditDialog
          key={selectedSession.id}
          session={selectedSession}
          tz={tz}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}

interface SessionEditDialogProps {
  session: SessionWithDetails;
  tz: string;
  onClose: () => void;
}

function SessionEditDialog({ session, tz, onClose }: SessionEditDialogProps) {
  const [rating, setRating] = useState<number | null>(session.focus_rating);
  const [reflection, setReflection] = useState<string>(session.reflection || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateMutation = useUpdateSession();
  const deleteMutation = useDeleteSession();

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      sessionId: session.id,
      focus_rating: rating,
      reflection: reflection.trim() || null,
    });
    onClose();
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(session.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <>
      <Dialog
        open={true}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title="Session details"
        description={formatLongDate(session.started_at, tz)}
      >
        <div className="space-y-4 pt-1">
          {/* Session metadata */}
          <div className="grid grid-cols-2 gap-3 text-xs border-b border-rule pb-3">
            <div>
              <span className="text-muted block">Time</span>
              <span className="font-medium text-ink tabular-nums">
                {formatTime(session.started_at, tz)} - {formatTime(session.ended_at, tz)}
              </span>
            </div>
            <div>
              <span className="text-muted block">Mode</span>
              <span className="font-medium text-ink capitalize">
                {session.mode}
              </span>
            </div>
            <div>
              <span className="text-muted block">Focused time</span>
              <span className="font-medium text-ink tabular-nums">
                {Math.round(session.focused_seconds / 60)} minutes
              </span>
            </div>
            <div>
              <span className="text-muted block">Paused time</span>
              <span className="font-medium text-ink tabular-nums">
                {Math.round(session.paused_seconds / 60)} minutes
              </span>
            </div>
            {session.todos?.title && (
              <div className="col-span-2">
                <span className="text-muted block">Linked todo</span>
                <span className="font-medium text-ink truncate block">
                  {session.todos.title}
                </span>
              </div>
            )}
          </div>

          {/* Distractions list */}
          <div className="border-b border-rule pb-3">
            <h4 className="text-xs font-semibold text-ink uppercase tracking-wider mb-2">
              Distractions ({session.distractions.length})
            </h4>
            {session.distractions.length === 0 ? (
              <p className="text-xs text-muted">No distractions recorded.</p>
            ) : (
              <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {session.distractions.map((d) => (
                  <li
                    key={d.id}
                    className="text-xs flex items-baseline justify-between gap-2 text-ink"
                  >
                    <span>
                      <strong className="font-medium">{d.category}</strong>
                      {d.note && <span className="text-muted ml-1">({d.note})</span>}
                    </span>
                    <span className="text-muted tabular-nums shrink-0">
                      {formatTime(d.occurred_at, tz)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Rating radio group */}
          <div>
            <span className="text-xs font-semibold text-ink block mb-2">
              Rating
            </span>
            <div
              role="radiogroup"
              aria-label="Session rating"
              className="flex items-center gap-2"
            >
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  role="radio"
                  aria-checked={rating === val}
                  onClick={() => setRating(rating === val ? null : val)}
                  className={`h-9 w-9 rounded-[6px] border text-xs font-medium cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                    rating === val
                      ? 'border-accent bg-accent text-accent-ink font-semibold'
                      : 'border-rule bg-surface text-ink hover:border-ink/40'
                  }`}
                >
                  {val}
                </button>
              ))}
              {rating != null && (
                <button
                  type="button"
                  onClick={() => setRating(null)}
                  className="text-xs text-muted hover:text-ink ml-2 cursor-pointer underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Reflection field */}
          <Field
            as="textarea"
            label="Reflection"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="What went well? What caused distractions?"
            rows={3}
          />

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-rule">
            <Button
              variant="danger"
              size="md"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete session
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="md" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                loading={updateMutation.isPending}
                onClick={handleSave}
              >
                Save changes
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete session"
        description="Are you sure you want to delete this focus session? This action cannot be undone."
        confirmText="Delete session"
        variant="danger"
        onConfirm={handleDelete}
      />
    </>
  );
}
