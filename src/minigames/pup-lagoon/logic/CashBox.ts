/**
 * Vendor change-making (SPEC-pup-lagoon §13 Sukli). A vendor gives sukli only from what is in their box;
 * if no exact combination exists, it is "walang panukli".
 */
import { CASH_BOXES } from '../config';
import {
  addMoney,
  DENOMS_DESC,
  emptyMoney,
  type Money,
  moneyOf,
  moneyTotal,
  subMoney,
} from './Money';
import type { CashLevel, Denom } from './types';

export function startingBox(level: CashLevel): Money {
  return moneyOf(CASH_BOXES[level]);
}

/**
 * Pieces from `box` that add up to `amount`: greedy largest-first, then a bounded search for the
 * exact combination with the fewest pieces. Null when no combination exists (walang panukli).
 */
export function makeChange(amount: number, box: Money): Money | null {
  if (amount < 0) return null;
  if (amount === 0) return emptyMoney();

  const greedy: Record<Denom, number> = { ...emptyMoney() };
  let rest = amount;
  for (const d of DENOMS_DESC) {
    const n = Math.min(box[d], Math.floor(rest / d));
    greedy[d] = n;
    rest -= n * d;
  }
  if (rest === 0) return greedy;

  if (moneyTotal(box) < amount) return null;
  let best: Record<Denom, number> | null = null;
  let bestPieces = Infinity;
  const pick: Record<Denom, number> = { ...emptyMoney() };
  const search = (i: number, remaining: number, pieces: number): void => {
    if (pieces >= bestPieces) return;
    if (remaining === 0) {
      best = { ...pick };
      bestPieces = pieces;
      return;
    }
    if (i >= DENOMS_DESC.length) return;
    const d = DENOMS_DESC[i];
    for (let n = Math.min(box[d], Math.floor(remaining / d)); n >= 0; n--) {
      pick[d] = n;
      search(i + 1, remaining - n * d, pieces + n);
    }
    pick[d] = 0;
  };
  search(0, amount, 0);
  return best;
}

export type SaleResult =
  | { ok: true; change: Money }
  | { ok: false; reason: 'kulang'; short: number }
  | { ok: false; reason: 'walangPanukli' };

/** A vendor's cash box. Paid pieces go in; sukli comes out (§13: box += paid, box −= change). */
export class CashBox {
  private box: Money;

  constructor(start: Money) {
    this.box = start;
  }

  get money(): Money {
    return this.box;
  }

  /** Try a sale without changing anything. */
  quote(paid: Money, total: number): SaleResult {
    const sum = moneyTotal(paid);
    if (sum < total) return { ok: false, reason: 'kulang', short: total - sum };
    const change = makeChange(sum - total, this.box);
    return change ? { ok: true, change } : { ok: false, reason: 'walangPanukli' };
  }

  /** Complete a sale: change comes from the box before the paid pieces go in. */
  sell(paid: Money, total: number): SaleResult {
    const result = this.quote(paid, total);
    if (result.ok) this.box = addMoney(subMoney(this.box, result.change), paid);
    return result;
  }
}
