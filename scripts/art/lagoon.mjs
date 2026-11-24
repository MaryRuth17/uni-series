// Lagoon Merienda art (SPEC-pup-lagoon §3, §10.1, §11; owner reference photos, never traced): the PUP
// intro panorama, the Lagoon map (ground, stall row, red kiosks, tusok cart with FEWA, green lagoon with
// white posts and black railings, brick plaza with the LAGOON planter, tambayan, shade trees), the people
// (students on benches, latag sellers, dancers and a singer), and a storefront for every stall.
// Original pixel art; no logos or real signage (SPEC §13).
import { Pix, mix, shade, sheet } from './pix.mjs';
import { foodAssets, foodPix } from './lagoon-food.mjs';
import { SKINS } from './avatar.mjs';

const INK = '#2b2233';
const MAP_W = 512;
const MAP_H = 336;
const OY = 24;

function hash(...n) {
  let h = 2166136261;
  for (const v of n) {
    h ^= (v | 0) + 0x9e3779b9;
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
}

// ---- Shared bits ----------------------------------------------------------------------------------

function canopy(p, cx, cy, r, seed, base = '#3f7d3a') {
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + hash(seed, k) * 0.6;
    const d = r * (0.45 + hash(seed, k, 1) * 0.3);
    const rr = Math.round(r * (0.45 + hash(seed, k, 2) * 0.2));
    p.disc(
      Math.round(cx + Math.cos(a) * d),
      Math.round(cy + Math.sin(a) * d * 0.8),
      rr,
      shade(base, -0.12),
    );
  }
  p.disc(cx, cy, Math.round(r * 0.75), base);
  for (let k = 0; k < 7; k++) {
    const a = hash(seed, k, 3) * Math.PI * 2;
    const d = r * 0.5 * hash(seed, k, 4);
    p.disc(
      Math.round(cx - 2 + Math.cos(a) * d),
      Math.round(cy - 3 + Math.sin(a) * d),
      Math.max(2, Math.round(r * 0.28)),
      shade(base, 0.18),
    );
  }
  for (let k = 0; k < 14; k++) {
    const x = Math.round(cx - r + hash(seed, k, 5) * r * 2);
    const y = Math.round(cy - r + hash(seed, k, 6) * r * 1.6);
    if (Math.hypot(x - cx, (y - cy) * 1.2) < r * 0.9) p.px(x, y, shade(base, 0.38));
  }
}

/** A tiny standing or sitting person (about 10×16), front view. */
function person(
  p,
  x,
  y,
  { skin, hair, shirt, pants = '#3b4a6b', sit = false, arm = 0, long = false, lace = null },
) {
  // x, y = feet centre.
  if (!sit) {
    p.rect(x - 3, y - 5, 2, 5, pants);
    p.rect(x + 1, y - 5, 2, 5, pants);
    p.px(x - 3, y - 1, INK);
    p.px(x + 2, y - 1, INK);
  } else {
    p.rect(x - 3, y - 4, 6, 2, pants);
    p.rect(x - 3, y - 2, 2, 2, pants);
    p.rect(x + 1, y - 2, 2, 2, pants);
  }
  const top = sit ? y - 11 : y - 12;
  p.rect(x - 3, top, 6, 7, shirt);
  p.hline(x - 3, top, 6, shade(shirt, 0.2));
  if (lace) p.vline(x, top, 5, lace);
  // Arms.
  p.rect(x - 4, top + 1 - (arm === 1 ? 3 : 0), 1, 4, skin);
  p.rect(x + 3, top + 1 - (arm === 2 ? 3 : 0), 1, 4, skin);
  // Head.
  p.rect(x - 2, top - 6, 5, 6, skin);
  p.rect(x - 3, top - 7, 7, 3, hair);
  p.px(x - 3, top - 4, hair);
  p.px(x + 3, top - 4, hair);
  if (long) {
    p.vline(x - 3, top - 4, 5, hair);
    p.vline(x + 3, top - 4, 5, hair);
  }
  p.px(x - 1, top - 3, INK);
  p.px(x + 1, top - 3, INK);
}

const LOOKS = [
  { skin: SKINS[1], hair: '#2b2233', shirt: '#fff4dc', pants: '#3b4a6b', lace: '#8a2b2b' },
  { skin: SKINS[2], hair: '#3e2a1a', shirt: '#d94b3d', pants: '#2b2233', long: true },
  { skin: SKINS[0], hair: '#2b2233', shirt: '#3b6fb6', pants: '#d8d2c4' },
  {
    skin: SKINS[3],
    hair: '#1f1b26',
    shirt: '#ffffff',
    pants: '#6b2f3a',
    long: true,
    lace: '#3a9a6a',
  },
  { skin: SKINS[2], hair: '#5a3a22', shirt: '#3a9a6a', pants: '#3b4a6b' },
  { skin: SKINS[4], hair: '#2b2233', shirt: '#f2c14e', pants: '#2b2233', long: true },
];

// ---- The map ground (x 0–512, y 24–360) ------------------------------------------------------------

const PLAZA = { x: 250, y: 190, r: 56 };
const POND = { x: 410, y: 225, w: 124, h: 80 };

function ground() {
  const p = new Pix(MAP_W, MAP_H);
  const put = (x, y, c) => p.px(x, y - OY, c);
  for (let y = OY; y < 360; y++)
    for (let x = 0; x < MAP_W; x++) {
      // Light grey square paving with joints, warmer near the stall row.
      let c = x % 12 === 0 || (y - OY) % 12 === 0 ? '#c9c4b6' : '#d9d5c8';
      if (hash(x >> 2, y >> 2, 1) < 0.08) c = shade(c, -0.04);
      // Walkway in front of the stall row and beside the kiosks: smooth concrete.
      if ((y >= 96 && y < 114 && x >= 92 && x < 500) || (x >= 88 && x < 114 && y >= 100 && y < 300))
        c = (x + y) % 23 === 0 ? '#d6d0c2' : '#e4dfd2';
      // Tambayan: lighter square tiles.
      if (y >= 292 && x >= 104 && x < 476) c = x % 16 === 0 || y % 16 === 0 ? '#c4c0b4' : '#dedbd2';
      put(x, y, c);
    }
  // Drain grates along the walkway.
  for (let x = 110; x < 496; x += 34) {
    p.rect(x, 112 - OY, 10, 3, '#8a8494');
    for (let k = 0; k < 10; k += 2) p.px(x + k, 113 - OY, '#55505f');
  }
  // Garden beds with white star flowers between the windows.
  for (const [x0, x1] of [
    [176, 184],
    [256, 264],
    [340, 360],
    [436, 492],
  ]) {
    p.rect(x0, 115 - OY, x1 - x0, 6, '#5a8f3a');
    for (let x = x0; x < x1; x += 3) p.px(x + 1, 116 - OY + (x % 2), '#ffffff');
  }
  // Plaza: herringbone red brick with wide white curved bands, a dark shadow ring.
  for (let y = PLAZA.y - PLAZA.r - 2; y <= PLAZA.y + PLAZA.r + 2; y++)
    for (let x = PLAZA.x - PLAZA.r - 2; x <= PLAZA.x + PLAZA.r + 2; x++) {
      const d = Math.hypot(x - PLAZA.x, (y - PLAZA.y) * 1.05);
      if (d > PLAZA.r + 1) continue;
      let c = (Math.floor((x + y) / 3) + Math.floor((x - y) / 6)) & 1 ? '#b5563d' : '#a54a34';
      if ((x + 2 * y) % 7 === 0) c = '#8f3e2c';
      if (d > PLAZA.r - 4) c = '#f2eee4';
      else if (Math.abs(d - 36) < 2.2) c = '#f2eee4';
      else if (d > PLAZA.r - 5) c = '#9a8f80';
      put(x, y, c);
    }
  // Wide white band sweeping out toward the tambayan (photo: curved bands).
  for (let t = 0; t < 1; t += 0.004) {
    const a = Math.PI * (0.15 + t * 0.55);
    const x = Math.round(PLAZA.x + Math.cos(a) * (PLAZA.r + 10 + t * 6));
    const y = Math.round(PLAZA.y + Math.sin(a) * (PLAZA.r + 10 + t * 6));
    for (let k = -1; k <= 1; k++) put(x, y + k, '#ece7dc');
  }
  // The Lagoon: concrete rim, green water with reflections.
  for (let y = POND.y - POND.h / 2 - 6; y <= POND.y + POND.h / 2 + 6; y++)
    for (let x = POND.x - POND.w / 2 - 6; x <= POND.x + POND.w / 2 + 6; x++) {
      const e = ((x - POND.x) / (POND.w / 2)) ** 2 + ((y - POND.y) / (POND.h / 2)) ** 2;
      if (e > 1.22) continue;
      let c;
      if (e > 1.0) c = e > 1.12 ? '#bdb8ac' : '#e8e4da';
      else {
        const depth = 1 - e;
        c = depth > 0.55 ? '#3f6e4a' : depth > 0.25 ? '#4f7f55' : '#5e8c61';
        if (y < POND.y - POND.h / 2 + 12 && hash(x >> 1, y, 4) < 0.35) c = '#2f5a3a'; // tree reflections
        if (hash(x >> 2, y, 5) < 0.03) c = '#8fbf8a';
      }
      put(x, y, c);
    }
  // Stone bank along the lower right (photo).
  for (let x = POND.x + 10; x < POND.x + POND.w / 2 + 4; x++) {
    const y = Math.round(
      POND.y + (POND.h / 2) * Math.sqrt(Math.max(0, 1 - ((x - POND.x) / (POND.w / 2)) ** 2)),
    );
    for (let k = 0; k < 3; k++) put(x, y - k, hash(x, k, 6) < 0.5 ? '#9a9486' : '#7f7a6e');
  }
  // Tambayan planter boxes: terracotta with purple-leaf plants and pink flowers.
  for (const [x, y, w] of [
    [112, 340, 30],
    [216, 342, 46],
    [334, 342, 46],
    [440, 340, 30],
  ]) {
    p.rect(x, y - OY, w, 10, '#c8693f');
    p.hline(x, y - OY, w, '#e08a5a');
    p.rect(x + 1, y - 3 - OY, w - 2, 4, '#7a4a8a');
    for (let k = 1; k < w - 1; k += 3) {
      p.px(x + k, y - 4 - OY, '#9a6ab0');
      if (k % 6 === 1) p.px(x + k + 1, y - 3 - OY, '#f2a6c8');
    }
    p.rect(x, y + 10 - OY, w, 2, '#00000030');
  }
  // Dappled shade under the big trees.
  for (const [cx, cy, r] of [
    [30, 70, 30],
    [110, 300, 30],
    [230, 300, 28],
    [350, 300, 28],
    [470, 296, 26],
    [495, 150, 30],
    [330, 150, 18],
  ]) {
    for (let y = cy - r; y < cy + r; y++)
      for (let x = cx - r; x < cx + r; x++) {
        if (Math.hypot(x - cx, (y - cy) * 1.3) > r) continue;
        if (hash(x >> 1, y >> 1, 7) < 0.55 && x >= 0 && x < MAP_W && y >= OY)
          put(x, y, '#00000022');
      }
  }
  return p;
}

/** White posts with orange bands and black iron railings around the Lagoon (front half), over the walkers. */
function pondRail() {
  const p = new Pix(POND.w + 16, POND.h + 16);
  const cx = p.w / 2;
  const cy = p.h / 2;
  const rx = POND.w / 2 + 3;
  const ry = POND.h / 2 + 3;
  let prev = null;
  for (let a = 0; a <= Math.PI * 2 + 0.001; a += Math.PI / 90) {
    const x = Math.round(cx + Math.cos(a) * rx);
    const y = Math.round(cy + Math.sin(a) * ry);
    if (prev) {
      p.line(prev[0], prev[1] - 3, x, y - 3, '#2b2233');
      p.line(prev[0], prev[1] - 1, x, y - 1, '#3a3346');
      if (Math.round(a * 30) % 2 === 0) p.px(x, y - 2, '#3a3346');
    }
    prev = [x, y];
  }
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * rx);
    const y = Math.round(cy + Math.sin(a) * ry);
    p.rect(x - 1, y - 6, 3, 7, '#f4f1ea');
    p.hline(x - 1, y - 3, 3, '#d9743d');
    p.rect(x - 2, y - 7, 5, 1, '#ffffff');
    p.px(x + 1, y - 5, '#c9c4b6');
  }
  return p;
}

function plazaSign() {
  const p = new Pix(72, 56);
  // Hexagonal planter: white base, terracotta rim, spiky green and purple plants.
  const hex = [
    [14, 30],
    [58, 30],
    [68, 40],
    [58, 52],
    [14, 52],
    [4, 40],
  ];
  for (let y = 30; y < 53; y++)
    for (let x = 4; x < 69; x++) {
      const inside = (() => {
        let c = false;
        for (let i = 0, j = hex.length - 1; i < hex.length; j = i++) {
          const [xi, yi] = hex[i];
          const [xj, yj] = hex[j];
          if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
        }
        return c;
      })();
      if (!inside) continue;
      p.px(x, y, y > 46 ? '#8f4a32' : y > 43 ? '#f4f1ea' : y > 40 ? '#c75b3b' : '#4f8a3a');
    }
  for (let k = 0; k < 22; k++) {
    const x = 8 + Math.floor(hash(k, 11) * 56);
    const h = 3 + Math.floor(hash(k, 12) * 5);
    p.line(x, 40, x + (k % 3) - 1, 40 - h, k % 3 === 0 ? '#7a4a8a' : '#5e9c48');
  }
  // The sign: red block letters LAGOON on a white slab (in-world sign, SPEC-pup-lagoon §15).
  p.rect(16, 6, 40, 26, '#f4f1ea');
  p.rect(16, 28, 40, 4, '#d9d2c0');
  p.rect(12, 8, 48, 14, '#c0392b');
  p.hline(12, 8, 48, '#e05a48');
  p.text(15, 11, 'LAGOON', '#fff4dc', '5x7');
  p.outline(INK);
  return p;
}

// ---- Buildings and stalls ---------------------------------------------------------------------------

function stallRow() {
  const p = new Pix(400, 68);
  // White concrete-block wall.
  p.rect(0, 10, 400, 58, '#f1ece4');
  for (let y = 14; y < 68; y += 6) p.hline(0, y, 400, '#e0dbd0');
  for (let y = 14; y < 68; y += 12) for (let x = 0; x < 400; x += 16) p.vline(x, y, 6, '#e0dbd0');
  for (let y = 20; y < 68; y += 12) for (let x = 8; x < 400; x += 16) p.vline(x, y, 6, '#e0dbd0');
  // Doors between windows.
  for (const x of [176, 256, 346]) {
    p.rect(x, 40, 12, 28, '#5d6b8a');
    p.vline(x + 6, 40, 28, '#4a5776');
  }
  // Navy steel awning with cables.
  p.rect(0, 2, 400, 10, '#2b3a5e');
  p.hline(0, 2, 400, '#41557f');
  p.hline(0, 11, 400, '#1d2848');
  for (let x = 20; x < 400; x += 60) p.line(x, 0, x + 14, 10, '#55505f');
  p.rect(0, 12, 400, 2, '#00000030');
  return p;
}

const BALLOONS = (p, x, y) => {
  p.disc(x, y, 3, '#d94b3d');
  p.disc(x + 6, y + 1, 3, '#f2c14e');
  p.px(x - 1, y - 1, '#f08a7a');
  p.px(x + 5, y, '#fbe27a');
  p.vline(x, y + 3, 4, '#55505f');
  p.vline(x + 6, y + 4, 3, '#55505f');
};

/** A stall-row window: frame 0 closed (navy accordion shutter), frame 1 open with its display. */
function stallWindow(display) {
  return sheet(
    [0, 1].map((open) => {
      const p = new Pix(64, 48);
      p.rect(2, 6, 60, 36, '#d8d2c4');
      p.stroke(2, 6, 60, 36, '#a9a394');
      if (!open) {
        for (let x = 4; x < 60; x += 4) {
          p.rect(x, 8, 4, 32, '#2b3a5e');
          p.vline(x, 8, 32, '#41557f');
        }
        p.rect(18, 22, 28, 10, '#fff4dc');
        p.stroke(18, 22, 28, 10, INK);
        p.hline(22, 26, 20, '#8a8494');
        p.hline(22, 28, 14, '#8a8494');
      } else {
        // Shutters folded to the sides, a lit interior, a counter with the display.
        for (const x of [3, 56]) {
          p.rect(x, 8, 5, 32, '#2b3a5e');
          for (let y = 8; y < 40; y += 3) p.hline(x, y, 5, '#41557f');
        }
        p.rect(8, 8, 48, 22, '#5a4a3a');
        p.rect(10, 9, 44, 2, '#f8f4e0');
        display(p);
        p.rect(6, 30, 52, 4, '#c9b48a');
        p.hline(6, 30, 52, '#e0cfa6');
        p.rect(6, 34, 52, 8, '#f1ece4');
        BALLOONS(p, 6, 2);
        BALLOONS(p, 50, 2);
      }
      p.rect(0, 42, 64, 2, '#00000030');
      return p;
    }),
  );
}

const WINDOW_DISPLAY = {
  palamig: (p) => {
    // Drink dispensers in a row with blue labels (photo).
    ['#e98ab0', '#f2c14e', '#8a5a2a', '#c9e8a6', '#f08a3c'].forEach((c, i) => {
      const x = 10 + i * 9;
      p.rect(x, 14, 7, 15, '#e8f2f6');
      p.rect(x + 1, 17, 5, 11, c);
      p.rect(x + 1, 22, 5, 3, '#3b6fb6');
      p.rect(x, 13, 7, 2, '#c9d1d9');
    });
  },
  merienda: (p) => {
    p.rect(10, 20, 20, 9, '#c9a26a');
    for (let x = 12; x < 28; x += 5) p.ellipse(x + 1, 22, 2, 2, '#c98a4a');
    p.rect(34, 18, 18, 11, '#e8f2f6');
    for (let x = 35; x < 50; x += 5) p.rect(x, 22, 4, 3, '#d98a3a');
  },
  lugawan: (p) => {
    for (const x of [16, 36]) {
      p.rect(x - 7, 16, 14, 13, '#9aa3ad');
      p.hline(x - 7, 16, 14, '#c9d1d9');
      p.ellipse(x, 16, 6, 2, '#efe6cc');
      p.px(x - 2, 12, '#ffffff90');
      p.px(x + 1, 10, '#ffffff70');
    }
    p.rect(46, 20, 8, 9, '#f4f1ea');
  },
  ihaw: (p) => {
    p.rect(10, 22, 44, 7, '#2b2233');
    for (let x = 12; x < 52; x += 3) p.vline(x, 22, 7, '#55505f');
    for (let x = 14; x < 50; x += 6) {
      p.line(x, 26, x + 4, 18, '#c9a26a');
      p.rect(x + 1, 21, 2, 3, '#8a3a1a');
    }
    p.px(20, 14, '#ffffff70');
    p.px(34, 12, '#ffffff60');
  },
};

/** A red kiosk (80×50): frame 0 closed, frame 1 open with the glass display case. */
function kiosk(display) {
  return sheet(
    [0, 1].map((open) => {
      const p = new Pix(80, 50);
      // Roof and photo-menu banner.
      p.rect(0, 0, 80, 10, '#9a2b22');
      p.hline(0, 0, 80, '#c0392b');
      p.rect(6, 2, 68, 7, open ? '#fff4dc' : '#d8d2c4');
      if (open)
        for (let k = 0; k < 4; k++)
          p.rect(10 + k * 16, 3, 10, 5, ['#d9a441', '#6b3a22', '#3a9a6a', '#d94b3d'][k]);
      // Red front.
      p.rect(0, 10, 80, 40, open ? '#d94b3d' : '#9a8f8f');
      p.hline(0, 10, 80, open ? '#e8705f' : '#b0a6a6');
      p.rect(0, 46, 80, 4, '#00000030');
      // Glass display case with steel trays.
      p.rect(6, 14, 68, 20, open ? '#e8f2f6' : '#7a7280');
      p.stroke(6, 14, 68, 20, '#c9d1d9');
      if (open) {
        p.hline(7, 15, 66, '#ffffff');
        display(p);
        p.hline(7, 24, 66, '#c9d1d9');
        // Fluorescent tube, price sign, condiment jug.
        p.hline(8, 13, 64, '#f8f4e0');
        p.rect(6, 36, 18, 8, '#fff4dc');
        p.hline(8, 39, 12, '#d94b3d');
        p.hline(8, 41, 8, '#8a8494');
        p.rect(66, 34, 6, 9, '#3e2416');
        p.rect(66, 34, 6, 2, '#f2c14e');
        BALLOONS(p, 30, 38);
      } else {
        for (let x = 8; x < 74; x += 4) p.vline(x, 15, 18, '#6a6270');
      }
      return p;
    }),
  );
}

const trays = (keys) => (p) => {
  keys.forEach((k, i) => {
    const x = 8 + (i % 4) * 16;
    const y = i < 4 ? 15 : 24;
    p.rect(x, y + 1, 15, 8, '#c9d1d9');
    const f = foodPix(k);
    // Food shrunk 2:1 into the tray (every other pixel).
    for (let yy = 0; yy < 12; yy++)
      for (let xx = 0; xx < 12; xx++) {
        const c = f.get(xx * 2, yy * 2);
        if (c && c[3] > 0)
          p.px(
            x + 2 + xx,
            y - 1 + yy * 0.75,
            `#${c
              .slice(0, 3)
              .map((v) => v.toString(16).padStart(2, '0'))
              .join('')}`,
          );
      }
  });
};

function tusokCart() {
  return sheet(
    [0, 1].map((f) => {
      const p = new Pix(40, 32);
      // Umbrella-less steel cart with a wok of oil and a FEWA board.
      p.rect(4, 14, 32, 12, '#c9d1d9');
      p.hline(4, 14, 32, '#eef2f6');
      p.rect(4, 20, 32, 2, '#d94b3d');
      p.ellipse(14, 13, 8, 3, '#55505f');
      p.ellipse(14, 12, 7, 2, '#d9a441');
      for (const [x, c] of [
        [10, '#d8b07a'],
        [14, '#f08a3c'],
        [17, '#8a5a3a'],
      ])
        p.disc(x, 12, 1, c);
      p.px(12 + f, 8, '#ffffffa0');
      p.px(15 - f, 6, '#ffffff80');
      // Sawsawan jars.
      for (const [x, c] of [
        [25, '#8a4a22'],
        [29, '#d94b3d'],
        [33, '#efe6cc'],
      ]) {
        p.rect(x, 9, 3, 5, c);
        p.hline(x, 9, 3, '#ffffff80');
      }
      // FEWA board on a pole.
      p.vline(6, 2, 12, '#55505f');
      p.rect(0, 0, 22, 8, '#f2c14e');
      p.stroke(0, 0, 22, 8, '#d94b3d');
      p.text(2, 2, 'FEWA', '#d94b3d', '3x5');
      // Wheels.
      p.disc(9, 27, 3, '#2b2233');
      p.disc(31, 27, 3, '#2b2233');
      p.px(9, 27, '#8a929c');
      p.px(31, 27, '#8a929c');
      p.outline(INK);
      return p;
    }),
  );
}

function waterStation() {
  return sheet(
    [0, 1].map((open) => {
      const p = new Pix(20, 28);
      p.rect(3, 8, 14, 18, open ? '#3b6fb6' : '#8a8494');
      p.rect(5, 2, 10, 7, open ? '#a6d2ea' : '#c9c4b6');
      p.rect(8, 14, 4, 3, '#c9d1d9');
      p.rect(5, 20, 10, 3, '#55505f');
      p.outline(INK);
      return p;
    }),
  );
}

function bench() {
  const p = new Pix(48, 20);
  p.rect(2, 6, 44, 6, '#8b5a3c');
  for (let x = 2; x < 46; x += 4) p.vline(x, 6, 6, '#a06a48');
  p.hline(2, 6, 44, '#b47c58');
  p.rect(4, 12, 3, 6, '#55505f');
  p.rect(41, 12, 3, 6, '#55505f');
  p.rect(2, 18, 44, 2, '#00000030');
  p.outline(INK);
  return p;
}

/** Students on benches: 6 looks × 2 frames (eating, reading a laptop, chatting). */
function sitters() {
  const frames = [];
  LOOKS.forEach((look, i) =>
    [0, 1].forEach((f) => {
      const p = new Pix(16, 20);
      person(p, 8, 18, { ...look, sit: true, arm: f === 1 ? (i % 2) + 1 : 0 });
      if (i % 3 === 0) {
        p.rect(4, 12, 8, 4, '#c9d1d9');
        p.rect(5, 13, 6, 2, f ? '#a6d2ea' : '#6d7ea3');
      } else if (i % 3 === 1 && f === 1) p.rect(9, 6, 3, 3, '#f2c14e');
      p.outline(INK);
      frames.push(p);
    }),
  );
  return sheet(frames);
}

/** Latag: students selling crafts, flowers and snacks on mats and little tables under umbrellas. */
function latag(variant) {
  const p = new Pix(44, 36);
  const umbrella = ['#f2a6c8', '#3b6fb6', '#f2c14e', '#3a9a6a'][variant];
  // Table with a lace cloth, goods on top.
  p.rect(6, 20, 32, 8, '#f4f1ea');
  for (let x = 6; x < 38; x += 2) p.px(x, 27, '#d8d2c4');
  p.rect(8, 28, 2, 6, '#55505f');
  p.rect(34, 28, 2, 6, '#55505f');
  const goods = [
    ['#e98ab0', '#f2c14e', '#ffffff', '#9a6ab0'], // flowers
    ['#d94b3d', '#3b6fb6', '#f2c14e', '#3a9a6a'], // crochet and keychains
    ['#c98a4a', '#f2c87a', '#8a5a2a', '#ffffff'], // cookies and brownies
    ['#a6d2ea', '#f2a6c8', '#ffffff', '#f2c14e'], // stickers and prints
  ][variant];
  for (let k = 0; k < 7; k++) {
    const x = 9 + k * 4;
    p.rect(x, 17 + (k % 2), 3, 3, goods[k % 4]);
    p.px(x, 17 + (k % 2), shade(goods[k % 4], 0.35));
  }
  if (variant === 0) {
    p.rect(30, 12, 6, 8, '#f4f1ea');
    p.text(30, 14, '50', '#d94b3d', '3x5');
  }
  // Seller behind the table.
  person(p, 22, 20, { ...LOOKS[(variant * 2) % 6], arm: 2 });
  // Umbrella.
  p.vline(40, 4, 26, '#8a8494');
  for (let y = 0; y < 7; y++)
    p.hline(26 + y * 2 - 6, y + 1, 28 - y * 4 + 12, shade(umbrella, y % 2 ? -0.08 : 0));
  p.outline(INK);
  return p;
}

/** Dancers (4 frames) in two outfits, and a singer with a guitar (2 frames). */
function dancers() {
  const frames = [];
  for (const look of [LOOKS[1], LOOKS[2]])
    for (let f = 0; f < 4; f++) {
      const p = new Pix(16, 24);
      const bob = f % 2;
      person(p, 8, 23 - bob, { ...look, arm: [1, 0, 2, 0][f] });
      if (f === 1) p.px(4, 18, look.skin);
      p.outline(INK);
      frames.push(p);
    }
  return sheet(frames);
}

function singer() {
  return sheet(
    [0, 1].map((f) => {
      const p = new Pix(20, 24);
      person(p, 9, 23, { ...LOOKS[3], arm: 0 });
      // Guitar across the body.
      p.ellipse(11, 16, 4, 3, '#c98a4a');
      p.disc(11, 16, 1, '#3e2a1a');
      p.line(13, 15, 18, 10 - f, '#8a5a2a');
      p.px(5, 14 + f, LOOKS[3].skin);
      // Music notes.
      p.px(16 + f, 3, INK);
      p.vline(17 + f, 0, 3, INK);
      p.outline(INK);
      return p;
    }),
  );
}

/** The map's shade trees, drawn over people and stalls (transparent elsewhere). */
function treeCanopy() {
  const p = new Pix(MAP_W, MAP_H);
  const trees = [
    [30, 50, 30],
    [494, 130, 32],
    [110, 286, 22],
    [230, 288, 20],
    [350, 288, 20],
    [500, 230, 18],
    [16, 330, 20],
  ];
  trees.forEach(([x, y, r], i) => {
    p.rect(x - 2, y - OY + r * 0.4, 4, r * 0.7, '#5a4632');
    canopy(p, x, y - OY, r, i + 3);
  });
  return p;
}

// ---- Storefronts (400×170) ----------------------------------------------------------------------------

const FRONT_W = 400;
const FRONT_H = 170;
const STALL_ITEMS = {
  karinderya: [
    'adobo_meal',
    'curry_meal',
    'teriyaki_meal',
    'chopsuey_meal',
    'liempo_meal',
    'tonkatsu_meal',
  ],
  // Same order as data/menu.ts, so the game's price tags line up with the food (FEWA last, under its banner).
  tusok: ['fishball', 'kikiam', 'squidball', 'tokneneng', 'kwekkwek', 'fewa'],
  palamig: ['gulaman', 'melon', 'buko', 'softdrinks', 'water_bottle', 'iced_coffee'],
  ihaw: ['betamax', 'isaw', 'hotdog_stick', 'bbq', 'mais', 'bbq_rice'],
  merienda: ['pandesal', 'turon', 'kamotecue', 'puto', 'bananacue', 'siopao'],
  lugawan: ['lugaw', 'tokwa', 'lugaw_egg', 'goto', 'mami'],
  halohalo: ['icecandy', 'iskrambol', 'lecheflan', 'maiscon', 'halohalo'],
  silog: ['hotsilog', 'longsilog', 'tapsilog', 'sisig_rice'],
  water: ['tumbler_water'],
};

function vendorAt(p, x, y, look, apron = '#ffffff') {
  // A bigger vendor (3× a map person) behind the counter, waving.
  const big = new Pix(20, 28);
  person(big, 10, 27, { ...look, arm: 2 });
  big.rect(7, 16, 6, 6, apron);
  for (let yy = 0; yy < big.h; yy++)
    for (let xx = 0; xx < big.w; xx++) {
      const c = big.get(xx, yy);
      if (!c || !c[3]) continue;
      const h = `#${c
        .slice(0, 3)
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('')}`;
      p.rect(x + xx * 3, y + yy * 3, 3, 3, h);
    }
}

function blitFood(p, key, x, y, scale = 1) {
  const f = foodPix(key);
  for (let yy = 0; yy < f.h; yy++)
    for (let xx = 0; xx < f.w; xx++) {
      const c = f.get(xx, yy);
      if (!c || !c[3]) continue;
      const h = `#${c
        .slice(0, 3)
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('')}`;
      p.rect(x + xx * scale, y + yy * scale, scale, scale, h);
    }
}

const FRONT_STYLE = {
  karinderya: { kind: 'kiosk', vendor: 1 },
  silog: { kind: 'kiosk', vendor: 4 },
  halohalo: { kind: 'kiosk', vendor: 5 },
  palamig: { kind: 'window', vendor: 3 },
  merienda: { kind: 'window', vendor: 0 },
  lugawan: { kind: 'window', vendor: 2 },
  ihaw: { kind: 'window', vendor: 4 },
  tusok: { kind: 'cart', vendor: 2 },
  water: { kind: 'water', vendor: -1 },
};

/**
 * The front of a stall: sign board on top (the game writes the stall's name on it), a display of its food,
 * the vendor behind the counter, balloons, and a FEWA tarpaulin for the tusok cart. Price tags are drawn
 * by the game so they follow promos.
 */
function storefront(key) {
  const p = new Pix(FRONT_W, FRONT_H);
  const style = FRONT_STYLE[key];
  const items = STALL_ITEMS[key];
  // Backdrop: shade trees and the white campus wall.
  p.vgrad(0, 0, FRONT_W, 60, ['#bfe0ff', '#dff0f7']);
  for (let x = -10; x < FRONT_W + 20; x += 46) canopy(p, x, 18, 26, x + 40, '#4f8a3c');
  p.rect(0, 60, FRONT_W, 110, '#d9d5c8');
  if (style.kind === 'window' || style.kind === 'kiosk') {
    const wall = style.kind === 'kiosk' ? '#d94b3d' : '#f1ece4';
    p.rect(20, 34, 360, 126, wall);
    if (style.kind === 'window') {
      for (let y = 40; y < 160; y += 8) p.hline(20, y, 360, '#e0dbd0');
      // Navy awning across the top.
      p.rect(10, 26, 380, 14, '#2b3a5e');
      p.hline(10, 26, 380, '#41557f');
      p.rect(10, 40, 380, 3, '#00000030');
      // Folded accordion shutters at the sides.
      for (const x of [28, 352]) {
        p.rect(x, 46, 20, 84, '#2b3a5e');
        for (let y = 46; y < 130; y += 5) p.hline(x, y, 20, '#41557f');
      }
    } else {
      p.hline(20, 34, 360, '#e8705f');
      p.rect(10, 22, 380, 12, '#9a2b22');
    }
    // Sign board (name written by the game).
    p.rect(70, 4, 260, 26, '#fff4dc');
    p.stroke(70, 4, 260, 26, INK);
    p.stroke(72, 6, 256, 22, '#d94b3d');
    // Interior.
    p.rect(52, 48, 296, 64, style.kind === 'kiosk' ? '#e8f2f6' : '#5a4a3a');
    p.hline(54, 50, 292, '#f8f4e0');
  } else if (style.kind === 'cart') {
    p.rect(0, 60, FRONT_W, 110, '#d9d5c8');
    // FEWA tarpaulin on two poles.
    p.vline(66, 4, 120, '#55505f');
    p.vline(334, 4, 120, '#55505f');
    p.rect(70, 4, 260, 26, '#f2c14e');
    p.stroke(70, 4, 260, 26, INK);
    p.stroke(72, 6, 256, 22, '#d94b3d');
  } else {
    p.rect(160, 40, 80, 120, '#3b6fb6');
    p.rect(170, 50, 60, 40, '#a6d2ea');
    p.rect(185, 100, 30, 14, '#c9d1d9');
    p.rect(70, 4, 260, 26, '#fff4dc');
    p.stroke(70, 4, 260, 26, INK);
  }
  // Vendor.
  if (style.vendor >= 0)
    vendorAt(p, 170, 30, LOOKS[style.vendor], style.kind === 'cart' ? '#f2c14e' : '#ffffff');
  // Counter or cart body, with the food on display.
  if (style.kind === 'cart') {
    p.rect(60, 104, 280, 40, '#c9d1d9');
    p.hline(60, 104, 280, '#eef2f6');
    p.rect(60, 122, 280, 4, '#d94b3d');
    p.ellipse(130, 102, 46, 8, '#55505f');
    p.ellipse(130, 100, 42, 6, '#d9a441');
    p.disc(90, 150, 10, '#2b2233');
    p.disc(310, 150, 10, '#2b2233');
  } else if (style.kind !== 'water') {
    p.rect(40, 112, 320, 12, '#c9b48a');
    p.hline(40, 112, 320, '#e0cfa6');
    p.rect(40, 124, 320, 36, style.kind === 'kiosk' ? '#b8402f' : '#e8e4da');
  }
  // The food: up to 6 big items across the counter, each on a tray.
  const n = items.length;
  items.forEach((k, i) => {
    const slot = 300 / Math.max(n, 1);
    const x = Math.round(50 + slot * i + slot / 2 - 24);
    const y = style.kind === 'cart' ? 74 : 66;
    if (style.kind !== 'water') {
      p.rect(x - 2, y + 40, 52, 6, '#c9d1d9');
      p.hline(x - 2, y + 40, 52, '#eef2f6');
    }
    blitFood(p, k, x, style.kind === 'water' ? 112 : y, 2);
  });
  if (style.kind !== 'water' && style.kind !== 'cart') {
    BALLOONS(p, 30, 44);
    BALLOONS(p, 360, 44);
  }
  if (key === 'karinderya') {
    // TOYO jug on the counter (photo detail).
    p.rect(360, 92, 14, 20, '#3e2416');
    p.rect(360, 92, 14, 4, '#f2c14e');
  }
  return p;
}

// ---- The PUP intro panorama (960×360) -----------------------------------------------------------------

function introPanorama() {
  const W = 960;
  const p = new Pix(W, 360);
  p.vgrad(0, 0, W, 200, ['#8fc4ec', '#bfe0f7', '#f4ead2']);
  // Clouds.
  for (const [x, y, w] of [
    [80, 40, 70],
    [320, 24, 90],
    [610, 50, 60],
    [820, 30, 80],
  ]) {
    p.ellipse(x, y, w / 2, 10, '#ffffff');
    p.ellipse(x - w / 4, y + 4, w / 4, 8, '#ffffff');
    p.ellipse(x + w / 4, y + 5, w / 4, 7, '#f4f8fb');
  }
  // Lawn and hedges behind the plaza, then the far trees.
  p.rect(0, 196, W, 66, '#7fb65a');
  for (let y = 196; y < 262; y += 2) for (let x = (y / 2) % 2; x < W; x += 5) p.px(x, y, '#8fc46a');
  for (let x = -20; x < W + 40; x += 38) canopy(p, x, 168, 30, x + 5, '#4f8a3c');
  for (let x = 0; x < W; x += 24) {
    p.ellipse(x + 12, 250, 13, 7, '#4f8a3c');
    p.ellipse(x + 10, 248, 9, 4, '#6fae4e');
  }
  // The main building: long white hall with maroon bands and the tall central pylon (original design).
  const bx = 220;
  const bw = 520;
  const by = 150;
  p.rect(bx, by, bw, 110, '#f1ece4');
  p.rect(bx, by, bw, 8, '#8a2b2b');
  for (let r = 0; r < 3; r++) {
    p.rect(bx, by + 30 + r * 28, bw, 3, '#8a2b2b');
    for (let x = bx + 10; x < bx + bw - 10; x += 14) {
      if (Math.abs(x - (bx + bw / 2)) < 40) continue;
      p.rect(x, by + 14 + r * 28, 8, 12, '#3b4a6b');
      p.hline(x, by + 14 + r * 28, 8, '#6d7ea3');
    }
  }
  const cx = bx + bw / 2;
  for (let y = 20; y < by + 10; y++) {
    const half = 6 + Math.floor((y - 20) / 22);
    p.rect(cx - half, y, half * 2 + 1, 1, '#ece2c6');
    p.px(cx + half, y, '#c9b998');
    p.px(cx - half, y, '#fff8e6');
  }
  p.rect(cx - 4, 10, 9, 10, '#e2b23c');
  p.rect(cx - 2, 4, 5, 6, '#f2c94e');
  p.rect(cx - 30, by + 60, 60, 50, '#e8e2d4');
  p.rect(cx - 14, by + 78, 28, 32, '#3e3446');
  for (let k = 0; k < 4; k++) p.rect(cx - 26 + k * 16, by + 60, 4, 50, '#ffffff');
  p.rect(bx, by + 108, bw, 4, '#00000030');
  // Ground: plaza paving, lawn, flagpole, hedges.
  p.rect(0, 262, W, 98, '#d9d5c8');
  for (let y = 262; y < 360; y += 10) p.hline(0, y, W, '#cbc6b8');
  for (let x = 0; x < W; x += 20) p.vline(x, 262, 98, '#cbc6b8');
  p.rect(0, 256, W, 8, '#5e9c48');
  for (let x = 0; x < W; x += 3) p.px(x, 256 + (x % 2), '#7fbf5a');
  p.vline(140, 120, 140, '#c9d1d9');
  // The Philippine flag: blue over red, a white triangle at the hoist with the sun.
  p.rect(141, 122, 26, 8, '#2a5bb0');
  p.rect(141, 130, 26, 8, '#d0302a');
  for (let k = 0; k < 8; k++) p.rect(141, 122 + k, 1 + k, 16 - 2 * k, '#ffffff');
  p.px(144, 130, '#f2c14e');
  p.px(143, 129, '#f2c14e');
  // Big shade trees in front.
  for (const [x, y, r] of [
    [40, 200, 54],
    [880, 196, 60],
    [600, 300, 0],
  ]) {
    if (!r) continue;
    p.rect(x - 4, y, 8, 70, '#5a4632');
    canopy(p, x, y - 20, r, x, '#3f7d3a');
  }
  // A pergola on the right (photo detail).
  for (let x = 770; x < 870; x += 16) p.rect(x, 230, 4, 34, '#f1ece4');
  p.rect(764, 226, 112, 5, '#e0dbd0');
  return p;
}

// ---- How-to-play icons (48×48) --------------------------------------------------------------------------

function howIcons() {
  const frames = [];
  // 1. Listahan notebook with checks.
  {
    const p = new Pix(48, 48);
    p.rect(10, 6, 28, 36, '#fffbef');
    for (let y = 12; y < 40; y += 6) p.hline(12, y, 24, '#a6c8ee');
    p.vline(16, 6, 36, '#f2a6c8');
    for (let k = 0; k < 3; k++) {
      p.stroke(18, 9 + k * 9, 5, 5, INK);
      if (k < 2) p.line(19, 11 + k * 9, 21, 13 + k * 9, '#3a9a6a');
      p.hline(25, 11 + k * 9, 10, '#55505f');
    }
    p.outline(INK);
    frames.push(p);
  }
  // 2. A stall with a pila.
  {
    const p = new Pix(48, 48);
    p.rect(4, 8, 30, 22, '#d94b3d');
    p.rect(8, 12, 22, 10, '#e8f2f6');
    p.rect(2, 4, 34, 5, '#2b3a5e');
    for (let k = 0; k < 3; k++) person(p, 38 - k * 0 + 0, 46 - k * 0, LOOKS[0]);
    person(p, 12, 46, LOOKS[1]);
    person(p, 24, 46, LOOKS[2]);
    person(p, 36, 46, LOOKS[4]);
    p.outline(INK);
    frames.push(p);
  }
  // 3. Coins and a bill: pay and count your sukli.
  {
    const p = new Pix(48, 48);
    p.rect(6, 22, 30, 16, '#9fd18a');
    p.stroke(6, 22, 30, 16, '#3a7a4a');
    p.disc(21, 30, 4, '#c9e8a6');
    for (const [x, y, r] of [
      [34, 14, 7],
      [22, 10, 5],
      [38, 34, 6],
    ]) {
      p.disc(x, y, r, '#f2c14e');
      p.disc(x - 1, y - 1, r - 2, '#fbe27a');
      p.px(x, y, '#c98a2a');
    }
    p.outline(INK);
    frames.push(p);
  }
  // 4. Eat with the barkada; the leftover goes to the alkansya.
  {
    const p = new Pix(48, 48);
    p.rect(2, 30, 30, 5, '#8b5a3c');
    person(p, 9, 32, { ...LOOKS[1], sit: true });
    person(p, 21, 32, { ...LOOKS[2], sit: true, arm: 2 });
    p.rect(34, 18, 12, 26, '#c9a26a');
    for (let y = 22; y < 44; y += 6) p.hline(34, y, 12, '#8a6a3a');
    p.rect(37, 16, 6, 2, '#3e2a1a');
    p.disc(40, 10, 3, '#f2c14e');
    p.outline(INK);
    frames.push(p);
  }
  return sheet(frames);
}

// ---- Export ---------------------------------------------------------------------------------------------

export function lagoonAssets() {
  const out = [
    { key: 'lagoon_ground', pix: ground() },
    { key: 'lagoon_canopy', pix: treeCanopy() },
    { key: 'lagoon_pond_rail', pix: pondRail() },
    { key: 'lagoon_plaza_sign', pix: plazaSign() },
    { key: 'lagoon_stallrow', pix: stallRow() },
    { key: 'cart_tusok', pix: tusokCart(), frame: [40, 32] },
    { key: 'water_station', pix: waterStation(), frame: [20, 28] },
    { key: 'lagoon_bench', pix: bench() },
    { key: 'lagoon_sitter', pix: sitters(), frame: [16, 20] },
    { key: 'lagoon_dancer', pix: dancers(), frame: [16, 24] },
    { key: 'lagoon_singer', pix: singer(), frame: [20, 24] },
    { key: 'lagoon_intro', pix: introPanorama() },
    { key: 'lagoon_how', pix: howIcons(), frame: [48, 48] },
  ];
  for (let v = 0; v < 4; v++) out.push({ key: `lagoon_latag_${v + 1}`, pix: latag(v) });
  for (const [key, display] of Object.entries(WINDOW_DISPLAY))
    out.push({ key: `stall_window_${key}`, pix: stallWindow(display), frame: [64, 48] });
  for (const key of ['karinderya', 'silog', 'halohalo'])
    out.push({
      key: `kiosk_${key}`,
      pix: kiosk(trays(STALL_ITEMS[key].slice(0, 8))),
      frame: [80, 50],
    });
  for (const key of Object.keys(STALL_ITEMS))
    out.push({ key: `front_${key}`, pix: storefront(key) });
  out.push(...foodAssets(Object.values(STALL_ITEMS).flat().concat(['free_iced_tea'])));
  return out;
}

export { mix };
