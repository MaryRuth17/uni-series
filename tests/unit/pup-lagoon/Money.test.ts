import { describe, expect, it } from 'vitest';
import {
  addMoney,
  containsMoney,
  emptyMoney,
  greedyPieces,
  moneyOf,
  moneyTotal,
  pieceCount,
  subMoney,
  toPieces,
} from '../../../src/minigames/pup-lagoon/logic/Money';

describe('Money', () => {
  it('counts pieces and totals', () => {
    const m = moneyOf([50, 10, 5, 5]);
    expect(moneyTotal(m)).toBe(70);
    expect(pieceCount(m)).toBe(4);
    expect(toPieces(m)).toEqual([50, 10, 5, 5]);
    expect(moneyTotal(emptyMoney())).toBe(0);
  });

  it('adds and subtracts without going negative', () => {
    const a = moneyOf([20, 10]);
    const b = moneyOf([10]);
    expect(moneyTotal(addMoney(a, b))).toBe(40);
    expect(toPieces(subMoney(a, b))).toEqual([20]);
    expect(containsMoney(a, moneyOf([20, 20]))).toBe(false);
    expect(() => subMoney(a, moneyOf([5]))).toThrow();
  });

  it('makes pasabay money with the fewest pieces', () => {
    expect(greedyPieces(25)).toEqual([20, 5]);
    expect(greedyPieces(18)).toEqual([10, 5, 1, 1, 1]);
    expect(greedyPieces(0)).toEqual([]);
  });
});
