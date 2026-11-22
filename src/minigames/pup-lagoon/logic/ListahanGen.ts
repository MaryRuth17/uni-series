/**
 * Seeded listahan generator with solvability checks (SPEC-pup-lagoon §6 generation rules, §13 Generator,
 * replaced in part by OC-8). Never ships a listahan the player cannot finish:
 *  - minCost (complete every line) ≤ wallet (baon + pasabay money) and ≥ minCostRatio × baon;
 *  - minCostBusog (complete + busog target) ≤ wallet;
 *  - no single item ticks every player line (except the tutorial);
 *  - both plans can be paid with the wallet mix and the vendors' starting cash boxes;
 *  - with a sold-out event, all of the above hold without the sold-out item.
 * After LISTAHAN.maxTries failures it uses a hand-made fallback list for the tier.
 */
import {
  BUSOG_TARGET_PAYDAY,
  BUSOG_TARGET_PDP,
  BUSOG_TARGETS,
  EVENTS,
  LISTAHAN,
  OFTEN_WALA_CHANCE,
  TUTORIAL,
} from '../config';
import { Random } from '../../../core/Random';
import { BARKADA } from '../data/barkada';
import { FALLBACKS } from '../data/fallbacks';
import { PROMOS, type PromoDef } from '../data/events';
import { STALLS } from '../data/stalls';
import { smallChangeMix, WALLET_MIXES } from '../data/walletMixes';
import { startingBox } from './CashBox';
import { openStalls, orderableItems, type PurchaseEffect } from './Catalog';
import { Listahan } from './Listahan';
import { greedyPieces, type Money, moneyOf } from './Money';
import { payableOrder, planVisits, type Visit } from './Payment';
import type { VacantDef } from './Rhythm';
import { mixSeed, SEED_SALT } from './seeds';
import { buildCandidates, solve, type SolveResult } from './Solver';
import type {
  CashLevel,
  Denom,
  EventKind,
  FriendKey,
  ListahanLine,
  StallKey,
  Tag,
  Tier,
} from './types';

export interface GenContext {
  saveSeed: number;
  /** Ipon Shop items owned (the Tumbler opens the water station). */
  owned: readonly string[];
}

export interface GeneratedVacant {
  def: VacantDef;
  /** The event that actually applies (a fallback list drops the sold-out event). */
  event: EventKind | null;
  lines: ListahanLine[];
  busogTarget: number;
  noSpicy: boolean;
  open: StallKey[];
  baonPieces: Denom[];
  /** Baon plus any pasabay money. */
  wallet: Money;
  cashBoxes: Record<StallKey, Money>;
  promo: PromoDef | null;
  soldOut: { item: string; afterMs: number } | null;
  longLineStall: StallKey | null;
  rain: boolean;
  hot: boolean;
  /** Solver results with the sold-out item removed: the Sulit Master! baseline. */
  baseline: SolveResult;
  /** Visit orders proven payable for each plan. */
  route: { complete: Visit[]; busog: Visit[] | null };
  usedFallback: boolean;
  tries: number;
}

export function busogTargetFor(def: VacantDef): number {
  if (def.special === 'pdp') return BUSOG_TARGET_PDP;
  if (def.special === 'kinsenas' || def.special === 'katapusan') return BUSOG_TARGET_PAYDAY;
  const t = BUSOG_TARGETS[def.tier];
  return def.slot === 'tanghali' ? t.tanghali : t.other;
}

export function generateVacant(def: VacantDef, ctx: GenContext): GeneratedVacant {
  const rng = new Random(mixSeed(ctx.saveSeed, def.n, SEED_SALT.listahan));
  const open = openStalls(def.tier, ctx.owned);
  const openSet = new Set(open);
  const busogTarget = busogTargetFor(def);

  const cashBoxes = {} as Record<StallKey, Money>;
  for (const s of STALLS) {
    let level: CashLevel = s.cashBox;
    if (s.oftenWala && rng.chance(OFTEN_WALA_CHANCE)) level = 'wala';
    if (def.walangPanukli && level === 'kaunti') level = 'wala';
    cashBoxes[s.key] = startingBox(level);
  }

  const promoOptions = PROMOS.filter((p) => openSet.has(p.stall));
  const promo = def.event === 'promo' && promoOptions.length ? rng.pick(promoOptions) : null;
  const queueStalls = open.filter((s) => s !== 'water');
  const longLineStall = def.event === 'longLine' ? rng.pick(queueStalls) : null;
  const rain = def.event === 'rain';
  const hot = def.event === 'hot';
  const base = {
    def,
    busogTarget,
    open,
    cashBoxes,
    promo,
    longLineStall,
    rain,
    hot,
  };

  if (def.special === 'tutorial') {
    const lines = TUTORIAL.tags.map((tag, i) => tagLine(i, tag));
    const accepted = acceptPlan(lines, [[...TUTORIAL.wallet]], 0, false, null, base, ctx, rng, {
      skipRatio: true,
      skipTrivial: true,
    });
    if (!accepted) throw new Error('Tutorial vacant is not solvable');
    return { ...accepted, event: null, usedFallback: false, tries: 1 };
  }

  for (let tries = 1; tries <= LISTAHAN.maxTries; tries++) {
    const built = buildLines(def, rng, openSet, ctx.owned, hot, rain);
    if (!built) continue;
    const accepted = acceptPlan(
      built.lines,
      mixOrder(def, rng),
      built.pasabayMoney,
      built.noSpicy,
      def.event === 'soldOut' ? rng : null,
      base,
      ctx,
      rng,
      {},
    );
    if (accepted) return { ...accepted, event: def.event, usedFallback: false, tries };
  }

  for (const tags of FALLBACKS[def.tier]) {
    const lines = tags.map((tag, i) => tagLine(i, tag));
    const accepted = acceptPlan(lines, mixOrder(def, rng), 0, false, null, base, ctx, rng, {
      skipRatio: true,
      skipTrivial: true,
      busogOptional: true,
    });
    if (accepted) {
      return {
        ...accepted,
        event: def.event === 'soldOut' ? null : def.event,
        usedFallback: true,
        tries: LISTAHAN.maxTries,
      };
    }
  }
  throw new Error(`No solvable listahan for vacant ${def.n}`);
}

type Accepted = Omit<GeneratedVacant, 'event' | 'usedFallback' | 'tries'>;

function acceptPlan(
  lines: ListahanLine[],
  mixes: readonly Denom[][],
  pasabayMoney: number,
  noSpicy: boolean,
  soldOutRng: Random | null,
  base: Pick<
    GeneratedVacant,
    'def' | 'busogTarget' | 'open' | 'cashBoxes' | 'promo' | 'longLineStall' | 'rain' | 'hot'
  >,
  ctx: GenContext,
  rng: Random,
  opts: { skipRatio?: boolean; skipTrivial?: boolean; busogOptional?: boolean },
): Accepted | null {
  const { def, busogTarget } = base;
  const openSet = new Set(base.open);
  const walletTotal = def.baon + pasabayMoney;
  const candidates = buildCandidates({
    open: openSet,
    owned: ctx.owned,
    promo: base.promo,
    noSpicy,
  });

  if (!opts.skipTrivial && isTrivial(lines, candidates)) return null;

  let result = solve(lines, candidates, busogTarget, walletTotal);
  if (result.minCost === null || result.planComplete === null) return null;
  if (!opts.busogOptional && result.minCostBusog === null) return null;
  if (!opts.skipRatio && result.minCost < LISTAHAN.minCostRatio * def.baon) return null;

  let soldOut: GeneratedVacant['soldOut'] = null;
  if (soldOutRng) {
    const popular = result.planComplete.filter((s) => s.price > 0).map((s) => s.item);
    if (popular.length === 0) return null;
    const item = soldOutRng.pick(popular);
    const without = buildCandidates({
      open: openSet,
      owned: ctx.owned,
      promo: base.promo,
      noSpicy,
      soldOut: new Set([item]),
    });
    result = solve(lines, without, busogTarget, walletTotal);
    if (result.minCost === null || result.planComplete === null) return null;
    if (result.minCostBusog === null) return null;
    const [lo, hi] = EVENTS.soldOutAfterMs;
    soldOut = { item, afterMs: rng.int(lo, hi) };
  }

  const completeVisits = planVisits(result.planComplete);
  const busogVisits = result.planBusog ? planVisits(result.planBusog) : null;
  for (const baonPieces of mixes) {
    const wallet = moneyOf([...baonPieces, ...greedyPieces(pasabayMoney)]);
    const complete = payableOrder(wallet, base.cashBoxes, completeVisits);
    if (!complete) continue;
    const busog = busogVisits ? payableOrder(wallet, base.cashBoxes, busogVisits) : null;
    if (!busog && !opts.busogOptional) continue;
    return {
      ...base,
      lines,
      noSpicy,
      baonPieces: [...baonPieces],
      wallet,
      soldOut,
      baseline: result,
      route: { complete, busog },
    };
  }
  return null;
}

/** True if one purchase alone would complete every player line (§6 "avoid trivial lists"). */
function isTrivial(lines: readonly ListahanLine[], candidates: readonly PurchaseEffect[]): boolean {
  const playerLines = lines.filter((l) => !l.forFriends);
  if (playerLines.length < 2) return false;
  return candidates.some((c) => {
    const l = new Listahan(playerLines);
    l.applyPlayer(c);
    return l.isComplete();
  });
}

/** Wallet mixes to try: a tier-weighted preset first (later tiers favour big bills), small change last. */
function mixOrder(def: VacantDef, rng: Random): Denom[][] {
  const presets = WALLET_MIXES[def.baon] ?? [];
  const order: Denom[][] = [];
  if (presets.length) {
    const preferred = rng.int(0, Math.min(presets.length - 1, def.tier - 1));
    order.push([...presets[preferred]]);
    presets.forEach((p, i) => {
      if (i !== preferred) order.push([...p]);
    });
  }
  order.push(smallChangeMix(def.baon));
  return order;
}

function tagLine(i: number, tag: Tag, qty = 1): ListahanLine {
  return { id: `L${i + 1}`, kind: 'tag', tag, qty, owner: 'player', forFriends: false };
}

function buildLines(
  def: VacantDef,
  rng: Random,
  open: ReadonlySet<StallKey>,
  owned: readonly string[],
  hot: boolean,
  rain: boolean,
): { lines: ListahanLine[]; noSpicy: boolean; pasabayMoney: number } | null {
  const tier: Tier = def.tier;
  const noSpicy = tier >= LISTAHAN.noSpicy.fromTier && rng.chance(LISTAHAN.noSpicy.chance);
  const candidates = buildCandidates({ open, owned, noSpicy });
  const available = new Set<Tag>();
  for (const c of candidates) {
    c.tags.forEach((t) => available.add(t));
    c.free?.tags.forEach((t) => available.add(t));
  }
  if (noSpicy) available.delete('maanghang');

  const [minLines, maxLines] = LISTAHAN.lines[tier];
  const count = rng.int(minLines, maxLines);
  const lines: ListahanLine[] = [];
  const used = new Set<Tag>();

  if (hot && available.has('malamig')) {
    lines.push(tagLine(lines.length, 'malamig'));
    used.add('malamig');
  }

  let itemLines = 0;
  for (let i = 0; i < LISTAHAN.maxItemLines[tier]; i++) {
    if (rng.chance(LISTAHAN.itemLineChance)) itemLines++;
  }
  itemLines = Math.min(itemLines, count - 1);

  const weightOf = (t: Tag): number =>
    (LISTAHAN.slotTagWeights[def.slot][t] ?? 1) * (rain ? (EVENTS.rainTagWeights[t] ?? 1) : 1);
  while (lines.length < count - itemLines) {
    const options = [...available].filter((t) => !used.has(t));
    if (options.length === 0) return null;
    const tag = pickWeighted(rng, options, weightOf);
    used.add(tag);
    lines.push(tagLine(lines.length, tag));
  }

  const items = orderableItems(open, owned).filter(
    (m) => m.requires === undefined && !(noSpicy && m.tags.includes('maanghang')),
  );
  const usedItems = new Set<string>();
  for (let i = 0; i < itemLines; i++) {
    const options = items.filter((m) => !usedItems.has(m.key));
    if (options.length === 0) break;
    const m = rng.pick(options);
    usedItems.add(m.key);
    lines.push({
      id: `L${lines.length + 1}`,
      kind: 'item',
      item: m.key,
      qty: 1,
      owner: 'player',
      forFriends: false,
    });
  }

  let qtyLine: ListahanLine | null = null;
  if (tier >= LISTAHAN.quantity.fromTier && rng.chance(LISTAHAN.quantity.chance)) {
    const tagLines = lines.filter((l) => l.kind === 'tag');
    if (tagLines.length) {
      qtyLine = rng.pick(tagLines);
      qtyLine.qty = LISTAHAN.quantity.qty;
    }
  }

  let pasabayMoney = 0;
  if (tier >= LISTAHAN.pasabay.fromTier && rng.chance(LISTAHAN.pasabay.chance)) {
    const friend = pickWeighted(
      rng,
      BARKADA.map((b) => b.key),
      (k: FriendKey) => BARKADA.find((b) => b.key === k)?.pasabayWeight ?? 1,
    );
    const affordable = items.filter((m) => m.price > 0 && m.price <= LISTAHAN.pasabay.maxPrice);
    const loved = affordable.filter((m) =>
      BARKADA.find((b) => b.key === friend)?.loves.includes(m.key),
    );
    const pool = loved.length ? loved : affordable;
    if (pool.length) {
      const m = rng.pick(pool);
      pasabayMoney = m.price;
      lines.push({
        id: `L${lines.length + 1}`,
        kind: 'item',
        item: m.key,
        qty: 1,
        owner: friend,
        forFriends: true,
        money: m.price,
      });
    }
  }

  const payday = def.special === 'kinsenas' || def.special === 'katapusan';
  if (payday) {
    const options = LISTAHAN.pangBarkada.tags.filter((t) => available.has(t) && !used.has(t));
    if (options.length) {
      const tag = rng.pick(options);
      used.add(tag);
      lines.push({
        id: `L${lines.length + 1}`,
        kind: 'tag',
        tag,
        qty: LISTAHAN.pangBarkada.qty,
        owner: 'barkada',
        forFriends: true,
      });
    }
  }

  const units = (): number => lines.reduce((s, l) => s + l.qty, 0);
  if (units() > LISTAHAN.maxUnits && qtyLine) qtyLine.qty = 1;
  while (units() > LISTAHAN.maxUnits) {
    const idx = lines.findIndex((l) => !l.forFriends && l !== lines[0]);
    if (idx < 0) return null;
    lines.splice(idx, 1);
  }
  lines.forEach((l, i) => (l.id = `L${i + 1}`));
  return { lines, noSpicy, pasabayMoney };
}

function pickWeighted<T>(rng: Random, options: readonly T[], weight: (t: T) => number): T {
  const total = options.reduce((s, o) => s + weight(o), 0);
  let roll = rng.float(0, total);
  for (const o of options) {
    roll -= weight(o);
    if (roll < 0) return o;
  }
  return options[options.length - 1];
}
