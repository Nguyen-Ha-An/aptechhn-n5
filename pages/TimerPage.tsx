/**
 * Timer Page - Focus Timer with Zen Mode, Distraction Logging & Open-ended Mode
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobal } from '../context/GlobalContext';
import { useT } from '../i18n';
import { Card, Button, Badge, Select, Modal, SegmentedControl } from '../components/ui';
import { SessionConfig, DistractionLog, SessionMode } from '../types';
import { SUBJECTS, FOCUS_TIPS, DISTRACTION_CATEGORIES, BREAK_ACTIVITIES } from '../constants';
import {
  Play,
  Pause,
  Square,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Timer as TimerIcon,
  Clock,
  Infinity,
  MessageCircle,
  Star,
  X,
} from 'lucide-react';

type TimerState = 'idle' | 'running' | 'paused' | 'completed';
type FlowState = 'setup' | 'focus' | 'quiz' | 'break';

export const TimerPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, addSession, setZenMode, isZenMode, showToast, setMiniChatOpen } = useGlobal();
  const t = useT();

  // Timer state
  const [flowState, setFlowState] = useState<FlowState>('setup');
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [config, setConfig] = useState<SessionConfig>({
    subject: SUBJECTS[0],
    focusMinutes: 25,
    breakMinutes: 5,
    mode: 'timed',
  });

  // Session tracking
  const [distractions, setDistractions] = useState<DistractionLog[]>([]);
  const [showDistractionModal, setShowDistractionModal] = useState(false);
  const [breakPlan, setBreakPlan] = useState<string[]>([]);
  const [currentTip, setCurrentTip] = useState(FOCUS_TIPS[0]);

  // End session modal (for open-ended mode)
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [focusRating, setFocusRating] = useState<number>(3);

  // Refs
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          if (flowState === 'focus') {
            timerState === 'running' ? handlePause() : handleResume();
          }
          break;
        case 'r':
          if (flowState === 'focus' && timerState !== 'running') {
            handleReset();
          }
          break;
        case 'z':
          setZenMode(!isZenMode);
          break;
        case 'escape':
          if (isZenMode) setZenMode(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timerState, flowState, isZenMode, setZenMode]);

  // Timer countdown (for timed mode)
  useEffect(() => {
    if (timerState === 'running' && config.mode === 'timed' && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerState, config.mode]);

  // Elapsed time counter (for open-ended mode)
  useEffect(() => {
    if (timerState === 'running' && config.mode === 'open') {
      timerRef.current = window.setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerState, config.mode]);

  const handleStart = () => {
    startTimeRef.current = Date.now();
    setTimerState('running');
    setFlowState('focus');
    setCurrentTip(FOCUS_TIPS[Math.floor(Math.random() * FOCUS_TIPS.length)]);
    setDistractions([]);
    setBreakPlan([]);
    setElapsedTime(0);

    if (config.mode === 'timed') {
      setTimeLeft(config.focusMinutes * 60);
    }
  };

  const handlePause = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerState('paused');
  };

  const handleResume = () => {
    setTimerState('running');
  };

  const handleReset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(config.focusMinutes * 60);
    setElapsedTime(0);
    setTimerState('idle');
    setFlowState('setup');
    setDistractions([]);
  };

  const handleEndOpenSession = () => {
    setShowEndSessionModal(true);
    handlePause();
  };

  const handleConfirmEndSession = (skipQuiz: boolean) => {
    setShowEndSessionModal(false);

    const actualSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

    // Record the session
    const session = addSession({
      startTime: new Date(startTimeRef.current).toISOString(),
      endTime: new Date().toISOString(),
      type: 'focus',
      durationSeconds: actualSeconds,
      projectId: state.projects.find((p) => p.name === config.subject)?.id || null,
      linkedTaskId: config.linkedTaskId || null,
      linkedNoteId: null,
      subject: config.subject,
      distractions: distractions,
      quizScore: null,
      phaseCount: 1,
      breakPlan: breakPlan.map((b) => ({ activity: b, completed: false })),
      notes: '',
      mode: config.mode,
      plannedDurationSeconds: config.mode === 'timed' ? config.focusMinutes * 60 : null,
      focusRating: config.mode === 'open' ? focusRating : null,
    });

    sessionIdRef.current = session.id;
    showToast(t.timer.sessionComplete, 'success');

    if (skipQuiz) {
      // Go back to setup
      handleReset();
    } else {
      // Go to quiz
      setFlowState('quiz');
      navigate('/quiz');
    }
  };

  const handleTimerComplete = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerState('completed');

    // Calculate actual focus time
    const actualSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

    // Record the session
    const session = addSession({
      startTime: new Date(startTimeRef.current).toISOString(),
      endTime: new Date().toISOString(),
      type: 'focus',
      durationSeconds: actualSeconds,
      projectId: state.projects.find((p) => p.name === config.subject)?.id || null,
      linkedTaskId: config.linkedTaskId || null,
      linkedNoteId: null,
      subject: config.subject,
      distractions: distractions,
      quizScore: null,
      phaseCount: 1,
      breakPlan: breakPlan.map((b) => ({ activity: b, completed: false })),
      notes: '',
      mode: 'timed',
      plannedDurationSeconds: config.focusMinutes * 60,
      focusRating: null,
    });

    sessionIdRef.current = session.id;
    showToast(t.timer.sessionComplete, 'success');

    // Go to quiz
    setFlowState('quiz');
    navigate('/quiz');
  }, [config, distractions, breakPlan, addSession, showToast, navigate, state.projects, t]);

  const handleLogDistraction = (category: string, note: string = '') => {
    const log: DistractionLog = {
      id: `dist_${Date.now()}`,
      category,
      note,
      timestamp: new Date().toISOString(),
    };
    setDistractions((prev) => [...prev, log]);
    setShowDistractionModal(false);
    showToast(t.distractions.title.replace('Log ', ''), 'info');
  };

  const toggleBreakActivity = (activityId: string) => {
    setBreakPlan((prev) =>
      prev.includes(activityId)
        ? prev.filter((id) => id !== activityId)
        : [...prev, activityId]
    );
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = config.mode === 'timed' && flowState === 'focus'
    ? 100 - (timeLeft / (config.focusMinutes * 60)) * 100
    : 0;

  // Project options
  const projectOptions = state.projects.map((p) => ({ value: p.name, label: p.name }));

  const modeOptions: { value: SessionMode; label: string }[] = [
    { value: 'timed', label: t.timer.timed },
    { value: 'open', label: t.timer.openEnded },
  ];

  // ============================================
  // Zen Mode (Fullscreen Timer)
  // ============================================
  if (isZenMode && flowState === 'focus') {
    const displayTime = config.mode === 'timed' ? timeLeft : elapsedTime;

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-indigo-900 flex flex-col items-center justify-center z-50">
        {/* Exit button */}
        <button
          onClick={() => setZenMode(false)}
          className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors"
        >
          <Minimize2 className="w-6 h-6" />
        </button>

        {/* Mode indicator */}
        {config.mode === 'open' && (
          <div className="absolute top-4 left-4 flex items-center gap-2 text-white/50">
            <Infinity className="w-5 h-5" />
            <span className="text-sm">{t.timer.openEnded}</span>
          </div>
        )}

        {/* Timer */}
        <div className="text-center">
          <p className="text-white/60 text-lg mb-4">{config.subject}</p>
          <div className="text-[10rem] font-mono font-bold text-white tracking-tight">
            {formatTime(displayTime)}
          </div>
          <p className="text-white/40 mt-4 italic max-w-md mx-auto">"{currentTip}"</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-12">
          {timerState === 'running' ? (
            <button
              onClick={handlePause}
              className="p-6 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            >
              <Pause className="w-8 h-8 text-white" />
            </button>
          ) : (
            <button
              onClick={handleResume}
              className="p-6 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            >
              <Play className="w-8 h-8 text-white" />
            </button>
          )}

          {config.mode === 'open' && (
            <button
              onClick={handleEndOpenSession}
              className="p-4 bg-green-500/20 rounded-full hover:bg-green-500/30 transition-colors"
            >
              <Square className="w-6 h-6 text-green-400" />
            </button>
          )}

          <button
            onClick={() => setShowDistractionModal(true)}
            className="p-4 bg-amber-500/20 rounded-full hover:bg-amber-500/30 transition-colors"
          >
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </button>
        </div>

        {/* Progress bar (timed mode only) */}
        {config.mode === 'timed' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div
              className="h-full bg-indigo-500 transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Keyboard hints */}
        <div className="absolute bottom-6 text-white/30 text-xs flex gap-6">
          <span>Space: {t.timer.pause}/{t.timer.resume}</span>
          <span>Z: {t.timer.exitZen}</span>
        </div>

        {/* Distraction Modal */}
        {showDistractionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
            <Card className="w-full max-w-sm p-4 bg-gray-800 border-gray-700">
              <h3 className="font-semibold text-white mb-4">{t.distractions.title}</h3>
              <div className="grid grid-cols-2 gap-2">
                {DISTRACTION_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleLogDistraction(cat.id)}
                    className="p-3 bg-gray-700 rounded-lg text-white text-sm hover:bg-gray-600 transition-colors"
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                fullWidth
                className="mt-4 text-gray-400"
                onClick={() => setShowDistractionModal(false)}
              >
                {t.common.cancel}
              </Button>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // Setup Screen
  // ============================================
  if (flowState === 'setup') {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t.timer.title}</h1>
          <p className="text-gray-500 mt-2">{t.timer.subtitle}</p>
        </div>

        <Card className="p-6 space-y-6">
          {/* Session Mode */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              {t.timer.sessionMode}
            </label>
            <SegmentedControl
              options={modeOptions}
              value={config.mode}
              onChange={(mode) => setConfig({ ...config, mode })}
              fullWidth
            />
            <p className="text-xs text-gray-500 mt-2">
              {config.mode === 'timed' ? t.timer.timedDesc : t.timer.openEndedDesc}
            </p>
          </div>

          {/* Subject */}
          <Select
            label={t.timer.subject}
            options={projectOptions}
            value={config.subject}
            onChange={(e) => setConfig({ ...config, subject: e.target.value })}
          />

          {/* Timed mode settings */}
          {config.mode === 'timed' && (
            <>
              {/* Focus Duration */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t.timer.focusDuration}: <span className="text-indigo-600 font-bold">{config.focusMinutes} {t.common.min}</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={config.focusMinutes}
                  onChange={(e) => setConfig({ ...config, focusMinutes: parseInt(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>5 {t.common.min}</span>
                  <span>25 {t.common.min}</span>
                  <span>60 {t.common.min}</span>
                </div>
              </div>

              {/* Break Duration */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t.timer.breakDuration}: <span className="text-teal-600 font-bold">{config.breakMinutes} {t.common.min}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={config.breakMinutes}
                  onChange={(e) => setConfig({ ...config, breakMinutes: parseInt(e.target.value) })}
                  className="w-full accent-teal-500"
                />
              </div>
            </>
          )}

          {/* Open-ended mode info */}
          {config.mode === 'open' && (
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
              <div className="flex items-center gap-2 text-indigo-700 mb-2">
                <Infinity className="w-5 h-5" />
                <span className="font-medium">{t.timer.openEnded}</span>
              </div>
              <p className="text-sm text-indigo-600">
                {t.timer.stopAnytime}
              </p>
            </div>
          )}

          {/* Break Plan */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              {t.timer.planBreak}
            </label>
            <div className="flex flex-wrap gap-2">
              {BREAK_ACTIVITIES.map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => toggleBreakActivity(activity.id)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    breakPlan.includes(activity.id)
                      ? 'bg-teal-50 border-teal-500 text-teal-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {activity.label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleStart} fullWidth size="lg">
            <Play className="w-5 h-5" />
            {t.timer.startSession}
          </Button>
        </Card>

        {/* Keyboard shortcuts hint */}
        <p className="text-xs text-gray-400 text-center mt-6">
          {t.timer.keyboardHint}
        </p>
      </div>
    );
  }

  // ============================================
  // Focus Timer Screen
  // ============================================
  const displayTime = config.mode === 'timed' ? timeLeft : elapsedTime;

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 relative">
      {/* Floating Chat Button */}
      <button
        onClick={() => setMiniChatOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors z-40"
        title={t.chat.miniChat}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Badge variant="primary">{config.subject}</Badge>
          {config.mode === 'open' && (
            <Badge variant="outline">
              <Infinity className="w-3 h-3 mr-1" />
              {t.timer.openEnded}
            </Badge>
          )}
        </div>
        <p className="text-gray-500 mt-2 italic text-sm">"{currentTip}"</p>
      </div>

      {/* Circular Timer */}
      <div className="relative w-72 h-72 mb-8">
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="6"
          />
          {config.mode === 'timed' && (
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke={timerState === 'paused' ? '#9ca3af' : '#6366f1'}
              strokeWidth="6"
              strokeDasharray="283"
              strokeDashoffset={283 - (283 * progressPercent) / 100}
              className="transition-all duration-1000 ease-linear"
            />
          )}
          {config.mode === 'open' && (
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke={timerState === 'paused' ? '#9ca3af' : '#6366f1'}
              strokeWidth="6"
              strokeDasharray="4 4"
              className="animate-spin-slow"
              style={{ animationDuration: '30s' }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {config.mode === 'open' && (
            <span className="text-xs text-gray-400 mb-1">{t.timer.elapsedTime}</span>
          )}
          <span className={`text-6xl font-mono font-bold ${timerState === 'paused' ? 'text-gray-400' : 'text-gray-900'}`}>
            {formatTime(displayTime)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-8">
        {timerState === 'running' ? (
          <Button variant="secondary" size="lg" onClick={handlePause}>
            <Pause className="w-5 h-5" />
            {t.timer.pause}
          </Button>
        ) : (
          <Button size="lg" onClick={handleResume}>
            <Play className="w-5 h-5" />
            {t.timer.resume}
          </Button>
        )}

        {config.mode === 'open' ? (
          <Button variant="primary" onClick={handleEndOpenSession}>
            <Square className="w-5 h-5" />
            {t.timer.endSession}
          </Button>
        ) : (
          <Button variant="ghost" onClick={handleReset}>
            <Square className="w-5 h-5" />
            {t.timer.stop}
          </Button>
        )}

        <Button variant="ghost" onClick={() => setZenMode(true)}>
          <Maximize2 className="w-5 h-5" />
          {t.timer.zen}
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDistractionModal(true)}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          {t.timer.logDistraction}
          {distractions.length > 0 && (
            <Badge variant="warning" size="sm">{distractions.length}</Badge>
          )}
        </Button>
      </div>

      {/* Progress Bar (timed mode only) */}
      {config.mode === 'timed' && (
        <div className="w-full max-w-md mt-8">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            {Math.round(progressPercent)}% {t.timer.complete}
          </p>
        </div>
      )}

      {/* Distraction Modal */}
      <Modal
        open={showDistractionModal}
        onClose={() => setShowDistractionModal(false)}
        title={t.distractions.title}
      >
        <p className="text-sm text-gray-500 mb-4">
          {t.distractions.description}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {DISTRACTION_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleLogDistraction(cat.id)}
              className="p-3 bg-gray-50 rounded-lg text-sm hover:bg-gray-100 transition-colors text-left"
            >
              {cat.label}
            </button>
          ))}
        </div>
      </Modal>

      {/* End Session Modal (open-ended mode) */}
      <Modal
        open={showEndSessionModal}
        onClose={() => {
          setShowEndSessionModal(false);
          handleResume();
        }}
        title={t.timer.endSessionPrompt}
      >
        <div className="space-y-6">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              {t.timer.elapsedTime}: <strong>{formatTime(elapsedTime)}</strong>
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              {t.timer.focusRating}
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setFocusRating(rating)}
                  className={`p-3 rounded-lg transition-colors ${
                    focusRating >= rating
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  <Star className={`w-6 h-6 ${focusRating >= rating ? 'fill-current' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => handleConfirmEndSession(true)}
            >
              {t.timer.skipQuiz}
            </Button>
            <Button
              fullWidth
              onClick={() => handleConfirmEndSession(false)}
            >
              {t.timer.takeQuiz}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TimerPage;
