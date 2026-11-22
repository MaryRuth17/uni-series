/**
 * The listahan and its ticking rules (SPEC-pup-lagoon §6 "How lines are checked", §13 "Ticking rule").
 * - A player purchase ticks one unit of every open player line it matches, once per copy.
 * - A friend-assigned purchase ticks only that friend line and adds no busog.
 * - The free item (karinderya iced tea) counts as a player purchase.
 */
import type { PurchaseEffect } from './Catalog';
import type { ListahanLine, Tag } from './types';

export function lineMatches(line: ListahanLine, itemKey: string, tags: readonly Tag[]): boolean {
  return line.kind === 'item' ? line.item === itemKey : tags.includes(line.tag as Tag);
}

export class Listahan {
  readonly lines: readonly ListahanLine[];
  private done: number[];

  constructor(lines: readonly ListahanLine[]) {
    this.lines = lines;
    this.done = lines.map(() => 0);
  }

  doneUnits(lineId: string): number {
    return this.done[this.indexOf(lineId)];
  }

  isLineDone(lineId: string): boolean {
    const i = this.indexOf(lineId);
    return this.done[i] >= this.lines[i].qty;
  }

  /** Every line, friend lines included. */
  isComplete(): boolean {
    return this.lines.every((l, i) => this.done[i] >= l.qty);
  }

  /** The lines that count for the Kumpleto! stamp: everything except friend lines (OC-3). */
  isRequiredComplete(): boolean {
    return this.lines.every((l, i) => l.forFriends || this.done[i] >= l.qty);
  }

  /**
   * The first open friend line this purchase matches: the tray's "Para kay Migs?" default (§13).
   * `pending` counts units already waiting in the tray for each friend line.
   */
  defaultFriendLine(
    effect: PurchaseEffect,
    pending: ReadonlyMap<string, number> = new Map(),
  ): string | null {
    const i = this.lines.findIndex(
      (l, idx) =>
        l.forFriends &&
        this.done[idx] + (pending.get(l.id) ?? 0) < l.qty &&
        lineMatches(l, effect.item, effect.tags),
    );
    return i >= 0 ? this.lines[i].id : null;
  }

  /** Apply a player purchase. Returns the ids of lines that gained a unit. */
  applyPlayer(effect: PurchaseEffect): string[] {
    const ticked = new Set<string>();
    for (let c = 0; c < effect.copies; c++) {
      this.tickPlayerLines(effect.item, effect.tags, ticked);
    }
    if (effect.free) this.tickPlayerLines(effect.free.item, effect.free.tags, ticked);
    return [...ticked];
  }

  /** Apply a purchase made for one friend line. Returns [lineId] if it gained a unit. */
  applyFriend(lineId: string, effect: PurchaseEffect): string[] {
    const i = this.indexOf(lineId);
    const line = this.lines[i];
    if (!line.forFriends || !lineMatches(line, effect.item, effect.tags)) return [];
    const before = this.done[i];
    this.done[i] = Math.min(line.qty, this.done[i] + effect.copies);
    return this.done[i] > before ? [lineId] : [];
  }

  /** Line ids an order would tick, without changing anything (the HUD's pulsing preview). */
  preview(order: readonly { effect: PurchaseEffect; forLine: string | null }[]): string[] {
    const copy = new Listahan(this.lines);
    copy.done = [...this.done];
    const ticked = new Set<string>();
    for (const o of order) {
      const ids = o.forLine ? copy.applyFriend(o.forLine, o.effect) : copy.applyPlayer(o.effect);
      ids.forEach((id) => ticked.add(id));
    }
    return [...ticked];
  }

  private tickPlayerLines(itemKey: string, tags: readonly Tag[], ticked: Set<string>): void {
    this.lines.forEach((l, i) => {
      if (!l.forFriends && this.done[i] < l.qty && lineMatches(l, itemKey, tags)) {
        this.done[i] += 1;
        ticked.add(l.id);
      }
    });
  }

  private indexOf(lineId: string): number {
    const i = this.lines.findIndex((l) => l.id === lineId);
    if (i < 0) throw new Error(`Unknown listahan line: ${lineId}`);
    return i;
  }
}
