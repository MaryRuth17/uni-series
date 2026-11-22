/**
 * Tappable surprises on the landing street (SPEC-homepage §3.5): each reacts once, then rests for a
 * 5-second cooldown. Pure: no Phaser; time only through update(dtMs). Never required to play.
 */
import { STREET } from './config';

export type SurpriseKey = 'jeep' | 'cart' | 'print' | 'cat' | 'train' | 'barker';

export class Surprises {
  private readonly cooldownMs: number;
  private readonly resting = new Map<SurpriseKey, number>();

  constructor(cooldownMs: number = STREET.surpriseCooldownMs) {
    this.cooldownMs = cooldownMs;
  }

  /** True if the surprise reacts now (and starts its cooldown); false while it rests. */
  trigger(key: SurpriseKey): boolean {
    if ((this.resting.get(key) ?? 0) > 0) return false;
    this.resting.set(key, this.cooldownMs);
    return true;
  }

  isReady(key: SurpriseKey): boolean {
    return (this.resting.get(key) ?? 0) <= 0;
  }

  update(dtMs: number): void {
    for (const [key, left] of this.resting) this.resting.set(key, left - dtMs);
  }
}
