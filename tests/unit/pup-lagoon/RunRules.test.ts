import { describe, expect, it } from 'vitest';
import { purchaseEffect } from '../../../src/minigames/pup-lagoon/logic/Catalog';
import { LagoonVacant } from '../../../src/minigames/pup-lagoon/logic/LagoonVacant';
import { moneyOf } from '../../../src/minigames/pup-lagoon/logic/Money';
import {
  cheapestNeed,
  judgeFinish,
  judgeStuck,
  overspend,
  ticksLine,
} from '../../../src/minigames/pup-lagoon/logic/RunRules';
import type { StallKey } from '../../../src/minigames/pup-lagoon/logic/types';
import { itemLine, makeVacant, tag } from './helpers';

const ALL: ReadonlySet<StallKey> = new Set([
  'karinderya',
  'tusok',
  'palamig',
  'ihaw',
  'merienda',
  'tinapay',
  'lugawan',
  'halohalo',
  'silog',
  'ricebox',
]);

describe('RunRules (owner rules, DECISIONS L-034)', () => {
  it('knows which purchases tick which lines, free iced tea included', () => {
    const meal = purchaseEffect('adobo_meal', undefined, null);
    expect(ticksLine(tag('L1', 'kanin'), meal)).toBe(true);
    expect(ticksLine(tag('L2', 'inumin'), meal)).toBe(true); // the free iced tea
    expect(ticksLine(tag('L3', 'tusok'), meal)).toBe(false);
    expect(ticksLine(itemLine('L4', 'fewa'), purchaseEffect('fewa', 'suka', null))).toBe(true);
    expect(ticksLine(tag('L5', 'maanghang'), purchaseEffect('fishball', 'maanghang', null))).toBe(
      true,
    );
  });

  it('loses on an order that costs more than the money left', () => {
    expect(overspend(70, 70)).toBe(0);
    expect(overspend(85, 70)).toBe(15);
  });

  it('wins only with every line done when finishing', () => {
    const lines = [tag('L1', 'kanin'), tag('L2', 'inumin')];
    expect(judgeFinish(lines, () => true)).toEqual({ kind: 'win' });
    expect(judgeFinish(lines, (id) => id === 'L1')).toEqual({
      kind: 'incomplete',
      missing: ['L2'],
    });
  });

  it('is stuck (broke) when the money left cannot buy anything still needed', () => {
    const lines = [tag('L1', 'sabaw')];
    const cheapest = cheapestNeed(lines, ALL, [], null);
    expect(cheapest).toBe(25); // lugaw
    expect(judgeStuck(lines, () => false, 20, cheapest)).toEqual({
      kind: 'broke',
      missing: ['L1'],
    });
    expect(judgeStuck(lines, () => false, 25, cheapest)).toBeNull();
    expect(judgeStuck(lines, () => true, 0, cheapest)).toBeNull();
    expect(cheapestNeed([tag('L1', 'tusok')], ALL, [], null)).toBe(10);
  });
});

describe('LagoonVacant without lines (DECISIONS L-033)', () => {
  it('goes straight to the counter, buys, and pays with change', () => {
    const gen = makeVacant({ lines: [tag('L1', 'tusok')], wallet: [20, 10], cash: 'maraming' });
    const v = new LagoonVacant(gen, { suki: {}, owned: [], saveSeed: 1 });
    expect(v.joinPila('tusok').ok).toBe(true);
    expect(v.location).toEqual({ stall: 'tusok', at: 'counter' });
    expect(v.pilaLength('tusok')).toBe(0);
    expect(v.addToOrder('kikiam', { sauce: 'matamis' }).ok).toBe(true);
    const paid = v.pay(moneyOf([20]));
    expect(paid.ok).toBe(true);
    expect(v.wallet.total).toBe(20); // ₱10 left in the wallet + ₱10 sukli
    expect(v.listahan.isComplete()).toBe(true);
    expect(v.joinPila('water').ok).toBe(false);
  });
});
