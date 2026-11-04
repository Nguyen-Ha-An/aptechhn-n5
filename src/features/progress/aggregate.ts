import { addDays, localDayKey, todayKey } from '@/lib/dates';

export interface SessionAggregateInput {
  started_at: string;
  focused_seconds: number;
}

export interface DistractionAggregateInput {
  category: string;
}

export interface DayMinutes {
  label: string;
  value: number;
  dayKey: string;
  isCurrent: boolean;
}

export interface HourMinutes {
  label: string;
  value: number;
  hour: number;
}

export interface CategoryDistraction {
  label: string;
  value: number;
}

export function getLocalHour(isoString: string, tz: string): number {
  const d = new Date(isoString);
  const hourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  }).format(d);
  return parseInt(hourStr, 10) % 24;
}

/**
 * Aggregates focus minutes per local day for the past `days` days ending today.
 * Fills zero days so every day in the range is present.
 */
export function minutesByDay(
  sessions: SessionAggregateInput[],
  tz: string,
  days: number = 7,
): DayMinutes[] {
  const today = todayKey(tz);
  const dayKeys: string[] = [];
  const secondsByDay = new Map<string, number>();

  for (let i = days - 1; i >= 0; i--) {
    const key = addDays(today, -i);
    dayKeys.push(key);
    secondsByDay.set(key, 0);
  }

  for (const session of sessions) {
    if (!session.started_at || typeof session.focused_seconds !== 'number') {
      continue;
    }
    const sDay = localDayKey(session.started_at, tz);
    if (secondsByDay.has(sDay)) {
      const current = secondsByDay.get(sDay) ?? 0;
      secondsByDay.set(sDay, current + Math.max(0, session.focused_seconds));
    }
  }

  return dayKeys.map((dayKey) => {
    const totalSecs = secondsByDay.get(dayKey) ?? 0;
    const value = Math.round(totalSecs / 60);

    let label: string;
    if (days <= 7) {
      const [y, m, d] = dayKey.split('-').map(Number);
      const date = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
      label = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'UTC',
        weekday: 'short',
      }).format(date);
    } else {
      label = String(parseInt(dayKey.slice(8), 10));
    }

    return {
      dayKey,
      label,
      value,
      isCurrent: dayKey === today,
    };
  });
}

/**
 * Aggregates focus minutes across the 24 hours of the day (0-23) in timezone `tz`.
 */
export function minutesByHour(
  sessions: SessionAggregateInput[],
  tz: string,
): HourMinutes[] {
  const secondsByHour = new Array<number>(24).fill(0);

  for (const session of sessions) {
    if (!session.started_at || typeof session.focused_seconds !== 'number') {
      continue;
    }
    const hour = getLocalHour(session.started_at, tz);
    if (hour >= 0 && hour < 24) {
      secondsByHour[hour] = (secondsByHour[hour] ?? 0) + Math.max(0, session.focused_seconds);
    }
  }

  return secondsByHour.map((secs, h) => ({
    hour: h,
    label: `${String(h).padStart(2, '0')}`,
    value: Math.round(secs / 60),
  }));
}

/**
 * Counts distractions grouped by category, sorted descending by count.
 */
export function distractionsByCategory(
  distractions: DistractionAggregateInput[],
): CategoryDistraction[] {
  const counts = new Map<string, number>();

  for (const d of distractions) {
    const cat = d.category?.trim();
    if (!cat) continue;
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => {
      if (b.value !== a.value) {
        return b.value - a.value;
      }
      return a.label.localeCompare(b.label);
    });
}
