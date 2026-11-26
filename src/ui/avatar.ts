/**
 * The player's character from the School ID: layered 48×48 sprites (SPEC-homepage §8 avatar_<part>_<n>,
 * girl or boy: DECISIONS D-041). Body (skin tone) → outfit → ID lace → hair.
 */
import type Phaser from 'phaser';
import type { Profile } from '../core/SaveManager';

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
 * The character's head and shoulders at 1× (24×24), for small chips. Each layer is cropped to the top
 * middle of its 48×48 frame, so no pixels are dropped by scaling (owner: "characters glitch").
 */
export function avatarHead(
  scene: Phaser.Scene,
  x: number,
  y: number,
  p: Profile,
): Phaser.GameObjects.Container {
  const g = p.gender === 'boy' ? 'boy' : 'girl';
  const layers: [string, number][] = [
    [`avatar_body_${g}`, p.skin],
    [`avatar_outfit_${g}`, p.outfit],
    ['avatar_lace', p.lace],
    [`avatar_hair_${g}`, p.hair],
  ];
  return scene.add.container(
    x,
    y,
    layers.map(([key, frame]) => scene.add.image(0, 12, key, frame).setCrop(12, 0, 24, 24)),
  );
}
