/**
 * School ID rules (SPEC-homepage §3.3): name up to 12 characters, skin tone (6), hair (8), outfit (4),
 * ID lace colour (6; DECISIONS Q-003 still open). Pure: no Phaser.
 */
import type { Profile } from '../core/SaveManager';

export const ID_OPTIONS = { skin: 6, hair: 8, outfit: 4, lace: 6 } as const;
export const NAME_MAX = 12;
export type IdPart = keyof typeof ID_OPTIONS;

export function emptyProfile(): Profile {
  return { name: '', skin: 0, hair: 0, outfit: 0, lace: 0 };
}

/** Trim, collapse spaces, drop control characters, and cut to 12 characters (not UTF-16 units). */
export function cleanName(raw: string): string {
  const noControl = raw.replace(/[\u0000-\u001f\u007f]/g, '');
  const collapsed = noControl.replace(/\s+/g, ' ').trim();
  return [...collapsed].slice(0, NAME_MAX).join('');
}

/** Next or previous option for a part, wrapping around. */
export function cycle(part: IdPart, value: number, dir: 1 | -1): number {
  const n = ID_OPTIONS[part];
  return (((value + dir) % n) + n) % n;
}

export function validateProfile(p: Profile): { ok: true } | { ok: false; reason: 'name' | 'part' } {
  if (cleanName(p.name).length === 0) return { ok: false, reason: 'name' };
  for (const part of Object.keys(ID_OPTIONS) as IdPart[]) {
    const v = p[part];
    if (!Number.isInteger(v) || v < 0 || v >= ID_OPTIONS[part])
      return { ok: false, reason: 'part' };
  }
  return { ok: true };
}
