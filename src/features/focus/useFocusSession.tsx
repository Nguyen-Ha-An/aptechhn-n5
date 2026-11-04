import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { QueryClient, QueryClientContext, QueryClientProvider } from '@tanstack/react-query';
import {
  focusReducer,
  INITIAL_FOCUS_STATE,
  focusedMs,
  remainingMs,
  breakRemainingMs,
  type FocusState,
  type FocusMode,
  type FocusPhase,
} from './focusMachine';
import { useProfile } from '@/features/profile/queries';

const STORAGE_KEY = 'focus:active';
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const fallbackQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

interface PersistedData {
  state: FocusState;
  savedAt: number;
}

function loadPersistedState(): FocusState {
  if (typeof window === 'undefined') {
    return INITIAL_FOCUS_STATE;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return INITIAL_FOCUS_STATE;
    }
    const data = JSON.parse(raw) as PersistedData;
    const now = Date.now();
    if (!data || !data.state || !data.savedAt) {
      localStorage.removeItem(STORAGE_KEY);
      return INITIAL_FOCUS_STATE;
    }
    // Discard if older than 12h
    if (now - data.savedAt > TWELVE_HOURS_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return INITIAL_FOCUS_STATE;
    }
    if (data.state.startedAt && now - data.state.startedAt > TWELVE_HOURS_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return INITIAL_FOCUS_STATE;
    }
    // Discard if idle
    if (data.state.phase === 'idle') {
      localStorage.removeItem(STORAGE_KEY);
      return INITIAL_FOCUS_STATE;
    }
    return data.state;
  } catch (err) {
    console.warn('Failed to restore focus session state:', err);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return INITIAL_FOCUS_STATE;
  }
}

export function formatTimer(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export interface FocusContextValue {
  state: FocusState;
  now: number;
  zenMode: boolean;
  setZenMode: (zen: boolean | ((prev: boolean) => boolean)) => void;
  startSession: (options: {
    mode: FocusMode;
    plannedMinutes?: number;
    todoId?: string | null;
  }) => void;
  pause: () => void;
  resume: () => void;
  logDistraction: (category: string, note?: string) => void;
  endFocus: () => void;
  startBreak: () => void;
  skipBreak: () => void;
  reset: () => void;
  currentFocusedMs: number;
  currentRemainingMs: number;
  currentBreakRemainingMs: number;
  formattedTime: string;
  progressRatio: number;
}

const FocusContext = createContext<FocusContextValue | null>(null);

function FocusProviderInner({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(focusReducer, undefined, loadPersistedState);
  const [now, setNow] = useState<number>(() => Date.now());
  const [zenMode, setZenMode] = useState<boolean>(false);
  const { data: profile } = useProfile();

  const prevPhaseRef = useRef<FocusPhase>(state.phase);

  // Profile preferences
  const shortBreakMs = (profile?.short_break_minutes ?? 5) * 60 * 1000;
  const longBreakMs = (profile?.long_break_minutes ?? 15) * 60 * 1000;
  const cyclesBeforeLongBreak = profile?.cycles_before_long_break ?? 4;
  const autoStartBreaks = profile?.auto_start_breaks ?? false;
  const notificationsAllowed = profile?.notifications ?? true;

  // Persist state to localStorage on every change
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (state.phase === 'idle') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      const data: PersistedData = {
        state,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [state]);

  // Tick calculation and interval
  const performTick = useCallback(() => {
    const timestamp = Date.now();
    setNow(timestamp);

    if (state.phase === 'focusing') {
      dispatch({
        type: 'TICK',
        now: timestamp,
        autoStartBreaks,
        shortBreakMs,
        longBreakMs,
        cyclesBeforeLongBreak,
      });
    } else if (state.phase === 'break') {
      dispatch({
        type: 'BREAK_TICK',
        now: timestamp,
      });
    }
  }, [state.phase, autoStartBreaks, shortBreakMs, longBreakMs, cyclesBeforeLongBreak]);

  // 1-second interval while active (focusing or break)
  useEffect(() => {
    if (state.phase !== 'focusing' && state.phase !== 'break') {
      return;
    }
    const timer = setInterval(() => {
      performTick();
    }, 1000);

    return () => clearInterval(timer);
  }, [state.phase, performTick]);

  // Immediate tick on visibility change
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performTick();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [performTick]);

  // Web Notifications on phase transitions
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = state.phase;

    if (!notificationsAllowed || typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      if (prevPhase === 'focusing' && (state.phase === 'break' || state.phase === 'finished')) {
        try {
          new Notification('Focus block done', {
            body: state.phase === 'break' ? 'Break started!' : 'Great session! Save or take a break.',
          });
        } catch (e) {
          console.warn('Could not fire notification:', e);
        }
      } else if (prevPhase === 'break' && state.phase === 'finished') {
        try {
          new Notification('Break is over', {
            body: 'Ready for the next focus block?',
          });
        } catch (e) {
          console.warn('Could not fire notification:', e);
        }
      }
    }
  }, [state.phase, notificationsAllowed]);

  // Update document.title
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    if (state.phase === 'focusing' || state.phase === 'paused') {
      const displayMs =
        state.mode === 'timed' ? remainingMs(state, now) : focusedMs(state, now);
      const timeStr = formatTimer(displayMs);
      document.title = `${timeStr} Focus | FocusLearn`;
    } else if (state.phase === 'break') {
      const displayMs = breakRemainingMs(state, now);
      const timeStr = formatTimer(displayMs);
      document.title = `${timeStr} Break | FocusLearn`;
    } else {
      document.title = 'FocusLearn';
    }
  }, [state, now]);

  // Selectors
  const effectiveNow = now > 0 ? now : (state.startedAt ?? 0);
  const currentFocusedMs = focusedMs(state, effectiveNow);
  const currentRemainingMs = remainingMs(state, effectiveNow);
  const currentBreakRemainingMs = breakRemainingMs(state, effectiveNow);

  let formattedTime = '00:00';
  let progressRatio = 0;

  if (state.phase === 'break') {
    formattedTime = formatTimer(currentBreakRemainingMs);
    if (state.breakPlannedMs && state.breakPlannedMs > 0) {
      progressRatio = Math.min(1, Math.max(0, 1 - currentBreakRemainingMs / state.breakPlannedMs));
    }
  } else if (state.mode === 'timed' && state.plannedMs && state.plannedMs > 0) {
    formattedTime = formatTimer(currentRemainingMs);
    progressRatio = Math.min(1, Math.max(0, currentFocusedMs / state.plannedMs));
  } else {
    // Open mode or idle
    formattedTime = formatTimer(currentFocusedMs);
    progressRatio = 0;
  }

  const startSession = useCallback(
    ({
      mode,
      plannedMinutes,
      todoId,
    }: {
      mode: FocusMode;
      plannedMinutes?: number;
      todoId?: string | null;
    }) => {
      const timestamp = Date.now();
      const plannedMs =
        mode === 'timed' && plannedMinutes ? plannedMinutes * 60 * 1000 : null;
      const sessionId = crypto.randomUUID();

      // Ask for notification permission if not yet decided
      if (
        notificationsAllowed &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'default'
      ) {
        Notification.requestPermission().catch(() => {});
      }

      dispatch({
        type: 'START',
        mode,
        plannedMs,
        todoId: todoId || null,
        now: timestamp,
        sessionId,
      });
      setNow(timestamp);
    },
    [notificationsAllowed]
  );

  const pause = useCallback(() => {
    const timestamp = Date.now();
    dispatch({ type: 'PAUSE', now: timestamp });
    setNow(timestamp);
  }, []);

  const resume = useCallback(() => {
    const timestamp = Date.now();
    dispatch({ type: 'RESUME', now: timestamp });
    setNow(timestamp);
  }, []);

  const logDistraction = useCallback((category: string, note?: string) => {
    const timestamp = Date.now();
    const id = crypto.randomUUID();
    dispatch({
      type: 'LOG_DISTRACTION',
      id,
      category,
      note,
      now: timestamp,
    });
  }, []);

  const endFocus = useCallback(() => {
    const timestamp = Date.now();
    dispatch({ type: 'END_FOCUS', now: timestamp });
    setNow(timestamp);
  }, []);

  const startBreak = useCallback(() => {
    const timestamp = Date.now();
    dispatch({
      type: 'START_BREAK',
      now: timestamp,
      shortBreakMs,
      longBreakMs,
      cyclesBeforeLongBreak,
    });
    setNow(timestamp);
  }, [shortBreakMs, longBreakMs, cyclesBeforeLongBreak]);

  const skipBreak = useCallback(() => {
    dispatch({ type: 'SKIP_BREAK' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    setNow(Date.now());
  }, []);

  const value: FocusContextValue = {
    state,
    now,
    zenMode,
    setZenMode,
    startSession,
    pause,
    resume,
    logDistraction,
    endFocus,
    startBreak,
    skipBreak,
    reset,
    currentFocusedMs,
    currentRemainingMs,
    currentBreakRemainingMs,
    formattedTime,
    progressRatio,
  };

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function FocusProvider({ children }: { children: ReactNode }) {
  const client = useContext(QueryClientContext);
  if (!client) {
    return (
      <QueryClientProvider client={fallbackQueryClient}>
        <FocusProviderInner>{children}</FocusProviderInner>
      </QueryClientProvider>
    );
  }
  return <FocusProviderInner>{children}</FocusProviderInner>;
}

export function useFocus(): FocusContextValue {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
}
