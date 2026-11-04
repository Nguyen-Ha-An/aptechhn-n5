import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useProfile } from '@/features/profile/queries';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
});

function getStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem('fl:theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // Ignore localStorage access failures
  }
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();
  const themePref: ThemePreference =
    (profile?.theme as ThemePreference | undefined) ?? getStoredTheme();

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark') {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    try {
      localStorage.setItem('fl:theme', themePref);
    } catch {
      // Ignore
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateResolved = () => {
      const isDark =
        themePref === 'dark' || (themePref === 'system' && mediaQuery.matches);
      const nextResolved: ResolvedTheme = isDark ? 'dark' : 'light';
      document.documentElement.dataset.theme = nextResolved;
      setResolvedTheme(nextResolved);
    };

    updateResolved();

    if (themePref === 'system') {
      mediaQuery.addEventListener('change', updateResolved);
      return () => mediaQuery.removeEventListener('change', updateResolved);
    }
  }, [themePref]);

  return (
    <ThemeContext.Provider value={{ theme: themePref, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
