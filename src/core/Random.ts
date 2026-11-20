/**
 * Seeded random numbers for game logic, the balance sim and tests (SPEC §8).
 * All gameplay randomness goes through a Random so a Day can be replayed exactly from its seed.
 * Never call Math.random() in logic code. No Phaser imports (enforced by ESLint).
 * Algorithm: mulberry32 (32-bit state; fast and plenty for gameplay).
 */
export class Random {
  readonly seed: number;
  private state: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.state = this.seed;
  }

  /** Float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** True with probability p (0..1). chance(0) is always false, chance(1) always true. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Random.pick: empty array');
    }
    return items[this.int(0, items.length - 1)];
  }

  /** value ± value × fraction, e.g. jitter(9, 0.2) is in [7.2, 10.8). Used for spawn intervals. */
  jitter(value: number, fraction: number): number {
    const spread = Math.abs(value * fraction);
    return this.float(value - spread, value + spread);
  }
}
