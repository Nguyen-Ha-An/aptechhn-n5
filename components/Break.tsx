/**
 * Break Component
 * Displays the break countdown after passing a quiz
 * Shows time remaining and allows skipping
 */

import React, { useState, useEffect } from 'react';
import Button from './Button';

interface BreakProps {
  durationMinutes: number;
  onEnd: () => void;
}

// Break activity suggestions
const BREAK_TIPS = [
  "Stand up and stretch your body",
  "Look away from the screen for 20 seconds",
  "Take deep breaths and relax",
  "Get a glass of water",
  "Walk around the room",
  "Do some light exercises",
  "Close your eyes and rest",
  "Step outside for fresh air"
];

const Break: React.FC<BreakProps> = ({ durationMinutes, onEnd }) => {
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [tip] = useState(BREAK_TIPS[Math.floor(Math.random() * BREAK_TIPS.length)]);

  // Calculate progress percentage
  const totalSeconds = durationMinutes * 60;
  const progressPercent = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      onEnd();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onEnd]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-100 space-y-8 p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-bold text-teal-800">Break Time!</h2>
        <p className="text-teal-600 text-lg">You earned it. Relax and recharge.</p>
      </div>

      {/* Circular Timer Display */}
      <div className="relative w-56 h-56 flex items-center justify-center">
        <svg
          className="absolute top-0 left-0 w-full h-full transform -rotate-90"
          viewBox="0 0 100 100"
        >
          {/* Background circle */}
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="#ccfbf1"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="#14b8a6"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="283"
            strokeDashoffset={283 - (283 * progressPercent) / 100}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="bg-white rounded-full w-44 h-44 flex items-center justify-center shadow-lg">
          <span className="text-5xl font-mono font-bold text-teal-600">
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Break Tip */}
      <div className="bg-white/80 backdrop-blur px-6 py-4 rounded-xl shadow-sm max-w-sm text-center">
        <p className="text-teal-700 font-medium">{tip}</p>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-md">
        <div className="bg-teal-100 rounded-full h-2">
          <div
            className="bg-teal-500 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-center text-xs text-teal-500 mt-2">
          {Math.round(progressPercent)}% of break complete
        </p>
      </div>

      {/* Skip Button */}
      <Button
        onClick={onEnd}
        variant="outline"
        className="border-teal-500 text-teal-600 hover:bg-teal-50"
      >
        Skip Break & Continue
      </Button>
    </div>
  );
};

export default Break;
