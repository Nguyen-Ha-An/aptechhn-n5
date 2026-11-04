import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { useSession } from '@/features/auth';
import { notifyAchievements } from '@/features/achievements/notifyAchievements';
import type { FocusState } from './focusMachine';
import { focusedMs } from './focusMachine';

export interface OpenTodo {
  id: string;
  title: string;
}

export function useOpenTodos() {
  const { user, status } = useSession();

  return useQuery({
    queryKey: qk.openTodos,
    queryFn: async (): Promise<OpenTodo[]> => {
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('todos')
        .select('id, title')
        .eq('done', false)
        .order('position');

      if (error) {
        throw error;
      }

      return data ?? [];
    },
    enabled: status === 'signed-in' && Boolean(user?.id),
  });
}

export interface SaveSessionInput {
  state: FocusState;
  rating?: number | null;
  reflection?: string | null;
}

export function useSaveSession() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ state, rating, reflection }: SaveSessionInput) => {
      if (!user?.id) {
        throw new Error('You must be signed in to save a session.');
      }
      if (!state.sessionId) {
        throw new Error('Session ID is missing.');
      }
      if (state.startedAt === null) {
        throw new Error('Session has not started.');
      }

      const now = Date.now();
      const endedAtMs = state.pausedAt ?? now;
      const focusedSeconds = Math.max(0, Math.round(focusedMs(state, now) / 1000));
      const pausedSeconds = Math.max(0, Math.round(state.pausedTotalMs / 1000));
      const plannedSeconds =
        state.plannedMs !== null ? Math.max(0, Math.round(state.plannedMs / 1000)) : null;

      const sessionRow = {
        id: state.sessionId,
        user_id: user.id,
        todo_id: state.todoId || null,
        mode: state.mode,
        started_at: new Date(state.startedAt).toISOString(),
        ended_at: new Date(endedAtMs).toISOString(),
        planned_seconds: plannedSeconds,
        focused_seconds: focusedSeconds,
        paused_seconds: pausedSeconds,
        phase_count: Math.max(1, state.completedCycles),
        focus_rating: rating ?? null,
        reflection: reflection ? reflection.trim() : null,
      };

      const { error: sessionError } = await supabase
        .from('focus_sessions')
        .upsert(sessionRow);

      if (sessionError) {
        throw sessionError;
      }

      if (state.distractions.length > 0) {
        const distractionRows = state.distractions.map((d) => ({
          id: d.id,
          session_id: state.sessionId,
          user_id: user.id,
          category: d.category,
          note: d.note ? d.note.trim() : null,
          occurred_at: new Date(d.at).toISOString(),
        }));

        const { error: distError } = await supabase
          .from('distractions')
          .upsert(distractionRows);

        if (distError) {
          throw distError;
        }
      }

      // Invalidate relevant queries per controller ruling:
      // Invalidate qk.todayFocus, qk.sessions (all ranges: prefix ['sessions']), qk.userStats, qk.achievements
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.todayFocus }),
        queryClient.invalidateQueries({ queryKey: ['sessions'] }),
        queryClient.invalidateQueries({ queryKey: qk.userStats }),
        queryClient.invalidateQueries({ queryKey: qk.achievements }),
      ]);

      // Check achievements and toast new ones
      await notifyAchievements(queryClient);

      return { sessionId: state.sessionId };
    },
  });
}
