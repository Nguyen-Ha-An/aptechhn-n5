import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out';

export interface SessionContextValue {
  session: Session | null;
  user: User | null;
  status: AuthStatus;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() =>
    isSupabaseConfigured ? 'loading' : 'signed-out',
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isMounted = true;

    // Fetch initial session
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        if (!isMounted) return;
        if (initialSession) {
          setSession(initialSession);
          setStatus('signed-in');
        } else {
          setSession(null);
          setStatus('signed-out');
        }
      })
      .catch((err) => {
        console.warn('Failed to load initial session:', err);
        if (isMounted) {
          setSession(null);
          setStatus('signed-out');
        }
      });

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return;
      if (currentSession) {
        setSession(currentSession);
        setStatus('signed-in');
      } else {
        setSession(null);
        setStatus('signed-out');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value: SessionContextValue = {
    session,
    user: session?.user ?? null,
    status,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (context !== undefined) {
    return context;
  }

  // Fallback for isolated usage or test environments without AuthProvider
  return {
    session: null,
    user: null,
    status: isSupabaseConfigured ? 'loading' : 'signed-out',
  };
}
