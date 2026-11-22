/**
 * Derive independent, reproducible seeds from the save seed and the vacant number (OC-8: saveSeed + n).
 * A small integer hash, so nearby vacants do not get correlated random streams.
 */
export function mixSeed(...parts: number[]): number {
  let h = 0x9e3779b9;
  for (const p of parts) {
    h = Math.imul(h ^ (p >>> 0), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

/** Salts so each system gets its own stream for the same vacant. */
export const SEED_SALT = { rhythm: 1, listahan: 2, play: 3 } as const;
