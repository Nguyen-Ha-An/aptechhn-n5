import { supabase } from '@/lib/supabase';

export async function deleteUserAccount(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('You must be signed in to delete your account.');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error('Supabase client is not configured.');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: publishableKey,
    },
  });

  if (!response.ok && response.status !== 204) {
    let errorMsg = 'Failed to delete account.';
    try {
      const data = await response.json();
      if (data?.error) {
        errorMsg = data.error;
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorMsg);
  }

  await supabase.auth.signOut();
}
