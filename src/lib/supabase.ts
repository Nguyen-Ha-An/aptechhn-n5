import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && key);

export function assertSupabaseConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase configuration missing: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be defined in your environment.',
    );
  }
}

export function createAppSupabaseClient(
  customUrl?: string,
  customKey?: string,
): SupabaseClient<Database> {
  const finalUrl = customUrl ?? url;
  const finalKey = customKey ?? key;

  if (!finalUrl || !finalKey) {
    throw new Error(
      'Supabase configuration missing: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be defined.',
    );
  }

  return createClient<Database>(finalUrl, finalKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const supabase: SupabaseClient<Database> = (() => {
  if (!url || !key) {
    return new Proxy({} as SupabaseClient<Database>, {
      get(_target, prop) {
        throw new Error(
          `Supabase configuration missing: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is not defined. Cannot access supabase.${String(prop)}.`,
        );
      },
    });
  }

  return createAppSupabaseClient(url, key);
})();
