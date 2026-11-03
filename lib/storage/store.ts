/**
 * Storage Layer for FocusLearn Study OS
 * Handles localStorage persistence with schema versioning and migration
 */

import {
  AppState,
  LegacyAppData,
  Project,
  Task,
  Session,
  Achievement,
  Theme,
  TodoItem,
} from '../../types';
import { getTranslation } from '../../i18n';

const STORAGE_KEY = 'focuslearn_v3';
const LEGACY_KEY = 'focusLearnPlus_v2';
const CURRENT_SCHEMA_VERSION = 5;

// Default projects (subjects)
const DEFAULT_PROJECTS: Project[] = [
  { id: 'proj_math', name: 'Math', color: '#6366f1', icon: 'Calculator', description: 'Mathematics and calculations', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'proj_english', name: 'English', color: '#22c55e', icon: 'BookOpen', description: 'Language and literature', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'proj_physics', name: 'Physics', color: '#f59e0b', icon: 'Atom', description: 'Physical sciences', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'proj_history', name: 'History', color: '#ef4444', icon: 'Landmark', description: 'Historical studies', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'proj_general', name: 'General', color: '#8b5cf6', icon: 'Lightbulb', description: 'General studies', isDefault: true, createdAt: new Date().toISOString() },
];

// Default achievements
const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_session', title: 'First Steps', description: 'Complete your first focus session', icon: 'Play', unlockedAt: null },
  { id: 'quiz_master', title: 'Quiz Whiz', description: 'Score 100% on a quiz', icon: 'CheckCircle', unlockedAt: null },
  { id: 'marathon', title: 'Focus Marathon', description: 'Reach 100 total focus minutes', icon: 'Timer', unlockedAt: null },
  { id: 'streak_3', title: 'Consistent', description: 'Maintain a 3-day streak', icon: 'Flame', unlockedAt: null },
  { id: 'streak_7', title: 'Week Warrior', description: 'Maintain a 7-day streak', icon: 'Crown', unlockedAt: null },
  { id: 'flashcard_master', title: 'Memory Master', description: 'Review 100 flashcards', icon: 'Brain', unlockedAt: null },
  { id: 'note_taker', title: 'Note Taker', description: 'Create 10 notes', icon: 'FileText', unlockedAt: null },
  { id: 'task_complete', title: 'Task Champion', description: 'Complete 25 tasks', icon: 'Target', unlockedAt: null },
];

// Get the current week's cycle
function getCurrentWeekCycle() {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    id: `cycle_${startOfWeek.toISOString().split('T')[0]}`,
    name: `Week of ${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    startDate: startOfWeek.toISOString(),
    endDate: endOfWeek.toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
  };
}

// Default state for new users
function getDefaultState(): AppState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    settings: {
      timer: {
        focusMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        cyclesBeforeLongBreak: 4,
        autoStartBreaks: false,
        autoStartFocus: false,
        showNotifications: true,
      },
      theme: 'light',
      sidebarCollapsed: false,
      defaultProjectId: null,
      userName: '',
      language: 'en',
    },
    tasks: [],
    projects: DEFAULT_PROJECTS,
    cycles: [getCurrentWeekCycle()],
    notes: [],
    inbox: [],
    todos: [],
    decks: [],
    sessions: [],
    achievements: DEFAULT_ACHIEVEMENTS,
    chat: {
      conversations: [],
      messagesByConvId: {},
      activeConversationId: null,
    },
    lastActiveRoute: '/dashboard',
    favorites: ['/dashboard', '/timer', '/tasks'],
  };
}

// Migrate from legacy v2 schema to v3
function migrateFromV2(legacy: LegacyAppData): AppState {
  const defaultState = getDefaultState();

  // Map legacy theme
  let theme: Theme = 'light';
  if (legacy.profile?.activeTheme) {
    theme = legacy.profile.activeTheme;
  } else if (legacy.settings?.isDarkMode) {
    theme = 'dark';
  }

  // Find or create project for subject
  const getProjectIdForSubject = (subject: string): string | null => {
    const normalized = subject.toLowerCase();
    if (normalized.includes('math')) return 'proj_math';
    if (normalized.includes('english')) return 'proj_english';
    if (normalized.includes('physics')) return 'proj_physics';
    if (normalized.includes('history')) return 'proj_history';
    return 'proj_general';
  };

  // Migrate tasks
  const migratedTasks: Task[] = (legacy.tasks || []).map((t) => ({
    id: t.id,
    title: t.title,
    description: '',
    status: t.completed ? 'done' : 'todo',
    priority: 'medium',
    projectId: getProjectIdForSubject(t.subject),
    cycleId: null,
    dueDate: null,
    estimateMinutes: null,
    tags: [t.subject],
    createdAt: t.createdAt,
    updatedAt: t.createdAt,
    completedAt: t.completed ? t.createdAt : null,
  }));

  // Migrate sessions from history
  const migratedSessions: Session[] = (legacy.history || [])
    .filter((h) => h.type === 'focus' || h.type === 'quiz')
    .map((h) => ({
      id: h.id,
      startTime: h.date,
      endTime: new Date(new Date(h.date).getTime() + h.durationSeconds * 1000).toISOString(),
      type: 'focus' as const,
      durationSeconds: h.durationSeconds,
      projectId: h.subject ? getProjectIdForSubject(h.subject) : null,
      linkedTaskId: null,
      linkedNoteId: null,
      subject: h.subject || 'General',
      distractions: h.distractions || [],
      quizScore: h.score || null,
      phaseCount: 1,
      breakPlan: [],
      notes: '',
      mode: 'timed' as const,
      plannedDurationSeconds: h.durationSeconds,
      focusRating: null,
    }));

  // Migrate decks with project associations
  const migratedDecks = (legacy.decks || []).map((d) => ({
    ...d,
    projectId: getProjectIdForSubject(d.subject),
    createdAt: d.createdAt || new Date().toISOString(),
    lastReviewedAt: null,
  }));

  // Migrate achievements
  const migratedAchievements = DEFAULT_ACHIEVEMENTS.map((a) => {
    const legacyAch = legacy.achievements?.find((la: any) => la.id === a.id);
    return {
      ...a,
      unlockedAt: legacyAch?.unlockedAt || null,
    };
  });

  return {
    ...defaultState,
    settings: {
      ...defaultState.settings,
      theme,
      timer: {
        ...defaultState.settings.timer,
        focusMinutes: legacy.settings?.focusMinutes || 25,
        shortBreakMinutes: legacy.settings?.shortBreakMinutes || 5,
        longBreakMinutes: legacy.settings?.longBreakMinutes || 15,
        cyclesBeforeLongBreak: legacy.settings?.cyclesBeforeLongBreak || 4,
      },
    },
    tasks: migratedTasks,
    decks: migratedDecks,
    sessions: migratedSessions,
    achievements: migratedAchievements,
  };
}

// Migrate from v3 to v4 (add conversations, userName, language, todos)
function migrateFromV3(oldState: any): AppState {
  const conversations = oldState.conversations || [];
  const messagesByConvId = conversations.reduce((acc: Record<string, any[]>, conv: any) => {
    acc[conv.id] = conv.messages || [];
    return acc;
  }, {});
  return {
    ...oldState,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    settings: {
      ...oldState.settings,
      userName: oldState.settings?.userName || '',
      language: oldState.settings?.language || 'en',
    },
    chat: {
      conversations: conversations.map(({ messages, ...rest }: any) => rest),
      messagesByConvId,
      activeConversationId: oldState.activeConversationId || null,
    },
    todos: oldState.todos || [],
    // Migrate existing sessions to include new fields
    sessions: (oldState.sessions || []).map((s: any) => ({
      ...s,
      mode: s.mode || 'timed',
      plannedDurationSeconds: s.plannedDurationSeconds ?? s.durationSeconds,
      focusRating: s.focusRating ?? null,
    })),
  };
}

// Migrate from v4 to v5 (chat store schema)
function migrateFromV4(oldState: any): AppState {
  const defaultState = getDefaultState();
  const conversations = oldState.conversations || oldState.chat?.conversations || [];
  const extractedMessages = conversations.reduce((acc: Record<string, any[]>, conv: any) => {
    if (conv.messages) {
      acc[conv.id] = conv.messages;
    }
    return acc;
  }, {});
  const messagesByConvId = {
    ...extractedMessages,
    ...(oldState.messagesByConvId || oldState.chat?.messagesByConvId || {}),
  };
  const activeConversationId = oldState.activeConversationId || oldState.chat?.activeConversationId || null;
  return {
    ...defaultState,
    ...oldState,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    chat: {
      conversations: conversations.map(({ messages, ...rest }: any) => rest),
      messagesByConvId,
      activeConversationId,
    },
  };
}

function normalizeChatState(state: AppState): AppState {
  const now = new Date().toISOString();
  const defaultTitle = getTranslation(state.settings?.language || 'en', 'chat.newChat');
  const chat = (state as any).chat || {
    conversations: (state as any).conversations || [],
    messagesByConvId: (state as any).messagesByConvId || {},
    activeConversationId: (state as any).activeConversationId || null,
  };
  const messagesByConvId: Record<string, any[]> = { ...chat.messagesByConvId };
  const conversations = (chat.conversations || []).map((conv: any) => {
    if (conv.messages) {
      messagesByConvId[conv.id] = conv.messages;
    }
    if (!messagesByConvId[conv.id]) {
      messagesByConvId[conv.id] = [];
    }
    return {
      id: conv.id,
      title: conv.title || defaultTitle,
      createdAt: conv.createdAt || now,
      updatedAt: conv.updatedAt || now,
    };
  });

  if (conversations.length === 0) {
    const firstConversation = {
      id: generateId('conv'),
      title: defaultTitle,
      createdAt: now,
      updatedAt: now,
    };
    conversations.push(firstConversation);
    messagesByConvId[firstConversation.id] = [];
  }

  const activeConversationId = chat.activeConversationId || conversations[0].id;

  return {
    ...state,
    chat: {
      conversations,
      messagesByConvId,
      activeConversationId,
    },
  };
}

// Load state from localStorage
export function loadState(): AppState {
  try {
    // First check for existing data
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      const parsed = JSON.parse(storedData);
      // Ensure we have current schema version
      if (parsed.schemaVersion === CURRENT_SCHEMA_VERSION) {
        return normalizeChatState(parsed as AppState);
      }
      // Migrate from v3 to v4
      if (parsed.schemaVersion === 3) {
        console.log('Migrating from v3 schema...');
        const migrated = migrateFromV3(parsed);
        saveState(migrated);
        return normalizeChatState(migrated);
      }
      if (parsed.schemaVersion === 4) {
        console.log('Migrating from v4 schema...');
        const migrated = migrateFromV4(parsed);
        saveState(migrated);
        return normalizeChatState(migrated);
      }
    }

    // Check for legacy v2 data
    const legacyData = localStorage.getItem(LEGACY_KEY);
    if (legacyData) {
      const parsed = JSON.parse(legacyData) as LegacyAppData;
      console.log('Migrating from v2 schema...');
      const migrated = migrateFromV2(parsed);
      // Save migrated data
      saveState(migrated);
      return normalizeChatState(migrated);
    }

    // No existing data, return defaults
    return normalizeChatState(getDefaultState());
  } catch (e) {
    console.error('Failed to load state:', e);
    return normalizeChatState(getDefaultState());
  }
}

// Save state to localStorage
export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

// Update state with partial data
export function updateState(updates: Partial<AppState>): AppState {
  const current = loadState();
  const updated = { ...current, ...updates };
  saveState(updated);
  return updated;
}

// Export data as JSON file
export function exportData(): void {
  const state = loadState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `focuslearn_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import data from JSON
export function importData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (!data.schemaVersion) {
      throw new Error('Invalid schema');
    }
    saveState(data as AppState);
    return true;
  } catch (e) {
    console.error('Import failed:', e);
    return false;
  }
}

// Helper to generate IDs
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
