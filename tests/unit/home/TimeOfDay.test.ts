import { describe, expect, it } from 'vitest';
import { isDecember, phaseAt } from '../../../src/home/TimeOfDay';

const at = (h: number, m: number): Date => new Date(2026, 10, 22, h, m);

describe('TimeOfDay (SPEC-homepage §3.4)', () => {
  it('switches phase exactly at 6:00, 11:00, 15:00 and 18:30', () => {
    expect(phaseAt(at(5, 59))).toBe('gabi');
    expect(phaseAt(at(6, 0))).toBe('umaga');
    expect(phaseAt(at(10, 59))).toBe('umaga');
    expect(phaseAt(at(11, 0))).toBe('tanghali');
    expect(phaseAt(at(14, 59))).toBe('tanghali');
    expect(phaseAt(at(15, 0))).toBe('hapon');
    expect(phaseAt(at(18, 29))).toBe('hapon');
    expect(phaseAt(at(18, 30))).toBe('gabi');
    expect(phaseAt(at(0, 0))).toBe('gabi');
  });

  it('Golden hour theme always shows hapon', () => {
    expect(phaseAt(at(8, 0), 'golden')).toBe('hapon');
    expect(phaseAt(at(22, 0), 'golden')).toBe('hapon');
  });

  it('knows December for the parols', () => {
    expect(isDecember(new Date(2026, 11, 1))).toBe(true);
    expect(isDecember(at(12, 0))).toBe(false);
  });
});
