// Landing street art (SPEC-homepage §3, §8 keys). Drawn at 1 px = 1 world pixel on the 640×360 grid;
// the game renders it at 3× (DECISIONS D-040). Light comes from the top left.
import { Pix, hex, mix, rng, shade, sheet, toHex } from './pix.mjs';

export const INK = '#2b2233';
const CREAM = '#fff4dc';
const GLOW = '#ffe08a';
const GLOW_HOT = '#fff6c9';

/**
 * Night version of a sprite: everything darkens toward navy except light sources (glowing windows,
 * lit signs), which keep their colour so they read as lights.
 */
/** Lit signboards drawn by the last shop draw call: kept bright at night. */
let LIGHTS = [];

function nightify(src, lights = []) {
  const keep = new Set(
    [GLOW, GLOW_HOT, '#e8b45a', '#ffe9a8', '#fff2c6', '#fff4d0', '#fff6c9'].map((c) =>
      hex(c).slice(0, 3).join(','),
    ),
  );
  const out = new Pix(src.w, src.h);
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const c = src.get(x, y);
      if (!c || !c[3]) continue;
      const isLight =
        keep.has(c.slice(0, 3).join(',')) ||
        lights.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
      out.px(x, y, isLight ? toHex(c) : mix(toHex(c), '#161a3a', 0.5));
    }
  }
  return out;
}

// ---- Sky and far city ----------------------------------------------------------------------------

const SKIES = {
  umaga: ['#78b2e4', '#9fcbee', '#c8e2f3', '#eaf1ea'],
  tanghali: ['#3f8fdc', '#69aeea', '#99cdf3', '#cbe7f8'],
  hapon: ['#5f4596', '#8f5598', '#cf6680', '#f08a6c', '#ffb870'],
  gabi: ['#0f1433', '#171d45', '#232657', '#33306a'],
};

function sky(phase) {
  const p = new Pix(640, 186);
  p.vgrad(0, 0, 640, 186, SKIES[phase]);
  const r = rng(phase.length * 97);
  if (phase === 'gabi') {
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(r() * 640);
      const y = Math.floor(r() * 120);
      p.px(x, y, r() < 0.3 ? '#ffffff' : '#c9c4ff');
      if (r() < 0.12) {
        p.px(x - 1, y, '#8c86d0');
        p.px(x + 1, y, '#8c86d0');
        p.px(x, y - 1, '#8c86d0');
        p.px(x, y + 1, '#8c86d0');
      }
    }
    // Moon with craters and a soft halo.
    p.disc(520, 46, 20, '#ffffff16');
    p.disc(520, 46, 15, '#ffffff22');
    p.disc(520, 46, 11, '#f3ecd2');
    p.disc(516, 43, 2, '#ddd3b3');
    p.disc(524, 50, 3, '#ddd3b3');
    p.disc(523, 40, 1, '#ddd3b3');
    return p;
  }
  const sun = { umaga: [108, 62, 13], tanghali: [470, 28, 12], hapon: [560, 128, 18] }[phase];
  const [sx, sy, sr] = sun;
  p.disc(sx, sy, sr + 10, phase === 'hapon' ? '#ffd08a30' : '#ffffff20');
  p.disc(sx, sy, sr + 5, phase === 'hapon' ? '#ffd08a50' : '#ffffff30');
  p.disc(sx, sy, sr, phase === 'hapon' ? '#ffd27a' : '#fff1b0');
  p.disc(sx - 3, sy - 3, sr - 5, phase === 'hapon' ? '#ffe3a3' : '#fffbe0');
  return p;
}

/** A small, chunky cloud sprite with a lit top and shaded belly. */
function cloud(seed, w) {
  const p = new Pix(w, 20);
  const r = rng(seed);
  const puffs = [];
  for (let x = 6; x < w - 6; x += 7)
    puffs.push([x + Math.floor(r() * 3), 12 - Math.floor(r() * 6), 5 + Math.floor(r() * 4)]);
  for (const [x, y, rad] of puffs) p.disc(x, y, rad, '#d7dbe8');
  for (const [x, y, rad] of puffs) p.disc(x - 1, y - 1, rad - 1, '#ffffff');
  p.rect(2, 15, w - 4, 3, '#c3c8d9');
  p.outline('#9aa1b8');
  return p;
}

const CITY = {
  umaga: { far: '#a8b4d0', near: '#8892b4', win: '#c4cde3', lit: 0 },
  tanghali: { far: '#a2b0cf', near: '#8290b3', win: '#c0cbe4', lit: 0 },
  hapon: { far: '#8a6a9a', near: '#5b4a7a', win: '#7a6896', lit: 0.25 },
  gabi: { far: '#2c3058', near: '#1f2240', win: '#2b2f52', lit: 0.5 },
};

function cityFar(phase) {
  const c = CITY[phase];
  const p = new Pix(640, 66);
  const r = rng(4242);
  // Far layer: tall blocks with antennas.
  for (let x = 0; x < 640;) {
    const w = 18 + Math.floor(r() * 26);
    const h = 26 + Math.floor(r() * 34);
    p.rect(x, 66 - h, w, h, c.far);
    if (r() < 0.35) p.vline(x + Math.floor(w / 2), 66 - h - 6, 6, c.far);
    x += w + Math.floor(r() * 4);
  }
  // Near layer: offices and condos with windows, a water tank and a church dome.
  for (let x = 0; x < 640;) {
    const w = 26 + Math.floor(r() * 30);
    const h = 16 + Math.floor(r() * 30);
    p.rect(x, 66 - h, w, h, c.near);
    p.hline(x, 66 - h, w, shade(c.near, 0.12));
    for (let wy = 66 - h + 4; wy < 62; wy += 6) {
      for (let wx = x + 3; wx < x + w - 3; wx += 5) {
        const lit = r() < c.lit;
        p.rect(wx, wy, 2, 3, lit ? (r() < 0.5 ? GLOW : '#ffc46b') : c.win);
      }
    }
    x += w + 1 + Math.floor(r() * 5);
  }
  // Water tank on legs.
  p.rect(226, 6, 22, 12, c.near);
  p.hline(226, 6, 22, shade(c.near, 0.15));
  for (const lx of [228, 236, 245]) p.vline(lx, 18, 14, c.near);
  p.line(228, 22, 245, 30, c.near);
  // Church dome with a lantern.
  p.ellipse(430, 22, 13, 11, c.near);
  p.rect(417, 22, 27, 20, c.near);
  p.rect(428, 6, 5, 6, c.near);
  p.vline(430, 1, 5, c.near);
  p.hline(428, 3, 5, c.near);
  return p;
}

// ---- LRT-2 -----------------------------------------------------------------------------------------

function lrtTrack() {
  const p = new Pix(640, 150);
  const concrete = '#a7a6b3';
  // Pillars (seen between the shops) down to the sidewalk.
  for (const x of [132, 256, 380, 504]) {
    p.rect(x - 4, 16, 8, 132, '#8c8a99');
    p.vline(x - 4, 16, 132, '#a9a7b6');
    p.vline(x + 3, 16, 132, '#6f6d7d');
    p.rect(x - 6, 140, 12, 8, '#7a7888');
    p.hline(x - 6, 140, 12, '#9a98a8');
  }
  // Deck: concrete beam with panel joints, railing and the shadow under it.
  p.rect(0, 2, 640, 12, concrete);
  p.hline(0, 2, 640, '#c9c8d2');
  p.hline(0, 3, 640, '#bbbac6');
  p.rect(0, 11, 640, 3, '#8a8996');
  for (let x = 0; x < 640; x += 32) p.vline(x, 4, 7, '#93929f');
  p.hline(0, 0, 640, '#6f6d7d');
  for (let x = 2; x < 640; x += 6) p.vline(x, 0, 2, '#6f6d7d');
  p.rect(0, 14, 640, 2, '#5c5a6a');
  p.shadow(0, 16, 640, 3, 0.25);
  return p;
}

function lrtTrain(lit) {
  const w = 220;
  const p = new Pix(w, 24);
  const body = '#e9e9f0';
  p.rect(2, 2, w - 4, 17, body);
  p.hline(2, 2, w - 4, '#ffffff');
  p.rect(2, 15, w - 4, 3, '#7b4bb3');
  p.hline(2, 15, w - 4, '#9a6bd0');
  p.rect(2, 18, w - 4, 2, '#b7b6c4');
  for (let car = 0; car < 2; car++) {
    const x0 = 4 + car * 109;
    for (let i = 0; i < 6; i++) {
      const wx = x0 + 8 + i * 15;
      p.rect(wx, 6, 11, 7, lit ? GLOW : '#3b4a6b');
      if (!lit) p.hline(wx, 6, 11, '#5d6e92');
      else p.hline(wx, 6, 11, GLOW_HOT);
      p.stroke(wx - 1, 5, 13, 9, '#9897a6');
    }
    p.rect(x0 + 98, 5, 6, 12, '#c9c8d4');
    p.vline(x0 + 101, 5, 12, '#9897a6');
    if (car === 0) p.vline(x0 + 106, 2, 18, '#9897a6');
  }
  // Rounded nose and tail lights.
  p.rect(0, 5, 3, 12, '#d6d6e0');
  p.rect(w - 3, 5, 3, 12, '#d6d6e0');
  p.px(w - 2, 14, lit ? '#ff6a5a' : '#c0504a');
  p.px(1, 14, lit ? '#ffffff' : '#e0e0e8');
  for (const x of [22, 88, 132, 198]) {
    p.rect(x - 6, 20, 12, 3, '#4a4858');
    p.px(x - 3, 23, '#2b2233');
    p.px(x + 3, 23, '#2b2233');
  }
  p.stroke(1, 1, w - 2, 19, '#55536a');
  return p;
}

// ---- Shops -----------------------------------------------------------------------------------------

const SHOP_W = 116;
const SHOP_H = 112;

function windowPane(p, x, y, w, h, lit, frame = '#f2eee4') {
  p.rect(x - 1, y - 1, w + 2, h + 2, frame);
  p.stroke(x - 2, y - 2, w + 4, h + 4, shade(frame, -0.45));
  if (lit) {
    p.rect(x, y, w, h, GLOW);
    p.rect(x, y, w, Math.ceil(h / 3), GLOW_HOT);
    p.rect(x + 1, y + h - 3, w - 2, 2, '#e8b45a');
  } else {
    p.rect(x, y, w, h, '#4a5878');
    p.line(x, y + h - 1, x + Math.min(w, h) - 1, y + h - Math.min(w, h), '#6d7ea3');
    p.line(x + 3, y + h - 1, x + Math.min(w, h) + 2, y + h - Math.min(w, h), '#5d6e92');
  }
  p.vline(x + Math.floor(w / 2), y, h, frame);
  p.rect(x - 2, y + h + 1, w + 4, 2, shade(frame, -0.15));
}

function signboard(p, x, y, w, h, base, lit, lines) {
  if (lit) LIGHTS.push({ x: x - 2, y: y - 2, w: w + 4, h: h + 4 });
  if (lit) p.rect(x - 2, y - 2, w + 4, h + 4, '#ffe08a40');
  p.bevel(x, y, w, h, lit ? shade(base, 0.25) : base);
  let ty = y + Math.floor((h - lines.reduce((s, l) => s + (l.font === '3x5' ? 6 : 8), 0) + 1) / 2);
  for (const l of lines) {
    p.textCentered(x + w / 2, ty, l.text, l.color, l.font ?? '5x7', l.shadow ?? null);
    ty += l.font === '3x5' ? 6 : 8;
  }
}

function awning(p, x, y, w, c1, c2) {
  for (let i = 0; i < w; i++) {
    const c = Math.floor(i / 6) % 2 ? c1 : c2;
    p.vline(x + i, y, 6, c);
    p.px(x + i, y, shade(c, 0.25));
    // Scalloped hem.
    const sc = Math.floor(i / 6) % 2 ? shade(c1, -0.2) : shade(c2, -0.2);
    if (i % 6 !== 0 && i % 6 !== 5) p.px(x + i, y + 6, sc);
  }
  p.hline(x, y, w, INK);
  p.shadow(x, y + 7, w, 3, 0.22);
}

function wallTexture(p, x, y, w, h, base, kind, seed) {
  const r = rng(seed);
  p.rect(x, y, w, h, base);
  if (kind === 'concrete') {
    for (let i = 0; i < (w * h) / 18; i++)
      p.px(x + Math.floor(r() * w), y + Math.floor(r() * h), shade(base, r() < 0.5 ? -0.06 : 0.05));
    for (let yy = y + 12; yy < y + h; yy += 13) p.hline(x, yy, w, shade(base, -0.08));
  } else if (kind === 'tiles') {
    for (let yy = y; yy < y + h; yy += 5) p.hline(x, yy, w, shade(base, -0.1));
    for (let yy = y; yy < y + h; yy += 5)
      for (let xx = x + ((yy / 5) % 2) * 3; xx < x + w; xx += 6)
        p.vline(xx, yy, 5, shade(base, -0.1));
  } else if (kind === 'planks') {
    for (let yy = y; yy < y + h; yy += 4) {
      p.hline(x, yy, w, shade(base, -0.18));
      p.hline(x, yy + 1, w, shade(base, 0.06));
    }
    for (let i = 0; i < w / 10; i++)
      p.px(x + Math.floor(r() * w), y + Math.floor(r() * h), shade(base, -0.25));
  } else if (kind === 'brick') {
    for (let yy = y; yy < y + h; yy += 4) {
      p.hline(x, yy, w, shade(base, -0.2));
      const off = (yy / 4) % 2 ? 4 : 0;
      for (let xx = x + off; xx < x + w; xx += 8) p.vline(xx, yy, 4, shade(base, -0.2));
    }
  } else if (kind === 'stucco') {
    for (let i = 0; i < (w * h) / 10; i++)
      p.px(x + Math.floor(r() * w), y + Math.floor(r() * h), shade(base, (r() - 0.5) * 0.12));
  }
}

function parapet(p, color) {
  p.rect(0, 0, SHOP_W, 7, shade(color, -0.15));
  p.hline(0, 0, SHOP_W, shade(color, 0.2));
  p.hline(0, 6, SHOP_W, shade(color, -0.4));
}

function shopFrame(p) {
  p.vline(0, 0, SHOP_H, INK);
  p.vline(SHOP_W - 1, 0, SHOP_H, INK);
}

function shopDorm(lit) {
  const p = new Pix(SHOP_W, SHOP_H);
  const wall = '#e6d2ae';
  wallTexture(p, 0, 0, SHOP_W, SHOP_H, wall, 'concrete', 11);
  parapet(p, wall);
  // Upper floor: three windows, the middle one with the bedspace sign, a balcony with laundry.
  windowPane(p, 10, 12, 20, 18, lit);
  windowPane(p, 48, 12, 20, 18, lit);
  windowPane(p, 86, 12, 20, 18, lit && false);
  p.rect(88, 15, 16, 12, '#ffffff');
  p.stroke(88, 15, 16, 12, '#d94b3d');
  p.text(90, 17, 'BED', '#d94b3d', '3x5');
  p.text(89, 23, 'SPACE', '#2b2233', '3x5');
  p.rect(6, 34, 66, 2, '#5a5a66');
  for (let x = 6; x < 72; x += 4) p.vline(x, 34, 8, '#6e6e7a');
  p.hline(6, 41, 66, '#5a5a66');
  p.line(8, 30, 70, 30, '#7a7a86');
  const clothes = ['#d94b3d', '#f2c14e', '#3b6fb6', '#ffffff', '#3a9a6a', '#e58fb0'];
  clothes.forEach((c, i) => {
    const cx = 10 + i * 10;
    p.rect(cx, 31, 7, 6 + (i % 2) * 2, c);
    p.hline(cx, 31, 7, shade(c, 0.3));
    p.vline(cx + 6, 32, 5 + (i % 2) * 2, shade(c, -0.25));
  });
  signboard(p, 6, 46, 104, 16, '#fff4dc', lit, [
    { text: 'BEDSPACE FOR RENT', color: '#d94b3d' },
    { text: 'WIFI READY', color: '#2b2233', font: '3x5' },
  ]);
  // Ground floor: congratulations tarp and a gated door.
  p.rect(4, 68, 108, 44, shade(wall, -0.05));
  p.rect(6, 71, 72, 30, '#fff8ea');
  p.stroke(6, 71, 72, 30, '#d94b3d');
  p.rect(7, 72, 70, 4, '#d94b3d');
  p.textCentered(42, 78, 'CONGRATS!', '#d94b3d', '5x7');
  p.textCentered(42, 87, 'NEW BOARD', '#2b2233', '3x5');
  p.textCentered(42, 93, 'PASSERS', '#2b2233', '3x5');
  p.rect(7, 99, 70, 1, '#f2c14e');
  p.rect(84, 72, 26, 40, '#4b4f5e');
  for (let x = 85; x < 110; x += 3) p.vline(x, 72, 40, '#7d8294');
  for (let y = 75; y < 112; y += 8) p.hline(84, y, 26, '#7d8294');
  p.stroke(83, 71, 28, 41, INK);
  if (lit) p.rect(84, 72, 26, 3, '#ffe08a80');
  shopFrame(p);
  return p;
}

function shopPrint(lit) {
  const p = new Pix(SHOP_W, SHOP_H);
  const wall = '#9cb6c4';
  wallTexture(p, 0, 0, SHOP_W, SHOP_H, wall, 'tiles', 22);
  parapet(p, wall);
  for (const x of [10, 48, 86]) windowPane(p, x, 12, 20, 16, lit && x !== 10);
  signboard(p, 4, 34, 108, 20, '#1f4f9a', lit, [
    { text: 'PRINT • XEROX', color: '#ffffff', shadow: '#0f2a55' },
    { text: 'BIND • LAMINATE', color: '#ffd23a', font: '3x5' },
  ]);
  awning(p, 2, 56, 112, '#2b67c4', '#ffffff');
  // Glass storefront with a copier, paper stacks and a student's thick thesis.
  p.rect(4, 66, 108, 46, '#3a4256');
  const glass = lit ? '#ffe9a8' : '#7d93b8';
  p.rect(6, 68, 66, 40, glass);
  p.line(10, 106, 40, 70, lit ? '#fff4d0' : '#9db0d0');
  p.line(16, 106, 46, 70, lit ? '#fff4d0' : '#90a5c8');
  p.rect(12, 86, 24, 18, '#d8d8e2');
  p.rect(12, 84, 24, 3, '#9c9cab');
  p.rect(16, 92, 12, 2, '#3a3a48');
  p.px(32, 90, '#6cc36a');
  p.stroke(12, 84, 24, 20, INK);
  for (let i = 0; i < 4; i++) p.rect(44, 98 - i * 3, 18, 2, i % 2 ? '#ffffff' : '#f0ecdf');
  p.stroke(44, 89, 18, 11, '#9a9a9a');
  p.rect(48, 80, 14, 6, '#c0392b');
  p.hline(48, 80, 14, '#e05a4b');
  p.stroke(5, 67, 68, 42, INK);
  p.vline(39, 68, 40, '#3a4256');
  p.rect(80, 70, 28, 42, '#6a4a34');
  p.rect(83, 74, 22, 14, glass);
  p.px(102, 92, CREAM);
  p.stroke(80, 70, 28, 42, INK);
  shopFrame(p);
  return p;
}

function shopCarinderia(lit) {
  const p = new Pix(SHOP_W, SHOP_H);
  const wall = '#d7a46e';
  wallTexture(p, 0, 0, SHOP_W, SHOP_H, wall, 'planks', 33);
  parapet(p, '#b97d48');
  for (const x of [14, 50, 86]) windowPane(p, x, 12, 16, 14, lit, '#fff1d6');
  signboard(p, 6, 32, 104, 18, '#c0392b', lit, [
    { text: 'CARINDERIA', color: '#fff4dc', shadow: '#6b1d14' },
  ]);
  p.textCentered(58, 51, 'LUTONG BAHAY', '#6b3a1c', '3x5');
  awning(p, 2, 58, 112, '#d94b3d', '#fff4dc');
  // Turo-turo counter: steel trays with ulam, pots, rice.
  p.rect(4, 68, 108, 44, '#5a3c2c');
  p.rect(6, 70, 104, 26, lit ? '#6e5243' : '#4a3226');
  if (lit) p.hline(6, 70, 104, GLOW);
  p.rect(6, 86, 104, 4, '#c9d1d9');
  p.hline(6, 86, 104, '#ffffff');
  const ulam = ['#7a3b1c', '#e0a02a', '#3a7a2a', '#b84a2a', '#f2e2b4', '#8a5a2a'];
  ulam.forEach((c, i) => {
    const tx = 9 + i * 17;
    p.rect(tx, 80, 14, 6, '#aab3bd');
    p.hline(tx, 80, 14, '#e6ebf0');
    p.rect(tx + 1, 81, 12, 4, c);
    for (let k = 0; k < 4; k++) p.px(tx + 2 + k * 3, 81 + (k % 2), shade(c, 0.35));
  });
  for (const [x, c] of [
    [12, '#8a8f99'],
    [34, '#6b707a'],
  ]) {
    p.rect(x, 72, 12, 7, c);
    p.hline(x - 1, 72, 14, shade(c, 0.3));
    p.px(x + 5, 70, '#ffffff');
  }
  p.rect(86, 72, 18, 7, '#ffffff');
  p.stroke(86, 72, 18, 7, '#c9c9c9');
  p.rect(6, 90, 104, 22, '#7a4a2c');
  for (let x = 6; x < 110; x += 8) p.vline(x, 90, 22, '#6a3e24');
  p.hline(6, 90, 104, '#9a6a44');
  shopFrame(p);
  return p;
}

function shopSariSari(lit) {
  const p = new Pix(SHOP_W, SHOP_H);
  const wall = '#9fbe8c';
  wallTexture(p, 0, 0, SHOP_W, SHOP_H, wall, 'planks', 44);
  // Corrugated roof edge.
  for (let x = 0; x < SHOP_W; x++) p.vline(x, 0, 7, x % 4 < 2 ? '#a9aab5' : '#8a8b96');
  p.hline(0, 7, SHOP_W, '#5f606b');
  windowPane(p, 12, 13, 22, 16, lit, '#f4f0dc');
  windowPane(p, 82, 13, 22, 16, lit, '#f4f0dc');
  signboard(p, 6, 34, 104, 14, '#f2c14e', lit, [{ text: 'SARI-SARI STORE', color: '#2b2233' }]);
  // Store window with a wire grill and hanging snack sachets.
  p.rect(4, 52, 108, 60, shade(wall, -0.1));
  p.rect(8, 54, 70, 40, lit ? '#6d5a3e' : '#3e3328');
  const sachet = ['#d94b3d', '#f2c14e', '#3b6fb6', '#3a9a6a', '#e58fb0', '#ff8a3d'];
  for (let col = 0; col < 8; col++) {
    for (let k = 0; k < 4; k++) {
      const c = sachet[(col + k) % sachet.length];
      p.rect(11 + col * 8, 56 + k * 8, 5, 6, c);
      p.hline(11 + col * 8, 56 + k * 8, 5, shade(c, 0.35));
    }
  }
  for (let x = 8; x < 78; x += 4) p.vline(x, 54, 40, '#9da0aa80');
  for (let y = 54; y < 94; y += 4) p.hline(8, y, 70, '#9da0aa80');
  p.stroke(7, 53, 72, 42, INK);
  p.rect(6, 94, 74, 4, '#8b5a3c');
  p.hline(6, 94, 74, '#b07a4f');
  p.rect(10, 87, 10, 7, '#ffffff');
  p.rect(22, 89, 6, 5, '#f2c14e');
  // "Bawal ang utang" sign joke and a door.
  p.rect(82, 53, 28, 21, '#ffffff');
  p.stroke(82, 53, 28, 21, INK);
  p.text(84, 55, 'BAWAL', '#d94b3d', '3x5');
  p.text(85, 61, 'ANG', '#2b2233', '3x5');
  p.text(84, 67, 'UTANG', '#d94b3d', '3x5');
  p.rect(84, 77, 24, 35, '#6a4a34');
  p.stroke(84, 77, 24, 35, INK);
  p.px(104, 94, CREAM);
  shopFrame(p);
  return p;
}

function shopMilkTea(lit) {
  const p = new Pix(SHOP_W, SHOP_H);
  const wall = '#f0c8c0';
  wallTexture(p, 0, 0, SHOP_W, SHOP_H, wall, 'stucco', 55);
  parapet(p, '#e2a8a0');
  windowPane(p, 14, 12, 26, 16, lit, '#ffffff');
  windowPane(p, 76, 12, 26, 16, lit, '#ffffff');
  // Round sign with a cup.
  if (lit) LIGHTS.push({ x: 30, y: 32, w: 56, h: 16 });
  p.rect(30, 32, 56, 16, lit ? '#a8f0dc' : '#7fd6c0');
  p.stroke(30, 32, 56, 16, INK);
  p.hline(31, 33, 54, '#c9fff0');
  p.text(36, 37, 'MILK TEA', '#2b2233', '5x7');
  awning(p, 2, 52, 112, '#7fd6c0', '#ffffff');
  p.rect(4, 62, 108, 50, '#ffffff');
  p.rect(8, 66, 62, 34, lit ? '#fff2c6' : '#a9c6d6');
  p.line(12, 98, 40, 68, lit ? '#ffffff' : '#c6dbe6');
  // Menu board with cup icons.
  p.rect(14, 70, 24, 16, '#2b2233');
  for (let i = 0; i < 3; i++) {
    p.rect(16 + i * 7, 74, 4, 6, ['#c9a27e', '#7fd6c0', '#e58fb0'][i]);
    p.hline(16 + i * 7, 73, 4, '#ffffff');
    p.px(17 + i * 7, 79, '#2b2233');
  }
  p.text(16, 81, 'MENU', '#ffe08a', '3x5');
  p.rect(44, 84, 22, 6, '#e2a8a0');
  for (const x of [46, 54, 62]) {
    p.rect(x, 78, 4, 6, '#c9a27e');
    p.px(x + 1, 77, '#2b2233');
  }
  p.stroke(7, 65, 64, 36, INK);
  p.rect(78, 66, 28, 46, '#7fd6c0');
  p.rect(81, 70, 22, 22, lit ? '#fff2c6' : '#a9c6d6');
  p.stroke(78, 66, 28, 46, INK);
  for (const x of [12, 30, 48]) {
    p.rect(x, 102, 8, 2, '#8b5a3c');
    p.vline(x + 3, 104, 8, '#5a3c2c');
  }
  shopFrame(p);
  return p;
}

const SHOP_DRAW = {
  dorm: shopDorm,
  print: shopPrint,
  carinderia: shopCarinderia,
  sarisari: shopSariSari,
  milktea: shopMilkTea,
};

// ---- Wires, sidewalk, street -------------------------------------------------------------------------

function wires() {
  const p = new Pix(640, 40);
  const sag = (x, y0, d) => y0 + d * Math.sin((Math.PI * (x % 160)) / 160);
  for (const [y0, d, c] of [
    [2, 8, '#2b2233'],
    [8, 10, '#3a3346'],
    [14, 6, '#2b2233'],
  ]) {
    for (let x = 0; x < 640; x++) p.px(x, sag(x, y0, d), c);
  }
  for (const x of [0, 160, 320, 480]) {
    p.rect(x, 0, 3, 6, '#55505f');
  }
  return p;
}

function banderitas() {
  const colors = ['#d94b3d', '#f2c14e', '#3b6fb6', '#3a9a6a'];
  return sheet(
    colors.map((c) => {
      const p = new Pix(8, 9);
      for (let y = 0; y < 8; y++) {
        const half = Math.floor((8 - y) / 2);
        p.hline(4 - half, y, half * 2, c);
        p.px(4 - half, y, shade(c, 0.3));
      }
      p.hline(0, 0, 8, '#2b2233');
      return p;
    }),
  );
}

function sidewalk() {
  const p = new Pix(640, 18);
  const r = rng(7);
  p.rect(0, 0, 640, 18, '#bdb3a4');
  for (let i = 0; i < 900; i++)
    p.px(Math.floor(r() * 640), Math.floor(r() * 14), r() < 0.5 ? '#b0a696' : '#c8bfb1');
  for (let x = 0; x < 640; x += 20) p.vline(x, 0, 14, '#a39a8b');
  p.hline(0, 0, 640, '#d3cabd');
  p.hline(0, 7, 640, '#a9a091');
  // Curb.
  p.rect(0, 14, 640, 4, '#d9d2c6');
  p.hline(0, 14, 640, '#ece7dd');
  p.hline(0, 17, 640, '#8f877c');
  return p;
}

function street() {
  const p = new Pix(640, 42);
  const r = rng(9);
  p.rect(0, 0, 640, 42, '#4a4453');
  for (let i = 0; i < 2600; i++)
    p.px(Math.floor(r() * 640), Math.floor(r() * 42), r() < 0.5 ? '#433d4c' : '#544e5d');
  p.rect(0, 0, 640, 3, '#3a3542');
  for (let x = 6; x < 640; x += 40) p.rect(x, 27, 22, 2, '#d8d0bd');
  for (let i = 0; i < 6; i++) p.ellipse(40 + i * 110, 36, 6, 1, '#3f3948');
  return p;
}

// ---- Props -------------------------------------------------------------------------------------------

function cartFishball() {
  const p = new Pix(48, 40);
  // Umbrella.
  for (let x = 4; x < 44; x++) {
    const c = Math.floor((x - 4) / 5) % 2 ? '#d94b3d' : '#fff4dc';
    const top = 6 - Math.round(4 * Math.sin((Math.PI * (x - 4)) / 40));
    p.vline(x, top, 9 - top, c);
  }
  p.hline(4, 9, 40, '#a8352a');
  p.vline(23, 10, 12, '#5a5a66');
  // Cart body with a cooking pan and sauce jars.
  p.bevel(6, 22, 36, 11, '#8b5a3c');
  p.rect(10, 18, 18, 4, '#9aa3ad');
  p.hline(10, 18, 18, '#d8dde3');
  for (let i = 0; i < 4; i++) p.disc(13 + i * 4, 19, 1, '#d9a066');
  for (const [x, c] of [
    [31, '#c0392b'],
    [35, '#f2c14e'],
    [39, '#e6e1d3'],
  ]) {
    p.rect(x, 16, 3, 6, c);
    p.px(x + 1, 15, '#2b2233');
  }
  p.hline(8, 27, 32, '#a8754f');
  p.disc(12, 35, 4, '#2b2233');
  p.disc(12, 35, 2, '#8a8f99');
  p.disc(36, 35, 4, '#2b2233');
  p.disc(36, 35, 2, '#8a8f99');
  p.line(42, 24, 47, 20, '#5a3c2c');
  return p;
}

function cartSorbetes() {
  const p = new Pix(40, 34);
  p.bevel(4, 10, 32, 16, '#f2c14e');
  p.rect(5, 15, 30, 3, '#d94b3d');
  p.rect(5, 19, 30, 3, '#3b6fb6');
  for (let i = 0; i < 6; i++) p.px(7 + i * 5, 12, '#e58fb0');
  for (const x of [8, 17, 26]) {
    p.rect(x, 6, 7, 4, '#c9d1d9');
    p.hline(x, 6, 7, '#ffffff');
    p.px(x + 3, 4, '#9aa3ad');
    p.px(x + 3, 5, '#9aa3ad');
  }
  p.disc(36, 6, 2, '#d8b740');
  p.px(36, 9, '#5a5a66');
  p.disc(10, 29, 4, '#2b2233');
  p.disc(10, 29, 2, '#c9d1d9');
  p.disc(30, 29, 4, '#2b2233');
  p.disc(30, 29, 2, '#c9d1d9');
  p.line(0, 12, 4, 14, '#5a3c2c');
  return p;
}

function cartTaho() {
  const p = new Pix(40, 34);
  p.line(2, 8, 38, 8, '#8b5a3c');
  p.hline(2, 7, 36, '#b07a4f');
  for (const x of [4, 24]) {
    p.vline(x + 5, 8, 4, '#5a5a66');
    p.bevel(x, 12, 12, 18, '#c9d1d9', { light: 0.35 });
    p.hline(x, 16, 12, '#9aa3ad');
    p.hline(x, 24, 12, '#9aa3ad');
    p.rect(x - 1, 11, 14, 2, '#e6ebf0');
  }
  return p;
}

function stopSign() {
  const p = new Pix(48, 46);
  p.rect(22, 12, 3, 34, '#6d6d78');
  p.vline(22, 12, 34, '#8a8a96');
  p.bevel(2, 2, 44, 12, '#f2c14e');
  p.textCentered(24, 5, 'SAKAYAN', '#c0392b');
  p.rect(18, 44, 11, 2, '#55505f');
  return p;
}

function streetlight(lit) {
  const p = new Pix(22, 86);
  p.rect(4, 10, 3, 76, '#6d6d78');
  p.vline(4, 10, 76, '#8a8a96');
  p.line(5, 10, 14, 4, '#6d6d78');
  p.rect(12, 3, 9, 4, '#55505f');
  p.rect(13, 7, 7, 2, lit ? GLOW_HOT : '#c9c9c9');
  p.rect(2, 82, 7, 4, '#55505f');
  return p;
}

function tricycle() {
  const p = new Pix(46, 32);
  // Sidecar with a painted roof.
  p.bevel(2, 6, 24, 18, '#3a9a6a');
  p.rect(2, 4, 26, 3, '#d94b3d');
  p.hline(2, 4, 26, '#e86a5a');
  p.rect(5, 9, 12, 8, '#3b4a6b');
  p.hline(5, 9, 12, '#5d6e92');
  p.rect(3, 19, 22, 2, '#f2c14e');
  // Motorcycle and a napping driver.
  p.rect(28, 16, 14, 6, '#2b2233');
  p.rect(34, 12, 6, 4, '#c9d1d9');
  p.line(40, 12, 44, 8, '#8a8a96');
  p.disc(31, 10, 3, '#a46b45');
  p.rect(28, 5, 7, 3, '#3a3a48');
  p.rect(29, 13, 6, 4, '#f2c14e');
  p.disc(9, 27, 4, '#2b2233');
  p.disc(9, 27, 2, '#8a8f99');
  p.disc(38, 27, 4, '#2b2233');
  p.disc(38, 27, 2, '#8a8f99');
  return p;
}

function cat(sleeping) {
  const p = new Pix(16, 12);
  const fur = '#d99a5c';
  if (sleeping) {
    p.ellipse(8, 8, 6, 3, fur);
    p.disc(3, 8, 2, fur);
    p.px(2, 6, fur);
    p.px(4, 6, fur);
    p.hline(6, 7, 5, '#b8783e');
    p.hline(2, 8, 2, '#2b2233');
    p.line(13, 9, 15, 7, fur);
  } else {
    p.ellipse(8, 8, 4, 3, fur);
    p.disc(5, 4, 3, fur);
    p.px(3, 1, fur);
    p.px(7, 1, fur);
    p.px(4, 4, '#2b2233');
    p.px(6, 4, '#2b2233');
    p.line(12, 9, 15, 4, fur);
    p.hline(6, 9, 5, '#b8783e');
  }
  p.outline('#5a3a22');
  return p;
}

function dog() {
  const p = new Pix(22, 12);
  const fur = '#b08a5a';
  p.ellipse(11, 8, 8, 3, fur);
  p.disc(4, 7, 3, fur);
  p.rect(1, 6, 3, 2, shade(fur, -0.2));
  p.px(3, 6, '#2b2233');
  p.hline(8, 6, 8, shade(fur, 0.2));
  p.line(19, 8, 21, 6, fur);
  p.outline('#5a3a22');
  return p;
}

// ---- People ------------------------------------------------------------------------------------------

const SKINS = ['#f5d0b0', '#e8b48f', '#c98e66', '#a46b45', '#7d4e30', '#5a3820'];

/** A 16×24 student: head, hair, shirt, ID lace, legs (walk frame 0–3), accessory by variant. */
function walker(variant, frame) {
  const p = new Pix(16, 24);
  const skin = SKINS[[0, 2, 1, 3, 4, 1][variant]];
  const shirt = ['#ffffff', '#ffffff', '#3b6fb6', '#f2c14e', '#6b2f3a', '#3a9a6a'][variant];
  const pants = ['#2b2a4a', '#ffffff', '#3a3a48', '#2b3a6a', '#3a3a48', '#2b2a4a'][variant];
  const hair = ['#2b2233', '#3a2a22', '#2b2233', '#5a3a22', '#1d1d3a', '#2b2233'][variant];
  // Legs (walk cycle).
  const swing = [0, 1, 0, -1][frame];
  p.rect(6 + swing, 17, 2, 6, pants);
  p.rect(9 - swing, 17, 2, 6, pants);
  p.rect(5 + swing, 22, 3, 2, '#2b2233');
  p.rect(9 - swing, 22, 3, 2, '#2b2233');
  // Body and arms.
  p.rect(5, 10, 7, 8, shirt);
  p.hline(5, 10, 7, shade(shirt, 0.2));
  p.vline(11, 11, 7, shade(shirt, -0.2));
  p.rect(4, 11 - swing * 0, 1, 6, skin);
  p.rect(12, 11, 1, 6, skin);
  // Head and hair.
  p.rect(5, 3, 6, 7, skin);
  p.rect(5, 2, 6, 3, hair);
  p.px(5, 5, hair);
  p.px(10, 5, hair);
  p.px(9, 6, '#2b2233');
  // ID lace.
  p.vline(7, 10, 4, '#d94b3d');
  p.vline(9, 10, 4, '#d94b3d');
  p.rect(7, 14, 3, 3, '#ffffff');
  if (variant === 1) p.rect(5, 2, 6, 2, '#ffffff'); // nursing cap
  if (variant === 2) {
    p.rect(1, 6, 2, 14, '#9a9aa6'); // drafting tube
    p.hline(1, 6, 2, '#c9c9d2');
  }
  if (variant === 3) p.rect(12, 13, 3, 5, '#f2c14e'); // folder
  if (variant === 4) p.rect(2, 11, 3, 6, '#3b6fb6'); // backpack
  p.outline(INK);
  return p;
}

function barker(frame) {
  const p = new Pix(16, 26);
  const skin = '#c98e66';
  p.rect(6, 19, 2, 6, '#3a3a48');
  p.rect(9, 19, 2, 6, '#3a3a48');
  p.rect(5, 11, 7, 9, '#f2c14e');
  p.hline(5, 11, 7, '#f7d77a');
  p.rect(5, 4, 6, 7, skin);
  p.rect(4, 3, 8, 2, '#d94b3d');
  p.hline(4, 5, 9, '#a8352a');
  p.px(9, 7, '#2b2233');
  p.rect(9, 9, 2, 1, '#2b2233');
  // Waving arm: frames go up and down.
  const arm = [
    [12, 8],
    [13, 5],
    [12, 3],
    [13, 5],
  ][frame];
  p.line(12, 12, arm[0], arm[1], skin);
  p.line(12, 13, arm[0], arm[1] + 1, skin);
  p.rect(4, 12, 1, 6, skin);
  p.outline(INK);
  return p;
}

// ---- Jeepneys ----------------------------------------------------------------------------------------

const JEEP_SCHEMES = [
  { body: '#d94b3d', stripe: '#f2c14e', accent: '#3b6fb6' },
  { body: '#f2c14e', stripe: '#d94b3d', accent: '#3a9a6a' },
  { body: '#3b6fb6', stripe: '#ffffff', accent: '#f2c14e' },
  { body: '#3a9a6a', stripe: '#f2c14e', accent: '#d94b3d' },
];

/** An 80×40 jeepney facing left: chrome hood with a horse ornament, painted side, passenger windows. */
function jeepney(scheme, frame) {
  const s = JEEP_SCHEMES[scheme];
  const p = new Pix(80, 40);
  const chrome = '#c9d1d9';
  // Roof and rack.
  p.rect(18, 4, 60, 3, shade(s.body, -0.2));
  p.hline(18, 4, 60, shade(s.body, 0.25));
  for (let x = 20; x < 78; x += 6) p.vline(x, 2, 2, '#55505f');
  p.hline(18, 2, 60, '#55505f');
  // Body.
  p.rect(18, 7, 60, 24, s.body);
  p.hline(18, 7, 60, shade(s.body, 0.25));
  // Windows with passengers.
  for (let i = 0; i < 6; i++) {
    const wx = 22 + i * 9;
    p.rect(wx, 10, 7, 7, '#2e3a55');
    p.hline(wx, 10, 7, '#5d6e92');
    if ((i + scheme) % 3 !== 1) {
      p.disc(wx + 3, 14, 2, SKINS[(i + scheme) % 6]);
      p.rect(wx + 2, 11, 3, 2, '#2b2233');
    }
  }
  // Painted stripes and flourishes.
  p.rect(18, 19, 60, 2, s.stripe);
  p.rect(18, 22, 60, 1, s.accent);
  for (let x = 24; x < 74; x += 10) {
    p.px(x, 25, s.stripe);
    p.px(x + 1, 26, s.stripe);
    p.px(x + 2, 25, s.stripe);
  }
  p.rect(18, 28, 60, 3, chrome);
  p.hline(18, 28, 60, '#ffffff');
  // Hood and grille (front at the left).
  p.rect(4, 13, 16, 15, s.body);
  p.hline(4, 13, 16, shade(s.body, 0.25));
  p.rect(2, 16, 4, 12, chrome);
  for (let y = 17; y < 27; y += 2) p.hline(2, y, 4, '#8a929c');
  p.disc(6, 19, 2, '#fff6c9');
  p.rect(4, 28, 16, 3, chrome);
  // Windshield and the chrome horse on the hood.
  p.rect(14, 8, 6, 6, '#2e3a55');
  p.hline(14, 8, 6, '#6d7ea3');
  p.rect(8, 10, 2, 3, chrome);
  p.rect(7, 9, 2, 2, chrome);
  p.px(10, 10, chrome);
  // Rear entrance.
  p.rect(74, 10, 4, 18, '#2e3a55');
  p.vline(77, 8, 22, chrome);
  // Wheels (two frames: hubcap spokes rotate).
  for (const wx of [16, 62]) {
    p.disc(wx, 33, 6, '#1f1b26');
    p.disc(wx, 33, 3, '#8a929c');
    if (frame === 0) {
      p.hline(wx - 2, 33, 5, '#5a5f6a');
    } else {
      p.vline(wx, 31, 5, '#5a5f6a');
    }
  }
  p.outline(INK);
  return p;
}

/** The yellow route board above a parked jeepney (route text is drawn by the game). */
function routeBoard() {
  const p = new Pix(112, 12);
  p.bevel(0, 0, 112, 12, '#f2c14e');
  p.px(2, 2, '#9aa3ad');
  p.px(109, 2, '#9aa3ad');
  return p;
}

// ---- Export ------------------------------------------------------------------------------------------

export function landingAssets() {
  const out = [];
  for (const phase of ['umaga', 'tanghali', 'hapon', 'gabi']) {
    out.push({ key: `sky_${phase}`, pix: sky(phase) });
    out.push({ key: `city_far_${phase}`, pix: cityFar(phase) });
  }
  out.push({ key: 'cloud_1', pix: cloud(1, 46) });
  out.push({ key: 'cloud_2', pix: cloud(2, 34) });
  out.push({ key: 'cloud_3', pix: cloud(3, 58) });
  out.push({ key: 'lrt_track', pix: lrtTrack() });
  out.push({
    key: 'lrt_train',
    pix: sheet([lrtTrain(false), nightify(lrtTrain(true))]),
    frame: [220, 24],
  });
  for (const [key, draw] of Object.entries(SHOP_DRAW)) {
    // Frames: 0 lights off, 1 lights on (dusk), 2 night (darkened walls, lights on).
    LIGHTS = [];
    const lit = draw(true);
    const night = nightify(lit, LIGHTS);
    out.push({
      key: `shop_${key}`,
      pix: sheet([draw(false), lit, night]),
      frame: [SHOP_W, SHOP_H],
    });
  }
  out.push({ key: 'wires', pix: wires() });
  out.push({ key: 'banderita', pix: banderitas(), frame: [8, 9] });
  out.push({ key: 'sidewalk', pix: sidewalk() });
  out.push({ key: 'street', pix: street() });
  out.push({ key: 'cart_fishball', pix: cartFishball() });
  out.push({ key: 'cart_sorbetes', pix: cartSorbetes() });
  out.push({ key: 'cart_taho', pix: cartTaho() });
  out.push({ key: 'stop_sign', pix: stopSign() });
  out.push({
    key: 'streetlight',
    pix: sheet([streetlight(false), streetlight(true)]),
    frame: [22, 86],
  });
  out.push({ key: 'tricycle', pix: tricycle() });
  out.push({ key: 'cat', pix: sheet([cat(false), cat(true)]), frame: [16, 12] });
  out.push({ key: 'dog', pix: dog() });
  out.push({ key: 'barker', pix: sheet([0, 1, 2, 3].map((f) => barker(f))), frame: [16, 26] });
  for (let v = 0; v < 6; v++) {
    out.push({
      key: `walker_${v + 1}`,
      pix: sheet([0, 1, 2, 3].map((f) => walker(v, f))),
      frame: [16, 24],
    });
  }
  for (let s = 0; s < 4; s++) {
    out.push({ key: `jeep_${s + 1}`, pix: sheet([jeepney(s, 0), jeepney(s, 1)]), frame: [80, 40] });
  }
  out.push({ key: 'jeep_board', pix: routeBoard() });
  return out;
}

export { mix };
