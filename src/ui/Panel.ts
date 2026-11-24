/**
 * Cream panel with a rounded, bevelled frame (SPEC §6), drawn with the `ui_panel` nine-slice, and the
 * dimmed backdrop overlays sit on.
 */
import type Phaser from 'phaser';
import { COLORS } from './theme';
import { VIEW_H, VIEW_W } from './view';

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  tint: number = COLORS.cream,
): Phaser.GameObjects.NineSlice {
  const p = scene.add.nineslice(
    x,
    y,
    'ui_panel',
    undefined,
    width,
    Math.max(height, 12),
    6,
    6,
    6,
    6,
  );
  if (tint !== COLORS.cream) p.setTint(tint);
  return p;
}

/** Full-screen dim that also swallows taps meant for the scene underneath. */
export function backdrop(scene: Phaser.Scene, alpha = 0.6): Phaser.GameObjects.Rectangle {
  return scene.add
    .rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, COLORS.dim, alpha)
    .setInteractive();
}
