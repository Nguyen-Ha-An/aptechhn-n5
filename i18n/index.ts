/**
 * i18n System for FocusLearn
 * Type-safe translations with useT() hook
 */

import { createContext, useContext } from 'react';
import { en, TranslationKeys } from './en';
import { vi } from './vi';
import { Language } from '../types';

// Translation dictionaries
export const translations: Record<Language, TranslationKeys> = {
  en,
  vi,
};

// Context for current language
export const LanguageContext = createContext<Language>('en');

// Hook to get translations
export function useT(): TranslationKeys {
  const language = useContext(LanguageContext);
  return translations[language] || en;
}

// Hook to get current language
export function useLanguage(): Language {
  return useContext(LanguageContext);
}

// Helper to get translation by key path (for dynamic keys)
export function getTranslation(lang: Language, path: string): string {
  const t = translations[lang] || en;
  const keys = path.split('.');
  let result: any = t;
  for (const key of keys) {
    result = result?.[key];
    if (result === undefined) return path;
  }
  return typeof result === 'string' ? result : path;
}

export { en, vi };
export type { TranslationKeys };
