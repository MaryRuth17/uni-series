import { describe, expect, it } from 'vitest';
import { Guide, type GuideView } from '../../../src/minigames/pup-lagoon/logic/Guide';
import { LagoonVacant } from '../../../src/minigames/pup-lagoon/logic/LagoonVacant';
import {
  generateVacant,
  type GeneratedVacant,
} from '../../../src/minigames/pup-lagoon/logic/ListahanGen';
import { type Money, moneyTotal } from '../../../src/minigames/pup-lagoon/logic/Money';
import { Rhythm } from '../../../src/minigames/pup-lagoon/logic/Rhythm';
import { judgeFinish } from '../../../src/minigames/pup-lagoon/logic/RunRules';
import type { StallKey } from '../../../src/minigames/pup-lagoon/logic/types';

const ctx = { suki: {}, owned: [] as string[], saveSeed: 1 };

/** Does exactly what the guide says, like a new player would, and returns the steps it saw. */
function follow(gen: GeneratedVacant): { v: LagoonVacant; kinds: string[] } {
  const v = new LagoonVacant(gen, { ...ctx });
  const g = new Guide(gen.route.complete);
  let stall: StallKey | null = null;
  let sauceFor: string | null = null;
  let paying = false;
  let placed: Money | null = null;
  const kinds: string[] = [];
  for (let i = 0; i < 400; i++) {
    const view: GuideView = {
      stall,
      order: v.currentOrder,
      sauceFor,
      paying,
      placed: placed ? moneyTotal(placed) : 0,
      total: v.orderTotal(),
      grilling: v.isGrilling,
    };
    const s = g.step(view);
    kinds.push(s.kind);
    switch (s.kind) {
      case 'intro':
        g.ackIntro();
        break;
      case 'tab':
        if (v.location) expect(v.leaveCounter().ok).toBe(true);
        expect(v.joinPila(s.stall).ok).toBe(true);
        for (let k = 0; v.location?.at !== 'counter' && k < 2000; k++) v.update(100);
        stall = s.stall;
        break;
      case 'card':
        if (s.sauce) sauceFor = s.item;
        else expect(v.addToOrder(s.item).ok).toBe(true);
        break;
      case 'sauce':
        expect(v.addToOrder(sauceFor as string, { sauce: s.sauce }).ok).toBe(true);
        sauceFor = null;
        break;
      case 'bayad':
        paying = true;
        break;
      case 'place':
        placed = v.smartPay();
        expect(placed).not.toBeNull();
        break;
      case 'heto': {
        const items = v.currentOrder.map((o) => ({ item: o.item, sauce: o.sauce }));
        const r = v.pay(placed as Money);
        if (!r.ok) throw new Error(`pay failed: ${r.reason}`);
        g.onPaid(stall as StallKey, items, moneyTotal(r.change));
        paying = false;
        placed = null;
        break;
      }
      case 'sukli':
        g.ackSukli();
        break;
      case 'wait':
        v.update(100);
        break;
      case 'eat':
        return { v, kinds };
      default:
        throw new Error(`unexpected step ${s.kind}`);
    }
  }
  throw new Error('the guide never reached Kain na!');
}

describe('Guide: the guided round (L-039)', () => {
  it('walks a new player through the tutorial vacant to a win', () => {
    const gen = generateVacant(new Rhythm(1).vacant(1), { saveSeed: 1, owned: [] });
    const { v, kinds } = follow(gen);
    expect(judgeFinish(gen.lines, (id) => v.listahan.isLineDone(id)).kind).toBe('win');
    for (const k of ['intro', 'tab', 'card', 'bayad', 'place', 'heto', 'eat'])
      expect(kinds).toContain(k);
    expect(v.wallet.total).toBeGreaterThanOrEqual(0);
  });

  it('wins every vacant it guides (seeds 1-3, vacants 1-25)', () => {
    for (const seed of [1, 2, 3]) {
      const rhythm = new Rhythm(seed);
      for (let n = 1; n <= 25; n++) {
        const gen = generateVacant(rhythm.vacant(n), { saveSeed: seed, owned: [] });
        const { v } = follow(gen);
        const verdict = judgeFinish(gen.lines, (id) => v.listahan.isLineDone(id));
        expect(verdict.kind, `seed ${seed} vacant ${n}`).toBe('win');
      }
    }
  });

  it('asks to put back food that is not on the plan, and to close a picker it does not need', () => {
    const gen = generateVacant(new Rhythm(1).vacant(1), { saveSeed: 1, owned: [] });
    const g = new Guide(gen.route.complete);
    g.ackIntro();
    const first = gen.route.complete[0];
    const base: GuideView = {
      stall: first.stall,
      order: [],
      sauceFor: null,
      paying: false,
      placed: 0,
      total: 0,
      grilling: false,
    };
    const wrong = { item: 'definitely_not_planned' };
    expect(g.step({ ...base, order: [wrong] })).toEqual({ kind: 'fix', index: 0 });
    expect(g.step({ ...base, sauceFor: 'definitely_not_planned' })).toEqual({ kind: 'closeSauce' });
    expect(g.step({ ...base, grilling: true })).toEqual({ kind: 'wait' });
  });

  it('gives general tips once the player pays for something off the plan', () => {
    const gen = generateVacant(new Rhythm(1).vacant(1), { saveSeed: 1, owned: [] });
    const g = new Guide(gen.route.complete);
    g.ackIntro();
    g.onPaid(gen.route.complete[0].stall, [{ item: 'definitely_not_planned' }], 0);
    const view: GuideView = {
      stall: null,
      order: [],
      sauceFor: null,
      paying: false,
      placed: 0,
      total: 0,
      grilling: false,
    };
    expect(g.step(view)).toEqual({ kind: 'offPlan' });
    const late = new Guide(gen.route.complete);
    late.abandon();
    expect(late.step(view)).toEqual({ kind: 'offPlan' });
  });
});
