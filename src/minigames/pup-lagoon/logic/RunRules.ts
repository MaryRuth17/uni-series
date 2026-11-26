/**
 * The win and lose rules of a vacant (owner change, DECISIONS L-034). Pure: no Phaser, no randomness.
 *
 * You get a baon. Buy food for every line of your listahan. You lose ("game over, start again") if:
 *  - an order costs more than the money you have left (you spent more than your baon), or
 *  - you finish ("Kain na!") with lines still open, or
 *  - the money you have left cannot buy anything that ticks a line you still need.
 * You win when every line is done and you finish.
 */
import type { PromoDef } from '../data/events';
import { MENU } from '../data/menu';
import { purchaseEffect, type PurchaseEffect } from './Catalog';
import type { ListahanLine, Sawsawan, StallKey } from './types';

export type Verdict =
  | { kind: 'win' }
  | { kind: 'overspent'; short: number }
  | { kind: 'incomplete'; missing: string[] }
  | { kind: 'broke'; missing: string[] };

const SAUCES: readonly (Sawsawan | undefined)[] = [undefined, 'matamis', 'maanghang', 'suka'];

/** True if this purchase (with its free item, if any) ticks the line. */
export function ticksLine(line: ListahanLine, effect: PurchaseEffect): boolean {
  if (line.kind === 'item') return line.item === effect.item;
  if (!line.tag) return false;
  return effect.tags.includes(line.tag) || (effect.free?.tags.includes(line.tag) ?? false);
}

/** How much more than the money left this order costs (0 when the wallet covers it). */
export function overspend(orderTotal: number, walletTotal: number): number {
  return Math.max(0, orderTotal - walletTotal);
}

/** The cheapest price that ticks at least one open line, at the open stalls, or null if nothing does. */
export function cheapestNeed(
  open: readonly ListahanLine[],
  stalls: ReadonlySet<StallKey>,
  owned: readonly string[],
  promo: PromoDef | null,
  soldOut: (item: string) => boolean = () => false,
): number | null {
  let best: number | null = null;
  for (const m of MENU) {
    if (m.orderable === false || !stalls.has(m.stall) || soldOut(m.key)) continue;
    if (m.requires !== undefined && !owned.includes(m.requires)) continue;
    for (const sauce of m.needsSawsawan ? SAUCES.slice(1) : SAUCES.slice(0, 1)) {
      const e = purchaseEffect(m.key, sauce, promo);
      if (open.some((l) => ticksLine(l, e)) && (best === null || e.price < best)) best = e.price;
    }
  }
  return best;
}

/** Ending the vacant: win only if every line is done. */
export function judgeFinish(
  lines: readonly ListahanLine[],
  isDone: (id: string) => boolean,
): Verdict {
  const missing = lines.filter((l) => !isDone(l.id)).map((l) => l.id);
  return missing.length ? { kind: 'incomplete', missing } : { kind: 'win' };
}

/**
 * After a payment: if lines are still open but the money left cannot buy anything that ticks one of them,
 * the vacant is lost. Free things (the Tumbler refill) count as affordable.
 */
export function judgeStuck(
  lines: readonly ListahanLine[],
  isDone: (id: string) => boolean,
  walletTotal: number,
  cheapest: number | null,
): Verdict | null {
  const missing = lines.filter((l) => !isDone(l.id)).map((l) => l.id);
  if (!missing.length) return null;
  if (cheapest === null || cheapest > walletTotal) return { kind: 'broke', missing };
  return null;
}
