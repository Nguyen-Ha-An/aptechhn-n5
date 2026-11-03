// ============================================
// FocusLearn Study OS - Type Definitions
// ============================================

export type Theme = 'light' | 'dark' | 'navy' | 'forest';

// ============================================
// Core Entity Types
// ============================================

export type TaskStatus = 'inbox' | 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string | null;
  cycleId: string | null;
  dueDate: string | null;
  estimateMinutes: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Cycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  projectId: string | null;
  linkedTaskIds: string[];
  linkedSessionIds: string[];
  backlinks: string[]; // IDs of notes that link to this note
  createdAt: string;
  updatedAt: string;
}

export interface InboxItem {
  id: string;
  content: string;
  createdAt: string;
  type: 'capture';
}

// ============================================
// Todo Types (Notion-like checklist)
// ============================================

export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TodoItem {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  subjectId: string | null;
  priority: TodoPriority;
}

// ============================================
// Flashcard Types (SM-2 Algorithm)
// ============================================

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  example?: string;
  easeFactor: number;
  interval: number;
  reviews: number;
  nextReviewDate: string;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  subject: string;
  projectId: string | null;
  cards: Flashcard[];
  createdAt: string;
  lastReviewedAt: string | null;
}

// ============================================
// Session & Timer Types
// ============================================

export interface DistractionLog {
  id: string;
  category: string;
  note: string;
  timestamp: string;
}

export interface BreakPlan {
  activity: string;
  completed: boolean;
}

export interface Session {
  id: string;
  startTime: string;
  endTime: string | null;
  type: 'focus' | 'break';
  durationSeconds: number;
  projectId: string | null;
  linkedTaskId: string | null;
  linkedNoteId: string | null;
  subject: string;
  distractions: DistractionLog[];
  quizScore: number | null;
  phaseCount: number;
  breakPlan: BreakPlan[];
  notes: string;
  mode: SessionMode;
  plannedDurationSeconds: number | null;
  focusRating: number | null;
}

// ============================================
// Quiz Types
// ============================================

export interface QuizQuestion {
  q: string;
  choices: { A: string; B: string; C: string; D: string };
  answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export interface QuizData {
  title: string;
  questions: QuizQuestion[];
}

export interface QuizSession {
  quizData: QuizData;
  answers: Record<number, string>;
  score: number;
  submitted: boolean;
  isRetry: boolean;
  incorrectQuestions: QuizQuestion[];
}

// ============================================
// Settings Types
// ============================================

export type Language = 'en' | 'vi';

export interface TimerSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  showNotifications: boolean;
}

export interface AppSettings {
  timer: TimerSettings;
  theme: Theme;
  sidebarCollapsed: boolean;
  defaultProjectId: string | null;
  userName: string;
  language: Language;
}

// ============================================
// AI Chat Types
// ============================================

export type ChatMessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatStore {
  conversations: Conversation[];
  messagesByConvId: Record<string, ChatMessage[]>;
  activeConversationId: string | null;
}

export interface ChatContextOptions {
  includeTasks: boolean;
  includeProject: boolean;
  includeQuizMistakes: boolean;
  includeDistractions: boolean;
  includeNotes: boolean;
}

// ============================================
// Session Mode Types
// ============================================

export type SessionMode = 'timed' | 'open';

// ============================================
// Achievement Types (Simplified - no coins)
// ============================================

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
}

// ============================================
// Main App State
// ============================================

export interface AppState {
  schemaVersion: number;
  settings: AppSettings;

  // Core data
  tasks: Task[];
  projects: Project[];
  cycles: Cycle[];
  notes: Note[];
  inbox: InboxItem[];
  todos: TodoItem[];

  // Flashcards
  decks: FlashcardDeck[];

  // History
  sessions: Session[];

  // Achievements
  achievements: Achievement[];

  // AI Chat
  chat: ChatStore;

  // UI State (persisted)
  lastActiveRoute: string;
  favorites: string[]; // Route paths
}

// ============================================
// Timer Flow Types
// ============================================

export type AppScreen = 'home' | 'timer' | 'quiz' | 'break' | 'stats' | 'settings';
export type TimerState = 'idle' | 'running' | 'paused' | 'completed';
export type QuizResultState = 'pending' | 'passed' | 'failed' | 'retry_passed' | 'retry_failed';

export interface SessionConfig {
  subject: string;
  focusMinutes: number;
  breakMinutes: number;
  projectId?: string;
  linkedTaskId?: string;
  mode: SessionMode;
}

// ============================================
// Analytics Types
// ============================================

export interface DailyStats {
  date: string;
  focusMinutes: number;
  sessionsCount: number;
  quizAverage: number;
  distractionsCount: number;
}

export interface InsightData {
  bestStudyHour: number | null;
  topDistractionCategory: string | null;
  weakestProject: string | null;
  consistencyScore: number;
  currentStreak: number;
}

// ============================================
// Command Palette Types
// ============================================

export interface CommandAction {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  section: 'navigation' | 'actions' | 'search';
  keywords: string[];
  action: () => void;
}

// ============================================
// Legacy Types (for migration)
// ============================================

export interface LegacyAppData {
  version: number;
  profile: {
    coins: number;
    inventory: string[];
    activeTheme: Theme;
  };
  settings: {
    focusMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    cyclesBeforeLongBreak: number;
    isDarkMode: boolean;
  };
  tasks: {
    id: string;
    title: string;
    subject: string;
    completed: boolean;
    createdAt: string;
  }[];
  decks: FlashcardDeck[];
  history: {
    id: string;
    date: string;
    type: 'focus' | 'quiz' | 'flashcard';
    durationSeconds: number;
    score?: number;
    subject?: string;
    distractions?: DistractionLog[];
  }[];
  achievements: any[];
}

// ============================================
// User Stats (computed)
// ============================================

export interface UserStats {
  totalFocusMinutes: number;
  sessionsCompleted: number;
  averageQuizScore: number;
  streakDays: number;
  lastSessionDate: string;
  history: { date: string; minutes: number }[];
}
