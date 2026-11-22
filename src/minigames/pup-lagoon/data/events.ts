/**
 * Event details (SPEC-pup-lagoon §9.2, OC-5). Chances live in config.ts EVENTS.
 * "May quiz pa!" is removed (OC-2: no clock).
 */
import type { StallKey } from '../logic/types';

export interface PromoDef {
  key: string;
  stall: StallKey;
  item: string;
  /** Peso discount on the item. */
  priceOff?: number;
  /** Free copies per purchase (Buy 1 Take 1). */
  extraCopies?: number;
}

export const PROMOS: readonly PromoDef[] = [
  { key: 'turonB1T1', stall: 'merienda', item: 'turon', extraCopies: 1 },
  { key: 'kwekkwekOff5', stall: 'tusok', item: 'kwekkwek', priceOff: 5 },
  { key: 'pandesalExtra', stall: 'merienda', item: 'pandesal', extraCopies: 1 },
];
