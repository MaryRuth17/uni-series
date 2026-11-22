/**
 * Stalls and vendors (SPEC-pup-lagoon §7, §8, §10.1). Positions are the counter points on the 640×360 map.
 * Names and catchphrases are i18n keys: pupLagoon.stall.<key>, pupLagoon.vendor.<vendor>.
 */
import type { CashLevel, Slot, StallKey } from '../logic/types';

export type UsualPila = 'none' | 'short' | 'medium' | 'long';

export interface StallDef {
  key: StallKey;
  nameKey: string;
  vendor: string;
  zone: 'B' | 'C' | 'D' | 'E';
  cashBox: CashLevel;
  /** "Kaunti, often wala": the box may start empty (config OFTEN_WALA_CHANCE). */
  oftenWala: boolean;
  usualPila: UsualPila;
  busySlots: readonly Slot[];
  quietSlots: readonly Slot[];
  /** Counter point on the map (§10.1). */
  pos: { x: number; y: number };
}

function stall(
  key: StallKey,
  vendor: string,
  zone: StallDef['zone'],
  cashBox: CashLevel,
  usualPila: UsualPila,
  busySlots: Slot[],
  quietSlots: Slot[],
  pos: { x: number; y: number },
  oftenWala = false,
): StallDef {
  return {
    key,
    nameKey: `pupLagoon.stall.${key}`,
    vendor,
    zone,
    cashBox,
    oftenWala,
    usualPila,
    busySlots,
    quietSlots,
    pos,
  };
}

export const STALLS: readonly StallDef[] = [
  stall('karinderya', 'bebang', 'E', 'maraming', 'medium', ['tanghali'], ['hapon'], {
    x: 48,
    y: 135,
  }),
  stall('tusok', 'caloy', 'B', 'kaunti', 'medium', [], [], { x: 455, y: 160 }, true),
  stall('palamig', 'joy', 'D', 'maraming', 'short', ['tanghali'], [], { x: 140, y: 96 }),
  stall('ihaw', 'jun', 'D', 'kaunti', 'medium', ['hapon'], ['umaga'], { x: 400, y: 96 }),
  stall('merienda', 'pacing', 'D', 'maraming', 'short', ['umaga', 'hapon'], ['tanghali'], {
    x: 220,
    y: 96,
  }),
  stall('lugawan', 'dodong', 'D', 'kaunti', 'medium', ['umaga'], [], { x: 300, y: 96 }),
  stall('halohalo', 'mimi', 'E', 'maraming', 'short', ['hapon'], ['umaga'], { x: 48, y: 267 }),
  stall('silog', 'ronnie', 'E', 'kaunti', 'medium', ['tanghali'], [], { x: 48, y: 201 }),
  stall('water', '', 'C', 'wala', 'none', [], [], { x: 485, y: 300 }),
];

const BY_KEY = new Map(STALLS.map((s) => [s.key, s]));

export function stallDef(key: StallKey): StallDef {
  const found = BY_KEY.get(key);
  if (!found) throw new Error(`Unknown stall: ${key}`);
  return found;
}
