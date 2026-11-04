/**
 * Describes the old localStorage export format (FocusLearn v3-v5).
 * Used by the import feature to read legacy backup files.
 */

export type Theme = 'light' | 'dark' | 'navy' | 'forest';
export type Language = 'en' | 'vi';

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

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  projectId: string | null;
  linkedTaskIds: string[];
  linkedSessionIds: string[];
  backlinks: string[];
  createdAt: string;
  updatedAt: string;
}

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

export type SessionMode = 'timed' | 'open';

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
  messages?: ChatMessage[];
}

export interface ChatStore {
  conversations: Conversation[];
  messagesByConvId: Record<string, ChatMessage[]>;
  activeConversationId: string | null;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
}

/**
 * AppState export format across schema versions 3, 4, and 5.
 */
export interface AppState {
  schemaVersion: number;
  settings?: AppSettings;
  tasks?: Task[];
  notes?: Note[];
  todos?: TodoItem[];
  sessions?: Session[];
  achievements?: Achievement[];
  chat?: ChatStore;
  // v3 flat conversation fields
  conversations?: Conversation[];
  messagesByConvId?: Record<string, ChatMessage[]>;
  activeConversationId?: string | null;
  // Other potential fields in older backups
  projects?: unknown[];
  cycles?: unknown[];
  inbox?: unknown[];
  decks?: unknown[];
  lastActiveRoute?: string;
  favorites?: string[];
}
