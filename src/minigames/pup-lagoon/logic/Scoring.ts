/**
 * Results stamps (SPEC-pup-lagoon OC-3; replaces stars):
 *  - Kumpleto!      every player line ticked (friend lines are optional);
 *  - Busog!         busog reached this vacant's target;
 *  - Sulit Master!  every line ticked, spent ≤ cheapest completion + SULIT_MARGIN, no rule broken.
 * Ipon: leftover goes into the alkansya only with Kumpleto!.
 */
import { SULIT_MARGIN } from '../config';

export interface StampInput {
  requiredComplete: boolean;
  allComplete: boolean;
  busog: number;
  busogTarget: number;
  spent: number;
  /** Solver minCost for this vacant (sold-out item removed). */
  baselineMinCost: number | null;
  rulesBroken: boolean;
}

export interface Stamps {
  kumpleto: boolean;
  busog: boolean;
  sulit: boolean;
}

export function scoreStamps(i: StampInput): Stamps {
  return {
    kumpleto: i.requiredComplete,
    busog: i.busog >= i.busogTarget,
    sulit:
      i.allComplete &&
      !i.rulesBroken &&
      i.baselineMinCost !== null &&
      i.spent <= i.baselineMinCost + SULIT_MARGIN,
  };
}

/** Leftover money that goes into the alkansya (OC-3). */
export function iponFrom(stamps: Stamps, leftover: number): number {
  return stamps.kumpleto ? Math.max(0, leftover) : 0;
}
