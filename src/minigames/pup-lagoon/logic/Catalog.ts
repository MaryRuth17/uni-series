/**
 * What a purchase does: price, tags, busog, promo copies and free items (SPEC-pup-lagoon §6, §7).
 * The Solver and LagoonVacant both use purchaseEffect(), so planning and playing follow the same rules.
 */
import { STALLS_OPEN_FROM, TIER_STARTS } from '../config';
import type { PromoDef } from '../data/events';
import { MENU, menuItem } from '../data/menu';
import type { MenuItem, Sawsawan, StallKey, Tag, Tier } from './types';

/** Tier for vacant n (OC-4): 1–5 → 1, 6–12 → 2, 13–20 → 3, 21+ → 4. */
export function tierFor(n: number): Tier {
  let tier: Tier = 1;
  for (const t of TIER_STARTS) if (n >= t.from) tier = t.tier;
  return tier;
}

/** Stalls open at a tier; the water station opens once the player owns the Tumbler. */
export function openStalls(tier: Tier, owned: readonly string[]): StallKey[] {
  const open = (Object.keys(STALLS_OPEN_FROM) as Exclude<StallKey, 'water'>[]).filter(
    (s) => STALLS_OPEN_FROM[s] <= tier,
  ) as StallKey[];
  if (owned.includes('tumbler')) open.push('water');
  return open;
}

/** Menu items the player can order at the open stalls. */
export function orderableItems(open: ReadonlySet<StallKey>, owned: readonly string[]): MenuItem[] {
  return MENU.filter(
    (m) =>
      m.orderable !== false &&
      open.has(m.stall) &&
      (m.requires === undefined || owned.includes(m.requires)),
  );
}

export interface PurchaseEffect {
  item: string;
  sauce?: Sawsawan;
  stall: StallKey;
  price: number;
  /** Effective tags: maanghang sawsawan adds 'maanghang'. */
  tags: readonly Tag[];
  /** Busog per copy. */
  busog: number;
  /** 1, or 2 with a Buy 1 Take 1 promo. Each copy ticks again. */
  copies: number;
  /** The free item that comes with it (karinderya iced tea), ticked as a player purchase. */
  free: { item: string; tags: readonly Tag[]; busog: number } | null;
  grillSeconds: number;
  spicy: boolean;
}

export function purchaseEffect(
  itemKey: string,
  sauce: Sawsawan | undefined,
  promo: PromoDef | null,
): PurchaseEffect {
  const m = menuItem(itemKey);
  const tags: Tag[] = [...m.tags];
  if (m.needsSawsawan && sauce === 'maanghang' && !tags.includes('maanghang')) {
    tags.push('maanghang');
  }
  const promoHit = promo !== null && promo.item === itemKey;
  const freeDef = m.freeItem ? menuItem(m.freeItem) : null;
  return {
    item: itemKey,
    sauce: m.needsSawsawan ? sauce : undefined,
    stall: m.stall,
    price: Math.max(0, m.price - (promoHit ? (promo.priceOff ?? 0) : 0)),
    tags,
    busog: m.busog,
    copies: 1 + (promoHit ? (promo.extraCopies ?? 0) : 0),
    free: freeDef ? { item: freeDef.key, tags: freeDef.tags, busog: freeDef.busog } : null,
    grillSeconds: m.grillSeconds ?? 0,
    spicy: tags.includes('maanghang'),
  };
}
