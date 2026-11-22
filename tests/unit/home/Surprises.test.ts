import { describe, expect, it } from 'vitest';
import { Surprises } from '../../../src/home/Surprises';

describe('Surprises (SPEC-homepage §3.5)', () => {
  it('reacts once, then rests for 5 seconds', () => {
    const s = new Surprises();
    expect(s.trigger('jeep')).toBe(true);
    expect(s.trigger('jeep')).toBe(false);
    s.update(4900);
    expect(s.isReady('jeep')).toBe(false);
    expect(s.trigger('jeep')).toBe(false);
    s.update(100);
    expect(s.trigger('jeep')).toBe(true);
  });

  it('each surprise has its own cooldown', () => {
    const s = new Surprises(1000);
    expect(s.trigger('cat')).toBe(true);
    expect(s.trigger('train')).toBe(true);
    expect(s.trigger('cat')).toBe(false);
    expect(s.isReady('barker')).toBe(true);
  });
});
