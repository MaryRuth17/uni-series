import { describe, expect, it } from 'vitest';
import { Rhythm } from '../../../src/minigames/pup-lagoon/logic/Rhythm';

describe('Rhythm (OC-1, OC-4, OC-5)', () => {
  it('vacant 1 is the fixed tutorial', () => {
    const v = new Rhythm(42).vacant(1);
    expect(v).toEqual({
      n: 1,
      tier: 1,
      slot: 'tanghali',
      baon: 70,
      special: 'tutorial',
      walangPanukli: false,
      event: null,
    });
  });

  it('cycles slots umaga → tanghali → hapon and maps tiers by vacant count', () => {
    const r = new Rhythm(7);
    expect([1, 2, 3, 4].map((n) => r.vacant(n).slot)).toEqual([
      'tanghali',
      'hapon',
      'umaga',
      'tanghali',
    ]);
    expect([5, 6, 12, 13, 20, 21].map((n) => r.vacant(n).tier)).toEqual([1, 2, 2, 3, 3, 4]);
  });

  it('is deterministic per save seed', () => {
    const a = new Rhythm(99);
    const b = new Rhythm(99);
    expect(b.vacant(30)).toEqual(a.vacant(30));
    expect(new Rhythm(100).vacant(30)).not.toEqual(a.vacant(30));
  });

  it('keeps tier 1 calm and follows the special and event rules over many seeds', () => {
    let pdp = 0;
    let payday = 0;
    let events = 0;
    let tier4 = 0;
    const paydayKinds: string[] = [];
    for (let seed = 1; seed <= 300; seed++) {
      const r = new Rhythm(seed);
      for (let n = 2; n <= 60; n++) {
        const v = r.vacant(n);
        const prev = r.vacant(n - 1);
        if (v.tier === 1) {
          expect(v.special).toBeNull();
          expect(v.event).toBeNull();
          expect(v.walangPanukli).toBe(false);
          expect([60, 70, 80]).toContain(v.baon);
        }
        if (v.special === 'pdp') {
          expect(v.baon).toBe(50);
          expect(prev.special).not.toBe('pdp');
        }
        if (v.special === 'kinsenas' || v.special === 'katapusan') {
          expect(v.tier).toBeGreaterThanOrEqual(3);
          expect(v.baon).toBe(150);
          paydayKinds.push(v.special);
        }
        if (v.event === 'hot') expect(v.tier).toBeGreaterThanOrEqual(3);
        if (v.event) expect(v.event).not.toBe(prev.event);
        if (v.tier === 4) {
          tier4 += 1;
          if (v.special === 'pdp') pdp += 1;
          if (v.special === 'kinsenas' || v.special === 'katapusan') payday += 1;
          if (v.event) events += 1;
        }
      }
    }
    expect(payday / tier4).toBeGreaterThan(0.08);
    expect(payday / tier4).toBeLessThan(0.16);
    expect(pdp / tier4).toBeGreaterThan(0.09);
    expect(pdp / tier4).toBeLessThan(0.2);
    expect(events / tier4).toBeGreaterThan(0.3);
    expect(events / tier4).toBeLessThan(0.45);
    expect(paydayKinds[0]).toBe('kinsenas');
  });

  it('rejects bad vacant numbers', () => {
    expect(() => new Rhythm(1).vacant(0)).toThrow();
  });
});
