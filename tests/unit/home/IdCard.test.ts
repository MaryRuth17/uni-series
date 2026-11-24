import { describe, expect, it } from 'vitest';
import { cleanName, cycle, emptyProfile, validateProfile } from '../../../src/home/IdCard';

describe('IdCard (SPEC-homepage §3.3)', () => {
  it('cleans names: trims, collapses spaces, max 12 characters', () => {
    expect(cleanName('  Ana   Marie  ')).toBe('Ana Marie');
    expect(cleanName('Maria Clarissa Santos')).toBe('Maria Claris');
    expect(cleanName('Ñiño\u0007')).toBe('Ñiño');
    expect([...cleanName('😀'.repeat(20))]).toHaveLength(12);
  });

  it('cycles options with wrap-around', () => {
    expect(cycle('skin', 5, 1)).toBe(0);
    expect(cycle('hair', 0, -1)).toBe(7);
    expect(cycle('outfit', 1, 1)).toBe(2);
  });

  it('starts as a girl and accepts only girl or boy', () => {
    expect(emptyProfile().gender).toBe('girl');
    expect(validateProfile({ ...emptyProfile(), name: 'Migo', gender: 'boy' })).toEqual({
      ok: true,
    });
    expect(
      validateProfile({ ...emptyProfile(), name: 'Ana', gender: 'other' as unknown as 'girl' }),
    ).toEqual({ ok: false, reason: 'gender' });
  });

  it('needs a name and valid parts', () => {
    expect(validateProfile(emptyProfile())).toEqual({ ok: false, reason: 'name' });
    expect(validateProfile({ ...emptyProfile(), name: 'Ana' })).toEqual({ ok: true });
    expect(validateProfile({ ...emptyProfile(), name: 'Ana', lace: 6 })).toEqual({
      ok: false,
      reason: 'part',
    });
  });
});
