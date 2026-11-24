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

/** Draw order per landing layer (SPEC-homepage §7). */
export const DEPTH = {
  sky: 0,
  city: 10,
  track: 20,
  shops: 30,
  sidewalk: 40,
  street: 50,
  ui: 100,
};

/** The living street (SPEC-homepage §3.1, §3.5). Speeds in px/s, times in ms. */
export const STREET = {
  walker: {
    everyMs: [2000, 4000] as const,
    firstMs: 600,
    cap: 6,
    nightFactor: 2,
    speed: [18, 28] as const,
    variants: 6,
    y: 304,
  },
  jeep: {
    everyMs: [6000, 10000] as const,
    firstMs: [1500, 4000] as const,
    cap: 2,
    speed: [80, 110] as const,
    variants: 4,
    y: 336,
  },
  train: {
    everyMs: [20000, 30000] as const,
    firstMs: [3000, 6000] as const,
    cap: 1,
    /** The 220 px train's centre travels 640 + 220 px in 2.5 s (§3.1). */
    speed: Math.round((640 + 220) / 2.5),
    y: 158,
    width: 220,
  },
  cloudSpeed: 4,
  cityDriftPx: 2,
  cityDriftMs: 4000,
  signOnEveryMs: 1500,
  routeCycleMs: 2500,
  surpriseCooldownMs: 5000,
  bubbleMs: 1600,
  /** Parked jeepney at the stop, the carts and the corner, by x. */
  parkedJeepX: 200,
  fishballX: 56,
  stopSignX: 128,
  barkerX: 146,
  cartX: 566,
  tricycleX: 612,
  /** In the gap between the sari-sari store and the milk tea stall, so the pole never crosses a sign. */
  streetlightX: 504,
};

/** Route signboards on the parked jeepney (real place names only, §10). */
export const ROUTES = [
  'RECTO – STA. MESA',
  'ESPAÑA – QUIAPO',
  'STA. MESA – QUIAPO',
  'LEGARDA – RECTO',
];

/** Greybox colours for the six student walkers (walker_1..6) and the four jeepneys (jeep_1..4). */
export const WALKER_COLORS = [0xfff4dc, 0xffffff, 0x3b6fb6, 0x8b5a3c, 0x6b2f3a, 0x3a9a6a];
export const JEEP_COLORS = [
  PALETTE.jeepRed,
  PALETTE.jeepYellow,
  PALETTE.jeepBlue,
  PALETTE.jeepGreen,
];

/** Map objects at this depth and above are UI (HUD, list, card): drawn by the fixed UI camera. */
export const MAP_UI_DEPTH = 30;

/** Map ambient life (§4.1): train every 20–30 s, small jeepneys on the roads, cloud shadows, birds. */
export const MAP_AMBIENT = {
  trainEveryMs: [20000, 30000] as const,
  trainMs: 5000,
  /**
   * Traffic on the map (H4): [road id, sprite frame in map_mini] — frames 0–3 jeepneys, 4 tricycle,
   * 5 car. Each drives its road, turns around at the end and drives back in the other lane.
   */
  traffic: [
    ['espana', 0],
    ['espana', 5],
    ['recto', 1],
    ['legarda', 2],
    ['magsaysay', 3],
    ['magsaysay', 4],
    ['quezon', 2],
    ['lacson', 0],
    ['lacson', 5],
    ['mendiola', 4],
    ['pureza', 4],
  ] as const,
  /** Traffic speed range in px/s. */
  trafficSpeed: [14, 24] as const,
  /** Pasig River: ferry speed (px/s) and drifting water hyacinth (px/s, count). */
  boatSpeed: 10,
  hyacinthSpeed: 3,
  hyacinths: 8,
  sparkles: 8,
  cloudSpeed: 5,
  birdEveryMs: [8000, 14000] as const,
  birdMs: 8000,
  /** The map unfolds from this scale when arriving from the landing (§6 transitions). */
  unfoldFrom: 0.92,
};

/** Night lights (map_lights, additive) per phase: off by day, coming on at hapon, full at gabi. */
export const MAP_LIGHTS: Readonly<Record<Phase, number>> = {
  umaga: 0,
  tanghali: 0,
  hapon: 0.45,
  gabi: 1,
};

/** Warm tint over the map matching the landing's time of day (§4.1): colour and alpha. */
export const MAP_TINT: Readonly<Record<Phase, readonly [number, number]>> = {
  umaga: [0xbfe0ff, 0.08],
  tanghali: [0xffffff, 0],
  hapon: [0xff9a5a, 0.12],
  gabi: [0x1d2348, 0.35],
};
