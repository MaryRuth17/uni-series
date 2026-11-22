/**
 * Shared UI look (SPEC §6 UI style): cream panels with a dark outline, Pixelify Sans text.
 * ₱ and ★ are missing from Pixelify Sans, so the font stack falls back to monospace for those
 * glyphs until the art pass adds a pixel ₱ (DECISIONS H-005).
 */
import type Phaser from 'phaser';

export const FONT = '"Pixelify Sans", monospace';

export const COLORS = {
  ink: 0x2b2233,
  cream: 0xfff4dc,
  gold: 0xf2b33d,
  red: 0xd94b3d,
  yellow: 0xf2c14e,
  grey: 0x8a8494,
  dim: 0x000000,
};

export const TEXT = {
  ink: '#2B2233',
  cream: '#FFF4DC',
  gold: '#F2B33D',
  red: '#D94B3D',
  grey: '#8A8494',
};

export function textStyle(
  size: number,
  color: string = TEXT.ink,
  extra: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONT, fontSize: `${size}px`, color, ...extra };
}

/** Scene keys, so scenes never mistype each other's names. */
export const SCENES = {
  boot: 'Boot',
  preloader: 'Preloader',
  toast: 'Toast',
  landing: 'Landing',
  idCard: 'IdCard',
  campusMap: 'CampusMap',
  comingSoon: 'ComingSoon',
  settings: 'Settings',
  stickerBook: 'StickerBook',
  album: 'Album',
  credits: 'Credits',
} as const;
