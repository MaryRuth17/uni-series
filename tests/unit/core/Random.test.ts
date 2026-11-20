import { describe, expect, it } from 'vitest';
import { Random } from '../../../src/core/Random';

const draws = (rng: Random, count: number): number[] =>
  Array.from({ length: count }, () => rng.int(0, 1_000_000));

describe('Random', () => {
  it('gives the same sequence for the same seed', () => {
    expect(draws(new Random(1234), 20)).toEqual(draws(new Random(1234), 20));
  });

  it('gives different sequences for different seeds', () => {
    expect(draws(new Random(1), 10)).not.toEqual(draws(new Random(2), 10));
  });

  it('keeps its seed', () => {
    const rng = new Random(42);
    rng.next();
    expect(rng.seed).toBe(42);
  });

  it('next() stays in [0, 1)', () => {
    const rng = new Random(3);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() is inclusive and bounded', () => {
    const rng = new Random(7);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = rng.int(1, 3);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(3);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it('chance() edges are certain', () => {
    const rng = new Random(9);
    for (let i = 0; i < 50; i++) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
  });

  it('jitter() stays within the fraction', () => {
    const rng = new Random(11);
    for (let i = 0; i < 500; i++) {
      const v = rng.jitter(9, 0.2);
      expect(v).toBeGreaterThanOrEqual(7.2);
      expect(v).toBeLessThan(10.8);
    }
  });

  it('pick() returns a member and rejects an empty array', () => {
    const rng = new Random(5);
    const items = ['fishball', 'kikiam', 'kwekkwek'] as const;
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(rng.pick(items));
    }
    expect(() => rng.pick([])).toThrow();
  });
});
