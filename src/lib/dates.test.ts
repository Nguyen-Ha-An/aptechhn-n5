import { describe, it, expect } from 'vitest';
import {
  localDayKey,
  todayKey,
  addDays,
  startOfWeekKey,
  isOverdue,
  formatLongDate,
  formatTime,
  browserTimeZone,
} from './dates';

describe('dates utility', () => {
  it('converts UTC timestamp to local day key in Asia/Ho_Chi_Minh', () => {
    // 2026-11-01T23:30:00Z is 2026-11-02 06:30:00 in UTC+7 (Asia/Ho_Chi_Minh)
    const key = localDayKey('2026-11-01T23:30:00Z', 'Asia/Ho_Chi_Minh');
    expect(key).toBe('2026-11-02');
  });

  it('calculates startOfWeekKey as Monday', () => {
    // 2026-11-02 is Monday
    expect(startOfWeekKey('2026-11-02')).toBe('2026-11-02');
    // 2026-11-04 is Wednesday
    expect(startOfWeekKey('2026-11-04')).toBe('2026-11-02');
    // 2026-11-08 is Sunday
    expect(startOfWeekKey('2026-11-08')).toBe('2026-11-02');
    // 2026-11-09 is next Monday
    expect(startOfWeekKey('2026-11-09')).toBe('2026-11-09');
  });

  it('adds positive and negative days across month boundaries', () => {
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('evaluates overdue status against timezone today', () => {
    const tz = 'Asia/Ho_Chi_Minh';
    const today = todayKey(tz);
    const yesterday = addDays(today, -1);
    const tomorrow = addDays(today, 1);

    expect(isOverdue(yesterday, tz)).toBe(true);
    expect(isOverdue(today, tz)).toBe(false);
    expect(isOverdue(tomorrow, tz)).toBe(false);
    expect(isOverdue(null, tz)).toBe(false);
    expect(isOverdue(undefined, tz)).toBe(false);
  });

  it('formats long date with weekday and month name', () => {
    const tz = 'Asia/Ho_Chi_Minh';
    // 2026-11-04 is Wednesday
    expect(formatLongDate('2026-11-04', tz)).toBe('Wednesday, 4 November');
    expect(formatLongDate(new Date('2026-11-04T05:00:00Z'), tz)).toBe('Wednesday, 4 November');
  });

  it('formats time in 24h format', () => {
    const tz = 'Asia/Ho_Chi_Minh';
    // 02:41:00 UTC = 09:41:00 in Asia/Ho_Chi_Minh
    expect(formatTime('2026-11-04T02:41:00Z', tz)).toBe('09:41');
  });

  it('returns a valid browser time zone', () => {
    const tz = browserTimeZone();
    expect(typeof tz).toBe('string');
    expect(tz.length).toBeGreaterThan(0);
  });
});
