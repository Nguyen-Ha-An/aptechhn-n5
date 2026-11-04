import { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { BarChart, HBarList } from '@/components/charts';
import {
  useUserStats,
  useSessionsRange,
  useAchievements,
  minutesByDay,
  minutesByHour,
  distractionsByCategory,
} from '@/features/progress';
import { useProfile } from '@/features/profile/queries';
import { ACHIEVEMENTS, ACHIEVEMENT_IDS } from '@/lib/achievements';
import { formatLongDate } from '@/lib/dates';

export function ProgressPage() {
  const [range, setRange] = useState<7 | 30>(7);

  const { data: profile } = useProfile();
  const tz = profile?.timezone || 'Asia/Ho_Chi_Minh';

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    error: statsErr,
    refetch: refetchStats,
  } = useUserStats();

  const {
    data: sessions,
    isLoading: sessionsLoading,
    isError: sessionsError,
    error: sessionsErr,
    refetch: refetchSessions,
  } = useSessionsRange(range);

  const {
    data: achievements,
    isLoading: achLoading,
    isError: achError,
    error: achErr,
    refetch: refetchAchievements,
  } = useAchievements();

  const isLoading = statsLoading || sessionsLoading || achLoading;
  const hasError = statsError || sessionsError || achError;

  const handleRetry = () => {
    refetchStats();
    refetchSessions();
    refetchAchievements();
  };

  const unlockedMap = useMemo(() => {
    const map = new Map<string, { unlocked_at: string }>();
    if (achievements) {
      for (const item of achievements) {
        map.set(item.achievement_id, { unlocked_at: item.unlocked_at });
      }
    }
    return map;
  }, [achievements]);

  const dailyMinutes = useMemo(() => {
    return minutesByDay(sessions || [], tz, range);
  }, [sessions, tz, range]);

  const hourlyMinutes = useMemo(() => {
    return minutesByHour(sessions || [], tz);
  }, [sessions, tz]);

  const distractionsData = useMemo(() => {
    const allDistractions = (sessions || []).flatMap((s) => s.distractions || []);
    return distractionsByCategory(allDistractions);
  }, [sessions]);

  // Compute summary line
  const summaryLine = useMemo(() => {
    if (!stats || stats.sessions_count === 0) return null;
    const currentStreak = stats.current_streak;
    const bestStreak = stats.best_streak;
    const streakWord = currentStreak === 1 ? 'day' : 'days';

    let totalFocusText = '';
    if (stats.total_focus_minutes >= 60) {
      const hours = Math.round(stats.total_focus_minutes / 60);
      totalFocusText = `${hours} ${hours === 1 ? 'hour' : 'hours'} focused in total.`;
    } else {
      totalFocusText = `${stats.total_focus_minutes} ${stats.total_focus_minutes === 1 ? 'minute' : 'minutes'} focused in total.`;
    }

    return `Current streak ${currentStreak} ${streakWord}. Best ${bestStreak}. ${totalFocusText}`;
  }, [stats]);

  const getErrorMessage = (err: unknown): string | null => {
    if (err instanceof Error) return err.message;
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
      return (err as { message: string }).message;
    }
    return null;
  };

  const errorMessage =
    getErrorMessage(statsErr) ||
    getErrorMessage(sessionsErr) ||
    getErrorMessage(achErr) ||
    'An error occurred while fetching your progress.';

  return (
    <div className="pb-16">
      <PageHeader
        title="Progress"
        actions={
          <Link
            to="/progress/sessions"
            className="inline-flex min-h-[44px] md:min-h-0 items-center justify-center rounded-[6px] border border-rule px-3.5 py-1.5 text-sm font-medium text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent transition-colors"
          >
            All sessions
          </Link>
        }
      />

      {isLoading && (
        <div className="py-8">
          <Skeleton rows={8} />
        </div>
      )}

      {!isLoading && hasError && (
        <div className="py-8">
          <ErrorState
            title="Failed to load progress"
            message={errorMessage}
            onRetry={handleRetry}
          />
        </div>
      )}

      {!isLoading && !hasError && stats && stats.sessions_count === 0 && (
        <div className="py-8">
          <EmptyState
            title="No sessions yet"
            body="Start your first focus session to track your progress, streaks, and habits."
            action={
              <Link
                to="/focus"
                className="inline-flex min-h-[44px] items-center justify-center rounded-[6px] bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent transition-opacity"
              >
                Start focus session
              </Link>
            }
          />
        </div>
      )}

      {!isLoading && !hasError && stats && stats.sessions_count > 0 && (
        <div className="pt-6 space-y-10">
          {/* Summary line */}
          {summaryLine && (
            <p className="text-base text-ink font-normal">{summaryLine}</p>
          )}

          {/* Daily focus chart */}
          <section aria-labelledby="daily-chart-heading">
            <div className="flex items-center justify-between mb-4">
              <h2
                id="daily-chart-heading"
                className="font-serif text-lg font-semibold text-ink"
              >
                Focus minutes per day
              </h2>
              <div
                role="group"
                aria-label="Time range"
                className="inline-flex rounded-[6px] border border-rule p-0.5 bg-surface text-xs font-medium"
              >
                <button
                  type="button"
                  onClick={() => setRange(7)}
                  aria-pressed={range === 7}
                  className={`min-h-[44px] md:min-h-0 px-3 py-1 rounded-[4px] cursor-pointer transition-colors ${
                    range === 7
                      ? 'bg-paper text-ink font-semibold shadow-xs'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  7 days
                </button>
                <button
                  type="button"
                  onClick={() => setRange(30)}
                  aria-pressed={range === 30}
                  className={`min-h-[44px] md:min-h-0 px-3 py-1 rounded-[4px] cursor-pointer transition-colors ${
                    range === 30
                      ? 'bg-paper text-ink font-semibold shadow-xs'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  30 days
                </button>
              </div>
            </div>
            <BarChart
              data={dailyMinutes}
              valueLabel={(v) => `${v} min`}
              ariaLabel="Focus minutes per day"
            />
          </section>

          {/* Hourly focus chart */}
          <section aria-labelledby="hourly-chart-heading">
            <h2
              id="hourly-chart-heading"
              className="font-serif text-lg font-semibold text-ink mb-4"
            >
              When you focus
            </h2>
            <BarChart
              data={hourlyMinutes}
              valueLabel={(v) => `${v} min`}
              ariaLabel="Focus minutes by hour of day"
            />
          </section>

          {/* Distractions breakdown */}
          <section aria-labelledby="distractions-heading">
            <h2
              id="distractions-heading"
              className="font-serif text-lg font-semibold text-ink mb-4"
            >
              What distracts you
            </h2>
            {distractionsData.length === 0 ? (
              <p className="text-sm text-muted">No distractions logged.</p>
            ) : (
              <HBarList
                data={distractionsData}
                ariaLabel="Distractions by category"
                valueLabel={(v) => `${v} ${v === 1 ? 'distraction' : 'distractions'}`}
              />
            )}
          </section>

          {/* Achievements */}
          <section aria-labelledby="achievements-heading">
            <h2
              id="achievements-heading"
              className="font-serif text-lg font-semibold text-ink mb-4"
            >
              Achievements
            </h2>
            <ul
              className="divide-y divide-rule border-y border-rule"
              aria-label="Achievements list"
            >
              {ACHIEVEMENT_IDS.map((id) => {
                const meta = ACHIEVEMENTS[id];
                const unlocked = unlockedMap.get(id);

                if (unlocked) {
                  return (
                    <li
                      key={id}
                      className="py-3.5 flex items-start justify-between gap-4"
                    >
                      <div>
                        <h3 className="font-medium text-sm text-ink">{meta.title}</h3>
                        <p className="text-xs text-ink/80 mt-0.5">{meta.description}</p>
                      </div>
                      <span className="text-xs text-ink shrink-0 tabular-nums">
                        Unlocked {formatLongDate(unlocked.unlocked_at, tz)}
                      </span>
                    </li>
                  );
                }

                return (
                  <li
                    key={id}
                    className="py-3.5 flex items-start justify-between gap-4 text-muted"
                  >
                    <div>
                      <h3 className="font-medium text-sm text-muted">{meta.title}</h3>
                      <p className="text-xs text-muted/80 mt-0.5">{meta.description}</p>
                    </div>
                    <span className="text-xs text-muted shrink-0">Locked</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
