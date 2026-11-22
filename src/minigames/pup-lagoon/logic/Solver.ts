/**
 * Cheapest way to finish a listahan (SPEC-pup-lagoon §13 Solver, with OC-3/OC-8 names).
 * Quantity lines expand into units; a state is (units done, busog capped at the target, tumbler used).
 * Dijkstra over states where each edge buys one candidate for the player or for one friend line.
 * Results:
 *  - minCost / planComplete: every line ticked (the Sulit Master! baseline).
 *  - minCostBusog / planBusog: every line ticked and busog at the target.
 */
import type { PromoDef } from '../data/events';
import { orderableItems, type PurchaseEffect, purchaseEffect } from './Catalog';
import { lineMatches } from './Listahan';
import type { ListahanLine, Sawsawan, StallKey } from './types';

export interface PlanStep {
  item: string;
  sauce?: Sawsawan;
  stall: StallKey;
  price: number;
  /** Set when the item is bought for a friend line (pasabay or pang-barkada). */
  forLine?: string;
}

export interface SolveResult {
  minCost: number | null;
  planComplete: PlanStep[] | null;
  minCostBusog: number | null;
  planBusog: PlanStep[] | null;
}

export interface CandidateOptions {
  open: ReadonlySet<StallKey>;
  owned: readonly string[];
  soldOut?: ReadonlySet<string>;
  promo?: PromoDef | null;
  /** Bawal maanghang: leave out everything spicy. */
  noSpicy?: boolean;
}

/** Every purchase the player could make. Tusok items appear with and without maanghang sawsawan. */
export function buildCandidates(opts: CandidateOptions): PurchaseEffect[] {
  const out: PurchaseEffect[] = [];
  for (const m of orderableItems(opts.open, opts.owned)) {
    if (opts.soldOut?.has(m.key)) continue;
    const sauces: (Sawsawan | undefined)[] = m.needsSawsawan ? ['suka', 'maanghang'] : [undefined];
    for (const sauce of sauces) {
      const effect = purchaseEffect(m.key, sauce, opts.promo ?? null);
      if (opts.noSpicy && effect.spicy) continue;
      out.push(effect);
    }
  }
  return out;
}

interface Node {
  cost: number;
  prev: number;
  step: PlanStep | null;
}

export function solve(
  lines: readonly ListahanLine[],
  candidates: readonly PurchaseEffect[],
  busogTarget: number,
  maxCost = 1000,
): SolveResult {
  // Units: line i owns bits [start[i], start[i] + qty).
  const start: number[] = [];
  let units = 0;
  for (const l of lines) {
    start.push(units);
    units += l.qty;
  }
  if (units > 16) throw new Error('Solver: too many units');
  const full = (1 << units) - 1;
  const target = Math.max(0, busogTarget);

  const tickLine = (mask: number, i: number): number => {
    for (let u = 0; u < lines[i].qty; u++) {
      const bit = 1 << (start[i] + u);
      if (!(mask & bit)) return mask | bit;
    }
    return mask;
  };
  const tickAll = (mask: number, idx: readonly number[]): number => {
    let m = mask;
    for (const i of idx) m = tickLine(m, i);
    return m;
  };
  const edges = prepareEdges(lines, candidates);

  const key = (mask: number, busog: number, once: number): number =>
    (mask * (target + 1) + busog) * 2 + once;

  const nodes = new Map<number, Node>();
  const buckets: number[][] = [];
  const push = (k: number, cost: number, prev: number, step: PlanStep | null): void => {
    if (cost > maxCost) return;
    const seen = nodes.get(k);
    if (seen && seen.cost <= cost) return;
    nodes.set(k, { cost, prev, step });
    (buckets[cost] ??= []).push(k);
  };

  const result: SolveResult = {
    minCost: null,
    planComplete: null,
    minCostBusog: null,
    planBusog: null,
  };
  const planTo = (k: number): PlanStep[] => {
    const plan: PlanStep[] = [];
    for (let at = k; at >= 0;) {
      const n = nodes.get(at) as Node;
      if (n.step) plan.unshift(n.step);
      at = n.prev;
    }
    return plan;
  };

  push(key(0, 0, 0), 0, -1, null);
  const done = new Set<number>();
  for (let cost = 0; cost < buckets.length; cost++) {
    const bucket = buckets[cost];
    if (!bucket) continue;
    for (let b = 0; b < bucket.length; b++) {
      const k = bucket[b];
      if (done.has(k) || (nodes.get(k) as Node).cost !== cost) continue;
      done.add(k);
      const once = k % 2;
      const busog = Math.floor(k / 2) % (target + 1);
      const mask = Math.floor(k / 2 / (target + 1));

      if (mask === full && result.minCost === null) {
        result.minCost = cost;
        result.planComplete = planTo(k);
      }
      if (mask === full && busog === target) {
        result.minCostBusog = cost;
        result.planBusog = planTo(k);
        return result;
      }

      for (const e of edges) {
        const c = e.c;
        if (e.once && once) continue;
        const nextOnce = e.once ? 1 : once;
        const base = { item: c.item, sauce: c.sauce, stall: c.stall, price: c.price };

        // Bought for the player: ticks every matching player line, adds busog.
        let m = mask;
        for (let copy = 0; copy < c.copies; copy++) m = tickAll(m, e.player);
        m = tickAll(m, e.free);
        const nb = Math.min(target, busog + e.gain);
        if (m !== mask || nb !== busog) push(key(m, nb, nextOnce), cost + c.price, k, base);

        // Bought for a friend line: ticks only that line, no busog.
        for (const i of e.friend) {
          let fm = mask;
          for (let copy = 0; copy < c.copies; copy++) fm = tickLine(fm, i);
          if (fm !== mask) {
            push(key(fm, busog, nextOnce), cost + c.price, k, { ...base, forLine: lines[i].id });
          }
        }
      }
    }
  }
  return result;
}

interface Edge {
  c: PurchaseEffect;
  /** Player lines this purchase ticks (per copy), friend lines it can be bought for, free-item lines. */
  player: number[];
  friend: number[];
  free: number[];
  gain: number;
  once: boolean;
}

/**
 * Precompute which lines each candidate ticks, and drop dominated candidates: among purchases that
 * tick exactly the same lines, keep only those not beaten by a cheaper one with at least as much busog.
 */
function prepareEdges(
  lines: readonly ListahanLine[],
  candidates: readonly PurchaseEffect[],
): Edge[] {
  const groups = new Map<string, Edge[]>();
  for (const c of candidates) {
    const player: number[] = [];
    const friend: number[] = [];
    const free: number[] = [];
    lines.forEach((l, i) => {
      if (!lineMatches(l, c.item, c.tags)) return;
      if (l.forFriends) friend.push(i);
      else player.push(i);
    });
    if (c.free) {
      const f = c.free;
      lines.forEach((l, i) => {
        if (!l.forFriends && lineMatches(l, f.item, f.tags)) free.push(i);
      });
    }
    const edge: Edge = {
      c,
      player,
      friend,
      free,
      gain: c.busog * c.copies + (c.free?.busog ?? 0),
      once: c.item === 'tumbler_water',
    };
    const sig = [player.join(','), friend.join(','), free.join(','), c.copies, edge.once].join('|');
    const list = groups.get(sig) ?? [];
    list.push(edge);
    groups.set(sig, list);
  }
  const out: Edge[] = [];
  for (const list of groups.values()) {
    list.sort((a, b) => a.c.price - b.c.price || b.gain - a.gain);
    let bestGain = -1;
    for (const e of list) {
      if (e.gain > bestGain) {
        out.push(e);
        bestGain = e.gain;
      }
    }
  }
  return out;
}
