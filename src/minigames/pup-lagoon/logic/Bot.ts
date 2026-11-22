/**
 * A simple player for tests and `npm run sim`: follows a generated vacant's proven route
 * (queue, order, Smart pay, ask for extra, wait for the grill, leave). No Phaser, no randomness of its own.
 */
import type { LagoonVacant } from './LagoonVacant';
import type { GeneratedVacant } from './ListahanGen';

/** Play a generated vacant by following its proven route. Returns an error message, or null on success. */
export function playRoute(gen: GeneratedVacant, vacant: LagoonVacant): string | null {
  const route = gen.route.busog ?? gen.route.complete;
  for (const visit of route) {
    if (visit.stall === 'water') {
      const r = vacant.refillTumbler();
      if (!r.ok) return `refill: ${r.reason}`;
      continue;
    }
    const join = vacant.joinPila(visit.stall);
    if (!join.ok) return `join ${visit.stall}: ${join.reason}`;
    for (let i = 0; vacant.location?.at !== 'counter'; i++) {
      if (i > 10_000) return `stuck in pila at ${visit.stall}`;
      vacant.update(100);
    }
    for (const step of visit.steps) {
      const r = vacant.addToOrder(step.item, { sauce: step.sauce, forLine: step.forLine ?? null });
      if (!r.ok) return `order ${step.item}: ${r.reason}`;
    }
    const placed = vacant.smartPay();
    if (!placed) return `smart pay failed at ${visit.stall} for ₱${vacant.orderTotal()}`;
    const paid = vacant.pay(placed);
    if (!paid.ok) return `pay at ${visit.stall}: ${paid.reason}`;
    vacant.askExtra();
    while (vacant.isGrilling) vacant.update(100);
    const left = vacant.leaveCounter();
    if (!left.ok) return `leave ${visit.stall}: ${left.reason}`;
  }
  return null;
}
