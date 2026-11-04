import { describe, it, expect } from 'vitest';
import {
  INITIAL_FOCUS_STATE,
  focusReducer,
  focusedMs,
  remainingMs,
  breakRemainingMs,
  type FocusState,
} from './focusMachine';

describe('focusMachine', () => {
  it('starts in idle phase with initial defaults', () => {
    expect(INITIAL_FOCUS_STATE.phase).toBe('idle');
    expect(INITIAL_FOCUS_STATE.mode).toBe('timed');
    expect(INITIAL_FOCUS_STATE.completedCycles).toBe(0);
    expect(INITIAL_FOCUS_STATE.distractions).toEqual([]);
    expect(focusedMs(INITIAL_FOCUS_STATE, 1000)).toBe(0);
    expect(remainingMs(INITIAL_FOCUS_STATE, 1000)).toBe(0);
    expect(breakRemainingMs(INITIAL_FOCUS_STATE, 1000)).toBe(0);
  });

  it('starts a timed focus session properly', () => {
    const t0 = 1000;
    const plannedMs = 25 * 60 * 1000; // 25 min
    const state = focusReducer(INITIAL_FOCUS_STATE, {
      type: 'START',
      mode: 'timed',
      plannedMs,
      todoId: 'todo-123',
      now: t0,
      sessionId: 'session-abc',
    });

    expect(state.phase).toBe('focusing');
    expect(state.mode).toBe('timed');
    expect(state.sessionId).toBe('session-abc');
    expect(state.todoId).toBe('todo-123');
    expect(state.startedAt).toBe(t0);
    expect(state.plannedMs).toBe(plannedMs);
    expect(state.pausedTotalMs).toBe(0);
    expect(focusedMs(state, t0)).toBe(0);
    expect(focusedMs(state, t0 + 10000)).toBe(10000);
    expect(remainingMs(state, t0 + 10000)).toBe(plannedMs - 10000);
  });

  it('pause/resume excludes paused time', () => {
    const t0 = 1000;
    let state = focusReducer(INITIAL_FOCUS_STATE, {
      type: 'START',
      mode: 'timed',
      plannedMs: 1500000,
      now: t0,
      sessionId: 'sess-1',
    });

    // Focus for 10 seconds
    const tPause = t0 + 10000;
    state = focusReducer(state, { type: 'PAUSE', now: tPause });
    expect(state.phase).toBe('paused');
    expect(state.pausedAt).toBe(tPause);

    // While paused, focusedMs does not change with advancing `now`
    expect(focusedMs(state, tPause)).toBe(10000);
    expect(focusedMs(state, tPause + 50000)).toBe(10000);

    // Resume after 20 seconds of pause
    const tResume = tPause + 20000;
    state = focusReducer(state, { type: 'RESUME', now: tResume });
    expect(state.phase).toBe('focusing');
    expect(state.pausedAt).toBe(null);
    expect(state.pausedTotalMs).toBe(20000);

    // 5 seconds after resume
    const tNow = tResume + 5000;
    expect(focusedMs(state, tNow)).toBe(15000); // 10s + 5s = 15s total focus
    expect(remainingMs(state, tNow)).toBe(1500000 - 15000);
  });

  it('a 10-minute jump in TICK ends exactly once', () => {
    const t0 = 100000;
    const plannedMs = 25 * 60 * 1000; // 1500000 ms
    let state = focusReducer(INITIAL_FOCUS_STATE, {
      type: 'START',
      mode: 'timed',
      plannedMs,
      now: t0,
      sessionId: 'sess-2',
    });

    // 10 minutes past the planned end (25m + 10m = 35m jump)
    const tJump = t0 + plannedMs + 10 * 60 * 1000;
    state = focusReducer(state, {
      type: 'TICK',
      now: tJump,
      autoStartBreaks: false,
    });

    expect(state.phase).toBe('finished');
    expect(state.completedCycles).toBe(1);
    expect(focusedMs(state, tJump)).toBe(plannedMs);

    // Subsequent tick should be a no-op since phase is already 'finished'
    const stateAfterNextTick = focusReducer(state, {
      type: 'TICK',
      now: tJump + 1000,
      autoStartBreaks: false,
    });
    expect(stateAfterNextTick.phase).toBe('finished');
    expect(stateAfterNextTick.completedCycles).toBe(1);
  });

  it('open mode never auto-ends', () => {
    const t0 = 100000;
    let state = focusReducer(INITIAL_FOCUS_STATE, {
      type: 'START',
      mode: 'open',
      plannedMs: null,
      now: t0,
      sessionId: 'sess-open',
    });

    expect(state.phase).toBe('focusing');
    expect(state.mode).toBe('open');

    // TICK 2 hours later
    const tLater = t0 + 2 * 60 * 60 * 1000;
    state = focusReducer(state, {
      type: 'TICK',
      now: tLater,
    });

    expect(state.phase).toBe('focusing');
    expect(state.completedCycles).toBe(0);
    expect(focusedMs(state, tLater)).toBe(2 * 60 * 60 * 1000);
    expect(remainingMs(state, tLater)).toBe(0);
  });

  it('long break after N cycles', () => {
    const t0 = 1000;
    const plannedMs = 1500000;

    let state: FocusState = INITIAL_FOCUS_STATE;

    for (let cycle = 1; cycle <= 4; cycle++) {
      state = focusReducer(state, {
        type: 'START',
        mode: 'timed',
        plannedMs,
        now: t0 + cycle * 2000000,
        sessionId: `sess-cycle-${cycle}`,
      });
      // Simulate completing cycle
      state = {
        ...state,
        completedCycles: cycle - 1,
      };

      const tEnd = state.startedAt! + plannedMs;
      state = focusReducer(state, {
        type: 'TICK',
        now: tEnd,
        autoStartBreaks: true,
        shortBreakMs: 300000,
        longBreakMs: 900000,
        cyclesBeforeLongBreak: 4,
      });

      expect(state.phase).toBe('break');
      expect(state.completedCycles).toBe(cycle);

      if (cycle === 4) {
        expect(state.breakKind).toBe('long');
        expect(state.breakPlannedMs).toBe(900000);
      } else {
        expect(state.breakKind).toBe('short');
        expect(state.breakPlannedMs).toBe(300000);
      }
    }
  });

  it('distractions retained across pause and session progression', () => {
    const t0 = 1000;
    let state = focusReducer(INITIAL_FOCUS_STATE, {
      type: 'START',
      mode: 'timed',
      plannedMs: 1500000,
      now: t0,
      sessionId: 'sess-dist',
    });

    // Log distraction 1 while focusing
    state = focusReducer(state, {
      type: 'LOG_DISTRACTION',
      id: 'd-1',
      category: 'phone',
      note: 'Mom called',
      now: t0 + 2000,
    });
    expect(state.distractions).toHaveLength(1);

    // Pause
    state = focusReducer(state, { type: 'PAUSE', now: t0 + 5000 });

    // Log distraction 2 while paused
    state = focusReducer(state, {
      type: 'LOG_DISTRACTION',
      id: 'd-2',
      category: 'noise',
      note: 'Construction sounds',
      now: t0 + 8000,
    });
    expect(state.distractions).toHaveLength(2);

    // Resume
    state = focusReducer(state, { type: 'RESUME', now: t0 + 10000 });
    expect(state.distractions).toHaveLength(2);
    expect(state.distractions[0]).toEqual({
      id: 'd-1',
      category: 'phone',
      note: 'Mom called',
      at: t0 + 2000,
    });
    expect(state.distractions[1]).toEqual({
      id: 'd-2',
      category: 'noise',
      note: 'Construction sounds',
      at: t0 + 8000,
    });

    // End focus
    state = focusReducer(state, { type: 'END_FOCUS', now: t0 + 15000 });
    expect(state.phase).toBe('finished');
    expect(state.distractions).toHaveLength(2);
  });

  it('break timing, BREAK_TICK and SKIP_BREAK', () => {
    const t0 = 100000;
    let state = focusReducer(INITIAL_FOCUS_STATE, {
      type: 'START',
      mode: 'timed',
      plannedMs: 1500000,
      now: t0,
      sessionId: 'sess-break',
    });

    // Complete session with auto-start break
    const tEnd = t0 + 1500000;
    state = focusReducer(state, {
      type: 'TICK',
      now: tEnd,
      autoStartBreaks: true,
      shortBreakMs: 300000,
    });

    expect(state.phase).toBe('break');
    expect(state.breakStartedAt).toBe(tEnd);
    expect(state.breakPlannedMs).toBe(300000);
    expect(breakRemainingMs(state, tEnd + 100000)).toBe(200000);

    // Break tick before completion
    state = focusReducer(state, { type: 'BREAK_TICK', now: tEnd + 100000 });
    expect(state.phase).toBe('break');

    // Break tick at completion
    state = focusReducer(state, { type: 'BREAK_TICK', now: tEnd + 300000 });
    expect(state.phase).toBe('finished');
    expect(state.breakDone).toBe(true);

    // Test skip break from another break state
    state = focusReducer(state, {
      type: 'START_BREAK',
      now: tEnd + 400000,
      shortBreakMs: 300000,
    });
    expect(state.phase).toBe('break');
    state = focusReducer(state, { type: 'SKIP_BREAK' });
    expect(state.phase).toBe('finished');
    expect(state.breakDone).toBe(false);
  });

  it('RESET clears state back to initial', () => {
    let state = focusReducer(INITIAL_FOCUS_STATE, {
      type: 'START',
      mode: 'timed',
      plannedMs: 1500000,
      now: 1000,
      sessionId: 'sess-reset',
    });
    state = focusReducer(state, {
      type: 'LOG_DISTRACTION',
      id: 'd-1',
      category: 'social',
      note: 'Checked Twitter',
      now: 2000,
    });
    state = focusReducer(state, { type: 'END_FOCUS', now: 5000 });
    expect(state.phase).toBe('finished');
    expect(state.distractions).toHaveLength(1);

    state = focusReducer(state, { type: 'RESET' });
    expect(state).toEqual(INITIAL_FOCUS_STATE);
  });
});
