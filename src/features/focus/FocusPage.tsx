import { useState, useEffect, useRef, useId } from 'react';
import { toast } from 'sonner';
import {
  Play,
  Pause,
  ArrowCounterClockwise,
  Stop,
  ArrowsOutSimple,
  ArrowsInSimple,
  Coffee,
  CheckCircle,
} from '@phosphor-icons/react';
import { PageHeader } from '@/components/PageHeader';
import {
  Button,
  Field,
  ConfirmDialog,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui';
import { useProfile } from '@/features/profile/queries';
import { useFocus, formatTimer } from './useFocusSession';
import { useOpenTodos, useSaveSession } from './queries';
import type { FocusMode } from './focusMachine';

const DISTRACTION_CATEGORIES = [
  { id: 'phone', label: 'Phone' },
  { id: 'social', label: 'Social media' },
  { id: 'noise', label: 'Noise' },
  { id: 'people', label: 'People' },
  { id: 'hunger', label: 'Hungry' },
  { id: 'tired', label: 'Tired' },
  { id: 'thoughts', label: 'Wandering thoughts' },
  { id: 'other', label: 'Other' },
] as const;

function isTyping(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  const tagName = target.tagName;
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    target.isContentEditable
  );
}

export interface FocusPageProps {
  initialTodoId?: string;
}

export function FocusPage({ initialTodoId }: FocusPageProps) {
  const { data: profile } = useProfile();
  const { data: openTodos = [], isLoading: todosLoading } = useOpenTodos();
  const saveSessionMutation = useSaveSession();

  const {
    state,
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
    formattedTime,
    progressRatio,
    currentFocusedMs,
  } = useFocus();

  // Idle state form fields
  const [mode, setMode] = useState<FocusMode>('timed');
  const [customMinutes, setCustomMinutes] = useState<string | null>(null);
  const minutesInput = customMinutes ?? String(profile?.focus_minutes ?? 25);
  const setMinutesInput = (val: string) => setCustomMinutes(val);

  const [minutesError, setMinutesError] = useState<string | null>(null);
  const [customTodoId, setCustomTodoId] = useState<string | null>(null);
  const selectedTodoId = customTodoId ?? (initialTodoId ?? '');
  const setSelectedTodoId = (val: string) => setCustomTodoId(val);

  // Distraction popover state
  const [distractionOpen, setDistractionOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('phone');
  const [distractionNote, setDistractionNote] = useState('');

  // Finished state form fields
  const [rating, setRating] = useState<number | null>(null);
  const [reflection, setReflection] = useState('');

  // Dialog triggers
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  // Screen reader polite announcements
  const [srAnnouncement, setSrAnnouncement] = useState<string>('');
  const prevPhaseRef = useRef(state.phase);

  const minutesFieldId = useId();
  const todoFieldId = useId();

  // Exiting the route exits Zen mode
  useEffect(() => {
    return () => {
      setZenMode(false);
    };
  }, [setZenMode]);

  // Polite screen-reader announcements on phase changes only
  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (prev !== state.phase) {
      prevPhaseRef.current = state.phase;
      if (state.phase === 'focusing') {
        setSrAnnouncement(prev === 'paused' ? 'Focus session resumed' : 'Focus session started');
      } else if (state.phase === 'paused') {
        setSrAnnouncement('Focus session paused');
      } else if (state.phase === 'break') {
        setSrAnnouncement(
          `${state.breakKind === 'long' ? 'Long' : 'Short'} break started. Duration: ${formatTimer(state.breakPlannedMs ?? 0)}`
        );
      } else if (state.phase === 'finished') {
        setSrAnnouncement(
          state.breakDone
            ? 'Break finished. Session complete.'
            : 'Focus session ended. Session complete.'
        );
      } else if (state.phase === 'idle') {
        setSrAnnouncement('Focus session reset to idle.');
      }
    }
  }, [state.phase, state.breakKind, state.breakPlannedMs, state.breakDone]);

  // Global Keyboard Shortcuts (Space, D, Z, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignored while typing in inputs, textareas, selects
      if (isTyping(e)) {
        return;
      }

      // Esc exits Zen mode
      if (e.key === 'Escape') {
        if (zenMode) {
          setZenMode(false);
          e.preventDefault();
        }
        return;
      }

      // Z toggles Zen mode
      if (e.key === 'z' || e.key === 'Z') {
        setZenMode((prev) => !prev);
        e.preventDefault();
        return;
      }

      // Space pauses/resumes active session
      if (e.code === 'Space') {
        if (state.phase === 'focusing') {
          pause();
          e.preventDefault();
        } else if (state.phase === 'paused') {
          resume();
          e.preventDefault();
        }
        return;
      }

      // D opens distraction popover while focusing or paused
      if (e.key === 'd' || e.key === 'D') {
        if (state.phase === 'focusing' || state.phase === 'paused') {
          setDistractionOpen(true);
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.phase, pause, resume, zenMode, setZenMode]);

  // Handle minutes validation on blur
  const handleMinutesBlur = () => {
    const val = parseInt(minutesInput.trim(), 10);
    if (isNaN(val) || val < 5 || val > 180) {
      setMinutesError('Focus minutes must be between 5 and 180.');
    } else {
      setMinutesError(null);
    }
  };

  const handleStartSession = () => {
    let parsedMinutes = 25;
    if (mode === 'timed') {
      const val = parseInt(minutesInput.trim(), 10);
      if (isNaN(val) || val < 5 || val > 180) {
        setMinutesError('Focus minutes must be between 5 and 180.');
        return;
      }
      parsedMinutes = val;
    }

    startSession({
      mode,
      plannedMinutes: mode === 'timed' ? parsedMinutes : undefined,
      todoId: selectedTodoId || null,
    });
  };

  const handleSaveDistraction = () => {
    logDistraction(selectedCategory, distractionNote.trim());
    setDistractionNote('');
    setDistractionOpen(false);
    toast.success('Distraction logged');
  };

  const handleSaveSession = async () => {
    try {
      await saveSessionMutation.mutateAsync({
        state,
        rating,
        reflection: reflection.trim() || null,
      });
      reset();
      toast.success('Session saved');
    } catch (err) {
      console.error('Failed to save session:', err);
      toast.error('Failed to save session. Please try again.');
    }
  };

  // Find active todo title if chosen
  const activeTodo = openTodos.find((t) => t.id === state.todoId);

  // SVG Progress Ring calculations
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Polite Screen Reader Announcement Region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {srAnnouncement}
      </div>

      {/* Page Header (hidden in Zen mode) */}
      {!zenMode && (
        <div className="w-full mb-8">
          <PageHeader
            title="Focus"
            actions={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZenMode((prev) => !prev)}
                className="gap-1.5 text-xs text-muted"
                title="Zen mode (Z)"
                aria-label={zenMode ? 'Exit Zen mode' : 'Enter Zen mode'}
              >
                {zenMode ? <ArrowsInSimple size={16} /> : <ArrowsOutSimple size={16} />}
                <span>Zen (Z)</span>
              </Button>
            }
          />
        </div>
      )}

      {/* Floating Zen exit control when in Zen mode */}
      {zenMode && (
        <div className="fixed top-4 right-4 z-40">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setZenMode(false)}
            className="gap-1.5 text-xs shadow-xs"
            aria-label="Exit Zen mode (Esc)"
          >
            <ArrowsInSimple size={16} />
            <span>Exit Zen (Esc)</span>
          </Button>
        </div>
      )}

      {/* Phase 1: IDLE STATE */}
      {state.phase === 'idle' && (
        <div className="w-full max-w-md mx-auto space-y-6 pt-4">
          {/* Mode Selector */}
          <div>
            <span
              id="focus-mode-label"
              className="block text-xs font-medium text-muted uppercase tracking-wider mb-2"
            >
              Focus mode
            </span>
            <div
              role="radiogroup"
              aria-labelledby="focus-mode-label"
              className="flex rounded-[6px] border border-rule bg-surface p-1 gap-1"
            >
              <button
                type="button"
                role="radio"
                aria-checked={mode === 'timed'}
                onClick={() => setMode('timed')}
                className={`flex-1 rounded-[6px] py-1.5 text-sm font-medium transition-colors duration-120 cursor-pointer ${
                  mode === 'timed'
                    ? 'bg-paper text-ink font-semibold shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Timed
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === 'open'}
                onClick={() => setMode('open')}
                className={`flex-1 rounded-[6px] py-1.5 text-sm font-medium transition-colors duration-120 cursor-pointer ${
                  mode === 'open'
                    ? 'bg-paper text-ink font-semibold shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Open
              </button>
            </div>
          </div>

          {/* Minutes Input (Timed only) */}
          {mode === 'timed' && (
            <div>
              <Field
                id={minutesFieldId}
                label="Minutes"
                type="number"
                min={5}
                max={180}
                value={minutesInput}
                onChange={(e) => {
                  setMinutesInput(e.target.value);
                  if (minutesError) setMinutesError(null);
                }}
                onBlur={handleMinutesBlur}
                error={minutesError}
                hint="Set between 5 and 180 minutes."
                containerClassName="w-full"
              />
            </div>
          )}

          {/* Working on Todo Selector */}
          <div>
            <label
              htmlFor={todoFieldId}
              className="block text-sm font-medium text-ink mb-1.5"
            >
              Working on
            </label>
            <select
              id={todoFieldId}
              value={selectedTodoId}
              onChange={(e) => setSelectedTodoId(e.target.value)}
              disabled={todosLoading}
              className="w-full rounded-[6px] border border-rule bg-surface px-3 py-2 text-sm text-ink transition-colors duration-120 focus-visible:outline-2 focus-visible:outline-accent cursor-pointer disabled:cursor-not-allowed"
            >
              <option value="">None (free focus)</option>
              {openTodos.map((todo) => (
                <option key={todo.id} value={todo.id}>
                  {todo.title}
                </option>
              ))}
            </select>
            {todosLoading && (
              <p className="mt-1 text-xs text-muted">Loading open todos...</p>
            )}
          </div>

          {/* Start Button */}
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleStartSession}
              disabled={Boolean(minutesError)}
              className="w-full justify-center gap-2"
            >
              <Play size={18} weight="fill" aria-hidden="true" />
              <span>Start focus session</span>
            </Button>
          </div>
        </div>
      )}

      {/* Phase 2: RUNNING STATE (focusing or paused) */}
      {(state.phase === 'focusing' || state.phase === 'paused') && (
        <div className="w-full flex flex-col items-center justify-center py-6 md:py-12">
          {/* Main Timer Display */}
          <div className="relative flex flex-col items-center justify-center">
            {state.mode === 'timed' ? (
              <div className="relative flex items-center justify-center">
                <svg
                  className="w-[280px] h-[280px] md:w-[320px] md:h-[320px] -rotate-90 transform"
                  viewBox="0 0 280 280"
                  aria-hidden="true"
                >
                  {/* Background track */}
                  <circle
                    cx="140"
                    cy="140"
                    r={radius}
                    stroke="var(--color-rule)"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  {/* Progress stroke */}
                  <circle
                    cx="140"
                    cy="140"
                    r={radius}
                    stroke="var(--color-accent)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300 ease-linear"
                  />
                </svg>

                {/* Inner Digits */}
                <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                  <span className="font-sans text-5xl md:text-6xl font-semibold tabular-nums text-ink tracking-tight">
                    {formattedTime}
                  </span>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        state.phase === 'focusing'
                          ? 'bg-accent animate-pulse'
                          : 'bg-muted'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-medium text-muted capitalize">
                      {state.phase === 'focusing' ? 'Focusing' : 'Paused'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Open Mode Timer (no SVG ring) */
              <div className="flex flex-col items-center justify-center py-12 select-none">
                <span className="font-sans text-6xl md:text-7xl font-semibold tabular-nums text-ink tracking-tight">
                  {formattedTime}
                </span>
                <div className="mt-4 flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      state.phase === 'focusing'
                        ? 'bg-accent animate-pulse'
                        : 'bg-muted'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium text-muted">
                    {state.phase === 'focusing' ? 'Focusing (Open mode)' : 'Paused'}
                  </span>
                </div>
              </div>
            )}

            {/* Todo Title under timer */}
            {activeTodo && (
              <p className="mt-4 text-center text-sm text-muted">
                Working on:{' '}
                <span className="font-medium text-ink">{activeTodo.title}</span>
              </p>
            )}

            {/* Distraction counter if any logged */}
            {state.distractions.length > 0 && (
              <p className="mt-2 text-xs text-muted">
                {state.distractions.length} distraction
                {state.distractions.length === 1 ? '' : 's'} logged
              </p>
            )}
          </div>

          {/* Controls Bar */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {/* Pause / Resume Button */}
            {state.phase === 'focusing' ? (
              <Button
                variant="secondary"
                size="md"
                onClick={pause}
                className="gap-2"
                aria-label="Pause session (Space)"
              >
                <Pause size={18} weight="fill" aria-hidden="true" />
                <span>Pause (Space)</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={resume}
                className="gap-2"
                aria-label="Resume session (Space)"
              >
                <Play size={18} weight="fill" aria-hidden="true" />
                <span>Resume (Space)</span>
              </Button>
            )}

            {/* Log Distraction Popover */}
            <Popover open={distractionOpen} onOpenChange={setDistractionOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  size="md"
                  className="gap-2"
                  aria-label="Log distraction (D)"
                >
                  <ArrowCounterClockwise size={18} aria-hidden="true" />
                  <span>Log distraction (D)</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-ink mb-1">Log distraction</h4>
                  <p className="text-xs text-muted">
                    Note what pulled your attention away.
                  </p>
                </div>

                {/* Category buttons */}
                <div>
                  <span className="block text-xs font-medium text-muted mb-2">
                    Category
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DISTRACTION_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`rounded-[6px] px-2.5 py-1.5 text-xs text-left transition-colors duration-120 border cursor-pointer ${
                          selectedCategory === cat.id
                            ? 'border-accent bg-paper text-ink font-semibold shadow-xs'
                            : 'border-rule bg-surface text-muted hover:text-ink'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional note */}
                <Field
                  label="Note (optional)"
                  type="text"
                  placeholder="Details..."
                  value={distractionNote}
                  onChange={(e) => setDistractionNote(e.target.value)}
                  containerClassName="w-full"
                />

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDistractionOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveDistraction}
                  >
                    Log
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* End Session Button */}
            <Button
              variant="ghost"
              size="md"
              onClick={() => setEndDialogOpen(true)}
              className="gap-2 text-danger hover:text-danger"
              aria-label="End session"
            >
              <Stop size={18} aria-hidden="true" />
              <span>End session</span>
            </Button>

            {/* Zen Mode Toggle Button */}
            <Button
              variant="ghost"
              size="md"
              onClick={() => setZenMode((prev) => !prev)}
              className="gap-2 text-muted hover:text-ink"
              aria-label={zenMode ? 'Exit Zen mode (Esc)' : 'Zen mode (Z)'}
            >
              {zenMode ? <ArrowsInSimple size={18} /> : <ArrowsOutSimple size={18} />}
              <span>{zenMode ? 'Exit Zen' : 'Zen (Z)'}</span>
            </Button>
          </div>

          {/* Confirm End Session Dialog */}
          <ConfirmDialog
            open={endDialogOpen}
            onOpenChange={setEndDialogOpen}
            title="End session"
            description="Are you sure you want to end this focus session early?"
            confirmText="End session"
            variant="danger"
            onConfirm={() => {
              endFocus();
              setEndDialogOpen(false);
            }}
          />
        </div>
      )}

      {/* Phase 3: BREAK STATE */}
      {state.phase === 'break' && (
        <div className="w-full flex flex-col items-center justify-center py-8 md:py-16 space-y-6">
          <div className="flex items-center gap-2 text-accent">
            <Coffee size={24} weight="bold" aria-hidden="true" />
            <h2 className="font-serif text-2xl font-bold text-ink">
              {state.breakKind === 'long' ? 'Long break' : 'Short break'}
            </h2>
          </div>

          {/* Break SVG Ring */}
          <div className="relative flex items-center justify-center">
            <svg
              className="w-[240px] h-[240px] -rotate-90 transform"
              viewBox="0 0 280 280"
              aria-hidden="true"
            >
              <circle
                cx="140"
                cy="140"
                r={radius}
                stroke="var(--color-rule)"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="140"
                cy="140"
                r={radius}
                stroke="var(--color-accent)"
                strokeWidth="8"
                strokeLinecap="round"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
              <span className="font-sans text-5xl font-semibold tabular-nums text-ink">
                {formattedTime}
              </span>
              <span className="text-xs text-muted mt-1">Remaining</span>
            </div>
          </div>

          <p className="text-sm text-muted text-center max-w-xs">
            Step away, stretch, hydrate, and relax your eyes.
          </p>

          <Button
            variant="secondary"
            size="md"
            onClick={skipBreak}
            aria-label="Skip break"
          >
            Skip break
          </Button>
        </div>
      )}

      {/* Phase 4: FINISHED STATE */}
      {state.phase === 'finished' && (
        <div className="w-full max-w-md mx-auto space-y-6 py-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface border border-rule text-accent mb-2">
              <CheckCircle size={28} weight="fill" aria-hidden="true" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-ink">
              Session complete
            </h2>
            <p className="text-sm text-muted">
              {Math.max(1, Math.round(currentFocusedMs / (60 * 1000)))} minutes focused
              {' · '}
              {state.distractions.length} distraction
              {state.distractions.length === 1 ? '' : 's'}
            </p>
          </div>

          {/* Offer Start Break if break has not been taken yet */}
          {!state.breakDone && state.breakStartedAt === null && (
            <div className="p-4 rounded-[6px] border border-rule bg-surface flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Coffee size={22} className="text-muted shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-ink">Take a break</p>
                  <p className="text-xs text-muted">
                    {state.breakKind === 'long' ? '15 min long' : '5 min short'} break
                    recommended
                  </p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={startBreak}>
                Start break
              </Button>
            </div>
          )}

          {/* Focus Rating (1-5 Radio Group) */}
          <div>
            <span
              id="focus-rating-label"
              className="block text-sm font-medium text-ink mb-2"
            >
              How was your focus?
            </span>
            <div
              role="radiogroup"
              aria-labelledby="focus-rating-label"
              className="flex items-center justify-between gap-2"
            >
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  role="radio"
                  aria-checked={rating === val}
                  onClick={() => setRating(val)}
                  className={`flex-1 h-11 rounded-[6px] border text-sm font-semibold transition-colors duration-120 cursor-pointer ${
                    rating === val
                      ? 'border-accent bg-paper text-accent shadow-xs'
                      : 'border-rule bg-surface text-muted hover:text-ink'
                  }`}
                  aria-label={`Rating ${val} of 5`}
                >
                  {val}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-muted mt-1 px-1">
              <span>Rough</span>
              <span>Great</span>
            </div>
          </div>

          {/* Reflection Field */}
          <div>
            <Field
              as="textarea"
              label="Reflection (optional)"
              placeholder="What went well? Any distractions to note?"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={3}
              containerClassName="w-full"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setDiscardDialogOpen(true)}
              className="text-muted hover:text-ink"
            >
              Discard
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={saveSessionMutation.isPending}
              onClick={handleSaveSession}
              className="flex-1 justify-center"
            >
              Save session
            </Button>
          </div>

          {/* Discard Confirmation Dialog */}
          <ConfirmDialog
            open={discardDialogOpen}
            onOpenChange={setDiscardDialogOpen}
            title="Discard session"
            description="Are you sure you want to discard this session without saving?"
            confirmText="Discard"
            variant="danger"
            onConfirm={() => {
              reset();
              setDiscardDialogOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
