import React from 'react';

interface TimerDisplayProps {
  seconds: number;
  totalSeconds: number;
  phase: string;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ seconds, totalSeconds, phase }) => {
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = ((totalSeconds - seconds) / totalSeconds) * 100;
  
  // Phase colors
  const color = phase === 'focus' ? 'text-indigo-600 stroke-indigo-600' : 'text-teal-600 stroke-teal-600';

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      <svg className="absolute w-full h-full transform -rotate-90">
        <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-200 opacity-30" />
        <circle 
          cx="50%" cy="50%" r="45%" 
          stroke="currentColor" 
          strokeWidth="8" 
          fill="transparent" 
          strokeDasharray="283%" // Approx circumference 2*pi*r
          strokeDashoffset={`${283 - (283 * progress) / 100}%`}
          strokeLinecap="round"
          className={`transition-all duration-1000 ease-linear ${color}`} 
        />
      </svg>
      <div className={`text-5xl font-mono font-bold ${phase === 'focus' ? 'text-indigo-600' : 'text-teal-600'}`}>
        {formatTime(seconds)}
      </div>
    </div>
  );
};

export default TimerDisplay;