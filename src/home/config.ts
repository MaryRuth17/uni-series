/**
 * Homepage tuning: positions, sizes, timings and greybox colours (SPEC-homepage §2–§4, §6).
 */
import type { Phase } from './TimeOfDay';

export const PALETTE = {
  ink: 0x2b2233,
  cream: 0xfff4dc,
  creamText: '#FFF4DC',
  inkText: '#2B2233',
  gold: 0xf2b33d,
  jeepRed: 0xd94b3d,
  jeepYellow: 0xf2c14e,
  jeepBlue: 0x3b6fb6,
  jeepGreen: 0x3a9a6a,
  chrome: 0xc9d1d9,
  lrt: 0x7b4bb3,
  glow: 0xffe08a,
  city: 0x5b4a7a,
  walls: [0xe8d3b0, 0xc9a27e, 0x9db4c0, 0xe8d3b0, 0xc9a27e],
};

/** Greybox sky colours per phase (top, bottom). Golden hour is the default look. */
export const SKY: Readonly<Record<Phase, readonly [number, number]>> = {
  umaga: [0x9cc8e8, 0xe6f0f5],
  tanghali: [0x6fb3e8, 0xcfe8f7],
  hapon: [0x7a5ba6, 0xffb36b],
  gabi: [0x1d2348, 0x3a3566],
};

/** Landing layers, y ranges (§3.1). */
export const LANDING = {
  sky: { y: 0, h: 186 },
  city: { y: 120, h: 66 },
  track: { y: 170, h: 16 },
  shops: { y: 186, h: 114 },
  sidewalk: { y: 300, h: 18 },
  street: { y: 318, h: 30 },
  footer: { y: 348, h: 12 },
  logo: { x: 320, y: 63, w: 300, h: 70 },
  subtitle: { x: 320, y: 112 },
  play: { x: 320, y: 146, w: 176, h: 36 },
  icons: { xs: [548, 580, 612], y: 20, size: 28 },
  idChip: { x: 70, y: 20, w: 120, h: 28 },
  welcomeMs: 2000,
  logoBobPx: 2,
  logoBobMs: 3000,
};

/** Campus map HUD and card (§4.3, §4.6). */
export const MAP = {
  home: { x: 20, y: 20 },
  toggle: { x: 64, y: 20, w: 56, h: 24 },
  idChip: { x: 160, y: 20, w: 120, h: 24 },
  ipon: { x: 480, y: 20 },
  stickers: { x: 560, y: 20 },
  settings: { x: 612, y: 20 },
  stickerBook: { x: 28, y: 334 },
  album: { x: 612, y: 334 },
  card: { w: 360, h: 150, thumb: 96, slideMs: 250 },
  list: { w: 560, h: 64, top: 44, bottom: 326, gap: 8 },
  zoom: 1.1,
  zoomMs: 300,
  pin: 24,
  bounceMs: 2000,
};

/** Jeepney ride (§4.4) and transitions (§6). */
export const RIDE = {
  speed: 120,
  minMs: 1200,
  maxMs: 3000,
  skipAfterMs: 500,
  arriveMs: 600,
};

export const FADE_MS = 400;
