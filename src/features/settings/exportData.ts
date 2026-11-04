import { supabase } from '@/lib/supabase';
import { todayKey } from '@/lib/dates';

export interface FocusLearnExport {
  version: number;
  exported_at: string;
  profiles: unknown[];
  todos: unknown[];
  notes: unknown[];
  note_links: unknown[];
  focus_sessions: unknown[];
  distractions: unknown[];
  user_achievements: unknown[];
  conversations: unknown[];
  messages: unknown[];
  ai_usage: unknown[];
  user_stats: unknown[];
}

export async function fetchAllUserData(): Promise<FocusLearnExport> {
  const [
    profilesRes,
    todosRes,
    notesRes,
    noteLinksRes,
    focusSessionsRes,
    distractionsRes,
    achievementsRes,
    conversationsRes,
    messagesRes,
    aiUsageRes,
    userStatsRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('todos').select('*'),
    supabase.from('notes').select('*'),
    supabase.from('note_links').select('*'),
    supabase.from('focus_sessions').select('*'),
    supabase.from('distractions').select('*'),
    supabase.from('user_achievements').select('*'),
    supabase.from('conversations').select('*'),
    supabase.from('messages').select('*'),
    supabase.from('ai_usage').select('*'),
    supabase.from('user_stats').select('*'),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (todosRes.error) throw todosRes.error;
  if (notesRes.error) throw notesRes.error;
  if (noteLinksRes.error) throw noteLinksRes.error;
  if (focusSessionsRes.error) throw focusSessionsRes.error;
  if (distractionsRes.error) throw distractionsRes.error;
  if (achievementsRes.error) throw achievementsRes.error;
  if (conversationsRes.error) throw conversationsRes.error;
  if (messagesRes.error) throw messagesRes.error;
  if (aiUsageRes.error) throw aiUsageRes.error;
  if (userStatsRes.error) throw userStatsRes.error;

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    profiles: profilesRes.data ?? [],
    todos: todosRes.data ?? [],
    notes: notesRes.data ?? [],
    note_links: noteLinksRes.data ?? [],
    focus_sessions: focusSessionsRes.data ?? [],
    distractions: distractionsRes.data ?? [],
    user_achievements: achievementsRes.data ?? [],
    conversations: conversationsRes.data ?? [],
    messages: messagesRes.data ?? [],
    ai_usage: aiUsageRes.data ?? [],
    user_stats: userStatsRes.data ?? [],
  };
}

export function triggerDownloadJson(
  data: unknown,
  filename: string,
): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function exportUserData(timezone = 'Asia/Ho_Chi_Minh'): Promise<void> {
  const data = await fetchAllUserData();
  const day = todayKey(timezone);
  const filename = `focuslearn-export-${day}.json`;
  triggerDownloadJson(data, filename);
}
