/**
 * Shared Lagoon UI pieces (L6 polish): money as coins and bills, the busog meter as rice bowls.
 * Used by the Vacant card and the stalls screen so both look the same.
 */
import Phaser from 'phaser';
import { textStyle, TEXT } from '../../../ui/theme';
import { DENOMS_DESC, type Money } from '../logic/Money';

type Add = <T extends Phaser.GameObjects.GameObject>(o: T) => T;

const KEY: Readonly<Record<number, string>> = {
  1: 'coin_1',
  5: 'coin_5',
  10: 'coin_10',
  20: 'coin_20',
  50: 'bill_50',
  100: 'bill_100',
};

/** A row of money pieces (largest first), left-aligned at x, centred on y. Returns its width. */
export function moneyRow(
  scene: Phaser.Scene,
  add: Add,
  x: number,
  y: number,
  pieces: readonly number[],
): number {
  let cx = x;
  for (const d of pieces) {
    const img = add(scene.add.image(cx, y, KEY[d]).setOrigin(0, 0.5));
    cx += img.width + 3;
  }
  return cx - x;
}

/** A wallet grid: one picture per denomination held, with "×n", two columns. */
export function walletGrid(
  scene: Phaser.Scene,
  add: Add,
  x: number,
  y: number,
  money: Money,
  colW = 56,
): void {
  let i = 0;
  for (const d of DENOMS_DESC) {
    const n = money[d];
    if (!n) continue;
    const cx = x + (i % 2) * colW;
    const cy = y + Math.floor(i / 2) * 22;
    const img = add(scene.add.image(cx, cy, KEY[d]).setOrigin(0, 0.5));
    add(scene.add.text(cx + img.width + 3, cy, `×${n}`, textStyle(8, TEXT.ink)).setOrigin(0, 0.5));
    i++;
  }
}

/** Rice bowls: `filled` full bowls out of `total` (at most 8 drawn). Returns the row width. */
export function bowlRow(
  scene: Phaser.Scene,
  add: Add,
  x: number,
  y: number,
  filled: number,
  total: number,
): number {
  const n = Math.min(8, Math.max(total, filled));
  for (let i = 0; i < n; i++)
    add(scene.add.image(x + i * 13, y, 'ui_bowl', i < filled ? 1 : 0).setOrigin(0, 0.5));
  return n * 13;
}
