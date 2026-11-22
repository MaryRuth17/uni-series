import { describe, expect, it } from 'vitest';
import { Random } from '../../../src/core/Random';
import { stallDef } from '../../../src/minigames/pup-lagoon/data/stalls';
import { averagePila, Pila } from '../../../src/minigames/pup-lagoon/logic/Pila';

describe('Pila', () => {
  it('goes straight to the counter when nobody is in line', () => {
    const p = new Pila(0, 4, 0);
    expect(p.join()).toBe('counter');
    expect(p.playerPlace).toBe(0);
  });

  it('serves one person ahead every 3 seconds', () => {
    const rng = new Random(1);
    const p = new Pila(0, 4, 2);
    expect(p.join()).toBe('waiting');
    expect(p.playerPlace).toBe(2);
    for (let t = 0; t < 2900; t += 100) p.update(100, rng);
    expect(p.playerPlace).toBe(2);
    p.update(100, rng);
    expect(p.playerPlace).toBe(1);
    let reached = false;
    for (let t = 0; t < 3000; t += 100) reached = p.update(100, rng).reachedCounter || reached;
    expect(reached).toBe(true);
    expect(p.player).toBe('counter');
  });

  it('holds the line while the player is at the counter, then moves everyone up', () => {
    const rng = new Random(2);
    const p = new Pila(3, 4, 0);
    p.join();
    for (let t = 0; t < 60_000; t += 100) p.update(100, rng);
    expect(p.ahead).toBe(0);
    expect(p.length).toBeLessThanOrEqual(4);
    const behind = p.behind;
    p.leave();
    expect(p.player).toBe('none');
    expect(p.ahead).toBe(behind);
  });

  it('never grows past its cap', () => {
    const rng = new Random(3);
    const p = new Pila(10, 4, 4);
    for (let t = 0; t < 30_000; t += 100) p.update(100, rng);
    expect(p.length).toBeLessThanOrEqual(4);
  });

  it('is longer at busy slots, on hot days and with the long-line event', () => {
    const karinderya = stallDef('karinderya');
    expect(averagePila(karinderya, 'tanghali', false, false)).toBeGreaterThan(
      averagePila(karinderya, 'hapon', false, false),
    );
    const halo = stallDef('halohalo');
    expect(averagePila(halo, 'umaga', true, false)).toBeGreaterThan(
      averagePila(halo, 'umaga', false, false),
    );
    expect(averagePila(halo, 'umaga', false, true)).toBeGreaterThan(
      averagePila(halo, 'umaga', false, false),
    );
  });
});
