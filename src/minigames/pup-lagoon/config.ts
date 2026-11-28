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

/**
 * Stalls that open at each tier. Owner change (DECISIONS L-030): there are no levels, so every food stall is
 * open from the first vacant. The water station still opens with the Tumbler (an Ipon Shop item).
 */
export const STALLS_OPEN_FROM: Readonly<Record<Exclude<StallKey, 'water'>, Tier>> = {
  karinderya: 1,
  tusok: 1,
  palamig: 1,
  ihaw: 1,
  merienda: 1,
  tinapay: 1,
  lugawan: 1,
  halohalo: 1,
  silog: 1,
  ricebox: 1,
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
  /** Owner change (DECISIONS L-033): no lines; going to a stall puts the player at its counter at once. */
  enabled: false,
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

/** Map layout at 640×360 (SPEC-pup-lagoon §10.1). The HUD keeps the right column (x 512–640). */
export const VIEW = {
  topBar: { h: 24 },
  mapRight: 512,
  listahan: { x: 514, y: 28, w: 124, h: 176 },
  busog: { x: 516, y: 208, w: 120, h: 38 },
  wallet: { x: 516, y: 252, w: 120, h: 102 },
};

/** The storefront screen (owner change, DECISIONS L-026): a 512×220 front, the menu, the button bar. */
export const FRONT = {
  /** Stall tabs along the top. */
  tabsY: 24,
  tabsH: 16,
  /**
   * The stall banner (L-038, after the owner's photo of a Lagoon stall): a calm wall, the vendor in a small
   * window cropped from the front_<stall> art, the name board, the printed promo sign and the counter.
   */
  banner: {
    y: 40,
    h: 64,
    counterH: 8,
    vendor: { x: 14, w: 56, h: 50 },
    sign: { x: 404, w: 96 },
    /** Calm wall behind the banner, sampled from the storefront art. */
    wall: 0xf4f1ea,
  },
  /** The menu: every food once, as a card (picture, name, price, busog); tap a card to add it. */
  cards: { y: 110, left: 13, cols: 3, w: 156, h: 88, gapX: 10, gapY: 8 },
  /** One line of help between the menu and the tray. */
  info: { y: 298, h: 16, fill: 0xe6dcc6 },
  /** The tray bar: tray slots (VISIT.maxItems), total, money left, Bayad and Kain na!. */
  trayY: 316,
  trayH: 44,
  slot: 26,
};

/** Counter colour per stall, sampled from its front_<stall> art (kiosk red, cart green, water blue). */
export const STALL_COUNTER: Readonly<Record<StallKey, number>> = {
  karinderya: 0xd22f2a,
  halohalo: 0xd22f2a,
  silog: 0xd22f2a,
  ricebox: 0xd22f2a,
  tusok: 0x6fa65a,
  palamig: 0x6fa65a,
  ihaw: 0x6fa65a,
  merienda: 0x6fa65a,
  tinapay: 0x6fa65a,
  lugawan: 0x6fa65a,
  water: 0x3b6fb6,
};

/** Sound effects (DECISIONS L-035), made by scripts/audio/build.mjs. */
export const SFX = {
  tap: 'sfx_click',
  tab: 'sfx_tab',
  add: 'sfx_add',
  remove: 'sfx_remove',
  coin: 'sfx_coin',
  bill: 'sfx_bill',
  pay: 'sfx_pay',
  sukli: 'sfx_sukli',
  check: 'sfx_check',
  error: 'sfx_error',
  page: 'sfx_page',
  win: 'sfx_win',
  lose: 'sfx_lose',
} as const;

/** Music (owner request, DECISIONS L-031): a cozy lo-fi loop made by scripts/audio/build.mjs. */
export const LAGOON_MUSIC = 'music_lagoon';
/** Crowd murmur, birds and leaves under the music (L-035). */
export const LAGOON_AMBIENCE = 'amb_lagoon';

/** Stall order for keys 1–0 (§10.3, §7 order). */
export const STALL_KEYS_ORDER: readonly StallKey[] = [
  'karinderya',
  'tusok',
  'palamig',
  'ihaw',
  'merienda',
  'tinapay',
  'lugawan',
  'halohalo',
  'silog',
  'ricebox',
];

/** The arrival intro (LagoonOpeningScene): pan across the PUP panorama, then How to play. */
export const OPENING = {
  width: 960,
  /** The pan runs from the front gate (left) to the obelisk plaza (camera centre x). */
  panTo: 600,
  /** Centre of the gate's maroon beam, where the welcome banner is written. */
  banner: { x: 592, y: 201 },
  panMs: 4200,
  /** How long the obelisk stays on screen before How to play opens. */
  holdMs: 1400,
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
