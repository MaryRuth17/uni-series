/**
 * What the campus map shows for each minigame's progress (DECISIONS H-006, SPEC-pup-lagoon OC-12).
 * The map never reads stars: each minigame turns its own save data into a pin label and card lines.
 */
import type { SaveData } from '../core/SaveManager';
import type { LagoonProgress } from './pup-lagoon/logic/Progress';
import { rosterEntry } from './roster';

export interface ProgressSummary {
  /** Short label under the pin, e.g. "₱240"; null shows nothing. */
  pin: { key: string; params: Record<string, string | number> } | null;
  /** Lines for the campus card's progress area. */
  lines: { key: string; params?: Record<string, string | number> }[];
  /** Savings this minigame adds to the map's ipon total. */
  ipon: number;
}

export function summaryFor(id: string, save: SaveData): ProgressSummary {
  const entry = rosterEntry(id);
  if (entry.status !== 'playable') return { pin: null, lines: [], ipon: 0 };
  const hasSticker = save.stickers.includes(entry.stickerId);
  if (id === 'pup-lagoon') {
    const p = (save.minigames['pup-lagoon'] ?? {}) as Partial<LagoonProgress>;
    const ipon = typeof p.iponBalance === 'number' ? p.iponBalance : 0;
    const vacants = typeof p.vacants === 'number' ? p.vacants : 0;
    return {
      pin: { key: 'map.ipon', params: { ipon } },
      lines: [
        { key: 'map.progress', params: { vacants, ipon } },
        { key: hasSticker ? 'map.sticker.yes' : 'map.sticker.no' },
      ],
      ipon,
    };
  }
  return {
    pin: null,
    lines: [{ key: hasSticker ? 'map.sticker.yes' : 'map.sticker.no' }],
    ipon: 0,
  };
}

/** Total savings across every minigame (map HUD "Ipon total"). */
export function totalIpon(save: SaveData, ids: readonly string[]): number {
  return ids.reduce((sum, id) => sum + summaryFor(id, save).ipon, 0);
}
