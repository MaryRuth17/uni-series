import { describe, expect, it } from 'vitest';
import { playRoute } from '../../../src/minigames/pup-lagoon/logic/Bot';
import { generateVacant } from '../../../src/minigames/pup-lagoon/logic/ListahanGen';
import { LagoonVacant } from '../../../src/minigames/pup-lagoon/logic/LagoonVacant';
import { moneyOf, moneyTotal, toPieces } from '../../../src/minigames/pup-lagoon/logic/Money';
import { Rhythm } from '../../../src/minigames/pup-lagoon/logic/Rhythm';
import { makeVacant, pasabay, tag } from './helpers';

const ctx = { suki: {}, owned: [] as string[], saveSeed: 1 };

function toCounter(v: LagoonVacant, stall: Parameters<LagoonVacant['joinPila']>[0]): void {
  expect(v.joinPila(stall).ok).toBe(true);
  for (let i = 0; v.location?.at !== 'counter' && i < 2000; i++) v.update(100);
  expect(v.location).toEqual({ stall, at: 'counter' });
}

describe('LagoonVacant: the tutorial played start to finish', () => {
  it('pays, ticks, stamps and conserves money', () => {
    const gen = generateVacant(new Rhythm(1).vacant(1), { saveSeed: 1, owned: [] });
    const v = new LagoonVacant(gen, { ...ctx });
    expect(playRoute(gen, v)).toBeNull();
    const events = v.drainEvents().map((e) => e.type);
    expect(events).toContain('paid');
    expect(events).toContain('listComplete');
    const r = v.finish();
    expect(r.stamps.kumpleto).toBe(true);
    expect(r.spent + r.leftover).toBe(70);
    expect(r.iponAdded).toBe(r.leftover);
  });
});

describe('LagoonVacant: buying and paying (§4.3, §4.4)', () => {
  it('refuses short payments and payments the vendor cannot change', () => {
    const gen = makeVacant({ lines: [tag('L1', 'tusok')], wallet: [20, 5, 5], cash: 'wala' });
    const v = new LagoonVacant(gen, ctx);
    toCounter(v, 'tusok');
    expect(v.addToOrder('fishball').ok).toBe(false); // needs a sawsawan
    expect(v.addToOrder('fishball', { sauce: 'suka' }).ok).toBe(true);
    expect(v.pay(moneyOf([5]))).toMatchObject({ ok: false, reason: 'kulang', short: 5 });
    expect(v.pay(moneyOf([20]))).toMatchObject({ ok: false, reason: 'walangPanukli' });
    expect(v.pay(moneyOf([50]))).toMatchObject({ ok: false, reason: 'notInWallet' });
    const smart = v.smartPay();
    expect(smart && toPieces(smart)).toEqual([5, 5]);
    expect(v.pay(smart as ReturnType<typeof moneyOf>).ok).toBe(true);
    expect(v.listahan.isComplete()).toBe(true);
    expect(v.wallet.total).toBe(20);
  });

  it('keeps grilled orders at the counter until they are done', () => {
    const gen = makeVacant({ lines: [tag('L1', 'ihaw')], wallet: [10] });
    const v = new LagoonVacant(gen, ctx);
    toCounter(v, 'ihaw');
    v.addToOrder('betamax');
    expect(v.pay(moneyOf([10])).ok).toBe(true);
    expect(v.leaveCounter()).toMatchObject({ ok: false, reason: 'grilling' });
    for (let t = 0; t < 5000; t += 100) v.update(100);
    expect(v.leaveCounter().ok).toBe(true);
  });

  it('limits the tray to 5 items per visit', () => {
    const gen = makeVacant({ lines: [tag('L1', 'inumin')], wallet: [100] });
    const v = new LagoonVacant(gen, ctx);
    toCounter(v, 'palamig');
    for (let i = 0; i < 5; i++) expect(v.addToOrder('water_bottle').ok).toBe(true);
    expect(v.addToOrder('water_bottle')).toMatchObject({ ok: false, reason: 'trayFull' });
    expect(v.addToOrder('bbq')).toMatchObject({ ok: false, reason: 'wrongStall' });
  });

  it('Pa-extra po: +1 busog only for a suki, once per visit, after buying', () => {
    const gen = makeVacant({ lines: [tag('L1', 'inumin')], wallet: [20, 20] });
    const stranger = new LagoonVacant(gen, ctx);
    toCounter(stranger, 'palamig');
    expect(stranger.askExtra()).toMatchObject({ ok: false, reason: 'nothingBought' });
    stranger.addToOrder('gulaman');
    stranger.pay(moneyOf([20]));
    expect(stranger.askExtra()).toMatchObject({ ok: true, granted: false });
    expect(stranger.askExtra()).toMatchObject({ ok: false, reason: 'alreadyAsked' });

    const suki = new LagoonVacant(gen, { ...ctx, suki: { palamig: 3 } });
    toCounter(suki, 'palamig');
    suki.addToOrder('gulaman');
    suki.pay(moneyOf([20]));
    expect(suki.askExtra()).toMatchObject({ ok: true, granted: true });
    expect(suki.busog).toBe(2);
  });
});

describe('LagoonVacant: friends, rules and endings', () => {
  it('pasabay items go to the friend by default; unspent pasabay money is returned', () => {
    const lines = [tag('L1', 'inumin'), pasabay('L2', 'migs', 'gulaman', 20)];
    const gen = makeVacant({ lines, wallet: [20, 20, 20] });
    const v = new LagoonVacant(gen, ctx);
    toCounter(v, 'palamig');
    expect(v.addToOrder('gulaman')).toMatchObject({ ok: true, forLine: 'L2' });
    expect(v.addToOrder('gulaman')).toMatchObject({ ok: true, forLine: null });
    v.pay(moneyOf([20, 20]));
    const r = v.finish();
    expect(r.heartsGained.migs).toBe(1);
    expect(r.busog).toBe(1);
    expect(r.allComplete).toBe(true);

    const skipped = new LagoonVacant(gen, ctx);
    toCounter(skipped, 'palamig');
    skipped.addToOrder('water_bottle', { forLine: null });
    skipped.pay(moneyOf([20]));
    const r2 = skipped.finish();
    expect(r2.stamps.kumpleto).toBe(true);
    expect(r2.returnedPasabay).toBe(20);
    expect(r2.leftover).toBe(25);
    expect(r2.heartsGained.migs).toBeUndefined();
  });

  it('Bawal maanghang: warns once, and buying spicy blocks Sulit Master!', () => {
    const gen = makeVacant({ lines: [tag('L1', 'tusok')], wallet: [10, 10], noSpicy: true });
    const v = new LagoonVacant(gen, ctx);
    toCounter(v, 'tusok');
    expect(v.addToOrder('fishball', { sauce: 'maanghang' })).toMatchObject({ spicyWarning: true });
    expect(v.addToOrder('kikiam', { sauce: 'maanghang' })).toMatchObject({ spicyWarning: false });
    v.removeFromOrder(1);
    v.pay(moneyOf([10]));
    const r = v.finish();
    expect(r.rulesBroken).toBe(true);
    expect(r.stamps.kumpleto).toBe(true);
    expect(r.stamps.sulit).toBe(false);
  });

  it('a sold-out item disappears from the order and can no longer be added', () => {
    const gen = makeVacant({
      lines: [tag('L1', 'tusok')],
      wallet: [20],
      soldOut: { item: 'kwekkwek', afterMs: 30_000 },
    });
    const v = new LagoonVacant(gen, ctx);
    toCounter(v, 'tusok');
    expect(v.addToOrder('kwekkwek', { sauce: 'suka' }).ok).toBe(true);
    v.drainEvents();
    const seen: string[] = [];
    for (let t = 0; t < 30_000 && !seen.includes('soldOut'); t += 100) {
      v.update(100);
      v.drainEvents().forEach((e) => seen.push(e.type));
    }
    expect(v.currentOrder).toHaveLength(0);
    expect(seen).toContain('removedFromOrder');
    expect(v.addToOrder('kwekkwek', { sauce: 'suka' })).toMatchObject({
      ok: false,
      reason: 'soldOut',
    });
  });

  it('an incomplete listahan earns no ipon and the leftover goes home', () => {
    const gen = makeVacant({ lines: [tag('L1', 'tusok'), tag('L2', 'inumin')], wallet: [20, 10] });
    const v = new LagoonVacant(gen, ctx);
    expect(v.canEat()).toBe(false);
    toCounter(v, 'tusok');
    v.addToOrder('fishball', { sauce: 'suka' });
    v.pay(moneyOf([10]));
    expect(v.canEat()).toBe(true);
    const r = v.finish();
    expect(r.stamps.kumpleto).toBe(false);
    expect(r.iponAdded).toBe(0);
    expect(r.leftover).toBe(20);
  });

  it('the Tumbler refill is free, once per vacant', () => {
    const gen = makeVacant({ lines: [tag('L1', 'inumin')], wallet: [10], owned: ['tumbler'] });
    const v = new LagoonVacant(gen, { ...ctx, owned: ['tumbler'] });
    expect(v.refillTumbler().ok).toBe(true);
    expect(v.refillTumbler()).toMatchObject({ ok: false, reason: 'alreadyUsed' });
    const r = v.finish();
    expect(r.stamps.kumpleto).toBe(true);
    expect(r.spent).toBe(0);
    expect(moneyTotal(gen.wallet)).toBe(10);
  });
});
