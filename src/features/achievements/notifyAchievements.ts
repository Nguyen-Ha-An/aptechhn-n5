import { toast } from 'sonner';
import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ACHIEVEMENTS, type AchievementId } from '@/lib/achievements';
import { qk } from '@/lib/queryKeys';

export async function invalidateAchievements(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: qk.achievements });
}

function isKnownAchievementId(id: string): id is AchievementId {
  return Object.prototype.hasOwnProperty.call(ACHIEVEMENTS, id);
}

export async function notifyAchievements(queryClient?: QueryClient): Promise<AchievementId[]> {
  try {
    const { data, error } = await supabase.rpc('check_achievements');
    if (error) {
      console.warn('Failed to check achievements:', error.message);
      return [];
    }

    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    const unlocked: AchievementId[] = [];
    for (const rawId of data) {
      if (typeof rawId === 'string' && isKnownAchievementId(rawId)) {
        unlocked.push(rawId);
        const meta = ACHIEVEMENTS[rawId];
        toast.success(`Achievement unlocked: ${meta.title}`, {
          description: meta.description,
        });
      }
    }

    if (unlocked.length > 0 && queryClient) {
      await invalidateAchievements(queryClient);
    }

    return unlocked;
  } catch (err) {
    console.warn('Unexpected error in notifyAchievements:', err);
    return [];
  }
}
