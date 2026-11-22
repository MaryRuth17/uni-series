import { describe, expect, it } from 'vitest';
import {
  applyOutcome,
  breakReward,
  breakThreshold,
  buyFromShop,
  favouriteFood,
  newProgress,
  sukiLevel,
  type VacantOutcome,
} from '../../../src/minigames/pup-lagoon/logic/Progress';

const outcome = (n: number, extra: Partial<VacantOutcome> = {}): VacantOutcome => ({
  n,
  stamps: { kumpleto: true, busog: true, sulit: false },
  iponAdded: 10,
  stallsBought: ['ihaw'],
  foods: ['bbq_rice'],
  heartsGained: {},
  ...extra,
});

describe('Progress (OC-6, OC-7, OC-11)', () => {
  it('adds ipon to the balance and the lifetime total', () => {
    const { progress } = applyOutcome(newProgress(1), outcome(1, { iponAdded: 25 }));
    expect(progress.vacants).toBe(1);
    expect(progress.iponBalance).toBe(25);
    expect(progress.iponLifetime).toBe(25);
    expect(progress.stamps).toEqual({ kumpleto: 1, busog: 1, sulit: 0 });
  });

  it('breaks the alkansya by lifetime ipon; the first break gives the PUP sticker', () => {
    expect([0, 1, 2, 3, 4].map(breakThreshold)).toEqual([200, 500, 1000, 2000, 3000]);
    expect(breakReward(0)).toBe('sticker-pup');
    expect(breakReward(3)).toBe('frame_1');
    let p = { ...newProgress(1), iponBalance: 20, iponLifetime: 190 };
    p = buyFromShop({ ...p, iponBalance: 200 }, 'tumbler').ok ? p : p;
    const { progress, report } = applyOutcome(p, outcome(2, { iponAdded: 15 }));
    expect(report.newBreaks).toEqual([{ threshold: 200, reward: 'sticker-pup' }]);
    expect(progress.rewards).toContain('sticker-pup');
    expect(progress.alkansyaBreaks).toBe(1);
  });

  it('spending in the Ipon Shop never undoes a break', () => {
    let p = { ...newProgress(1), iponBalance: 150, iponLifetime: 150 };
    const bought = buyFromShop(p, 'tumbler');
    expect(bought.ok).toBe(true);
    if (bought.ok) p = bought.progress;
    expect(p.iponBalance).toBe(30);
    const { progress } = applyOutcome(p, outcome(3, { iponAdded: 60 }));
    expect(progress.iponLifetime).toBe(210);
    expect(progress.alkansyaBreaks).toBe(1);
  });

  it('shop refuses unknown, owned and unaffordable items', () => {
    const p = { ...newProgress(1), iponBalance: 100, owned: ['payong'] };
    expect(buyFromShop(p, 'nope')).toEqual({ ok: false, reason: 'unknown' });
    expect(buyFromShop(p, 'payong')).toEqual({ ok: false, reason: 'owned' });
    expect(buyFromShop(p, 'notebook')).toEqual({ ok: false, reason: 'kulang' });
  });

  it('suki levels count distinct vacants: 3 → Suki 1, 8 → Suki 2', () => {
    expect([0, 2, 3, 7, 8].map(sukiLevel)).toEqual([0, 0, 1, 1, 2]);
    let p = newProgress(1);
    const ups: number[] = [];
    for (let n = 1; n <= 8; n++) {
      const r = applyOutcome(p, outcome(n, { stallsBought: ['ihaw', 'ihaw', 'water'] }));
      p = r.progress;
      r.report.sukiUps.forEach((u) => ups.push(u.level));
    }
    expect(p.suki.ihaw).toBe(8);
    expect(p.suki.water).toBeUndefined();
    expect(ups).toEqual([1, 2]);
  });

  it('friendship hearts give gifts at 5, 10 and 15', () => {
    let p = newProgress(1);
    const gifts: string[] = [];
    for (let n = 1; n <= 8; n++) {
      const r = applyOutcome(p, outcome(n, { heartsGained: { migs: 2 } }));
      p = r.progress;
      r.report.gifts.forEach((g) => gifts.push(g.reward));
    }
    expect(p.hearts.migs).toBe(16);
    expect(gifts).toEqual(['gift_migs_charm', 'gift_migs_outfit', 'gift_migs_sticker']);
  });

  it('takes a barkada photo every 5th vacant with the favourite food', () => {
    let p = newProgress(1);
    let photo = null;
    for (let n = 1; n <= 5; n++) {
      const r = applyOutcome(p, outcome(n, { foods: n % 2 ? ['turon'] : ['turon', 'gulaman'] }));
      p = r.progress;
      photo = r.report.photo;
    }
    expect(photo).toEqual({ vacant: 5, food: 'turon' });
    expect(p.album).toHaveLength(1);
    expect(favouriteFood([])).toBeNull();
  });

  it('announces stalls that open on the next vacant', () => {
    expect(applyOutcome(newProgress(1), outcome(5)).report.newStalls.sort()).toEqual([
      'lugawan',
      'merienda',
    ]);
    expect(applyOutcome(newProgress(1), outcome(12)).report.newStalls.sort()).toEqual([
      'halohalo',
      'silog',
    ]);
    expect(applyOutcome(newProgress(1), outcome(7)).report.newStalls).toEqual([]);
  });
});
