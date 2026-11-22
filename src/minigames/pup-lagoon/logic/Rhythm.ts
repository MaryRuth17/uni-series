/**
 * The endless rhythm of vacants (SPEC-pup-lagoon OC-1, OC-4, OC-5): for vacant n, its tier, time slot,
 * baon, special (tutorial, petsa de peligro, payday), walang-panukli flag and event.
 * Deterministic from the save seed. "Never twice in a row" rules need the previous vacant, so vacants
 * are computed in order and cached.
 */
import { BAON, EVENTS, SLOT_ORDER, TUTORIAL, WALANG_PANUKLI_VACANT } from '../config';
import { Random } from '../../../core/Random';
import { tierFor } from './Catalog';
import { mixSeed, SEED_SALT } from './seeds';
import type { EventKind, Slot, Special, Tier } from './types';

export interface VacantDef {
  n: number;
  tier: Tier;
  slot: Slot;
  baon: number;
  special: Special | null;
  walangPanukli: boolean;
  event: EventKind | null;
}

const EVENT_ORDER: readonly EventKind[] = ['rain', 'hot', 'soldOut', 'promo', 'longLine'];

export class Rhythm {
  readonly saveSeed: number;
  private readonly cache: VacantDef[] = [];
  private paydays = 0;

  constructor(saveSeed: number) {
    this.saveSeed = saveSeed;
  }

  vacant(n: number): VacantDef {
    if (!Number.isInteger(n) || n < 1) throw new Error(`Rhythm: bad vacant number ${n}`);
    while (this.cache.length < n) this.cache.push(this.make(this.cache.length + 1));
    return this.cache[n - 1];
  }

  private make(n: number): VacantDef {
    const tier = tierFor(n);
    const slot = SLOT_ORDER[n % SLOT_ORDER.length];
    if (n === 1) {
      return {
        n,
        tier,
        slot: TUTORIAL.slot,
        baon: TUTORIAL.baon,
        special: 'tutorial',
        walangPanukli: false,
        event: null,
      };
    }
    const prev = this.cache[n - 2];
    const rng = new Random(mixSeed(this.saveSeed, n, SEED_SALT.rhythm));

    let special: Special | null = null;
    const prevPayday = prev.special === 'kinsenas' || prev.special === 'katapusan';
    if (tier >= BAON.payday.fromTier && !prevPayday && rng.chance(BAON.payday.chance)) {
      special = this.paydays % 2 === 0 ? 'kinsenas' : 'katapusan';
      this.paydays += 1;
    } else if (tier >= BAON.pdp.fromTier && prev.special !== 'pdp' && rng.chance(BAON.pdp.chance)) {
      special = 'pdp';
    }

    let baon: number;
    if (special === 'pdp') baon = BAON.pdp.amount;
    else if (special) baon = BAON.payday.amount;
    else baon = weighted(rng, BAON.normal);

    const walangPanukli =
      tier >= WALANG_PANUKLI_VACANT.fromTier && rng.chance(WALANG_PANUKLI_VACANT.chance);

    let event: EventKind | null = null;
    if (tier >= EVENTS.fromTier) {
      let roll = rng.next();
      for (const kind of EVENT_ORDER) {
        if (kind === 'hot' && tier < EVENTS.hotFromTier) continue;
        roll -= EVENTS.chances[kind];
        if (roll < 0) {
          event = kind === prev.event ? null : kind;
          break;
        }
      }
    }
    return { n, tier, slot, baon, special, walangPanukli, event };
  }
}

function weighted(rng: Random, options: readonly { amount: number; weight: number }[]): number {
  const total = options.reduce((s, o) => s + o.weight, 0);
  let roll = rng.float(0, total);
  for (const o of options) {
    roll -= o.weight;
    if (roll < 0) return o.amount;
  }
  return options[options.length - 1].amount;
}
