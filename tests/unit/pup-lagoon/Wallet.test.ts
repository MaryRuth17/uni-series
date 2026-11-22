import { describe, expect, it } from 'vitest';
import { moneyOf, moneyTotal, toPieces } from '../../../src/minigames/pup-lagoon/logic/Money';
import { smartPay, Wallet } from '../../../src/minigames/pup-lagoon/logic/Wallet';

describe('smartPay', () => {
  it('pays the exact amount when the wallet can make it', () => {
    const paid = smartPay(moneyOf([50, 10, 5, 5]), 15, moneyOf([]));
    expect(paid && toPieces(paid)).toEqual([10, 5]);
  });

  it('otherwise picks the smallest overpayment the vendor can change', () => {
    const paid = smartPay(moneyOf([50, 20]), 45, moneyOf([5]));
    expect(paid && toPieces(paid)).toEqual([50]);
  });

  it('avoids payments the vendor cannot change', () => {
    // 20 would need ₱5 change, which the box lacks; 10+10 is exact.
    const paid = smartPay(moneyOf([20, 10, 10]), 15 + 5, moneyOf([]));
    expect(paid && moneyTotal(paid)).toBe(20);
    expect(smartPay(moneyOf([20]), 15, moneyOf([]))).toBeNull();
  });

  it('prefers fewer pieces among equal overpayments', () => {
    const paid = smartPay(moneyOf([20, 10, 10, 5, 5, 5, 5]), 20, moneyOf([]));
    expect(paid && toPieces(paid)).toEqual([20]);
  });

  it('returns null when the wallet is short', () => {
    expect(smartPay(moneyOf([10]), 15, moneyOf([5, 5]))).toBeNull();
  });
});

describe('Wallet', () => {
  it('takes and gives pieces', () => {
    const w = new Wallet(moneyOf([50, 10]));
    expect(w.total).toBe(60);
    w.take(moneyOf([50]));
    w.give(moneyOf([5]));
    expect(toPieces(w.money)).toEqual([10, 5]);
    expect(w.has(moneyOf([50]))).toBe(false);
    expect(() => w.take(moneyOf([50]))).toThrow();
  });
});
