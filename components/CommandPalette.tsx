/**
 * Command Palette Component (Ctrl+K)
 * Inspired by Linear/Raycast command palette
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobal } from '../context/GlobalContext';
import {
  Search,
  LayoutDashboard,
  Inbox,
  CheckSquare,
  FolderKanban,
  FileText,
  GraduationCap,
  Timer,
  History,
  BarChart3,
  Settings,
  Plus,
  Play,
  BookOpen,
  Lightbulb,
  ArrowRight,
  Command,
  Hash,
} from 'lucide-react';
import { Kbd } from './ui';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  section: 'navigation' | 'actions' | 'tasks' | 'notes' | 'decks';
  keywords: string[];
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const { commandPaletteOpen, setCommandPaletteOpen, state, addTask, addInboxItem, addNote } = useGlobal();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [commandPaletteOpen]);

  // Navigation commands
  const navigationCommands: CommandItem[] = [
    { id: 'nav-dashboard', title: 'Go to Dashboard', icon: <LayoutDashboard size={18} />, section: 'navigation', keywords: ['dashboard', 'home', 'overview'], action: () => navigate('/dashboard') },
    { id: 'nav-inbox', title: 'Go to Inbox', icon: <Inbox size={18} />, section: 'navigation', keywords: ['inbox', 'capture'], action: () => navigate('/inbox') },
    { id: 'nav-tasks', title: 'Go to Tasks', icon: <CheckSquare size={18} />, section: 'navigation', keywords: ['tasks', 'todo', 'issues'], action: () => navigate('/tasks') },
    { id: 'nav-projects', title: 'Go to Projects', icon: <FolderKanban size={18} />, section: 'navigation', keywords: ['projects', 'subjects', 'cycles'], action: () => navigate('/projects') },
    { id: 'nav-notes', title: 'Go to Notes', icon: <FileText size={18} />, section: 'navigation', keywords: ['notes', 'documents'], action: () => navigate('/notes') },
    { id: 'nav-flashcards', title: 'Go to Flashcards', icon: <GraduationCap size={18} />, section: 'navigation', keywords: ['flashcards', 'cards', 'review', 'spaced'], action: () => navigate('/flashcards') },
    { id: 'nav-timer', title: 'Go to Timer', icon: <Timer size={18} />, section: 'navigation', keywords: ['timer', 'focus', 'pomodoro'], action: () => navigate('/timer') },
    { id: 'nav-sessions', title: 'Go to Sessions', icon: <History size={18} />, section: 'navigation', keywords: ['sessions', 'history'], action: () => navigate('/sessions') },
    { id: 'nav-analytics', title: 'Go to Analytics', icon: <BarChart3 size={18} />, section: 'navigation', keywords: ['analytics', 'stats', 'charts'], action: () => navigate('/analytics') },
    { id: 'nav-settings', title: 'Go to Settings', icon: <Settings size={18} />, section: 'navigation', keywords: ['settings', 'preferences'], action: () => navigate('/settings') },
  ];

  // Action commands
  const actionCommands: CommandItem[] = [
    {
      id: 'action-focus',
      title: 'Start Focus Session',
      subtitle: 'Begin a new pomodoro session',
      icon: <Play size={18} />,
      section: 'actions',
      keywords: ['start', 'focus', 'session', 'pomodoro', 'timer'],
      action: () => navigate('/timer'),
    },
    {
      id: 'action-task',
      title: 'Create New Task',
      subtitle: 'Add a task to your list',
      icon: <Plus size={18} />,
      section: 'actions',
      keywords: ['new', 'create', 'task', 'todo', 'add'],
      action: () => {
        if (query.length > 3) {
          addTask({
            title: query,
            description: '',
            status: 'todo',
            priority: 'medium',
            projectId: null,
            cycleId: null,
            dueDate: null,
            estimateMinutes: null,
            tags: [],
          });
        }
        navigate('/tasks');
      },
    },
    {
      id: 'action-capture',
      title: 'Quick Capture',
      subtitle: 'Add to inbox for later',
      icon: <Inbox size={18} />,
      section: 'actions',
      keywords: ['quick', 'capture', 'inbox', 'note'],
      action: () => {
        if (query.length > 3) {
          addInboxItem(query);
        }
        navigate('/inbox');
      },
    },
    {
      id: 'action-note',
      title: 'Create Quick Note',
      subtitle: 'Start a new note',
      icon: <FileText size={18} />,
      section: 'actions',
      keywords: ['new', 'create', 'note', 'write'],
      action: () => {
        if (query.length > 3) {
          addNote({
            title: query,
            content: '',
            tags: [],
            projectId: null,
            linkedTaskIds: [],
            linkedSessionIds: [],
          });
        }
        navigate('/notes');
      },
    },
    {
      id: 'action-review',
      title: 'Review Due Flashcards',
      subtitle: 'Review cards due today',
      icon: <BookOpen size={18} />,
      section: 'actions',
      keywords: ['review', 'flashcards', 'due', 'cards'],
      action: () => navigate('/flashcards'),
    },
  ];

  // Search in tasks
  const taskResults: CommandItem[] = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return state.tasks
      .filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
      .slice(0, 5)
      .map((t) => ({
        id: `task-${t.id}`,
        title: t.title,
        subtitle: `Task • ${t.status}`,
        icon: <CheckSquare size={18} />,
        section: 'tasks' as const,
        keywords: [],
        action: () => navigate('/tasks'),
      }));
  }, [query, state.tasks, navigate]);

  // Search in notes
  const noteResults: CommandItem[] = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return state.notes
      .filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      .slice(0, 5)
      .map((n) => ({
        id: `note-${n.id}`,
        title: n.title,
        subtitle: `Note • ${n.tags.join(', ') || 'No tags'}`,
        icon: <FileText size={18} />,
        section: 'notes' as const,
        keywords: [],
        action: () => navigate('/notes'),
      }));
  }, [query, state.notes, navigate]);

  // Search in decks
  const deckResults: CommandItem[] = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return state.decks
      .filter((d) => d.title.toLowerCase().includes(q) || d.subject.toLowerCase().includes(q))
      .slice(0, 3)
      .map((d) => ({
        id: `deck-${d.id}`,
        title: d.title,
        subtitle: `Deck • ${d.cards.length} cards`,
        icon: <GraduationCap size={18} />,
        section: 'decks' as const,
        keywords: [],
        action: () => navigate('/flashcards'),
      }));
  }, [query, state.decks, navigate]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query) {
      return [...actionCommands.slice(0, 4), ...navigationCommands.slice(0, 6)];
    }

    const q = query.toLowerCase();
    const navMatches = navigationCommands.filter(
      (c) => c.title.toLowerCase().includes(q) || c.keywords.some((k) => k.includes(q))
    );
    const actionMatches = actionCommands.filter(
      (c) => c.title.toLowerCase().includes(q) || c.keywords.some((k) => k.includes(q))
    );

    return [...actionMatches, ...navMatches, ...taskResults, ...noteResults, ...deckResults];
  }, [query, taskResults, noteResults, deckResults]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!commandPaletteOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            setCommandPaletteOpen(false);
          }
          break;
        case 'Escape':
          setCommandPaletteOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, filteredCommands, selectedIndex, setCommandPaletteOpen]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!commandPaletteOpen) return null;

  // Group commands by section
  const sections = {
    actions: filteredCommands.filter((c) => c.section === 'actions'),
    navigation: filteredCommands.filter((c) => c.section === 'navigation'),
    tasks: filteredCommands.filter((c) => c.section === 'tasks'),
    notes: filteredCommands.filter((c) => c.section === 'notes'),
    decks: filteredCommands.filter((c) => c.section === 'decks'),
  };

  const sectionLabels = {
    actions: 'Quick Actions',
    navigation: 'Navigation',
    tasks: 'Tasks',
    notes: 'Notes',
    decks: 'Flashcard Decks',
  };

  let globalIndex = -1;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setCommandPaletteOpen(false)}
      />

      {/* Panel */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-150">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or type a command..."
              className="flex-1 text-base outline-none placeholder:text-gray-400"
            />
            <Kbd>Esc</Kbd>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Lightbulb className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No results found</p>
                <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
              </div>
            ) : (
              Object.entries(sections).map(([key, items]) => {
                if (items.length === 0) return null;
                return (
                  <div key={key}>
                    <div className="px-4 py-1">
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        {sectionLabels[key as keyof typeof sectionLabels]}
                      </span>
                    </div>
                    {items.map((item) => {
                      globalIndex++;
                      const isSelected = globalIndex === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            item.action();
                            setCommandPaletteOpen(false);
                          }}
                          className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                            isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className={`${isSelected ? 'text-indigo-600' : 'text-gray-400'}`}>
                            {item.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            {item.subtitle && (
                              <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
                            )}
                          </div>
                          {isSelected && (
                            <ArrowRight className="w-4 h-4 text-indigo-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Kbd>Enter</Kbd>
              <span>to select</span>
            </div>
            <div className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              <span>to navigate</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
