import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { useSession } from '@/features/auth';
import { localDayKey, todayKey, browserTimeZone } from '@/lib/dates';
import type { Database } from '@/lib/database.types';

export type RecentNote = Pick<
  Database['public']['Tables']['notes']['Row'],
  'id' | 'title' | 'icon' | 'updated_at'
>;

export interface TodayFocusSummary {
  totalMinutes: number;
  sessionCount: number;
}

export function useTodayFocus(timezone?: string) {
  const { user, status } = useSession();
  const tz = timezone || browserTimeZone();

  return useQuery({
    queryKey: qk.todayFocus,
    queryFn: async (): Promise<TodayFocusSummary> => {
      if (!user?.id) {
        return { totalMinutes: 0, sessionCount: 0 };
      }

      const { data, error } = await supabase
        .from('focus_sessions')
        .select('id, started_at, focused_seconds')
        .order('started_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const today = todayKey(tz);
      const todaysSessions = (data || []).filter(
        (session) => localDayKey(session.started_at, tz) === today,
      );

      const totalSeconds = todaysSessions.reduce(
        (acc, curr) => acc + (curr.focused_seconds || 0),
        0,
      );

      return {
        totalMinutes: Math.round(totalSeconds / 60),
        sessionCount: todaysSessions.length,
      };
    },
    enabled: status === 'signed-in' && Boolean(user?.id),
  });
}

export function useRecentNotes() {
  const { user, status } = useSession();

  return useQuery({
    queryKey: qk.recentNotes,
    queryFn: async (): Promise<RecentNote[]> => {
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('notes')
        .select('id, title, icon, updated_at')
        .is('archived_at', null)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    },
    enabled: status === 'signed-in' && Boolean(user?.id),
  });
}
