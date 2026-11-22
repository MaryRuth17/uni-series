/**
 * When the landing street spawns walkers, passing jeepneys and the LRT-2 train (SPEC-homepage §3.1, §7).
 * Pure: no Phaser, seeded Random, time only through update(dtMs). The scene keeps the pooled sprites and
 * calls despawn() when one leaves the screen. Caps: 6 walkers, 2 moving jeepneys, 1 train.
 * At night (gabi) students come half as often and only half as many are out.
 */
import type { Random } from '../core/Random';
import { STREET } from './config';
import type { Phase } from './TimeOfDay';

export type SpawnKind = 'walker' | 'jeep' | 'train';

export interface SpawnEvent {
  kind: SpawnKind;
  /** 1 = left to right, -1 = right to left. The train always runs left to right. */
  dir: 1 | -1;
  /** Which look (walker_1..6, jeep_1..4). */
  variant: number;
  /** Pixels per second. */
  speed: number;
}

export class StreetSpawner {
  private readonly rng: Random;
  private readonly night: boolean;
  private readonly timers: Record<SpawnKind, number>;
  private readonly active: Record<SpawnKind, number> = { walker: 0, jeep: 0, train: 0 };

  constructor(rng: Random, phase: Phase) {
    this.rng = rng;
    this.night = phase === 'gabi';
    this.timers = {
      walker: this.rng.int(0, STREET.walker.firstMs),
      jeep: this.rng.int(STREET.jeep.firstMs[0], STREET.jeep.firstMs[1]),
      train: this.rng.int(STREET.train.firstMs[0], STREET.train.firstMs[1]),
    };
  }

  cap(kind: SpawnKind): number {
    if (kind === 'walker') return this.night ? Math.ceil(STREET.walker.cap / 2) : STREET.walker.cap;
    return kind === 'jeep' ? STREET.jeep.cap : STREET.train.cap;
  }

  count(kind: SpawnKind): number {
    return this.active[kind];
  }

  update(dtMs: number): SpawnEvent[] {
    const out: SpawnEvent[] = [];
    for (const kind of ['walker', 'jeep', 'train'] as SpawnKind[]) {
      this.timers[kind] -= dtMs;
      if (this.timers[kind] > 0) continue;
      this.timers[kind] = this.nextInterval(kind);
      if (this.active[kind] >= this.cap(kind)) continue;
      this.active[kind] += 1;
      out.push(this.event(kind));
    }
    return out;
  }

  /** A pooled object left the screen. */
  despawn(kind: SpawnKind): void {
    this.active[kind] = Math.max(0, this.active[kind] - 1);
  }

  private nextInterval(kind: SpawnKind): number {
    const [lo, hi] = STREET[kind].everyMs;
    const ms = this.rng.int(lo, hi);
    return kind === 'walker' && this.night ? ms * STREET.walker.nightFactor : ms;
  }

  private event(kind: SpawnKind): SpawnEvent {
    if (kind === 'train') return { kind, dir: 1, variant: 0, speed: STREET.train.speed };
    const s = STREET[kind];
    return {
      kind,
      dir: this.rng.chance(0.5) ? 1 : -1,
      variant: this.rng.int(0, s.variants - 1),
      speed: this.rng.int(s.speed[0], s.speed[1]),
    };
  }
}
