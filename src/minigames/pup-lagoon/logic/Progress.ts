/**
 * Endless progress between vacants (SPEC-pup-lagoon OC-6, OC-7, OC-11, §9.4): ipon balance and lifetime
 * total, alkansya breaks, suki levels, friendship hearts, photo album, stamps and the Ipon Shop.
 * Plain data in, new plain data out, so SaveManager can store it as JSON.
 */
import { ALKANSYA, HEARTS, IPON_SHOP, PHOTO_EVERY, SUKI } from '../config';
import { openStalls, tierFor } from './Catalog';
import type { FriendKey, StallKey } from './types';
import { FRIENDS } from './types';
import type { Stamps } from './Scoring';

export interface LagoonProgress {
  /** Vacants finished. The next vacant is vacants + 1. */
  vacants: number;
  saveSeed: number;
  iponBalance: number;
  iponLifetime: number;
  alkansyaBreaks: number;
  /** Distinct vacants with a purchase at each stall. */
  suki: Partial<Record<StallKey, number>>;
  hearts: Record<FriendKey, number>;
  owned: string[];
  album: { vacant: number; food: string }[];
  stamps: { kumpleto: number; busog: number; sulit: number };
  /** Player food keys of the last PHOTO_EVERY vacants, for the album's favourite food. */
  recentFoods: string[][];
  /** Rewards from alkansya breaks and friend gifts (cosmetics and stickers). */
  rewards: string[];
}

/** What LagoonVacant.finish() reports, and Progress needs. */
export interface VacantOutcome {
  n: number;
  stamps: Stamps;
  iponAdded: number;
  stallsBought: StallKey[];
  foods: string[];
  heartsGained: Partial<Record<FriendKey, number>>;
}

export interface ProgressReport {
  newBreaks: { threshold: number; reward: string }[];
  sukiUps: { stall: StallKey; level: 1 | 2 }[];
  gifts: { friend: FriendKey; reward: string }[];
  photo: { vacant: number; food: string } | null;
  /** Stalls that open on the next vacant (announced on the Vacant card). */
  newStalls: StallKey[];
}

export function newProgress(saveSeed: number): LagoonProgress {
  return {
    vacants: 0,
    saveSeed,
    iponBalance: 0,
    iponLifetime: 0,
    alkansyaBreaks: 0,
    suki: {},
    hearts: { migs: 0, bea: 0, jomar: 0 },
    owned: [],
    album: [],
    stamps: { kumpleto: 0, busog: 0, sulit: 0 },
    recentFoods: [],
    rewards: [],
  };
}

export function sukiLevel(count: number): 0 | 1 | 2 {
  if (count >= SUKI.levels[1]) return 2;
  if (count >= SUKI.levels[0]) return 1;
  return 0;
}

/** Lifetime ipon needed for break number k (0-based): 200, 500, 1000, 2000, 3000, … */
export function breakThreshold(k: number): number {
  if (k < ALKANSYA.breaks.length) return ALKANSYA.breaks[k];
  return (
    ALKANSYA.breaks[ALKANSYA.breaks.length - 1] +
    (k - ALKANSYA.breaks.length + 1) * ALKANSYA.thenEvery
  );
}

export function breakReward(k: number): string {
  if (k < ALKANSYA.rewards.length) return ALKANSYA.rewards[k];
  return `${ALKANSYA.laterRewardPrefix}${k - ALKANSYA.rewards.length + 1}`;
}

export function applyOutcome(
  p: LagoonProgress,
  o: VacantOutcome,
): { progress: LagoonProgress; report: ProgressReport } {
  const report: ProgressReport = {
    newBreaks: [],
    sukiUps: [],
    gifts: [],
    photo: null,
    newStalls: [],
  };
  const next: LagoonProgress = {
    ...p,
    vacants: Math.max(p.vacants, o.n),
    iponBalance: p.iponBalance + o.iponAdded,
    iponLifetime: p.iponLifetime + o.iponAdded,
    suki: { ...p.suki },
    hearts: { ...p.hearts },
    album: [...p.album],
    stamps: {
      kumpleto: p.stamps.kumpleto + (o.stamps.kumpleto ? 1 : 0),
      busog: p.stamps.busog + (o.stamps.busog ? 1 : 0),
      sulit: p.stamps.sulit + (o.stamps.sulit ? 1 : 0),
    },
    recentFoods: [...p.recentFoods, o.foods].slice(-PHOTO_EVERY),
    rewards: [...p.rewards],
  };

  while (next.iponLifetime >= breakThreshold(next.alkansyaBreaks)) {
    const reward = breakReward(next.alkansyaBreaks);
    report.newBreaks.push({ threshold: breakThreshold(next.alkansyaBreaks), reward });
    next.rewards.push(reward);
    next.alkansyaBreaks += 1;
  }

  for (const stall of new Set(o.stallsBought)) {
    if (stall === 'water') continue;
    const before = sukiLevel(next.suki[stall] ?? 0);
    next.suki[stall] = (next.suki[stall] ?? 0) + 1;
    const after = sukiLevel(next.suki[stall] ?? 0);
    if (after > before) report.sukiUps.push({ stall, level: after as 1 | 2 });
  }

  for (const friend of FRIENDS) {
    const gained = o.heartsGained[friend] ?? 0;
    if (!gained) continue;
    const before = next.hearts[friend];
    next.hearts[friend] = before + gained;
    HEARTS.giftsAt.forEach((at, i) => {
      if (before < at && next.hearts[friend] >= at) {
        const reward = `gift_${friend}_${HEARTS.gifts[i]}`;
        report.gifts.push({ friend, reward });
        next.rewards.push(reward);
      }
    });
  }

  if (o.n % PHOTO_EVERY === 0) {
    const food = favouriteFood(next.recentFoods);
    if (food) {
      report.photo = { vacant: o.n, food };
      next.album.push(report.photo);
    }
  }

  const nowOpen = new Set(openStalls(tierFor(o.n), next.owned));
  report.newStalls = openStalls(tierFor(o.n + 1), next.owned).filter((s) => !nowOpen.has(s));
  return { progress: next, report };
}

/** Most bought food over the recent vacants; ties go to the one bought first. */
export function favouriteFood(recent: readonly (readonly string[])[]): string | null {
  const counts = new Map<string, number>();
  for (const vacant of recent) for (const f of vacant) counts.set(f, (counts.get(f) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = 0;
  for (const [food, count] of counts) {
    if (count > bestCount) {
      best = food;
      bestCount = count;
    }
  }
  return best;
}

export type BuyResult =
  { ok: true; progress: LagoonProgress } | { ok: false; reason: 'unknown' | 'owned' | 'kulang' };

export function buyFromShop(p: LagoonProgress, key: string): BuyResult {
  const item = IPON_SHOP.find((i) => i.key === key);
  if (!item) return { ok: false, reason: 'unknown' };
  if (p.owned.includes(key)) return { ok: false, reason: 'owned' };
  if (p.iponBalance < item.cost) return { ok: false, reason: 'kulang' };
  return {
    ok: true,
    progress: { ...p, iponBalance: p.iponBalance - item.cost, owned: [...p.owned, key] },
  };
}
