export type FocusPhase = 'idle' | 'focusing' | 'paused' | 'break' | 'finished';
export type FocusMode = 'timed' | 'open';
export type BreakKind = 'short' | 'long' | null;

export interface Distraction {
  id: string;
  category: string;
  note: string;
  at: number;
}

export interface FocusState {
  phase: FocusPhase;
  mode: FocusMode;
  sessionId: string;
  todoId: string | null;
  startedAt: number | null;
  pausedAt: number | null;
  pausedTotalMs: number;
  plannedMs: number | null;
  completedCycles: number;
  breakKind: BreakKind;
  breakStartedAt: number | null;
  breakPlannedMs: number | null;
  breakDone?: boolean;
  distractions: Distraction[];
}

export const INITIAL_FOCUS_STATE: FocusState = {
  phase: 'idle',
  mode: 'timed',
  sessionId: '',
  todoId: null,
  startedAt: null,
  pausedAt: null,
  pausedTotalMs: 0,
  plannedMs: null,
  completedCycles: 0,
  breakKind: null,
  breakStartedAt: null,
  breakPlannedMs: null,
  breakDone: false,
  distractions: [],
};

export type FocusEvent =
  | {
      type: 'START';
      mode: FocusMode;
      plannedMs: number | null;
      todoId?: string | null;
      now: number;
      sessionId: string;
    }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | {
      type: 'LOG_DISTRACTION';
      id: string;
      category: string;
      note?: string;
      now: number;
    }
  | {
      type: 'TICK';
      now: number;
      autoStartBreaks?: boolean;
      shortBreakMs?: number;
      longBreakMs?: number;
      cyclesBeforeLongBreak?: number;
    }
  | { type: 'END_FOCUS'; now: number }
  | {
      type: 'START_BREAK';
      now: number;
      shortBreakMs?: number;
      longBreakMs?: number;
      cyclesBeforeLongBreak?: number;
    }
  | { type: 'SKIP_BREAK' }
  | { type: 'BREAK_TICK'; now: number }
  | { type: 'RESET' };

export function focusReducer(state: FocusState, event: FocusEvent): FocusState {
  switch (event.type) {
    case 'START': {
      return {
        ...INITIAL_FOCUS_STATE,
        phase: 'focusing',
        mode: event.mode,
        sessionId: event.sessionId,
        todoId: event.todoId ?? null,
        startedAt: event.now,
        pausedAt: null,
        pausedTotalMs: 0,
        plannedMs: event.mode === 'timed' ? event.plannedMs : null,
        completedCycles: 0,
        breakKind: null,
        breakStartedAt: null,
        breakPlannedMs: null,
        breakDone: false,
        distractions: [],
      };
    }

    case 'PAUSE': {
      if (state.phase !== 'focusing') {
        return state;
      }
      return {
        ...state,
        phase: 'paused',
        pausedAt: event.now,
      };
    }

    case 'RESUME': {
      if (state.phase !== 'paused') {
        return state;
      }
      const pauseDuration = state.pausedAt !== null ? Math.max(0, event.now - state.pausedAt) : 0;
      return {
        ...state,
        phase: 'focusing',
        pausedTotalMs: state.pausedTotalMs + pauseDuration,
        pausedAt: null,
      };
    }

    case 'LOG_DISTRACTION': {
      const newDistraction: Distraction = {
        id: event.id,
        category: event.category,
        note: event.note ?? '',
        at: event.now,
      };
      return {
        ...state,
        distractions: [...state.distractions, newDistraction],
      };
    }

    case 'TICK': {
      if (state.phase !== 'focusing') {
        return state;
      }
      // Open mode never auto-ends
      if (state.mode === 'open' || state.plannedMs === null) {
        return state;
      }

      const elapsed = focusedMs(state, event.now);
      if (elapsed < state.plannedMs) {
        return state;
      }

      // Reached planned time
      const newCycles = state.completedCycles + 1;
      const cyclesThreshold = event.cyclesBeforeLongBreak ?? 4;
      const isLong = newCycles % cyclesThreshold === 0;
      const breakKind: BreakKind = isLong ? 'long' : 'short';
      const breakDuration = isLong
        ? (event.longBreakMs ?? 15 * 60 * 1000)
        : (event.shortBreakMs ?? 5 * 60 * 1000);

      // Freeze focused time exactly at planned completion time
      const frozenPausedAt =
        state.startedAt !== null ? state.startedAt + state.pausedTotalMs + state.plannedMs : event.now;

      if (event.autoStartBreaks) {
        return {
          ...state,
          phase: 'break',
          completedCycles: newCycles,
          pausedAt: frozenPausedAt,
          breakKind,
          breakStartedAt: event.now,
          breakPlannedMs: breakDuration,
          breakDone: false,
        };
      }

      return {
        ...state,
        phase: 'finished',
        completedCycles: newCycles,
        pausedAt: frozenPausedAt,
        breakKind,
        breakStartedAt: null,
        breakPlannedMs: breakDuration,
        breakDone: false,
      };
    }

    case 'END_FOCUS': {
      if (state.phase !== 'focusing' && state.phase !== 'paused') {
        return state;
      }
      return {
        ...state,
        phase: 'finished',
        pausedAt: state.pausedAt ?? event.now,
      };
    }

    case 'START_BREAK': {
      if (state.phase !== 'finished') {
        return state;
      }
      const cyclesThreshold = event.cyclesBeforeLongBreak ?? 4;
      const isLong =
        state.breakKind === 'long' ||
        (state.completedCycles > 0 && state.completedCycles % cyclesThreshold === 0);
      const breakKind: BreakKind = state.breakKind ?? (isLong ? 'long' : 'short');
      const breakDuration =
        state.breakPlannedMs ??
        (isLong ? (event.longBreakMs ?? 15 * 60 * 1000) : (event.shortBreakMs ?? 5 * 60 * 1000));

      return {
        ...state,
        phase: 'break',
        breakKind,
        breakStartedAt: event.now,
        breakPlannedMs: breakDuration,
        breakDone: false,
      };
    }

    case 'SKIP_BREAK': {
      if (state.phase !== 'break') {
        return state;
      }
      return {
        ...state,
        phase: 'finished',
        breakDone: false,
      };
    }

    case 'BREAK_TICK': {
      if (state.phase !== 'break' || state.breakStartedAt === null || state.breakPlannedMs === null) {
        return state;
      }
      const elapsedBreak = event.now - state.breakStartedAt;
      if (elapsedBreak >= state.breakPlannedMs) {
        return {
          ...state,
          phase: 'finished',
          breakDone: true,
        };
      }
      return state;
    }

    case 'RESET': {
      return { ...INITIAL_FOCUS_STATE };
    }

    default:
      return state;
  }
}

export function focusedMs(state: FocusState, now: number): number {
  if (state.startedAt === null) {
    return 0;
  }
  const current = state.pausedAt ?? now;
  const elapsed = Math.max(0, current - state.startedAt - state.pausedTotalMs);
  if (
    state.mode === 'timed' &&
    state.plannedMs !== null &&
    (state.phase === 'break' || state.phase === 'finished')
  ) {
    return Math.min(state.plannedMs, elapsed);
  }
  return elapsed;
}

export function remainingMs(state: FocusState, now: number): number {
  if (state.mode === 'open' || state.plannedMs === null) {
    return 0;
  }
  const elapsed = focusedMs(state, now);
  return Math.max(0, state.plannedMs - elapsed);
}

export function breakRemainingMs(state: FocusState, now: number): number {
  if (state.phase !== 'break' || state.breakStartedAt === null || state.breakPlannedMs === null) {
    return 0;
  }
  const elapsed = Math.max(0, now - state.breakStartedAt);
  return Math.max(0, state.breakPlannedMs - elapsed);
}
