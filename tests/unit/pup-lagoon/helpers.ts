/** Test helpers: hand-built vacants and lines for exact scenarios. */
import { startingBox } from '../../../src/minigames/pup-lagoon/logic/CashBox';
import { openStalls } from '../../../src/minigames/pup-lagoon/logic/Catalog';
import type { GeneratedVacant } from '../../../src/minigames/pup-lagoon/logic/ListahanGen';
import { type Money, moneyOf } from '../../../src/minigames/pup-lagoon/logic/Money';
import { payableOrder, planVisits } from '../../../src/minigames/pup-lagoon/logic/Payment';
import { buildCandidates, solve } from '../../../src/minigames/pup-lagoon/logic/Solver';
import type {
  CashLevel,
  Denom,
  ListahanLine,
  StallKey,
  Tag,
  Tier,
} from '../../../src/minigames/pup-lagoon/logic/types';
import { STALLS } from '../../../src/minigames/pup-lagoon/data/stalls';

export function tag(id: string, t: Tag, qty = 1): ListahanLine {
  return { id, kind: 'tag', tag: t, qty, owner: 'player', forFriends: false };
}

export function itemLine(id: string, item: string): ListahanLine {
  return { id, kind: 'item', item, qty: 1, owner: 'player', forFriends: false };
}

export function pasabay(
  id: string,
  friend: 'migs' | 'bea' | 'jomar',
  item: string,
  money: number,
): ListahanLine {
  return { id, kind: 'item', item, qty: 1, owner: friend, forFriends: true, money };
}

export function pangBarkada(id: string, t: Tag, qty = 3): ListahanLine {
  return { id, kind: 'tag', tag: t, qty, owner: 'barkada', forFriends: true };
}

export function candidatesFor(tier: Tier, owned: string[] = [], noSpicy = false) {
  return buildCandidates({ open: new Set(openStalls(tier, owned)), owned, noSpicy });
}

export function boxes(
  level: CashLevel | Partial<Record<StallKey, CashLevel>>,
): Record<StallKey, Money> {
  const out = {} as Record<StallKey, Money>;
  for (const s of STALLS) {
    const l = typeof level === 'string' ? level : (level[s.key] ?? s.cashBox);
    out[s.key] = startingBox(l);
  }
  return out;
}

/** A GeneratedVacant built by hand, solved and proven payable like the generator does. */
export function makeVacant(opts: {
  lines: ListahanLine[];
  wallet: Denom[];
  tier?: Tier;
  baon?: number;
  busogTarget?: number;
  owned?: string[];
  cash?: CashLevel | Partial<Record<StallKey, CashLevel>>;
  noSpicy?: boolean;
  soldOut?: { item: string; afterMs: number } | null;
}): GeneratedVacant {
  const tier = opts.tier ?? 1;
  const owned = opts.owned ?? [];
  const open = openStalls(tier, owned);
  const target = opts.busogTarget ?? 0;
  const candidates = buildCandidates({
    open: new Set(open),
    owned,
    noSpicy: opts.noSpicy,
    soldOut: opts.soldOut ? new Set([opts.soldOut.item]) : undefined,
  });
  const baseline = solve(opts.lines, candidates, target);
  const cashBoxes = boxes(opts.cash ?? 'maraming');
  const wallet = moneyOf(opts.wallet);
  const complete = baseline.planComplete
    ? (payableOrder(wallet, cashBoxes, planVisits(baseline.planComplete)) ?? [])
    : [];
  const busog = baseline.planBusog
    ? payableOrder(wallet, cashBoxes, planVisits(baseline.planBusog))
    : null;
  const baon = opts.baon ?? opts.wallet.reduce((s: number, d) => s + d, 0);
  return {
    def: { n: 7, tier, slot: 'tanghali', baon, special: null, walangPanukli: false, event: null },
    event: null,
    lines: opts.lines,
    busogTarget: target,
    noSpicy: opts.noSpicy ?? false,
    open,
    baonPieces: opts.wallet,
    wallet,
    cashBoxes,
    promo: null,
    soldOut: opts.soldOut ?? null,
    longLineStall: null,
    rain: false,
    hot: false,
    baseline,
    route: { complete, busog },
    usedFallback: false,
    tries: 1,
  };
}
