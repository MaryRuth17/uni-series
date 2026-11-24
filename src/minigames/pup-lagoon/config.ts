/**
 * Every tuning number for Lagoon Merienda (SPEC-pup-lagoon, section 0 rules win).
 * Prices and menu data live in data/; this file holds the rules' numbers.
 */
import type {
  CashLevel,
  Denom,
  EventKind,
  FriendKey,
  Slot,
  StallKey,
  Tag,
  Tier,
} from './logic/types';

/** First vacant number of each tier (OC-4). Vacant 1 is the tutorial, inside tier 1. */
export const TIER_STARTS: readonly { tier: Tier; from: number }[] = [
  { tier: 1, from: 1 },
  { tier: 2, from: 6 },
  { tier: 3, from: 13 },
  { tier: 4, from: 21 },
];

/** Stalls that open at each tier (OC-4, §7). The water station opens with the Tumbler. */
export const STALLS_OPEN_FROM: Readonly<Record<Exclude<StallKey, 'water'>, Tier>> = {
  karinderya: 1,
  tusok: 1,
  palamig: 1,
  ihaw: 1,
  merienda: 2,
  lugawan: 2,
  halohalo: 3,
  silog: 3,
};

/** Vacant n uses SLOT_ORDER[n % 3], so the tutorial (n = 1) is tanghali, then hapon, umaga, … (OC-4). */
export const SLOT_ORDER: readonly Slot[] = ['umaga', 'tanghali', 'hapon'];

/** The fixed first vacant (§9.1 W1 Lunes, worked example 1). */
export const TUTORIAL = {
  baon: 70,
  wallet: [50, 10, 5, 5] as readonly Denom[],
  slot: 'tanghali' as Slot,
  tags: ['kanin', 'inumin', 'tusok'] as readonly Tag[],
};

export const BAON = {
  normal: [
    { amount: 60, weight: 1 },
    { amount: 70, weight: 2 },
    { amount: 80, weight: 1 },
  ],
  pdp: { amount: 50, chance: 1 / 6, fromTier: 2 as Tier },
  payday: { amount: 150, chance: 1 / 8, fromTier: 3 as Tier },
};

/** About 1 vacant in 10 from tier 2: every "kaunti" stall starts with an empty cash box (OC-4). */
export const WALANG_PANUKLI_VACANT = { chance: 0.1, fromTier: 2 as Tier };
/** "Kaunti, often wala" (the tusok cart): chance its box starts empty on any vacant. */
export const OFTEN_WALA_CHANCE = 0.5;

/** Starting cash boxes (§13 CashBox). */
export const CASH_BOXES: Readonly<Record<CashLevel, readonly Denom[]>> = {
  maraming: [1, 1, 1, 1, 5, 5, 5, 5, 10, 10, 10, 10, 10, 10, 20, 20, 20],
  kaunti: [1, 1, 5, 10, 10],
  wala: [],
};

/** At most one event per vacant from tier 2, about 40% in total, never the same twice in a row (OC-5). */
export const EVENTS = {
  fromTier: 2 as Tier,
  chances: { rain: 0.1, hot: 0.08, soldOut: 0.08, promo: 0.08, longLine: 0.06 } as Readonly<
    Record<EventKind, number>
  >,
  hotFromTier: 3 as Tier,
  /** Logic time after which the sold-out item runs out. */
  soldOutAfterMs: [20_000, 60_000] as const,
  /** Tag weight multipliers while it rains; hot days force a Malamig line. */
  rainTagWeights: { sabaw: 3 } as Partial<Record<Tag, number>>,
  hotBusyStalls: ['halohalo', 'palamig'] as readonly StallKey[],
  rainWalkFactor: 0.7,
};

/** Busog targets for the Busog! stamp (§9.3 table, by tier; OC-3). */
export const BUSOG_TARGETS: Readonly<Record<Tier, { tanghali: number; other: number }>> = {
  1: { tanghali: 5, other: 3 },
  2: { tanghali: 6, other: 4 },
  3: { tanghali: 7, other: 4 },
  4: { tanghali: 7, other: 5 },
};
export const BUSOG_TARGET_PDP = 4;
export const BUSOG_TARGET_PAYDAY = 6;

export const LISTAHAN = {
  /** Player lines per tier [min, max], including specific-item lines (§6). */
  lines: { 1: [3, 3], 2: [3, 4], 3: [4, 4], 4: [4, 5] } as Readonly<
    Record<Tier, readonly [number, number]>
  >,
  maxItemLines: { 1: 0, 2: 1, 3: 1, 4: 2 } as Readonly<Record<Tier, number>>,
  itemLineChance: 0.3,
  quantity: { fromTier: 2 as Tier, chance: 0.25, qty: 2 },
  pasabay: { fromTier: 2 as Tier, chance: 0.35, maxPrice: 30 },
  noSpicy: { fromTier: 3 as Tier, chance: 0.15 },
  /** Paydays (tier 3+) add Pang-barkada ×3 for one of these tags (OC-4). */
  pangBarkada: {
    qty: 3,
    tags: ['malamig', 'matamis', 'tusok', 'merienda', 'ihaw'] as readonly Tag[],
  },
  /** The solver's bit mask covers at most this many units (§13). */
  maxUnits: 8,
  /** Reject lists whose cheapest completion is under this share of the baon (§13, "not too easy"). */
  minCostRatio: 0.5,
  maxTries: 200,
  slotTagWeights: {
    tanghali: { kanin: 3 },
    umaga: { sabaw: 1.5, merienda: 1.5 },
    hapon: { merienda: 1.5, matamis: 1.5 },
  } as Readonly<Record<Slot, Partial<Record<Tag, number>>>>,
};

export const PILA = {
  secondsPerPerson: 3,
  cap: 4,
  longLineFactor: 2,
  /** Average queue length by the stall's usual pila (§7), before slot effects. */
  usualLength: { none: 0, short: 0.6, medium: 1.4, long: 2.4 },
  busyFactor: 1.7,
  quietFactor: 0.5,
};

export const VISIT = {
  maxItems: 5,
  extraBusog: 1,
};

export const SUKI = {
  /** Distinct vacants bought from a stall to reach Suki 1 and Suki 2 (OC-6). */
  levels: [3, 8] as const,
  libreChance: 0.05,
  libreMaxPrice: 15,
};

export const HEARTS = {
  pasabay: 1,
  pangBarkada: 2,
  giftsAt: [5, 10, 15] as const,
  gifts: ['charm', 'outfit', 'sticker'] as const,
};

/** OC-7: breaks count lifetime ipon. Rewards are fixed and known in advance (§15). */
export const ALKANSYA = {
  breaks: [200, 500, 1000] as const,
  thenEvery: 1000,
  rewards: ['sticker-pup', 'charm_alkansya', 'outfit_lagoon_shirt'] as const,
  /** After the listed rewards, every further break gives the next numbered photo frame. */
  laterRewardPrefix: 'frame_',
};

export const PHOTO_EVERY = 5;
export const SULIT_MARGIN = 5;
/** "Ay, buo!": paying with a ₱100 bill for a total this small (flavour only). */
export const BUO = { bill: 100 as Denom, totalAtMost: 20 };

export interface IponShopItem {
  key: string;
  cost: number;
  kind: 'helper' | 'cosmetic';
}

/** §5 Ipon Shop. ID lace colours wait for Q-003. */
export const IPON_SHOP: readonly IponShopItem[] = [
  { key: 'tumbler', cost: 120, kind: 'helper' },
  { key: 'notebook', cost: 150, kind: 'helper' },
  { key: 'payong', cost: 80, kind: 'helper' },
  ...(
    [
      'jeepney',
      'fishball',
      'sampaguita',
      'carabao',
      'parol',
      'sorbetes',
      'tsinelas',
      'salakot',
    ] as const
  ).map((c) => ({ key: `charm_${c}`, cost: 60, kind: 'cosmetic' as const })),
  { key: 'bench_mat', cost: 100, kind: 'cosmetic' },
  ...(['migs', 'bea', 'jomar'] as readonly FriendKey[]).map((f) => ({
    key: `outfit_${f}`,
    cost: 90,
    kind: 'cosmetic' as const,
  })),
];

/** Walking (used by the map view from L2). */
export const WALK_SPEED = 80;

/** Map layout at 640×360 (SPEC-pup-lagoon §10.1). The HUD keeps the right column (x 512–640). */
export const VIEW = {
  topBar: { h: 24 },
  mapRight: 512,
  stallRow: { x: 96, y: 28, w: 400, h: 68 },
  windows: { palamig: 140, merienda: 220, lugawan: 300, ihaw: 400 } as Readonly<
    Partial<Record<StallKey, number>>
  >,
  window: { w: 64, h: 48, cy: 62 },
  kiosks: { karinderya: 110, silog: 176, halohalo: 242 } as Readonly<
    Partial<Record<StallKey, number>>
  >,
  kiosk: { x: 8, w: 80, h: 50 },
  plaza: { x: 250, y: 190, r: 56 },
  lagoon: { x: 410, y: 225, w: 124, h: 80 },
  tusokCart: { x: 455, y: 160, w: 36, h: 28 },
  tambayan: { x: 110, y: 296, w: 360, h: 56 },
  benches: [170, 290, 410],
  water: { x: 485, y: 300, w: 20, h: 28 },
  listahan: { x: 512, y: 30, w: 120, h: 172 },
  busog: { x: 512, y: 208, w: 120, h: 16 },
  wallet: { x: 512, y: 292, w: 120, h: 60 },
  board: { x: 256, y: 186, w: 300, h: 236 },
  /** The storefront pop-up: a 400×170 front, the menu grid and buttons, over the map area. */
  front: { x: 256, y: 193, w: 492, h: 334 },
  /** NPC students stand this far apart in a pila. */
  queueGap: 10,
};

/** Stall order for keys 1–8 (§10.3, §7 order). */
export const STALL_KEYS_ORDER: readonly StallKey[] = [
  'karinderya',
  'tusok',
  'palamig',
  'ihaw',
  'merienda',
  'lugawan',
  'halohalo',
  'silog',
];

/** The arrival intro (LagoonOpeningScene): pan across the PUP panorama, then How to play. */
export const OPENING = {
  width: 960,
  panMs: 4200,
  jeepMs: 5200,
  /** Students crossing the plaza: [walker variant, start x, direction, speed px/s]. */
  walkers: [
    [1, 120, 1, 22],
    [3, 420, -1, 18],
    [5, 540, 1, 20],
    [2, 760, -1, 24],
    [6, 880, -1, 16],
  ] as const,
};

/**
 * Life on the Lagoon map (owner request, L6): latag sellers, performers in the plaza, students on the
 * benches and browsing. Positions are feet points on the 640×360 map.
 */
export const LAGOON_LIFE = {
  /** [latag variant 1–4, x, y]: flowers, crochet, baked goods, stickers. */
  latag: [
    [1, 178, 262],
    [2, 322, 262],
    [3, 352, 134],
    [4, 172, 146],
  ] as const,
  /** [dancer outfit 0–1, x, y] and the singer with a guitar. */
  dancers: [
    [0, 226, 238],
    [1, 244, 242],
  ] as const,
  singer: { x: 276, y: 238 },
  /** Students browsing or watching: [walker variant, x, y, faces left]. */
  browsers: [
    [4, 198, 266, true],
    [6, 302, 266, false],
    [2, 260, 254, false],
  ] as const,
  /** Two students on each bench (sitter look 0–5). */
  sitters: [
    [0, 3],
    [1, 4],
    [2, 5],
  ] as const,
  bench: { y: 314 },
  sitterMs: 900,
  danceMs: 260,
};
