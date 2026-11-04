import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/features/auth';
import { useProfile } from '@/features/profile/queries';
import { qk } from '@/lib/queryKeys';

const DISMISSED_STORAGE_KEY = 'fl:import-banner-dismissed';

export function ImportBanner() {
  const { user } = useSession();
  const { data: profile } = useProfile();

  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined'
        ? localStorage.getItem(DISMISSED_STORAGE_KEY) === 'true'
        : false;
    } catch {
      return false;
    }
  });

  const { data: todosCount } = useQuery({
    queryKey: qk.todosCountHead,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('todos')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
    enabled: Boolean(user?.id) && !dismissed && !profile?.legacy_imported_at,
  });

  const { data: notesCount } = useQuery({
    queryKey: qk.notesCountHead,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
    enabled: Boolean(user?.id) && !dismissed && !profile?.legacy_imported_at,
  });

  if (dismissed) {
    return null;
  }

  // If already imported or profile not yet loaded, hide banner
  if (!profile || profile.legacy_imported_at != null) {
    return null;
  }

  // Only show when both todos and notes counts are exactly 0
  if (todosCount !== 0 || notesCount !== 0) {
    return null;
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_STORAGE_KEY, 'true');
    } catch {
      // Ignore localStorage errors
    }
    setDismissed(true);
  };

  return (
    <div
      role="region"
      aria-label="Legacy data import"
      className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-surface px-4 py-3 text-sm text-ink"
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        <span>Used FocusLearn before?</span>
        <Link
          to="/settings/import"
          className="font-medium text-accent underline hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
        >
          Import your old data.
        </Link>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-xs text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded px-2 py-1 cursor-pointer"
        aria-label="Dismiss import notice"
      >
        Dismiss
      </button>
    </div>
  );
}
