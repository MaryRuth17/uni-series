/**
 * The guided round (DECISIONS L-039): one step at a time, it shows the player how to buy the whole listahan
 * and finish a vacant. It follows the generator's proven route (GeneratedVacant.route.complete: stall
 * visits that the baon can pay with Smart pay), so following it always wins the round.
 * Pure logic (no Phaser, no timers, no randomness): the scene passes a snapshot (GuideView), the guide
 * answers with the next step, and the scene draws the highlight and the speech bubble.
 */
import type { Visit } from './Payment';
import type { Sawsawan, StallKey } from './types';

/** What the stalls screen looks like right now. */
export interface GuideView {
  stall: StallKey | null;
  /** The tray, in order. */
  order: readonly { item: string; sauce?: Sawsawan }[];
  /** The food whose sawsawan picker is open, or null. */
  sauceFor: string | null;
  /** The Bayad (payment) view is open. */
  paying: boolean;
  /** Money placed on the counter, and the tray total. */
  placed: number;
  total: number;
  grilling: boolean;
}

export type GuideStep =
  /** Explain the listahan and the baon (needs Next). */
  | { kind: 'intro' }
  /** Go to this stall's tab. */
  | { kind: 'tab'; stall: StallKey }
  /** Tap this food's card (then pick `sauce`, if it has one). */
  | { kind: 'card'; item: string; sauce?: Sawsawan }
  /** In the sawsawan picker: pick this sauce. */
  | { kind: 'sauce'; sauce: Sawsawan }
  /** Close the sawsawan picker (it was opened for a food the plan does not need). */
  | { kind: 'closeSauce' }
  /** Something in the tray is not in the plan: tap it to put it back. */
  | { kind: 'fix'; index: number }
  /** Tap Bayad. */
  | { kind: 'bayad' }
  /** In the payment view: tap coins and bills until the placed money covers the total. */
  | { kind: 'place'; total: number }
  /** Enough money placed: tap Heto po!. */
  | { kind: 'heto' }
  /** Explain the sukli just received (needs Next). */
  | { kind: 'sukli'; change: number }
  /** The grill is still going: wait. */
  | { kind: 'wait' }
  /** The listahan is complete: tap Kain na!. */
  | { kind: 'eat' }
  /** The player paid for something off the plan: the guide can no longer promise a win. */
  | { kind: 'offPlan' };

interface Need {
  item: string;
  sauce?: Sawsawan;
}

export class Guide {
  private readonly visits: readonly Visit[];
  private visit = 0;
  private introDone = false;
  private sukli: number | null = null;
  private lost = false;

  constructor(visits: readonly Visit[]) {
    this.visits = visits;
  }

  /** The player read the intro. */
  ackIntro(): void {
    this.introDone = true;
  }

  /** Opened mid-round after buying: the plan no longer applies, so only general tips are given. */
  abandon(): void {
    this.introDone = true;
    this.lost = true;
  }

  /** The player read the sukli note. */
  ackSukli(): void {
    this.sukli = null;
  }

  /**
   * A payment went through for these items. On the plan, the guide moves to the next visit and explains
   * the sukli (if any); off the plan, it stops promising a win.
   */
  onPaid(stall: StallKey, items: readonly Need[], change: number): void {
    if (this.lost || this.finished) return;
    const v = this.visits[this.visit];
    if (stall !== v.stall || !sameFood(items, v.steps)) {
      this.lost = true;
      return;
    }
    this.visit += 1;
    if (change > 0) this.sukli = change;
  }

  /** Every planned visit is paid for. */
  get finished(): boolean {
    return this.visit >= this.visits.length;
  }

  step(view: GuideView): GuideStep {
    if (!this.introDone) return { kind: 'intro' };
    if (this.lost) return { kind: 'offPlan' };
    if (this.sukli !== null) return { kind: 'sukli', change: this.sukli };
    if (this.finished) return view.grilling ? { kind: 'wait' } : { kind: 'eat' };

    const v = this.visits[this.visit];
    const left = remaining(v.steps, view.order);
    if (view.paying) {
      return view.placed >= view.total ? { kind: 'heto' } : { kind: 'place', total: view.total };
    }
    if (view.sauceFor !== null) {
      const want = left.find((n) => n.item === view.sauceFor);
      return want?.sauce ? { kind: 'sauce', sauce: want.sauce } : { kind: 'closeSauce' };
    }
    if (view.grilling) return { kind: 'wait' };
    const extra = offPlanIndex(v.steps, view.order);
    if (extra >= 0) return { kind: 'fix', index: extra };
    if (view.stall !== v.stall) return { kind: 'tab', stall: v.stall };
    if (left.length) return { kind: 'card', item: left[0].item, sauce: left[0].sauce };
    return { kind: 'bayad' };
  }
}

const same = (a: Need, b: Need): boolean =>
  a.item === b.item && (a.sauce ?? null) === (b.sauce ?? null);

/** The planned food not yet in the tray (a multiset difference, in plan order). */
function remaining(plan: readonly Need[], order: readonly Need[]): Need[] {
  const left = [...plan];
  for (const o of order) {
    const i = left.findIndex((n) => same(n, o));
    if (i >= 0) left.splice(i, 1);
  }
  return left;
}

/** The first tray index that the plan does not need (too many, wrong food or wrong sauce), or -1. */
function offPlanIndex(plan: readonly Need[], order: readonly Need[]): number {
  const left = [...plan];
  for (let k = 0; k < order.length; k++) {
    const i = left.findIndex((n) => same(n, order[k]));
    if (i < 0) return k;
    left.splice(i, 1);
  }
  return -1;
}

function sameFood(a: readonly Need[], b: readonly Need[]): boolean {
  return a.length === b.length && remaining(b, a).length === 0;
}
