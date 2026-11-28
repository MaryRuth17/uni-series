import { describe, expect, it } from 'vitest';
import { MENU } from '../../../src/minigames/pup-lagoon/data/menu';
import { STALLS } from '../../../src/minigames/pup-lagoon/data/stalls';
import { PROMOS } from '../../../src/minigames/pup-lagoon/data/events';
import {
  openStalls,
  orderableItems,
  purchaseEffect,
  tierFor,
} from '../../../src/minigames/pup-lagoon/logic/Catalog';
import { TAGS } from '../../../src/minigames/pup-lagoon/logic/types';

describe('menu and stall data', () => {
  it('has the 57 menu items with valid stalls and tags', () => {
    expect(MENU).toHaveLength(57);
    expect(new Set(MENU.map((m) => m.key)).size).toBe(57);
    const stalls = new Set(STALLS.map((s) => s.key));
    for (const m of MENU) {
      expect(stalls.has(m.stall)).toBe(true);
      m.tags.forEach((t) => expect(TAGS).toContain(t));
      expect(m.price).toBeGreaterThanOrEqual(0);
    }
  });

  it('every promo points at a real item of its stall', () => {
    for (const p of PROMOS) {
      expect(MENU.find((m) => m.key === p.item)?.stall).toBe(p.stall);
    }
  });
});

describe('Catalog', () => {
  it('maps vacant numbers to tiers (OC-4)', () => {
    expect([1, 5, 6, 12, 13, 20, 21, 500].map(tierFor)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it('opens every food stall from the first vacant, and the water station with the Tumbler (L-030)', () => {
    for (const tier of [1, 2, 3, 4] as const) expect(openStalls(tier, [])).toHaveLength(10);
    expect(openStalls(1, [])).not.toContain('water');
    expect(openStalls(1, ['tumbler'])).toContain('water');
  });

  it('never lists the free iced tea as orderable', () => {
    const items = orderableItems(new Set(openStalls(4, ['tumbler'])), ['tumbler']).map(
      (m) => m.key,
    );
    expect(items).not.toContain('free_iced_tea');
    expect(items).toContain('tumbler_water');
  });

  it('applies sawsawan, free drinks and promos', () => {
    expect(purchaseEffect('fishball', 'maanghang', null).tags).toContain('maanghang');
    expect(purchaseEffect('fishball', 'suka', null).spicy).toBe(false);
    expect(purchaseEffect('adobo_meal', undefined, null).free?.tags).toEqual(['inumin', 'malamig']);
    const off = PROMOS.find((p) => p.key === 'kwekkwekOff5') ?? null;
    expect(purchaseEffect('kwekkwek', 'suka', off).price).toBe(15);
    const b1t1 = PROMOS.find((p) => p.key === 'turonB1T1') ?? null;
    expect(purchaseEffect('turon', undefined, b1t1).copies).toBe(2);
    expect(purchaseEffect('bbq', undefined, null).grillSeconds).toBe(5);
  });
});
