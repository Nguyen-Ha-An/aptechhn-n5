import React, { useState, useEffect, useRef } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { useNavigate } from 'react-router-dom';
import TimerDisplay from '../components/TimerDisplay';
import { Play, Pause, SkipForward, AlertCircle, Plus, CheckCircle, RotateCcw } from 'lucide-react';
import Button from '../components/Button';
import { SUBJECTS } from '../constants';

type Phase = 'focus' | 'shortBreak' | 'longBreak';

const Home: React.FC = () => {
  const { data, updateData, addCoins } = useGlobal();
  const navigate = useNavigate();
  const s = data.settings;

  // Timer State
  const [phase, setPhase] = useState<Phase>('focus');
  const [timeLeft, setTimeLeft] = useState(s.focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Task State
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  
  // Distraction State
  const [showDistractionModal, setShowDistractionModal] = useState(false);
  const [distractionNote, setDistractionNote] = useState("");
  const [sessionDistractions, setSessionDistractions] = useState<{category: string, note: string, timestamp: string}[]>([]);

  // --- Timer Logic ---
  useEffect(() => {
    // Sync time if settings change and timer not running
    if (!isRunning) {
        if (phase === 'focus') setTimeLeft(s.focusMinutes * 60);
        if (phase === 'shortBreak') setTimeLeft(s.shortBreakMinutes * 60);
        if (phase === 'longBreak') setTimeLeft(s.longBreakMinutes * 60);
    }
  }, [s, phase, isRunning]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = window.setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      handlePhaseComplete();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, timeLeft]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') { e.preventDefault(); setIsRunning(prev => !prev); }
      if (e.code === 'KeyR') handleReset();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handlePhaseComplete = () => {
    setIsRunning(false);
    if (phase === 'focus') {
      // Reward
      addCoins(10);
      
      // Save Session
      updateData(prev => ({
        ...prev,
        history: [...prev.history, {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          type: 'focus',
          durationSeconds: s.focusMinutes * 60,
          subject: activeTaskId ? prev.tasks.find(t => t.id === activeTaskId)?.subject : 'General',
          distractions: sessionDistractions
        }]
      }));
      setSessionDistractions([]);

      const newCycles = cycles + 1;
      setCycles(newCycles);
      if (newCycles % s.cyclesBeforeLongBreak === 0) {
        setPhase('longBreak');
        setTimeLeft(s.longBreakMinutes * 60);
      } else {
        setPhase('shortBreak');
        setTimeLeft(s.shortBreakMinutes * 60);
      }
      
      // Navigate to Quiz if focus done
      navigate('/quiz');

    } else {
      // Break done
      setPhase('focus');
      setTimeLeft(s.focusMinutes * 60);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(phase === 'focus' ? s.focusMinutes * 60 : s.shortBreakMinutes * 60);
  };

  const skipPhase = () => {
    if(confirm("Skip this phase?")) handlePhaseComplete();
  };

  // --- Task Logic ---
  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    updateData(prev => ({
      ...prev,
      tasks: [...prev.tasks, {
        id: crypto.randomUUID(),
        title: newTaskTitle,
        subject: 'General',
        completed: false,
        createdAt: new Date().toISOString()
      }]
    }));
    setNewTaskTitle("");
  };

  const toggleTask = (id: string) => {
    updateData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    }));
  };

  const logDistraction = (category: string) => {
    const log = { category, note: distractionNote, timestamp: new Date().toISOString() };
    setSessionDistractions(prev => [...prev, log]);
    setShowDistractionModal(false);
    setDistractionNote("");
  };

  const totalTime = phase === 'focus' ? s.focusMinutes * 60 : (phase === 'shortBreak' ? s.shortBreakMinutes * 60 : s.longBreakMinutes * 60);

  return (
    <div className="flex flex-col items-center p-6 space-y-8 animate-in fade-in">
      {/* Header Info */}
      <div className="w-full flex justify-between items-center text-gray-500 text-sm">
        <span>Cycle: {cycles % s.cyclesBeforeLongBreak} / {s.cyclesBeforeLongBreak}</span>
        <div className="flex items-center space-x-2 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
           <span>🪙 {data.profile.coins}</span>
        </div>
      </div>

      {/* Timer Area */}
      <div className="flex flex-col items-center space-y-6">
        <h2 className="text-2xl font-bold uppercase tracking-widest text-gray-400">{phase === 'focus' ? 'Focus Time' : 'Break Time'}</h2>
        <TimerDisplay seconds={timeLeft} totalSeconds={totalTime} phase={phase} />
        
        <div className="flex space-x-4">
          <button onClick={() => setIsRunning(!isRunning)} className="p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition active:scale-95">
            {isRunning ? <Pause size={32} /> : <Play size={32} fill="currentColor" />}
          </button>
          <button onClick={handleReset} className="p-4 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition">
            <RotateCcw size={24} />
          </button>
          <button onClick={skipPhase} className="p-4 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition">
            <SkipForward size={24} />
          </button>
        </div>

        {phase === 'focus' && isRunning && (
             <button onClick={() => setShowDistractionModal(true)} className="text-sm text-red-500 hover:text-red-600 flex items-center space-x-1 border border-red-200 px-3 py-1 rounded-full">
                <AlertCircle size={14} /> <span>I got distracted</span>
             </button>
        )}
      </div>

      {/* Tasks Section */}
      <div className="w-full max-w-md bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-3">Session Goal</h3>
        <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
          {data.tasks.filter(t => !t.completed).length === 0 && <p className="text-sm text-gray-400 italic">No pending tasks.</p>}
          {data.tasks.filter(t => !t.completed).map(task => (
            <div key={task.id} className={`flex items-center justify-between p-2 rounded-lg border ${activeTaskId === task.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100'}`}>
              <div className="flex items-center space-x-3">
                <button onClick={() => toggleTask(task.id)} className="text-gray-300 hover:text-green-500"><CheckCircle size={20} /></button>
                <span className="text-sm font-medium">{task.title}</span>
              </div>
              <button onClick={() => setActiveTaskId(task.id)} className="text-xs text-indigo-600 font-semibold px-2">
                {activeTaskId === task.id ? 'ACTIVE' : 'SELECT'}
              </button>
            </div>
          ))}
        </div>
        <div className="flex space-x-2">
            <input 
                value={newTaskTitle} 
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="Add a new task..."
                className="flex-1 text-sm border-gray-200 rounded-md p-2 outline-none focus:ring-1 focus:ring-indigo-500 border"
            />
            <button onClick={addTask} className="bg-gray-900 text-white p-2 rounded-md"><Plus size={18} /></button>
        </div>
      </div>

      {/* Distraction Modal */}
      {showDistractionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
                <h3 className="font-bold text-lg">Log Distraction</h3>
                <div className="grid grid-cols-2 gap-2">
                    {['Phone', 'Social Media', 'Daydreaming', 'Noise', 'Other'].map(cat => (
                        <button key={cat} onClick={() => logDistraction(cat)} className="p-2 border rounded hover:bg-gray-50 text-sm">{cat}</button>
                    ))}
                </div>
                <input 
                    placeholder="Optional note..." 
                    className="w-full border p-2 rounded text-sm"
                    value={distractionNote}
                    onChange={(e) => setDistractionNote(e.target.value)}
                />
                <button onClick={() => setShowDistractionModal(false)} className="w-full py-2 text-gray-500 text-sm">Cancel</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default Home;