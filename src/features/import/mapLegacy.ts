import type { AppState } from './legacy/legacyTypes';
import type { ParsedAppState } from './parseLegacy';
import { markdownToDoc, type LinkResolverResult } from './markdownToDoc';
import type { Database, Json } from '@/lib/database.types';

export type TodoInsert = Database['public']['Tables']['todos']['Insert'];
export type NoteInsert = Database['public']['Tables']['notes']['Insert'];
export type NoteLinkInsert = Database['public']['Tables']['note_links']['Insert'];
export type FocusSessionInsert = Database['public']['Tables']['focus_sessions']['Insert'];
export type DistractionInsert = Database['public']['Tables']['distractions']['Insert'];
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type UserAchievementInsert = Database['public']['Tables']['user_achievements']['Insert'];

export interface SkippedItemReport {
  category: string;
  count: number;
  reason: string;
}

export interface MapLegacyResult {
  counts: {
    todos: number;
    notes: number;
    note_links: number;
    focus_sessions: number;
    distractions: number;
    conversations: number;
    messages: number;
    achievements: number;
    total: number;
  };
  skipped: SkippedItemReport[];
  payloads: {
    todos: TodoInsert[];
    notes: NoteInsert[];
    note_links: NoteLinkInsert[];
    focus_sessions: FocusSessionInsert[];
    distractions: DistractionInsert[];
    conversations: ConversationInsert[];
    messages: MessageInsert[];
    achievements: UserAchievementInsert[];
  };
  idMap: Record<string, string>;
}

const VALID_DISTRACTION_CATEGORIES = new Set([
  'phone',
  'social',
  'noise',
  'people',
  'hunger',
  'tired',
  'thoughts',
  'other',
]);

const ACHIEVEMENT_ID_MAP: Record<string, string> = {
  first_session: 'first_session',
  marathon: 'focus_marathon',
  streak_3: 'streak_3',
  streak_7: 'streak_7',
  note_taker: 'note_taker',
};

function mapPriority(p?: string | null): 'none' | 'low' | 'medium' | 'high' {
  if (!p) return 'none';
  const lower = p.toLowerCase();
  if (lower === 'urgent') return 'high';
  if (lower === 'low' || lower === 'medium' || lower === 'high') return lower;
  return 'none';
}

function mapDistractionCategory(
  cat?: string | null,
): 'phone' | 'social' | 'noise' | 'people' | 'hunger' | 'tired' | 'thoughts' | 'other' {
  if (!cat) return 'other';
  const lower = cat.toLowerCase();
  return VALID_DISTRACTION_CATEGORIES.has(lower)
    ? (lower as 'phone' | 'social' | 'noise' | 'people' | 'hunger' | 'tired' | 'thoughts' | 'other')
    : 'other';
}

export function mapLegacy(
  appState: ParsedAppState | AppState,
  userId?: string,
): MapLegacyResult {
  const now = new Date().toISOString();
  const idMap: Record<string, string> = {};
  const skippedReports: SkippedItemReport[] = [];

  // 1. Map Notes first to build title map and assign new UUIDs
  const rawNotes = appState.notes ?? [];
  const titleToNoteMap = new Map<string, { id: string; label: string }>();

  for (const rawNote of rawNotes) {
    const newNoteId = crypto.randomUUID();
    idMap[rawNote.id] = newNoteId;
    const titleKey = (rawNote.title || '').trim().toLowerCase();
    if (titleKey && !titleToNoteMap.has(titleKey)) {
      titleToNoteMap.set(titleKey, {
        id: newNoteId,
        label: rawNote.title || 'Untitled',
      });
    }
  }

  const resolveLink = (title: string): LinkResolverResult | null => {
    const key = title.trim().toLowerCase();
    return titleToNoteMap.get(key) ?? null;
  };

  const notesPayload: NoteInsert[] = [];
  const noteLinksSet = new Set<string>();
  const noteLinksPayload: NoteLinkInsert[] = [];

  for (const rawNote of rawNotes) {
    const noteId = idMap[rawNote.id]!;
    const { doc, content_text } = markdownToDoc(rawNote.content || '', {
      resolveLink,
    });

    // Extract all resolved page links for note_links table
    const findPageLinks = (node: unknown) => {
      if (!node || typeof node !== 'object') return;
      const n = node as Record<string, unknown>;
      if (n.type === 'pageLink' && n.attrs && typeof n.attrs === 'object') {
        const attrs = n.attrs as Record<string, unknown>;
        const targetId = attrs.id as string;
        if (targetId && targetId !== noteId) {
          const key = `${noteId}:${targetId}`;
          if (!noteLinksSet.has(key)) {
            noteLinksSet.add(key);
            noteLinksPayload.push({
              source_id: noteId,
              target_id: targetId,
              ...(userId ? { user_id: userId } : {}),
            });
          }
        }
      }
      if (Array.isArray(n.content)) {
        for (const child of n.content) {
          findPageLinks(child);
        }
      }
    };
    findPageLinks(doc);

    notesPayload.push({
      id: noteId,
      title: rawNote.title || 'Untitled Note',
      content: doc as unknown as Json,
      content_text,
      created_at: rawNote.createdAt || now,
      updated_at: rawNote.updatedAt || now,
      ...(userId ? { user_id: userId } : {}),
    });
  }

  // 2. Map Todos: from legacy todos and legacy tasks
  const todosPayload: TodoInsert[] = [];
  const rawTodos = appState.todos ?? [];
  for (const rawTodo of rawTodos) {
    const newTodoId = crypto.randomUUID();
    idMap[rawTodo.id] = newTodoId;

    const isDone = Boolean(rawTodo.done);
    const completedAt = isDone
      ? rawTodo.updatedAt || rawTodo.createdAt || now
      : null;

    todosPayload.push({
      id: newTodoId,
      title: (rawTodo.title || 'Untitled Todo').slice(0, 500),
      done: isDone,
      priority: mapPriority(rawTodo.priority),
      due_date: rawTodo.dueDate || null,
      completed_at: completedAt,
      created_at: rawTodo.createdAt || now,
      updated_at: rawTodo.updatedAt || now,
      ...(userId ? { user_id: userId } : {}),
    });
  }

  // Old tasks -> todos
  const rawTasks = appState.tasks ?? [];
  for (const rawTask of rawTasks) {
    const newTaskId = crypto.randomUUID();
    idMap[rawTask.id] = newTaskId;

    const isDone = rawTask.status === 'done';
    const completedAt = isDone
      ? rawTask.completedAt || rawTask.updatedAt || rawTask.createdAt || now
      : null;

    todosPayload.push({
      id: newTaskId,
      title: (rawTask.title || 'Untitled Task').slice(0, 500),
      done: isDone,
      priority: mapPriority(rawTask.priority),
      due_date: rawTask.dueDate || null,
      completed_at: completedAt,
      created_at: rawTask.createdAt || now,
      updated_at: rawTask.updatedAt || now,
      ...(userId ? { user_id: userId } : {}),
    });
  }

  // 3. Map Focus Sessions + Distractions
  const rawSessions = appState.sessions ?? [];
  const sessionsPayload: FocusSessionInsert[] = [];
  const distractionsPayload: DistractionInsert[] = [];
  let breakSessionsCount = 0;
  let quizSessionsCount = 0;

  for (const rawSession of rawSessions) {
    if (rawSession.quizScore != null) {
      quizSessionsCount++;
    }

    if (rawSession.type === 'break') {
      breakSessionsCount++;
      continue;
    }

    const newSessionId = crypto.randomUUID();
    idMap[rawSession.id] = newSessionId;

    const startTime = rawSession.startTime || now;
    const durationSec = Math.max(0, rawSession.durationSeconds || 0);
    const endedAt =
      rawSession.endTime ||
      new Date(new Date(startTime).getTime() + durationSec * 1000).toISOString();

    const mappedTodoId = rawSession.linkedTaskId
      ? idMap[rawSession.linkedTaskId] ?? null
      : null;

    let focusRating: number | null = null;
    if (
      typeof rawSession.focusRating === 'number' &&
      rawSession.focusRating >= 1 &&
      rawSession.focusRating <= 5
    ) {
      focusRating = Math.round(rawSession.focusRating);
    }

    sessionsPayload.push({
      id: newSessionId,
      started_at: startTime,
      ended_at: endedAt,
      focused_seconds: durationSec,
      mode: rawSession.mode === 'open' ? 'open' : 'timed',
      planned_seconds: rawSession.plannedDurationSeconds ?? null,
      phase_count: rawSession.phaseCount ?? 1,
      focus_rating: focusRating,
      reflection: rawSession.notes || null,
      todo_id: mappedTodoId,
      created_at: startTime,
      ...(userId ? { user_id: userId } : {}),
    });

    // Distractions
    const rawDistractions = rawSession.distractions ?? [];
    for (const d of rawDistractions) {
      distractionsPayload.push({
        id: crypto.randomUUID(),
        session_id: newSessionId,
        category: mapDistractionCategory(d.category),
        note: d.note || null,
        occurred_at: d.timestamp || startTime,
        ...(userId ? { user_id: userId } : {}),
      });
    }
  }

  // 4. Map Conversations and Messages
  const rawConversations =
    appState.chat?.conversations ?? appState.conversations ?? [];
  const rawMessagesMap =
    appState.chat?.messagesByConvId ?? appState.messagesByConvId ?? {};

  const conversationsPayload: ConversationInsert[] = [];
  const messagesPayload: MessageInsert[] = [];
  let droppedMessagesCount = 0;

  for (const rawConv of rawConversations) {
    const newConvId = crypto.randomUUID();
    idMap[rawConv.id] = newConvId;

    conversationsPayload.push({
      id: newConvId,
      title: rawConv.title || 'New chat',
      created_at: rawConv.createdAt || now,
      updated_at: rawConv.updatedAt || now,
      ...(userId ? { user_id: userId } : {}),
    });

    const messages = rawConv.messages ?? rawMessagesMap[rawConv.id] ?? [];
    for (const msg of messages) {
      if (msg.role === 'system' || !msg.content || !msg.content.trim()) {
        droppedMessagesCount++;
        continue;
      }

      messagesPayload.push({
        id: crypto.randomUUID(),
        conversation_id: newConvId,
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content.trim(),
        created_at: msg.createdAt || rawConv.createdAt || now,
        ...(userId ? { user_id: userId } : {}),
      });
    }
  }

  // 5. Map Achievements
  const rawAchievements = appState.achievements ?? [];
  const achievementsPayload: UserAchievementInsert[] = [];
  const seenAchievements = new Set<string>();
  let droppedAchievementsCount = 0;

  for (const ach of rawAchievements) {
    if (!ach.unlockedAt) {
      continue;
    }
    const mappedId = ACHIEVEMENT_ID_MAP[ach.id];
    if (mappedId) {
      if (!seenAchievements.has(mappedId)) {
        seenAchievements.add(mappedId);
        achievementsPayload.push({
          achievement_id: mappedId,
          unlocked_at: ach.unlockedAt || now,
          ...(userId ? { user_id: userId } : {}),
        });
      }
    } else {
      droppedAchievementsCount++;
    }
  }

  // 6. Record skipped items reports
  const projectsCount = appState.projects?.length || 0;
  if (projectsCount > 0) {
    skippedReports.push({
      category: 'Projects',
      count: projectsCount,
      reason: 'Projects feature was replaced by flat and nested pages.',
    });
  }

  const cyclesCount = appState.cycles?.length || 0;
  if (cyclesCount > 0) {
    skippedReports.push({
      category: 'Cycles',
      count: cyclesCount,
      reason: 'Cycles feature was retired in FocusLearn redesign.',
    });
  }

  const decksCount = appState.decks?.length || 0;
  if (decksCount > 0) {
    skippedReports.push({
      category: 'Flashcards & Decks',
      count: decksCount,
      reason: 'Flashcards and quiz decks were retired.',
    });
  }

  const inboxCount = appState.inbox?.length || 0;
  if (inboxCount > 0) {
    skippedReports.push({
      category: 'Inbox',
      count: inboxCount,
      reason: 'Inbox items were retired in favor of Todos and Pages.',
    });
  }

  if (breakSessionsCount > 0) {
    skippedReports.push({
      category: 'Break Sessions',
      count: breakSessionsCount,
      reason: 'Only focus sessions are retained in session history.',
    });
  }

  if (quizSessionsCount > 0) {
    skippedReports.push({
      category: 'Quiz Data',
      count: quizSessionsCount,
      reason: 'Legacy quiz scores are no longer tracked.',
    });
  }

  if (droppedAchievementsCount > 0) {
    skippedReports.push({
      category: 'Achievements',
      count: droppedAchievementsCount,
      reason: 'Retired achievement categories were omitted.',
    });
  }

  if (droppedMessagesCount > 0) {
    skippedReports.push({
      category: 'System & Empty Messages',
      count: droppedMessagesCount,
      reason: 'System prompts and empty messages are not stored in chat history.',
    });
  }

  const counts = {
    todos: todosPayload.length,
    notes: notesPayload.length,
    note_links: noteLinksPayload.length,
    focus_sessions: sessionsPayload.length,
    distractions: distractionsPayload.length,
    conversations: conversationsPayload.length,
    messages: messagesPayload.length,
    achievements: achievementsPayload.length,
    total:
      todosPayload.length +
      notesPayload.length +
      noteLinksPayload.length +
      sessionsPayload.length +
      distractionsPayload.length +
      conversationsPayload.length +
      messagesPayload.length +
      achievementsPayload.length,
  };

  return {
    counts,
    skipped: skippedReports,
    payloads: {
      todos: todosPayload,
      notes: notesPayload,
      note_links: noteLinksPayload,
      focus_sessions: sessionsPayload,
      distractions: distractionsPayload,
      conversations: conversationsPayload,
      messages: messagesPayload,
      achievements: achievementsPayload,
    },
    idMap,
  };
}
