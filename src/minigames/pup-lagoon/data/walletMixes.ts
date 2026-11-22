/**
 * How each baon amount arrives as coins and bills (SPEC-pup-lagoon §9.1).
 * Each list goes from small pieces to big bills; later tiers favour the big-bill end,
 * which makes "walang panukli" matter.
 */
import type { Denom } from '../logic/types';

export const WALLET_MIXES: Readonly<Record<number, readonly (readonly Denom[])[]>> = {
  50: [[20, 10, 10, 5, 5], [20, 20, 10], [50]],
  60: [
    [20, 20, 10, 5, 5],
    [20, 20, 20],
    [50, 10],
  ],
  70: [
    [20, 20, 20, 10],
    [50, 10, 5, 5],
    [50, 20],
  ],
  80: [
    [20, 20, 20, 10, 5, 5],
    [20, 20, 20, 20],
    [50, 20, 10],
  ],
  150: [
    [50, 50, 20, 20, 10],
    [100, 20, 20, 10],
    [100, 50],
  ],
};

/**
 * Last-resort mix with small pieces, so almost any plan can be paid exactly.
 * 70 → [20, 20, 10, 10, 5, 1, 1, 1, 1, 1].
 */
export function smallChangeMix(amount: number): Denom[] {
  const out: Denom[] = [];
  let rest = amount;
  const take = (d: Denom, keep: number): void => {
    while (rest - d >= keep) {
      out.push(d);
      rest -= d;
    }
  };
  take(20, 30);
  take(10, 10);
  take(5, 5);
  take(1, 0);
  return out;
}
