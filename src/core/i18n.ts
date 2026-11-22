/**
 * t('key') lookup (SPEC §9 Language). Keys are flat, prefixed by area: 'landing.subtitle', 'map.ride'.
 * Filipino falls back to English per key until M6 translates the UI; a missing key shows the key itself.
 * Parameters: t('landing.welcomeBack', { name: 'Ana' }) fills {name}.
 */
import en from '../i18n/en.json';
import fil from '../i18n/fil.json';
import type { Language } from './SaveManager';

const DICTS: Record<Language, Record<string, string>> = { en, fil };
let current: Language = 'en';

export function setLanguage(language: Language): void {
  current = language;
}

export function getLanguage(): Language {
  return current;
}

export function hasKey(key: string): boolean {
  return key in DICTS.en;
}

export function t(key: string, params: Record<string, string | number> = {}): string {
  const text = DICTS[current][key] ?? DICTS.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}
