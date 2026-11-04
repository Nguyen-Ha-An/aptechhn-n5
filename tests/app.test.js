import { test, expect } from 'bun:test';
import { sampleData, readData, remainingSeconds } from '../src/app.js';

test('sample tasks and notes survive a JSON round trip', () => {
  const data = sampleData();
  expect(readData(JSON.parse(JSON.stringify(data)))).toEqual(data);
});

test('older browser data keeps tasks and notes during simplification', () => {
  const data = sampleData();
  const old = { ...data, theme: undefined, settings: { theme: 'dark' }, sessions: [{}], messages: [] };
  const restored = readData(old);
  expect(restored.tasks).toEqual(data.tasks);
  expect(restored.notes).toEqual(data.notes);
  expect(restored.theme).toBe('dark');
});

test('bad storage is rejected instead of crashing the page', () => {
  const data = sampleData();
  expect(() => readData(null)).toThrow();
  expect(() => readData({ ...data, notes: [{ id: 'a' }] })).toThrow();
  expect(() => readData({ ...data, tasks: [data.tasks[0], data.tasks[0]] })).toThrow();
  expect(() => readData({ ...data, timer: { duration: -1 } })).toThrow();
});

test('countdown excludes pauses, handles background time and stops at zero', () => {
  const timer = { duration: 60, elapsed: 10, runningSince: 1000 };
  expect(remainingSeconds(timer, 21_000)).toBe(30);
  expect(remainingSeconds(timer, 100_000)).toBe(0);
  expect(remainingSeconds({ ...timer, runningSince: null }, 100_000)).toBe(50);
  expect(remainingSeconds({ ...timer, elapsed: 0 }, 0)).toBe(60);
});
