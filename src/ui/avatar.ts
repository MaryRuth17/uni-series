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
