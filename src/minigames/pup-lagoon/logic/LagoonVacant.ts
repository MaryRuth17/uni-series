/**
 * One vacant of Lagoon Merienda: the round the scene, the tests and `npm run sim` all drive
 * (SPEC-pup-lagoon §4, §13 "LagoonDay", renamed by OC-1). No clock (OC-2): update(dtMs) only moves the
 * grill wait and the sold-out moment (and the pila, which is off since L-033: joinPila goes straight to
 * the counter).
 *
 * Commands return { ok, reason? }. Events queue up; the scene reads them with drainEvents().
 * Money is conserved: wallet + spent always equals the starting wallet (baon + pasabay money).
 */
import { BUO, HEARTS, PILA, SUKI, VISIT } from '../config';
import { Random } from '../../../core/Random';
import { menuItem } from '../data/menu';
import { STALLS } from '../data/stalls';
import { CashBox } from './CashBox';
import { type PurchaseEffect, purchaseEffect } from './Catalog';
import type { GeneratedVacant } from './ListahanGen';
import { Listahan } from './Listahan';
import { type Money, moneyTotal } from './Money';
import { Pila } from './Pila';
import type { VacantOutcome } from './Progress';
import { sukiLevel } from './Progress';
import { iponFrom, type Stamps, scoreStamps } from './Scoring';
import { mixSeed, SEED_SALT } from './seeds';
import { Wallet } from './Wallet';
import type { FriendKey, Sawsawan, StallKey } from './types';

export interface OrderEntry {
  item: string;
  sauce?: Sawsawan;
  /** Friend line this item is for, or null for the player. */
  forLine: string | null;
  effect: PurchaseEffect;
}

export interface PurchaseRecord {
  stall: StallKey;
  item: string;
  sauce?: Sawsawan;
  forLine: string | null;
  price: number;
}

export type VacantEvent =
  | { type: 'pilaChanged'; stall: StallKey }
  | { type: 'atCounter'; stall: StallKey }
  | { type: 'soldOut'; item: string }
  | { type: 'removedFromOrder'; item: string; reason: 'soldOut' }
  | {
      type: 'paid';
      stall: StallKey;
      total: number;
      change: Money;
      libreItem: string | null;
      buo: boolean;
    }
  | { type: 'ticked'; lineIds: string[] }
  | { type: 'listComplete' }
  | { type: 'grillDone'; stall: StallKey }
  | { type: 'extra'; stall: StallKey; granted: boolean };

export type Result<T = object> = ({ ok: true } & T) | { ok: false; reason: string; short?: number };

export interface VacantContext {
  /** Purchase counts per stall from Progress (for suki perks). */
  suki: Partial<Record<StallKey, number>>;
  owned: readonly string[];
  saveSeed: number;
}

export interface VacantResult extends VacantOutcome {
  busog: number;
  busogTarget: number;
  spent: number;
  /** Money left after returning unspent pasabay money to friends. */
  leftover: number;
  returnedPasabay: number;
  allComplete: boolean;
  rulesBroken: boolean;
  purchases: PurchaseRecord[];
}

export class LagoonVacant {
  readonly gen: GeneratedVacant;
  readonly listahan: Listahan;
  readonly wallet: Wallet;
  private readonly ctx: VacantContext;
  private readonly rng: Random;
  private readonly boxes = new Map<StallKey, CashBox>();
  private readonly pilas = new Map<StallKey, Pila>();
  private readonly open: Set<StallKey>;
  private readonly startTotal: number;
  private events: VacantEvent[] = [];

  private elapsedMs = 0;
  private soldOutNow = new Set<string>();
  private queueStall: StallKey | null = null;
  private counter: StallKey | null = null;
  private order: OrderEntry[] = [];
  private itemsThisVisit = 0;
  private extraAsked = false;
  private boughtThisVisit = false;
  /**
   * Suki 2 "Libre na 'yan, suki!": rolled when reaching the counter, used by one payment. The vendor
   * adds one free extra of the cheapest cheap item; the price stays the same, so every payment the
   * generator proved stays possible (DECISIONS L-004).
   */
  private libreGranted = false;
  private grillMs = 0;
  private tumblerUsed = false;
  private spicyWarned = false;
  private finished = false;

  busog = 0;
  spent = 0;
  rulesBroken = false;
  readonly purchases: PurchaseRecord[] = [];

  constructor(gen: GeneratedVacant, ctx: VacantContext) {
    this.gen = gen;
    this.ctx = ctx;
    this.rng = new Random(mixSeed(ctx.saveSeed, gen.def.n, SEED_SALT.play));
    this.listahan = new Listahan(gen.lines);
    this.wallet = new Wallet(gen.wallet);
    this.startTotal = moneyTotal(gen.wallet);
    this.open = new Set(gen.open);
    for (const s of STALLS) {
      this.boxes.set(s.key, new CashBox(gen.cashBoxes[s.key]));
      if (PILA.enabled && s.key !== 'water' && this.open.has(s.key)) {
        this.pilas.set(
          s.key,
          Pila.create(s, gen.def.slot, gen.hot, gen.longLineStall === s.key, this.rng),
        );
      }
    }
  }

  // ---- Queries -------------------------------------------------------------------------------

  isOpen(stall: StallKey): boolean {
    return this.open.has(stall);
  }

  isSoldOut(item: string): boolean {
    return this.soldOutNow.has(item);
  }

  pilaLength(stall: StallKey): number {
    return this.pilas.get(stall)?.length ?? 0;
  }

  /** Where the player is: in a queue, at a counter, or free to walk. */
  get location(): { stall: StallKey; at: 'pila' | 'counter' } | null {
    if (this.counter) return { stall: this.counter, at: 'counter' };
    if (this.queueStall) return { stall: this.queueStall, at: 'pila' };
    return null;
  }

  playerPlace(): number | null {
    return this.queueStall ? (this.pilas.get(this.queueStall)?.playerPlace ?? null) : null;
  }

  get currentOrder(): readonly OrderEntry[] {
    return this.order;
  }

  orderTotal(): number {
    return this.order.reduce((s, o) => s + o.effect.price, 0);
  }

  /** Index of the order item the vendor adds a free extra of, or -1. */
  libreIndex(): number {
    if (!this.libreGranted) return -1;
    let best = -1;
    this.order.forEach((o, i) => {
      if (o.effect.price > 0 && o.effect.price <= SUKI.libreMaxPrice) {
        if (best < 0 || o.effect.price < this.order[best].effect.price) best = i;
      }
    });
    return best;
  }

  /** Listahan lines the current order would tick (the HUD's pulsing check marks). */
  previewOrder(): string[] {
    return this.listahan.preview(this.order);
  }

  /** "Tara, kain na!" is available once anything was bought (OC-3). */
  canEat(): boolean {
    return this.purchases.length > 0 && !this.finished;
  }

  get isGrilling(): boolean {
    return this.grillMs > 0;
  }

  vendorBox(stall: StallKey): Money {
    return (this.boxes.get(stall) as CashBox).money;
  }

  drainEvents(): VacantEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  // ---- Time ----------------------------------------------------------------------------------

  update(dtMs: number): void {
    if (this.finished) return;
    this.elapsedMs += dtMs;
    for (const [stall, pila] of this.pilas) {
      const r = pila.update(dtMs, this.rng);
      if (r.changed) this.events.push({ type: 'pilaChanged', stall });
      if (r.reachedCounter && this.queueStall === stall) this.arriveAtCounter(stall);
    }
    if (this.grillMs > 0) {
      this.grillMs = Math.max(0, this.grillMs - dtMs);
      if (this.grillMs === 0 && this.counter)
        this.events.push({ type: 'grillDone', stall: this.counter });
    }
    const so = this.gen.soldOut;
    if (so && !this.soldOutNow.has(so.item) && this.elapsedMs >= so.afterMs) {
      this.soldOutNow.add(so.item);
      this.events.push({ type: 'soldOut', item: so.item });
      const before = this.order.length;
      this.order = this.order.filter((o) => o.item !== so.item);
      if (this.order.length !== before) {
        this.events.push({ type: 'removedFromOrder', item: so.item, reason: 'soldOut' });
      }
    }
  }

  // ---- Commands ------------------------------------------------------------------------------

  joinPila(stall: StallKey): Result {
    if (this.finished) return { ok: false, reason: 'finished' };
    if (this.queueStall || this.counter) return { ok: false, reason: 'busy' };
    if (stall === 'water' || !this.open.has(stall)) return { ok: false, reason: 'closed' };
    const pila = this.pilas.get(stall);
    if (!pila) {
      // No lines (L-033): straight to the counter.
      this.arriveAtCounter(stall);
      return { ok: true };
    }
    this.queueStall = stall;
    if (pila.join() === 'counter') this.arriveAtCounter(stall);
    this.events.push({ type: 'pilaChanged', stall });
    return { ok: true };
  }

  leavePila(): Result {
    if (!this.queueStall || this.counter) return { ok: false, reason: 'notInPila' };
    this.pilas.get(this.queueStall)?.leave();
    this.events.push({ type: 'pilaChanged', stall: this.queueStall });
    this.queueStall = null;
    return { ok: true };
  }

  addToOrder(
    item: string,
    opts: { sauce?: Sawsawan; forLine?: string | null } = {},
  ): Result<{ forLine: string | null; spicyWarning: boolean }> {
    const stall = this.counter;
    if (!stall) return { ok: false, reason: 'notAtCounter' };
    if (this.isGrilling) return { ok: false, reason: 'grilling' };
    let m;
    try {
      m = menuItem(item);
    } catch {
      return { ok: false, reason: 'unknownItem' };
    }
    if (m.stall !== stall) return { ok: false, reason: 'wrongStall' };
    if (m.orderable === false) return { ok: false, reason: 'notOrderable' };
    if (this.soldOutNow.has(item)) return { ok: false, reason: 'soldOut' };
    if (this.itemsThisVisit + this.order.length >= VISIT.maxItems) {
      return { ok: false, reason: 'trayFull' };
    }
    if (m.needsSawsawan && !opts.sauce) return { ok: false, reason: 'needsSawsawan' };
    const effect: PurchaseEffect = purchaseEffect(item, opts.sauce, this.gen.promo);

    let forLine: string | null;
    if (opts.forLine === undefined) {
      const pending = new Map<string, number>();
      for (const o of this.order) {
        if (o.forLine) pending.set(o.forLine, (pending.get(o.forLine) ?? 0) + o.effect.copies);
      }
      forLine = this.listahan.defaultFriendLine(effect, pending);
    } else if (opts.forLine === null) {
      forLine = null;
    } else {
      const line = this.gen.lines.find((l) => l.id === opts.forLine);
      if (!line || !line.forFriends) return { ok: false, reason: 'notFriendLine' };
      forLine = opts.forLine;
    }
    const spicyWarning = this.gen.noSpicy && effect.spicy && !this.spicyWarned;
    if (spicyWarning) this.spicyWarned = true;
    this.order.push({ item, sauce: effect.sauce, forLine, effect });
    return { ok: true, forLine, spicyWarning };
  }

  removeFromOrder(index: number): Result {
    if (index < 0 || index >= this.order.length) return { ok: false, reason: 'badIndex' };
    this.order.splice(index, 1);
    return { ok: true };
  }

  /** Smart pay suggestion for the current order (always available, OC-2). */
  smartPay(): Money | null {
    if (!this.counter || this.order.length === 0) return null;
    return this.wallet.smartPay(this.orderTotal(), this.vendorBox(this.counter));
  }

  pay(placed: Money): Result<{ change: Money; libreItem: string | null; buo: boolean }> {
    const stall = this.counter;
    if (!stall) return { ok: false, reason: 'notAtCounter' };
    if (this.order.length === 0) return { ok: false, reason: 'emptyOrder' };
    if (this.isGrilling) return { ok: false, reason: 'grilling' };
    if (!this.wallet.has(placed)) return { ok: false, reason: 'notInWallet' };

    const libreIndex = this.libreIndex();
    const total = this.orderTotal();
    const box = this.boxes.get(stall) as CashBox;
    const sale = box.sell(placed, total);
    if (!sale.ok) {
      return sale.reason === 'kulang'
        ? { ok: false, reason: 'kulang', short: sale.short }
        : { ok: false, reason: 'walangPanukli' };
    }

    this.wallet.take(placed);
    this.wallet.give(sale.change);
    this.spent += total;
    const libreItem = libreIndex >= 0 ? this.order[libreIndex].item : null;
    const buo = placed[BUO.bill] > 0 && total <= BUO.totalAtMost;
    this.events.push({ type: 'paid', stall, total, change: sale.change, libreItem, buo });

    const ticked = new Set<string>();
    let grill = 0;
    this.order.forEach((o, i) => {
      const effect = i === libreIndex ? { ...o.effect, copies: o.effect.copies + 1 } : o.effect;
      const ids = o.forLine
        ? this.listahan.applyFriend(o.forLine, effect)
        : this.listahan.applyPlayer(effect);
      ids.forEach((id) => ticked.add(id));
      if (!o.forLine) this.busog += effect.busog * effect.copies + (effect.free?.busog ?? 0);
      if (o.effect.spicy && this.gen.noSpicy) this.rulesBroken = true;
      grill = Math.max(grill, o.effect.grillSeconds);
      this.purchases.push({
        stall,
        item: o.item,
        sauce: o.sauce,
        forLine: o.forLine,
        price: o.effect.price,
      });
    });
    if (ticked.size) this.events.push({ type: 'ticked', lineIds: [...ticked] });
    if (this.listahan.isComplete()) this.events.push({ type: 'listComplete' });
    this.itemsThisVisit += this.order.length;
    this.boughtThisVisit = true;
    this.order = [];
    if (libreIndex >= 0) this.libreGranted = false;
    this.grillMs = grill * 1000;
    return { ok: true, change: sale.change, libreItem, buo };
  }

  /** "Pa-extra po": once per visit, after buying; only a suki gets the +1 busog (§4.3). */
  askExtra(): Result<{ granted: boolean }> {
    const stall = this.counter;
    if (!stall) return { ok: false, reason: 'notAtCounter' };
    if (this.extraAsked) return { ok: false, reason: 'alreadyAsked' };
    if (!this.boughtThisVisit) return { ok: false, reason: 'nothingBought' };
    this.extraAsked = true;
    const granted = sukiLevel(this.ctx.suki[stall] ?? 0) >= 1;
    if (granted) this.busog += VISIT.extraBusog;
    this.events.push({ type: 'extra', stall, granted });
    return { ok: true, granted };
  }

  leaveCounter(): Result {
    if (!this.counter) return { ok: false, reason: 'notAtCounter' };
    if (this.isGrilling) return { ok: false, reason: 'grilling' };
    this.pilas.get(this.counter)?.leave();
    this.events.push({ type: 'pilaChanged', stall: this.counter });
    this.counter = null;
    this.queueStall = null;
    this.order = [];
    return { ok: true };
  }

  /** Free water at the station, once per vacant, with the Tumbler (§5, OC-6). */
  refillTumbler(): Result {
    if (!this.ctx.owned.includes('tumbler') || !this.open.has('water')) {
      return { ok: false, reason: 'noTumbler' };
    }
    if (this.tumblerUsed) return { ok: false, reason: 'alreadyUsed' };
    if (this.queueStall || this.counter) return { ok: false, reason: 'busy' };
    this.tumblerUsed = true;
    const effect = purchaseEffect('tumbler_water', undefined, null);
    const ids = this.listahan.applyPlayer(effect);
    this.purchases.push({ stall: 'water', item: 'tumbler_water', forLine: null, price: 0 });
    if (ids.length) this.events.push({ type: 'ticked', lineIds: ids });
    if (this.listahan.isComplete()) this.events.push({ type: 'listComplete' });
    return { ok: true };
  }

  /** "Tara, kain na!": end the vacant and score it. */
  finish(): VacantResult {
    if (this.queueStall || this.counter) {
      this.pilas.get((this.counter ?? this.queueStall) as StallKey)?.leave();
      this.counter = null;
      this.queueStall = null;
      this.order = [];
    }
    this.finished = true;

    const heartsGained: Partial<Record<FriendKey, number>> = {};
    let owed = 0;
    for (const line of this.gen.lines) {
      if (!line.forFriends) continue;
      const done = this.listahan.isLineDone(line.id);
      if (line.owner === 'barkada') {
        if (done) {
          for (const f of ['migs', 'bea', 'jomar'] as const) {
            heartsGained[f] = (heartsGained[f] ?? 0) + HEARTS.pangBarkada;
          }
        }
      } else if (line.owner !== 'player') {
        if (done) heartsGained[line.owner] = (heartsGained[line.owner] ?? 0) + HEARTS.pasabay;
        else owed += line.money ?? 0;
      }
    }
    const walletTotal = this.wallet.total;
    const returnedPasabay = Math.min(owed, walletTotal);
    const leftover = walletTotal - returnedPasabay;
    const allComplete = this.listahan.isComplete();
    const stamps: Stamps = scoreStamps({
      requiredComplete: this.listahan.isRequiredComplete(),
      allComplete,
      busog: this.busog,
      busogTarget: this.gen.busogTarget,
      spent: this.spent,
      baselineMinCost: this.gen.baseline.minCost,
      rulesBroken: this.rulesBroken,
    });
    if (this.startTotal !== walletTotal + this.spent) {
      throw new Error('LagoonVacant: money not conserved');
    }
    return {
      n: this.gen.def.n,
      stamps,
      iponAdded: iponFrom(stamps, leftover),
      stallsBought: [...new Set(this.purchases.map((p) => p.stall))],
      foods: this.purchases.filter((p) => !p.forLine).map((p) => p.item),
      heartsGained,
      busog: this.busog,
      busogTarget: this.gen.busogTarget,
      spent: this.spent,
      leftover,
      returnedPasabay,
      allComplete,
      rulesBroken: this.rulesBroken,
      purchases: [...this.purchases],
    };
  }

  // ---- Internals -----------------------------------------------------------------------------

  private arriveAtCounter(stall: StallKey): void {
    this.counter = stall;
    this.itemsThisVisit = 0;
    this.extraAsked = false;
    this.boughtThisVisit = false;
    this.libreGranted =
      sukiLevel(this.ctx.suki[stall] ?? 0) >= 2 && this.rng.chance(SUKI.libreChance);
    this.events.push({ type: 'atCounter', stall });
  }
}
