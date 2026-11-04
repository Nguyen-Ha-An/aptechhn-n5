import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  minutesByDay,
  minutesByHour,
  distractionsByCategory,
  getLocalHour,
} from './aggregate';

describe('aggregate functions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Freeze time at 2026-11-04T12:00:00Z
    vi.setSystemTime(new Date('2026-11-04T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('minutesByDay', () => {
    it('fills zero days for empty sessions array', () => {
      const result7 = minutesByDay([], 'Asia/Ho_Chi_Minh', 7);
      expect(result7).toHaveLength(7);
      expect(result7.every((d) => d.value === 0)).toBe(true);
      expect(result7[6]?.isCurrent).toBe(true);
      expect(result7[0]?.isCurrent).toBe(false);

      const result30 = minutesByDay([], 'Asia/Ho_Chi_Minh', 30);
      expect(result30).toHaveLength(30);
      expect(result30.every((d) => d.value === 0)).toBe(true);
      expect(result30[29]?.isCurrent).toBe(true);
    });

    it('aggregates sessions across timezone boundaries correctly', () => {
      // 2026-11-03T23:30:00Z:
      // In UTC: day is 2026-11-03, hour is 23
      // In Asia/Ho_Chi_Minh (+7): day is 2026-11-04 (today), hour is 6
      const sessions = [
        {
          started_at: '2026-11-03T23:30:00Z',
          focused_seconds: 1800, // 30 minutes
        },
      ];

      // Test with Asia/Ho_Chi_Minh
      const hcmResult = minutesByDay(sessions, 'Asia/Ho_Chi_Minh', 7);
      const todayHcm = hcmResult.find((d) => d.dayKey === '2026-11-04');
      const yesterdayHcm = hcmResult.find((d) => d.dayKey === '2026-11-03');
      expect(todayHcm?.value).toBe(30);
      expect(yesterdayHcm?.value).toBe(0);

      // Test with UTC
      const utcResult = minutesByDay(sessions, 'UTC', 7);
      const todayUtc = utcResult.find((d) => d.dayKey === '2026-11-04');
      const yesterdayUtc = utcResult.find((d) => d.dayKey === '2026-11-03');
      expect(todayUtc?.value).toBe(0);
      expect(yesterdayUtc?.value).toBe(30);
    });

    it('rounds seconds to nearest minute and marks today as current', () => {
      const sessions = [
        {
          started_at: '2026-11-04T08:00:00Z',
          focused_seconds: 1530, // 25.5 mins -> 26 mins
        },
        {
          started_at: '2026-11-04T10:00:00Z',
          focused_seconds: 900, // 15 mins -> 41 mins total
        },
      ];

      const res = minutesByDay(sessions, 'UTC', 7);
      const today = res.find((d) => d.isCurrent);
      expect(today?.dayKey).toBe('2026-11-04');
      expect(today?.value).toBe(41);
    });
  });

  describe('minutesByHour', () => {
    it('returns 24 items with zero values for empty sessions', () => {
      const res = minutesByHour([], 'Asia/Ho_Chi_Minh');
      expect(res).toHaveLength(24);
      expect(res.every((h) => h.value === 0)).toBe(true);
      expect(res[0]?.label).toBe('00');
      expect(res[23]?.label).toBe('23');
    });

    it('respects timezone when placing session in local hour', () => {
      // 2026-11-03T23:30:00Z is 23:30 UTC, but 06:30 in Asia/Ho_Chi_Minh
      const sessions = [
        {
          started_at: '2026-11-03T23:30:00Z',
          focused_seconds: 3600, // 60 minutes
        },
      ];

      const hcmHours = minutesByHour(sessions, 'Asia/Ho_Chi_Minh');
      expect(hcmHours[6]?.value).toBe(60);
      expect(hcmHours[23]?.value).toBe(0);

      const utcHours = minutesByHour(sessions, 'UTC');
      expect(utcHours[23]?.value).toBe(60);
      expect(utcHours[6]?.value).toBe(0);
    });

    it('getLocalHour returns expected hour in given timezone', () => {
      expect(getLocalHour('2026-11-03T23:30:00Z', 'UTC')).toBe(23);
      expect(getLocalHour('2026-11-03T23:30:00Z', 'Asia/Ho_Chi_Minh')).toBe(6);
    });
  });

  describe('distractionsByCategory', () => {
    it('returns empty array when input is empty', () => {
      expect(distractionsByCategory([])).toEqual([]);
    });

    it('aggregates and sorts by count descending, then alphabetically', () => {
      const distractions = [
        { category: 'Social media' },
        { category: 'Phone' },
        { category: 'Phone' },
        { category: 'Colleague' },
        { category: 'Phone' },
        { category: 'Social media' },
      ];

      const result = distractionsByCategory(distractions);
      expect(result).toEqual([
        { label: 'Phone', value: 3 },
        { label: 'Social media', value: 2 },
        { label: 'Colleague', value: 1 },
      ]);
    });

    it('ignores empty categories', () => {
      const result = distractionsByCategory([
        { category: '  ' },
        { category: 'Noise' },
      ]);
      expect(result).toEqual([{ label: 'Noise', value: 1 }]);
    });
  });
});
