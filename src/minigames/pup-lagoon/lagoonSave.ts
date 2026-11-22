/**
 * Glue between the core save and Lagoon Merienda's progress (SPEC-pup-lagoon OC-11, DECISIONS D-018).
 * The save seed is made once, from the clock, the first time the player enters the Lagoon; every vacant
 * after that is reproducible from it.
 */
import type { SaveManager } from '../../core/SaveManager';
import { t } from '../../core/i18n';
import { menuItem } from './data/menu';
import { type LagoonProgress, newProgress } from './logic/Progress';
import type { ListahanLine } from './logic/types';

export const LAGOON_ID = 'pup-lagoon';

export function loadProgress(
  save: SaveManager,
  seed: () => number = () => Date.now() >>> 0,
): LagoonProgress {
  const stored = save.data.minigames[LAGOON_ID] as Partial<LagoonProgress> | undefined;
  if (stored && typeof stored.saveSeed === 'number') {
    return { ...newProgress(stored.saveSeed), ...stored } as LagoonProgress;
  }
  const fresh = newProgress(seed());
  save.update((d) => {
    d.minigames[LAGOON_ID] = fresh;
  });
  return fresh;
}

export function storeProgress(save: SaveManager, progress: LagoonProgress): void {
  save.update((d) => {
    d.minigames[LAGOON_ID] = progress;
  });
}

/** How a listahan line reads on the Vacant card and the HUD notebook. */
export function lineText(line: ListahanLine): string {
  const base =
    line.kind === 'tag'
      ? t(`pupLagoon.line.${line.tag}`)
      : t(menuItem(line.item as string).nameKey);
  if (line.owner === 'barkada') return t('pupLagoon.line.barkada', { qty: line.qty, line: base });
  if (line.owner !== 'player') {
    return t('pupLagoon.line.pasabay', { friend: t(`pupLagoon.friend.${line.owner}`), item: base });
  }
  return line.qty > 1 ? t('pupLagoon.line.qty', { line: base, qty: line.qty }) : base;
}
