import { describe, expect, it } from 'vitest';
import { Random } from '../../../src/core/Random';
import { STREET } from '../../../src/home/config';
import { type SpawnEvent, StreetSpawner } from '../../../src/home/StreetSpawner';

/** Run the spawner for `ms` in 100 ms frames, never despawning. */
function run(spawner: StreetSpawner, ms: number): { at: number; e: SpawnEvent }[] {
  const out: { at: number; e: SpawnEvent }[] = [];
  for (let t = 100; t <= ms; t += 100) for (const e of spawner.update(100)) out.push({ at: t, e });
  return out;
}

describe('StreetSpawner (SPEC-homepage §3.1, §7)', () => {
  it('never goes over 6 walkers, 2 moving jeepneys and 1 train', () => {
    const s = new StreetSpawner(new Random(1), 'hapon');
    run(s, 120_000);
    expect(s.count('walker')).toBe(6);
    expect(s.count('jeep')).toBe(2);
    expect(s.count('train')).toBe(1);
  });

  it('spawns walkers every 2–4 s and jeepneys every 6–10 s while there is room', () => {
    const s = new StreetSpawner(new Random(2), 'tanghali');
    const events: { at: number; e: SpawnEvent }[] = [];
    for (let t = 100; t <= 60_000; t += 100) {
      for (const e of s.update(100)) {
        events.push({ at: t, e });
        s.despawn(e.kind); // leaves at once, so caps never block
      }
    }
    for (const kind of ['walker', 'jeep'] as const) {
      const times = events.filter((x) => x.e.kind === kind).map((x) => x.at);
      const gaps = times.slice(1).map((t, i) => t - times[i]);
      const [lo, hi] = STREET[kind].everyMs;
      for (const g of gaps) {
        expect(g).toBeGreaterThanOrEqual(lo);
        expect(g).toBeLessThanOrEqual(hi + 100);
      }
    }
  });

  it('runs the train left to right, first within 3–6 s, then every 20–30 s', () => {
    const s = new StreetSpawner(new Random(3), 'umaga');
    const trains: number[] = [];
    for (let t = 100; t <= 90_000; t += 100) {
      for (const e of s.update(100)) {
        if (e.kind === 'train') {
          trains.push(t);
          expect(e.dir).toBe(1);
        }
        s.despawn(e.kind);
      }
    }
    expect(trains[0]).toBeGreaterThanOrEqual(3000);
    expect(trains[0]).toBeLessThanOrEqual(6100);
    trains.slice(1).forEach((t, i) => {
      expect(t - trains[i]).toBeGreaterThanOrEqual(20_000);
      expect(t - trains[i]).toBeLessThanOrEqual(30_100);
    });
  });

  it('has fewer students at night', () => {
    const night = new StreetSpawner(new Random(4), 'gabi');
    expect(night.cap('walker')).toBe(3);
    run(night, 120_000);
    expect(night.count('walker')).toBe(3);
  });

  it('picks valid variants and speeds, and is deterministic per seed', () => {
    const a = run(new StreetSpawner(new Random(9), 'hapon'), 30_000);
    const b = run(new StreetSpawner(new Random(9), 'hapon'), 30_000);
    expect(b).toEqual(a);
    for (const { e } of a) {
      if (e.kind === 'train') continue;
      expect(e.variant).toBeGreaterThanOrEqual(0);
      expect(e.variant).toBeLessThan(STREET[e.kind].variants);
      expect(e.speed).toBeGreaterThanOrEqual(STREET[e.kind].speed[0]);
      expect(e.speed).toBeLessThanOrEqual(STREET[e.kind].speed[1]);
    }
  });

  it('despawn never goes below zero', () => {
    const s = new StreetSpawner(new Random(5), 'hapon');
    s.despawn('jeep');
    expect(s.count('jeep')).toBe(0);
  });
});
