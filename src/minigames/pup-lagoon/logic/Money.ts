/**
 * Physical money as counts per denomination (SPEC-pup-lagoon §5). Pure helpers; values are immutable.
 */
import type { Denom } from './types';

export type Money = Readonly<Record<Denom, number>>;

/** Largest first: the order vendors count change in. */
export const DENOMS_DESC: readonly Denom[] = [100, 50, 20, 10, 5, 1];

export function emptyMoney(): Money {
  return { 1: 0, 5: 0, 10: 0, 20: 0, 50: 0, 100: 0 };
}

export function moneyOf(pieces: readonly Denom[]): Money {
  const m: Record<Denom, number> = { ...emptyMoney() };
  for (const p of pieces) m[p] += 1;
  return m;
}

export function moneyTotal(m: Money): number {
  let sum = 0;
  for (const d of DENOMS_DESC) sum += d * m[d];
  return sum;
}

export function pieceCount(m: Money): number {
  let n = 0;
  for (const d of DENOMS_DESC) n += m[d];
  return n;
}

export function addMoney(a: Money, b: Money): Money {
  const m: Record<Denom, number> = { ...emptyMoney() };
  for (const d of DENOMS_DESC) m[d] = a[d] + b[d];
  return m;
}

/** True if `a` holds at least every piece in `b`. */
export function containsMoney(a: Money, b: Money): boolean {
  return DENOMS_DESC.every((d) => a[d] >= b[d]);
}

/** a − b. Throws if `a` does not hold the pieces, so money can never go negative. */
export function subMoney(a: Money, b: Money): Money {
  if (!containsMoney(a, b)) throw new Error('subMoney: not enough pieces');
  const m: Record<Denom, number> = { ...emptyMoney() };
  for (const d of DENOMS_DESC) m[d] = a[d] - b[d];
  return m;
}

/** Pieces, largest first, e.g. [50, 10, 5, 5]. */
export function toPieces(m: Money): Denom[] {
  const out: Denom[] = [];
  for (const d of DENOMS_DESC) for (let i = 0; i < m[d]; i++) out.push(d);
  return out;
}

/** Fewest pieces for an amount with unlimited denominations (used for pasabay money). */
export function greedyPieces(amount: number): Denom[] {
  const out: Denom[] = [];
  let rest = amount;
  for (const d of DENOMS_DESC) {
    while (rest >= d) {
      out.push(d);
      rest -= d;
    }
  }
  return out;
}
