import { describe, expect, it } from 'vitest';
import { LISTAHAN, TUTORIAL } from '../../../src/minigames/pup-lagoon/config';
import { FALLBACKS } from '../../../src/minigames/pup-lagoon/data/fallbacks';
import { smallChangeMix } from '../../../src/minigames/pup-lagoon/data/walletMixes';
import { generateVacant } from '../../../src/minigames/pup-lagoon/logic/ListahanGen';
import { moneyOf, moneyTotal, toPieces } from '../../../src/minigames/pup-lagoon/logic/Money';
import { payableOrder, planVisits } from '../../../src/minigames/pup-lagoon/logic/Payment';
import { Rhythm } from '../../../src/minigames/pup-lagoon/logic/Rhythm';
import { solve } from '../../../src/minigames/pup-lagoon/logic/Solver';
import type { Tier } from '../../../src/minigames/pup-lagoon/logic/types';
import { boxes, candidatesFor, tag } from './helpers';

describe('ListahanGen: tutorial', () => {
  it('uses the fixed tutorial list, wallet and the ₱70 answer', () => {
    const g = generateVacant(new Rhythm(5).vacant(1), { saveSeed: 5, owned: [] });
    expect(g.lines.map((l) => l.tag)).toEqual(TUTORIAL.tags);
    expect(toPieces(g.wallet)).toEqual([50, 10, 5, 5]);
    expect(g.baseline.minCost).toBe(70);
    expect(g.event).toBeNull();
  });
});

describe('ListahanGen: acceptance rules over 1,000 seeds (OC-8)', () => {
  it('never ships a listahan that cannot be finished and paid', () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const r = new Rhythm(seed);
      for (const n of [3, 9, 16, 25]) {
        const def = r.vacant(n);
        const g = generateVacant(def, { saveSeed: seed, owned: seed % 3 === 0 ? ['tumbler'] : [] });
        const wallet = moneyTotal(g.wallet);
        const pasabay = g.lines.reduce((s, l) => s + (l.money ?? 0), 0);
        expect(wallet).toBe(def.baon + pasabay);
        expect(g.baseline.minCost).not.toBeNull();
        expect(g.baseline.minCost as number).toBeLessThanOrEqual(wallet);
        if (!g.usedFallback) {
          expect(g.baseline.minCost as number).toBeGreaterThanOrEqual(
            LISTAHAN.minCostRatio * def.baon,
          );
          expect(g.baseline.minCostBusog as number).toBeLessThanOrEqual(wallet);
          expect(g.route.busog).not.toBeNull();
        }
        expect(g.lines.reduce((s, l) => s + l.qty, 0)).toBeLessThanOrEqual(LISTAHAN.maxUnits);
        const tags = g.lines.filter((l) => l.kind === 'tag').map((l) => l.tag);
        expect(new Set(tags).size).toBe(tags.length);
        if (g.noSpicy) expect(tags).not.toContain('maanghang');
        if (g.hot) expect(tags).toContain('malamig');
        if (def.special === 'kinsenas' || def.special === 'katapusan') {
          expect(g.lines.some((l) => l.owner === 'barkada' && l.qty === 3)).toBe(true);
        }
        if (g.soldOut) {
          expect(g.baseline.planComplete?.some((s) => s.item === g.soldOut?.item)).toBe(false);
        }
        expect(g.route.complete.length).toBeGreaterThan(0);
      }
    }
  }, 60_000);

  it('is deterministic for the same seed and vacant', () => {
    const def = new Rhythm(321).vacant(18);
    const a = generateVacant(def, { saveSeed: 321, owned: [] });
    const b = generateVacant(def, { saveSeed: 321, owned: [] });
    expect(b.lines).toEqual(a.lines);
    expect(b.baonPieces).toEqual(a.baonPieces);
  });
});

describe('fallback lists', () => {
  it('each tier has a fallback that fits the smallest baon and pays exactly with no vendor change', () => {
    const smallest: Record<Tier, number> = { 1: 60, 2: 50, 3: 50, 4: 50 };
    for (const tier of [1, 2, 3, 4] as Tier[]) {
      const ok = FALLBACKS[tier].some((tags) => {
        const lines = tags.map((t, i) => tag(`L${i + 1}`, t));
        const r = solve(lines, candidatesFor(tier), 0, smallest[tier]);
        if (!r.planComplete) return false;
        const wallet = moneyOf(smallChangeMix(smallest[tier]));
        return payableOrder(wallet, boxes('wala'), planVisits(r.planComplete)) !== null;
      });
      expect(ok, `tier ${tier}`).toBe(true);
    }
  });
});
