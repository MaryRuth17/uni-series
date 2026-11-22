/**
 * One stall's queue (SPEC-pup-lagoon §4.2, §13 Pila). NPC students arrive at random; each person ahead
 * takes PILA.secondsPerPerson. While the player is at the counter the queue behind them waits.
 * Arrival rate is set so the average length is the stall's usual pila (M/M/1: ρ = L / (L + 1)).
 */
import { EVENTS, PILA } from '../config';
import type { StallDef } from '../data/stalls';
import type { Random } from '../../../core/Random';
import type { Slot } from './types';

export type PlayerInPila = 'none' | 'waiting' | 'counter';

/** Average queue length for a stall in this slot and event (§9.1 slot effects, §9.2 events). */
export function averagePila(stall: StallDef, slot: Slot, hot: boolean, longLine: boolean): number {
  let avg = PILA.usualLength[stall.usualPila];
  if (stall.busySlots.includes(slot)) avg *= PILA.busyFactor;
  if (stall.quietSlots.includes(slot)) avg *= PILA.quietFactor;
  if (hot && EVENTS.hotBusyStalls.includes(stall.key)) avg *= PILA.busyFactor;
  if (longLine) avg *= PILA.longLineFactor;
  return avg;
}

export class Pila {
  /** NPCs in front of the player (or the whole queue when the player is not in it). */
  ahead: number;
  /** NPCs who joined after the player. */
  behind = 0;
  player: PlayerInPila = 'none';
  readonly cap: number;
  readonly arrivalPerSec: number;
  private serviceMs = 0;

  constructor(averageLength: number, cap: number, initial: number) {
    this.cap = cap;
    this.ahead = Math.max(0, Math.min(cap, Math.round(initial)));
    const serviceRate = 1 / PILA.secondsPerPerson;
    this.arrivalPerSec =
      averageLength <= 0 ? 0 : (serviceRate * averageLength) / (averageLength + 1);
  }

  static create(stall: StallDef, slot: Slot, hot: boolean, longLine: boolean, rng: Random): Pila {
    const avg = averagePila(stall, slot, hot, longLine);
    const cap = PILA.cap * (longLine ? PILA.longLineFactor : 1);
    return new Pila(avg, cap, rng.float(0, avg * 2));
  }

  get length(): number {
    return this.ahead + this.behind + (this.player === 'none' ? 0 : 1);
  }

  /** People ahead of the player, or null when the player is not in this pila. */
  get playerPlace(): number | null {
    return this.player === 'none' ? null : this.ahead;
  }

  join(): PlayerInPila {
    if (this.player !== 'none') return this.player;
    this.player = this.ahead === 0 ? 'counter' : 'waiting';
    return this.player;
  }

  /** The player leaves the line or the counter; everyone behind moves up. */
  leave(): void {
    if (this.player === 'none') return;
    this.player = 'none';
    this.ahead += this.behind;
    this.behind = 0;
  }

  update(dtMs: number, rng: Random): { changed: boolean; reachedCounter: boolean } {
    let changed = false;
    let reachedCounter = false;
    if (this.length < this.cap && rng.chance((this.arrivalPerSec * dtMs) / 1000)) {
      if (this.player === 'none') this.ahead += 1;
      else this.behind += 1;
      changed = true;
    }
    if (this.player !== 'counter' && this.ahead > 0) {
      this.serviceMs += dtMs;
      const perPerson = PILA.secondsPerPerson * 1000;
      while (this.serviceMs >= perPerson && this.ahead > 0) {
        this.serviceMs -= perPerson;
        this.ahead -= 1;
        changed = true;
      }
      if (this.ahead === 0) {
        this.serviceMs = 0;
        if (this.player === 'waiting') {
          this.player = 'counter';
          reachedCounter = true;
        }
      }
    }
    return { changed, reachedCounter };
  }
}
