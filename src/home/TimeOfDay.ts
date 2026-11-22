/**
 * Device time → landing phase (SPEC-homepage §3.4). Pure: no Phaser.
 * Umaga 6:00–10:59, Tanghali 11:00–14:59, Hapon 15:00–18:29, Gabi 18:30–5:59.
 * The "Golden hour" theme always shows hapon.
 */
import type { Theme } from '../core/SaveManager';

export type Phase = 'umaga' | 'tanghali' | 'hapon' | 'gabi';

export function phaseAt(date: Date, theme: Theme = 'auto'): Phase {
  if (theme === 'golden') return 'hapon';
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes >= 6 * 60 && minutes < 11 * 60) return 'umaga';
  if (minutes >= 11 * 60 && minutes < 15 * 60) return 'tanghali';
  if (minutes >= 15 * 60 && minutes < 18 * 60 + 30) return 'hapon';
  return 'gabi';
}

/** December brings parols and a Christmas jingle (§2 seasonal touch). */
export function isDecember(date: Date): boolean {
  return date.getMonth() === 11;
}
