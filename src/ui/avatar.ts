/**
 * The player's character from the School ID: layered 48×48 sprites (SPEC-homepage §8 avatar_<part>_<n>,
 * girl or boy: DECISIONS D-041). Body (skin tone) → outfit → ID lace → hair.
 */
import type Phaser from 'phaser';
import type { Profile } from '../core/SaveManager';
import { COLORS } from './theme';

/** School ID photo colours (IdCardScene photo frame). */
export const PHOTO_BG = 0xbfd8e8;
export const PHOTO_BAND = 0x8fb3c9;

export function avatarSprite(
  scene: Phaser.Scene,
  x: number,
  y: number,
  p: Profile,
  scale = 1,
): Phaser.GameObjects.Container {
  const g = p.gender === 'boy' ? 'boy' : 'girl';
  return scene.add
    .container(x, y, [
      scene.add.image(0, 0, `avatar_body_${g}`, p.skin),
      scene.add.image(0, 0, `avatar_outfit_${g}`, p.outfit),
      scene.add.image(0, 0, 'avatar_lace', p.lace),
      scene.add.image(0, 0, `avatar_hair_${g}`, p.hair),
    ])
    .setScale(scale);
}

/**
 * Window of the 48×48 avatar frame shown in name-tag portraits: x 8–41, y 0–31 (even sizes, so it sits on
 * whole pixels). It holds every hair pixel
 * of all 16 styles (girl and boy) and the full head; re-check the hair bounds if the hair art changes.
 */
export const PORTRAIT_CROP = { x: 8, y: 0, w: 34, h: 32 } as const;
/** Outer size of the framed portrait (1 px ink frame around the crop). */
export const PORTRAIT_SIZE = { w: PORTRAIT_CROP.w + 2, h: PORTRAIT_CROP.h + 2 } as const;

/**
 * The character's head and shoulders at 1× in a small photo frame, like the School ID photo (light blue
 * with a darker band, ink frame), for the landing and map name tags. Each layer is cropped, never scaled,
 * so no pixels are dropped (owner: "characters glitch"). (x, y) is the centre of the frame.
 */
export function avatarPortrait(
  scene: Phaser.Scene,
  x: number,
  y: number,
  p: Profile,
): Phaser.GameObjects.Container {
  const g = p.gender === 'boy' ? 'boy' : 'girl';
  const c = PORTRAIT_CROP;
  // Frame-pixel x of the window centre is c.x + c.w / 2; the image origin sits at frame pixel 24.
  const cx = c.x + c.w / 2 - 24;
  const cy = c.y + c.h / 2 - 24;
  const layers: [string, number][] = [
    [`avatar_body_${g}`, p.skin],
    [`avatar_outfit_${g}`, p.outfit],
    ['avatar_lace', p.lace],
    [`avatar_hair_${g}`, p.hair],
  ];
  return scene.add.container(x, y, [
    scene.add.rectangle(0, 0, PORTRAIT_SIZE.w, PORTRAIT_SIZE.h, COLORS.ink),
    scene.add.rectangle(0, 0, c.w, c.h, PHOTO_BG),
    scene.add.rectangle(0, c.h / 2 - 3, c.w, 6, PHOTO_BAND),
    ...layers.map(([key, frame]) =>
      scene.add.image(-cx, -cy, key, frame).setCrop(c.x, c.y, c.w, c.h),
    ),
  ]);
}
