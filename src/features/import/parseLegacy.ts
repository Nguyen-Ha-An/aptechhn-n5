import { z } from 'zod';

const TaskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);
const TaskStatusEnum = z.enum(['inbox', 'todo', 'in_progress', 'done']).catch('todo');

const LegacyTaskSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  title: z.string().default('Untitled Task'),
  description: z.string().optional().default(''),
  status: TaskStatusEnum,
  priority: TaskPriorityEnum.optional().nullable(),
  projectId: z.string().nullable().optional(),
  cycleId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  estimateMinutes: z.number().nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  completedAt: z.string().nullable().optional(),
}).passthrough();

const LegacyNoteSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  title: z.string().default('Untitled Note'),
  content: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  projectId: z.string().nullable().optional(),
  linkedTaskIds: z.array(z.string()).optional().default([]),
  linkedSessionIds: z.array(z.string()).optional().default([]),
  backlinks: z.array(z.string()).optional().default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

const LegacyTodoSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  title: z.string().default('Untitled Todo'),
  done: z.boolean().optional().default(false),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
  priority: TaskPriorityEnum.optional().nullable(),
}).passthrough();

const LegacyDistractionSchema = z.object({
  id: z.string().optional(),
  category: z.string().optional().default('other'),
  note: z.string().optional().default(''),
  timestamp: z.string().optional(),
}).passthrough();

const LegacySessionSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  startTime: z.string(),
  endTime: z.string().nullable().optional(),
  type: z.enum(['focus', 'break']).optional().default('focus'),
  durationSeconds: z.number().nonnegative().optional().default(0),
  projectId: z.string().nullable().optional(),
  linkedTaskId: z.string().nullable().optional(),
  linkedNoteId: z.string().nullable().optional(),
  subject: z.string().optional().default(''),
  distractions: z.array(LegacyDistractionSchema).optional().default([]),
  quizScore: z.number().nullable().optional(),
  phaseCount: z.number().optional().default(1),
  notes: z.string().optional().default(''),
  mode: z.enum(['timed', 'open']).optional().default('timed'),
  plannedDurationSeconds: z.number().nullable().optional(),
  focusRating: z.number().nullable().optional(),
}).passthrough();

const LegacyAchievementSchema = z.object({
  id: z.string(),
  title: z.string().optional().default(''),
  description: z.string().optional().default(''),
  icon: z.string().optional().default(''),
  unlockedAt: z.string().nullable().optional(),
}).passthrough();

const LegacyChatMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['user', 'assistant', 'system']).catch('user'),
  content: z.string().optional().default(''),
  createdAt: z.string().optional(),
}).passthrough();

const LegacyConversationSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  title: z.string().default('New chat'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  messages: z.array(LegacyChatMessageSchema).optional(),
}).passthrough();

const LegacyChatStoreSchema = z.object({
  conversations: z.array(LegacyConversationSchema).optional().default([]),
  messagesByConvId: z.record(z.string(), z.array(LegacyChatMessageSchema)).optional().default({}),
  activeConversationId: z.string().nullable().optional(),
}).passthrough();

export const LegacyAppStateSchema = z.object({
  schemaVersion: z
    .number()
    .int()
    .refine((v) => v >= 3 && v <= 5, {
      message: 'Unsupported export schema version. FocusLearn supports versions 3, 4, and 5.',
    }),
  settings: z.record(z.string(), z.unknown()).optional(),
  tasks: z.array(LegacyTaskSchema).optional().default([]),
  notes: z.array(LegacyNoteSchema).optional().default([]),
  todos: z.array(LegacyTodoSchema).optional().default([]),
  sessions: z.array(LegacySessionSchema).optional().default([]),
  achievements: z.array(LegacyAchievementSchema).optional().default([]),
  chat: LegacyChatStoreSchema.optional(),
  conversations: z.array(LegacyConversationSchema).optional(),
  messagesByConvId: z.record(z.string(), z.array(LegacyChatMessageSchema)).optional(),
  activeConversationId: z.string().nullable().optional(),
  projects: z.array(z.unknown()).optional().default([]),
  cycles: z.array(z.unknown()).optional().default([]),
  inbox: z.array(z.unknown()).optional().default([]),
  decks: z.array(z.unknown()).optional().default([]),
  lastActiveRoute: z.string().optional(),
  favorites: z.array(z.string()).optional(),
}).passthrough();

export type ParsedAppState = z.infer<typeof LegacyAppStateSchema>;

export function parseLegacy(input: unknown): ParsedAppState {
  let parsed: unknown = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new Error('Invalid JSON: Could not parse export file.');
    }
  }

  const result = LegacyAppStateSchema.safeParse(parsed);
  if (!result.success) {
    const errorMessages = result.error.issues.map((issue) => issue.message).join('; ');
    throw new Error(`Invalid export data: ${errorMessages}`);
  }

  return result.data as ParsedAppState;
}
