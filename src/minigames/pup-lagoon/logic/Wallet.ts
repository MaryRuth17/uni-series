/**
 * The player's wallet and Smart pay (SPEC-pup-lagoon §5, §13).
 * Smart pay picks the exact amount if the wallet can make it; otherwise the smallest overpayment the
 * vendor can give change for, then the fewest pieces.
 */
import { makeChange } from './CashBox';
import {
  addMoney,
  containsMoney,
  DENOMS_DESC,
  emptyMoney,
  type Money,
  moneyTotal,
  subMoney,
} from './Money';
import type { Denom } from './types';

export function smartPay(wallet: Money, total: number, vendorBox: Money): Money | null {
  if (moneyTotal(wallet) < total) return null;
  let best: Money | null = null;
  let bestOver = Infinity;
  let bestPieces = Infinity;
  const pick: Record<Denom, number> = { ...emptyMoney() };

  const visit = (i: number, sum: number, pieces: number): void => {
    if (i === DENOMS_DESC.length) {
      if (sum < total) return;
      const over = sum - total;
      if (over > bestOver || (over === bestOver && pieces >= bestPieces)) return;
      if (over > 0 && makeChange(over, vendorBox) === null) return;
      best = { ...pick };
      bestOver = over;
      bestPieces = pieces;
      return;
    }
    const d = DENOMS_DESC[i];
    for (let n = 0; n <= wallet[d]; n++) {
      pick[d] = n;
      visit(i + 1, sum + n * d, pieces + n);
    }
    pick[d] = 0;
  };
  visit(0, 0, 0);
  return best;
}

export class Wallet {
  private held: Money;

  constructor(start: Money) {
    this.held = start;
  }

  get money(): Money {
    return this.held;
  }

  get total(): number {
    return moneyTotal(this.held);
  }

  has(pieces: Money): boolean {
    return containsMoney(this.held, pieces);
  }

  take(pieces: Money): void {
    this.held = subMoney(this.held, pieces);
  }

  give(pieces: Money): void {
    this.held = addMoney(this.held, pieces);
  }

  smartPay(total: number, vendorBox: Money): Money | null {
    return smartPay(this.held, total, vendorBox);
  }
}
