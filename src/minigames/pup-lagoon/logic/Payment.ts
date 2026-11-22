/**
 * Can a plan be paid with these coins and bills, given each vendor's cash box? (SPEC-pup-lagoon §13
 * Generator step 5.) Groups the plan into stall visits (at most 5 items each) and tries visit orders,
 * paying each with Smart pay, as a player would.
 */
import { VISIT } from '../config';
import { CashBox } from './CashBox';
import { addMoney, type Money, subMoney } from './Money';
import type { PlanStep } from './Solver';
import type { StallKey } from './types';
import { smartPay } from './Wallet';

export interface Visit {
  stall: StallKey;
  steps: PlanStep[];
  total: number;
}

export function planVisits(plan: readonly PlanStep[]): Visit[] {
  const byStall = new Map<StallKey, PlanStep[]>();
  for (const s of plan) {
    const list = byStall.get(s.stall) ?? [];
    list.push(s);
    byStall.set(s.stall, list);
  }
  const visits: Visit[] = [];
  for (const [stall, steps] of byStall) {
    for (let i = 0; i < steps.length; i += VISIT.maxItems) {
      const chunk = steps.slice(i, i + VISIT.maxItems);
      visits.push({ stall, steps: chunk, total: chunk.reduce((sum, s) => sum + s.price, 0) });
    }
  }
  return visits;
}

/** The first visit order that can be paid in full, or null. */
export function payableOrder(
  wallet: Money,
  boxes: Readonly<Record<StallKey, Money>>,
  visits: readonly Visit[],
): Visit[] | null {
  const tryFrom = (
    w: Money,
    b: Readonly<Record<StallKey, Money>>,
    left: readonly Visit[],
  ): Visit[] | null => {
    if (left.length === 0) return [];
    for (let i = 0; i < left.length; i++) {
      const v = left[i];
      let nextWallet = w;
      let nextBoxes = b;
      if (v.total > 0) {
        const paid = smartPay(w, v.total, b[v.stall]);
        if (!paid) continue;
        const box = new CashBox(b[v.stall]);
        const sale = box.sell(paid, v.total);
        if (!sale.ok) continue;
        nextWallet = addMoney(subMoney(w, paid), sale.change);
        nextBoxes = { ...b, [v.stall]: box.money };
      }
      const rest = tryFrom(nextWallet, nextBoxes, [...left.slice(0, i), ...left.slice(i + 1)]);
      if (rest) return [v, ...rest];
    }
    return null;
  };
  return tryFrom(wallet, boxes, visits);
}
