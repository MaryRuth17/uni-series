/**
 * Cream panel with a 1 px dark outline (SPEC §6), and the dimmed backdrop overlays sit on.
 * Placeholders until the art pass swaps in the nine-slice `panel`.
 */
import type Phaser from 'phaser';
import { COLORS } from './theme';

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: number = COLORS.cream,
): Phaser.GameObjects.Rectangle {
  return scene.add.rectangle(x, y, width, height, fill).setStrokeStyle(1, COLORS.ink);
}

/** Full-screen dim that also swallows taps meant for the scene underneath. */
export function backdrop(scene: Phaser.Scene, alpha = 0.6): Phaser.GameObjects.Rectangle {
  const { width, height } = scene.scale;
  return scene.add
    .rectangle(width / 2, height / 2, width, height, COLORS.dim, alpha)
    .setInteractive();
}
