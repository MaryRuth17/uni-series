/**
 * Core types for Lagoon Merienda (SPEC-pup-lagoon §13, with the §0 owner changes).
 * Pure types only: no Phaser, no randomness.
 */

export type Tag =
  | 'kanin'
  | 'inumin'
  | 'malamig'
  | 'matamis'
  | 'tusok'
  | 'ihaw'
  | 'merienda'
  | 'sabaw'
  | 'maanghang'
  | 'gulay';

export const TAGS: readonly Tag[] = [
  'kanin',
  'inumin',
  'malamig',
  'matamis',
  'tusok',
  'ihaw',
  'merienda',
  'sabaw',
  'maanghang',
  'gulay',
];

export type Denom = 1 | 5 | 10 | 20 | 50 | 100;
export type Slot = 'umaga' | 'tanghali' | 'hapon';
export type StallKey =
  | 'karinderya'
  | 'tusok'
  | 'palamig'
  | 'ihaw'
  | 'merienda'
  | 'tinapay'
  | 'lugawan'
  | 'halohalo'
  | 'silog'
  | 'ricebox'
  | 'water';
export type FriendKey = 'migs' | 'bea' | 'jomar';
export const FRIENDS: readonly FriendKey[] = ['migs', 'bea', 'jomar'];
export type Sawsawan = 'matamis' | 'maanghang' | 'suka';
/** Difficulty tier from the vacant count (OC-4). The tutorial vacant (n = 1) is tier 1. */
export type Tier = 1 | 2 | 3 | 4;
export type CashLevel = 'maraming' | 'kaunti' | 'wala';
export type Special = 'tutorial' | 'pdp' | 'kinsenas' | 'katapusan';
export type EventKind = 'rain' | 'hot' | 'soldOut' | 'promo' | 'longLine';

export interface MenuItem {
  key: string;
  nameKey: string;
  stall: StallKey;
  price: number;
  tags: readonly Tag[];
  busog: number;
  /** Added automatically with this item, e.g. the karinderya's free iced tea. */
  freeItem?: string;
  /** Tusok items ask for a sawsawan; maanghang adds the maanghang tag. */
  needsSawsawan?: boolean;
  /** Ihaw items keep the player at the counter this long after paying. */
  grillSeconds?: number;
  /** False for items that only come free with another item. Default true. */
  orderable?: boolean;
  /** Ipon Shop item the player must own, e.g. the tumbler for the water station. */
  requires?: string;
}

/** Who a listahan line is for. Friend lines are pasabay; 'barkada' is the payday pang-barkada treat. */
export type LineOwner = 'player' | FriendKey | 'barkada';

export interface ListahanLine {
  id: string;
  kind: 'tag' | 'item';
  tag?: Tag;
  item?: string;
  /** 1 unless a quantity modifier (e.g. Tusok-tusok ×2, Pang-barkada ×3). */
  qty: number;
  owner: LineOwner;
  /** Pasabay and pang-barkada lines: bought for friends, no busog for the player. */
  forFriends: boolean;
  /** Pasabay only: the money the friend handed over. */
  money?: number;
}
