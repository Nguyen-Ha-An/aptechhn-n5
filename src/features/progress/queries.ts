import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { useSession } from '@/features/auth';
import type { Database } from '@/lib/database.types';

export type UserStatsRow = Database['public']['Views']['user_stats']['Row'];

export interface SessionDistraction {
  id: string;
  category: string;
  note: string | null;
  occurred_at: string;
}

export interface SessionWithDetails {
  id: string;
  user_id: string;
  todo_id: string | null;
  mode: string;
  started_at: string;
  ended_at: string;
  planned_seconds: number | null;
  focused_seconds: number;
  paused_seconds: number;
  phase_count: number;
  focus_rating: number | null;
  reflection: string | null;
  created_at: string;
  todos: { title: string } | null;
  distractions: SessionDistraction[];
}

export interface UserAchievementItem {
  achievement_id: string;
  unlocked_at: string;
}

export type SessionsRange = 7 | 30 | 'all';

/**
 * Reads aggregated statistics from the user_stats view.
 */
export function useUserStats() {
  const { user, status } = useSession();

  return useQuery({
    queryKey: qk.userStats,
    queryFn: async (): Promise<UserStatsRow | null> => {
      if (!user?.id) {
        return null;
      }

      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
    enabled: status === 'signed-in' && Boolean(user?.id),
  });
}

/**
 * Fetches sessions for the given range with linked todo title and distractions list.
 */
export function useSessionsRange(days: SessionsRange) {
  const { user, status } = useSession();

  return useQuery({
    queryKey: qk.sessions(days),
    queryFn: async (): Promise<SessionWithDetails[]> => {
      if (!user?.id) {
        return [];
      }

      let query = supabase
        .from('focus_sessions')
        .select(`
          id,
          user_id,
          todo_id,
          mode,
          started_at,
          ended_at,
          planned_seconds,
          focused_seconds,
          paused_seconds,
          phase_count,
          focus_rating,
          reflection,
          created_at,
          todos ( title ),
          distractions ( id, category, note, occurred_at )
        `)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (days !== 'all') {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('started_at', cutoff);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Format relation results to match typed interface
      return ((data || []) as unknown[]).map((raw) => {
        const item = raw as Record<string, unknown>;
        const rawTodos = item.todos;
        let todosObj: { title: string } | null = null;
        if (Array.isArray(rawTodos) && rawTodos.length > 0) {
          todosObj = rawTodos[0] as { title: string };
        } else if (rawTodos && typeof rawTodos === 'object' && 'title' in rawTodos) {
          todosObj = rawTodos as { title: string };
        }

        const rawDistractions = Array.isArray(item.distractions) ? item.distractions : [];
        const distractions = (rawDistractions as unknown[]).map((d) => {
          const dist = d as Record<string, unknown>;
          return {
            id: String(dist.id ?? ''),
            category: String(dist.category ?? ''),
            note: dist.note != null ? String(dist.note) : null,
            occurred_at: String(dist.occurred_at ?? ''),
          };
        });

        return {
          id: String(item.id),
          user_id: String(item.user_id),
          todo_id: item.todo_id != null ? String(item.todo_id) : null,
          mode: String(item.mode ?? 'timed'),
          started_at: String(item.started_at),
          ended_at: String(item.ended_at),
          planned_seconds: item.planned_seconds != null ? Number(item.planned_seconds) : null,
          focused_seconds: Number(item.focused_seconds ?? 0),
          paused_seconds: Number(item.paused_seconds ?? 0),
          phase_count: Number(item.phase_count ?? 1),
          focus_rating: item.focus_rating != null ? Number(item.focus_rating) : null,
          reflection: item.reflection != null ? String(item.reflection) : null,
          created_at: String(item.created_at),
          todos: todosObj,
          distractions,
        };
      });
    },
    enabled: status === 'signed-in' && Boolean(user?.id),
  });
}

/**
 * Fetches user unlocked achievements from user_achievements table.
 */
export function useAchievements() {
  const { user, status } = useSession();

  return useQuery({
    queryKey: qk.achievements,
    queryFn: async (): Promise<UserAchievementItem[]> => {
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: true });

      if (error) {
        throw error;
      }

      return (data || []) as UserAchievementItem[];
    },
    enabled: status === 'signed-in' && Boolean(user?.id),
  });
}

export interface UpdateSessionVariables {
  sessionId: string;
  focus_rating: number | null;
  reflection: string | null;
}

/**
 * Mutation to update rating and reflection of an existing focus session.
 * Invalidates ['sessions'], qk.userStats, and qk.todayFocus upon completion.
 */
export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, focus_rating, reflection }: UpdateSessionVariables) => {
      const { data, error } = await supabase
        .from('focus_sessions')
        .update({
          focus_rating,
          reflection,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: qk.userStats });
      queryClient.invalidateQueries({ queryKey: qk.todayFocus });
    },
  });
}

/**
 * Mutation to delete a focus session.
 * Invalidates ['sessions'], qk.userStats, and qk.todayFocus upon completion.
 */
export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('focus_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: qk.userStats });
      queryClient.invalidateQueries({ queryKey: qk.todayFocus });
    },
  });
}
