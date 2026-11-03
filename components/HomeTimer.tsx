/**
 * HomeTimer Component
 * Handles the home screen (subject/time selection) and running timer
 * Part of the Focus Timer (Pomodoro) feature
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SessionConfig, TimerState } from '../types';
import { SUBJECTS, FOCUS_TIPS } from '../constants';
import Button from './Button';

interface HomeTimerProps {
  onSessionComplete: (config: SessionConfig, actualMinutes: number) => void;
  goToStats: () => void;
}

const HomeTimer: React.FC<HomeTimerProps> = ({ onSessionComplete, goToStats }) => {
  // Timer state management
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [config, setConfig] = useState<SessionConfig>({
    subject: SUBJECTS[0],
    focusMinutes: 25,
    breakMinutes: 5
  });
  const [customSubject, setCustomSubject] = useState("");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [tip, setTip] = useState(FOCUS_TIPS[0]);

  // Track actual elapsed time for stats
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  // Select random focus tip when timer starts
  useEffect(() => {
    if (timerState === 'running') {
      setTip(FOCUS_TIPS[Math.floor(Math.random() * FOCUS_TIPS.length)]);
    }
  }, [timerState]);

  // Timer countdown logic
  useEffect(() => {
    if (timerState === 'running' && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer completed - trigger session complete
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
  }, [timerState]);

  // Handle timer completion - calculate actual focus minutes
  const handleTimerComplete = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerState('completed');

    // Calculate actual minutes spent focusing
    const actualSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const actualMinutes = Math.ceil(actualSeconds / 60);

    // Get effective subject (custom or selected)
    const effectiveSubject = config.subject === 'Custom' && customSubject.trim()
      ? customSubject.trim()
      : config.subject;

    onSessionComplete(
      { ...config, subject: effectiveSubject },
      actualMinutes
    );
  }, [config, customSubject, onSessionComplete]);

  // Start the focus timer
  const handleStart = () => {
    const minutes = config.focusMinutes;
    setTimeLeft(minutes * 60);
    startTimeRef.current = Date.now();
    setTimerState('running');
  };

  // Pause the timer
  const handlePause = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerState('paused');
  };

  // Resume the timer
  const handleResume = () => {
    setTimerState('running');
  };

  // Stop and reset the timer (user aborted)
  const handleStop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerState('idle');
    setTimeLeft(config.focusMinutes * 60);
  };

  // Format seconds to MM:SS display
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage for visual indicator
  const progressPercent = 100 - (timeLeft / (config.focusMinutes * 60)) * 100;

  // Get display subject name
  const displaySubject = config.subject === 'Custom' && customSubject.trim()
    ? customSubject.trim()
    : config.subject;

  // --- Running Timer View ---
  if (timerState === 'running' || timerState === 'paused') {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-8 animate-in fade-in duration-500 p-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-700">
            Focusing: {displaySubject}
          </h2>
          <p className="text-gray-500 text-sm italic">"{tip}"</p>
        </div>

        {/* Circular Timer Display */}
        <div className="relative w-64 h-64 flex items-center justify-center bg-white rounded-full shadow-xl border-4 border-indigo-100">
          <svg
            className="absolute top-0 left-0 w-full h-full transform -rotate-90"
            viewBox="0 0 100 100"
          >
            {/* Background circle */}
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="#e0e7ff"
              strokeWidth="6"
            />
            {/* Progress circle */}
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke={timerState === 'paused' ? '#94a3b8' : '#4f46e5'}
              strokeWidth="6"
              strokeDasharray="283"
              strokeDashoffset={283 - (283 * progressPercent) / 100}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className={`text-5xl font-mono font-bold ${timerState === 'paused' ? 'text-gray-400' : 'text-indigo-600'}`}>
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Timer Controls */}
        <div className="flex space-x-4">
          {timerState === 'running' ? (
            <Button onClick={handlePause} variant="secondary">Pause</Button>
          ) : (
            <Button onClick={handleResume} variant="primary">Resume</Button>
          )}
          <Button onClick={handleStop} variant="danger">Stop</Button>
        </div>

        {/* Progress bar (alternative view) */}
        <div className="w-full max-w-md">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            {Math.round(progressPercent)}% complete
          </p>
        </div>
      </div>
    );
  }

  // --- Setup Screen (Home) ---
  return (
    <div className="max-w-md mx-auto space-y-8 pt-10 px-4 pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold text-indigo-600 tracking-tight">
          FocusLearn
        </h1>
        <p className="text-gray-500">
          Master your subjects, one session at a time.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg space-y-6 border border-gray-100">
        {/* Subject Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SUBJECTS.map((sub) => (
              <button
                key={sub}
                onClick={() => setConfig({ ...config, subject: sub })}
                className={`p-2 text-sm rounded-lg border transition-colors ${
                  config.subject === sub
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
          {/* Custom subject input */}
          {config.subject === 'Custom' && (
            <input
              type="text"
              placeholder="Enter topic..."
              className="mt-2 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
            />
          )}
        </div>

        {/* Focus Duration Slider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Focus Duration:{' '}
            <span className="text-indigo-600 font-bold">{config.focusMinutes} min</span>
          </label>
          <input
            type="range"
            min="1"
            max="60"
            value={config.focusMinutes}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setConfig({ ...config, focusMinutes: val });
              setTimeLeft(val * 60);
            }}
            className="w-full accent-indigo-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1 min</span>
            <span>25 min</span>
            <span>60 min</span>
          </div>
        </div>

        {/* Break Duration Slider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Break Duration:{' '}
            <span className="text-teal-600 font-bold">{config.breakMinutes} min</span>
          </label>
          <input
            type="range"
            min="1"
            max="15"
            value={config.breakMinutes}
            onChange={(e) => setConfig({ ...config, breakMinutes: parseInt(e.target.value) })}
            className="w-full accent-teal-500 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1 min</span>
            <span>5 min</span>
            <span>15 min</span>
          </div>
        </div>

        {/* Start Button */}
        <Button
          onClick={handleStart}
          fullWidth
          className="text-lg py-3"
          disabled={config.subject === 'Custom' && !customSubject.trim()}
        >
          Start Focus Session
        </Button>
      </div>

      {/* View Stats Link */}
      <div className="text-center">
        <button
          onClick={goToStats}
          className="text-sm text-gray-500 hover:text-indigo-600 underline"
        >
          View Stats
        </button>
      </div>
    </div>
  );
};

export default HomeTimer;
