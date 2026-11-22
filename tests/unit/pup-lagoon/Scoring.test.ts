import { describe, expect, it } from 'vitest';
import { iponFrom, scoreStamps } from '../../../src/minigames/pup-lagoon/logic/Scoring';

const base = {
  requiredComplete: true,
  allComplete: true,
  busog: 5,
  busogTarget: 5,
  spent: 70,
  baselineMinCost: 70,
  rulesBroken: false,
};

describe('Scoring stamps (OC-3)', () => {
  it('gives all three stamps for a complete, full, sulit vacant', () => {
    expect(scoreStamps(base)).toEqual({ kumpleto: true, busog: true, sulit: true });
  });

  it('Sulit Master! allows ₱5 over the cheapest completion, no more', () => {
    expect(scoreStamps({ ...base, spent: 75 }).sulit).toBe(true);
    expect(scoreStamps({ ...base, spent: 76 }).sulit).toBe(false);
  });

  it('Sulit needs every line including friend lines, and no broken rule', () => {
    expect(scoreStamps({ ...base, allComplete: false }).sulit).toBe(false);
    expect(scoreStamps({ ...base, rulesBroken: true }).sulit).toBe(false);
  });

  it('Kumpleto and Busog are separate', () => {
    expect(scoreStamps({ ...base, requiredComplete: false, allComplete: false })).toEqual({
      kumpleto: false,
      busog: true,
      sulit: false,
    });
    expect(scoreStamps({ ...base, busog: 4 }).busog).toBe(false);
  });

  it('ipon only comes with Kumpleto!', () => {
    expect(iponFrom({ kumpleto: true, busog: false, sulit: false }, 15)).toBe(15);
    expect(iponFrom({ kumpleto: false, busog: true, sulit: false }, 15)).toBe(0);
  });
});
