import { describe, expect, it } from 'vitest';
import { CashBox, makeChange, startingBox } from '../../../src/minigames/pup-lagoon/logic/CashBox';
import { moneyOf, moneyTotal, toPieces } from '../../../src/minigames/pup-lagoon/logic/Money';

describe('makeChange', () => {
  it('gives nothing for exact pay', () => {
    expect(moneyTotal(makeChange(0, moneyOf([])) as ReturnType<typeof moneyOf>)).toBe(0);
  });

  it('uses the fewest pieces, largest first', () => {
    const change = makeChange(35, moneyOf([20, 10, 5, 5, 5, 1, 1]));
    expect(change && toPieces(change)).toEqual([20, 10, 5]);
  });

  it('finds an exact combination when greedy fails', () => {
    // Greedy takes the 50 and is stuck at 10; the search finds 20 + 20 + 20.
    const change = makeChange(60, moneyOf([50, 20, 20, 20]));
    expect(change && toPieces(change)).toEqual([20, 20, 20]);
  });

  it('returns null when the box cannot make it (walang panukli)', () => {
    expect(makeChange(5, moneyOf([10, 20]))).toBeNull();
    expect(makeChange(3, moneyOf([5, 1, 1]))).toBeNull();
    expect(makeChange(10, moneyOf([]))).toBeNull();
  });
});

describe('CashBox', () => {
  it('starts with the spec presets', () => {
    expect(moneyTotal(startingBox('maraming'))).toBe(4 + 20 + 60 + 60);
    expect(moneyTotal(startingBox('kaunti'))).toBe(2 + 5 + 20);
    expect(moneyTotal(startingBox('wala'))).toBe(0);
  });

  it('takes paid pieces in and gives change out', () => {
    const box = new CashBox(startingBox('kaunti'));
    const sale = box.sell(moneyOf([50]), 45);
    expect(sale.ok).toBe(true);
    if (sale.ok) expect(toPieces(sale.change)).toEqual([5]);
    expect(moneyTotal(box.money)).toBe(27 - 5 + 50);
  });

  it('refuses short payments and impossible change without changing the box', () => {
    const box = new CashBox(startingBox('wala'));
    expect(box.sell(moneyOf([5]), 10)).toEqual({ ok: false, reason: 'kulang', short: 5 });
    expect(box.sell(moneyOf([20]), 10)).toEqual({ ok: false, reason: 'walangPanukli' });
    expect(moneyTotal(box.money)).toBe(0);
    // Once someone pays with coins, the vendor has change.
    expect(box.sell(moneyOf([10]), 10).ok).toBe(true);
    expect(box.sell(moneyOf([20]), 10).ok).toBe(true);
  });
});
