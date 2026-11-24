// Lagoon storefronts (owner request, L6): the main play screen shows one stall at a time, 512×220, drawn
// from the owner's photos without tracing. Two looks:
//   kiosk — a red kiosk: food-photo banners on top, a printed promo sign taped to the wall, a lit glass case
//           with steel trays, a TOYO jug, a red front where the game writes the stall's name;
//   row   — the stall row: a concrete overhang, a menu board and a black name board, the shop behind,
//           a table with a green floral cloth, big juice dispensers, wooden crates, a tree with roots.
// Layout points (food, name, steam) come from src/minigames/pup-lagoon/data/storefronts.json, so the game's
// price tags and name land in the right places. No real stall names, menus or brands (SPEC-pup-lagoon §15).
import { readFileSync } from 'node:fs';
import { Pix, mix, shade } from './pix.mjs';
import { foodPix } from './lagoon-food.mjs';
import { INK, LOOKS, blitScaled, canopy, hash, person } from './lagoon-common.mjs';

const LAYOUT = JSON.parse(
  readFileSync(
    new URL('../../src/minigames/pup-lagoon/data/storefronts.json', import.meta.url),
    'utf8',
  ),
);
export const FRONT_W = 512;
export const FRONT_H = 220;

/** Menu items per stall, in data/menu.ts order (checked by tests/unit/art/packs.test.ts). */
export const STALL_ITEMS = {
  karinderya: [
    'adobo_meal',
    'curry_meal',
    'teriyaki_meal',
    'chopsuey_meal',
    'liempo_meal',
    'tonkatsu_meal',
  ],
  tusok: ['fishball', 'kikiam', 'squidball', 'tokneneng', 'kwekkwek', 'fewa'],
  palamig: ['gulaman', 'melon', 'buko', 'softdrinks', 'water_bottle', 'iced_coffee'],
  ihaw: ['betamax', 'isaw', 'hotdog_stick', 'bbq', 'mais', 'bbq_rice'],
  merienda: ['pandesal', 'turon', 'kamotecue', 'puto', 'bananacue', 'siopao'],
  lugawan: ['lugaw', 'tokwa', 'lugaw_egg', 'goto', 'mami'],
  halohalo: ['icecandy', 'iskrambol', 'lecheflan', 'maiscon', 'halohalo'],
  silog: ['hotsilog', 'longsilog', 'tapsilog', 'sisig_rice'],
  water: ['tumbler_water'],
};

// ---- Small props -------------------------------------------------------------------------------------

function food(p, key, cx, cy, s = 2) {
  const f = foodPix(key);
  blitScaled(p, f, cx - (f.w * s) / 2, cy - (f.h * s) / 2, s);
}

function tray(p, cx, y, w) {
  p.rect(cx - w / 2, y, w, 4, '#c9d1d9');
  p.hline(cx - w / 2, y, w, '#eef2f6');
  p.hline(cx - w / 2, y + 3, w, '#8a929c');
}

function vendor(p, x, y, look, apron = '#ffffff') {
  const v = new Pix(20, 28);
  person(v, 10, 27, { ...look, arm: 2 });
  v.rect(7, 16, 6, 6, apron);
  v.px(9, 17, '#d8d2c4');
  v.outline(INK);
  blitScaled(p, v, x, y, 3);
}

function tape(p, x, y) {
  p.rect(x - 4, y - 2, 9, 4, '#f2e6a8c0');
}

function printedSign(p, x, y, w, h) {
  p.rect(x + 2, y + 2, w, h, '#00000030');
  p.rect(x, y, w, h, '#fbfaf6');
  p.hline(x, y + h - 1, w, '#e0ddd4');
  tape(p, x + 6, y + 1);
  tape(p, x + w - 6, y + 1);
}

function photoBanner(p, x, y, w, h, keys, seed) {
  p.rect(x, y, w, h, '#2b2233');
  const bg = ['#f2c14e', '#e8a33a', '#f08a3c', '#d9603a'];
  const tiles = keys.length;
  const tw = Math.floor((w - 4) / tiles);
  keys.forEach((k, i) => {
    const tx = x + 2 + i * tw;
    p.vgrad(tx, y + 2, tw - 1, h - 10, [bg[(i + seed) % 4], shade(bg[(i + seed) % 4], -0.25)]);
    food(p, k, tx + tw / 2, y + 2 + (h - 10) / 2, 1);
  });
  p.rect(x + 2, y + h - 8, w - 4, 6, '#c0392b');
  for (let k = 0; k < 5; k++)
    p.hline(x + 6 + k * Math.floor(w / 5), y + h - 6, Math.floor(w / 8), '#fff4dc');
}

function toyoJug(p, x, y) {
  // Big condiment jug with a red lid and a hand-written TOYO label (photo detail).
  p.rect(x, y + 6, 26, 32, '#3e2416');
  p.rect(x + 1, y + 6, 4, 32, '#5a3a22');
  p.rect(x - 1, y, 28, 7, '#d22f2a');
  p.hline(x - 1, y, 28, '#e8604a');
  p.rect(x + 3, y + 12, 20, 9, '#f4f1ea');
  p.text(x + 4, y + 14, 'TOYO', INK, '3x5');
  p.outline(INK);
}

function blueTub(p, x, y) {
  p.rect(x, y + 5, 18, 18, '#efe6cc');
  p.rect(x - 1, y, 20, 6, '#3b6fb6');
  p.hline(x - 1, y, 20, '#6d9ad6');
  p.rect(x + 3, y + 10, 12, 6, '#ffffff');
}

function waterBottles(p, x, y, n) {
  for (let k = 0; k < n; k++) {
    const bx = x + k * 9;
    p.rect(bx, y + 6, 7, 22, '#cfe8f4');
    p.rect(bx + 1, y + 2, 5, 4, '#cfe8f4');
    p.rect(bx + 1, y, 5, 2, '#3b6fb6');
    p.rect(bx, y + 14, 7, 5, '#3b6fb6');
    p.vline(bx + 1, y + 6, 20, '#ffffff');
  }
}

function cupStack(p, x, y, h = 30) {
  for (let k = 0; k < h; k += 2) p.hline(x, y + k, 12, k % 4 ? '#e8f2f6' : '#d8e2e6');
  p.vline(x + 2, y, h, '#ffffff');
}

function plasticBags(p, x, y) {
  p.vline(x + 6, y - 6, 6, '#8a8494');
  for (let k = 0; k < 3; k++) {
    p.rect(x + k * 2, y + k * 3, 14, 24 - k * 2, k % 2 ? '#f4f1ea' : '#ffffff');
    p.vline(x + k * 2, y + k * 3, 24 - k * 2, '#d8d2c4');
  }
}

function crate(p, x, y, w, h, kind = 'wood') {
  if (kind === 'foam') {
    p.rect(x, y, w, h, '#f4f1ea');
    p.rect(x, y, w, 5, '#ffffff');
    p.stroke(x, y, w, h, '#c9c4b6');
    p.hline(x, y + 5, w, '#d8d2c4');
    return;
  }
  p.rect(x, y, w, h, '#e3cc8c');
  for (let yy = y + 4; yy < y + h; yy += 7) p.hline(x, yy, w, '#b89a5a');
  p.vline(x + 2, y, h, '#c9ad6a');
  p.vline(x + w - 3, y, h, '#c9ad6a');
  p.stroke(x, y, w, h, '#8a6a3a');
}

/** Big plastic juice dispenser with a lid, a tap and a blue diamond label (photo detail). */
function dispenser(p, x, y, w, h, juice, lid) {
  p.rect(x + 2, y + 2, w, h, '#00000025');
  p.rect(x, y, w, h, '#e8f2f6');
  p.rect(x + 2, y + 10, w - 4, h - 14, juice);
  p.rect(x + 2, y + 10, w - 4, 3, shade(juice, 0.25));
  for (let k = 0; k < 5; k++)
    p.rect(x + 4 + ((k * 7) % (w - 10)), y + 14 + ((k * 5) % 10), 4, 3, '#ffffffa0');
  p.rect(x - 1, y, w + 2, 7, lid);
  p.hline(x - 1, y, w + 2, shade(lid, 0.3));
  // Blue diamond label.
  const cx = x + w / 2;
  const cy = y + h / 2 + 4;
  for (let k = 0; k < 9; k++) p.hline(cx - k, cy - 9 + k, k * 2 + 1, '#2f8fd8');
  for (let k = 0; k < 9; k++) p.hline(cx - (8 - k), cy + k, (8 - k) * 2 + 1, '#2f8fd8');
  p.hline(cx - 4, cy - 1, 9, '#ffffff');
  p.hline(cx - 3, cy + 1, 7, '#ffffff');
  // Tap.
  p.rect(cx - 2, y + h - 4, 5, 4, '#f4f1ea');
  p.rect(cx - 1, y + h, 3, 3, '#d22f2a');
  p.vline(x + 1, y, h, '#ffffff');
}

function pot(p, x, y, w, h) {
  p.rect(x, y, w, h, '#a9b1ba');
  p.vline(x + 2, y, h, '#d6dde3');
  p.vline(x + w - 3, y, h, '#7d858e');
  p.ellipse(x + w / 2, y, w / 2, 4, '#efe6cc');
  p.ellipse(x + w / 2, y, w / 2 - 2, 2, '#f7f0dc');
  p.rect(x - 3, y + 6, 3, 4, '#55505f');
  p.rect(x + w, y + 6, 3, 4, '#55505f');
  p.line(x + w - 6, y - 2, x + w + 6, y - 18, '#8a929c');
}

function burner(p, x, y, w) {
  p.rect(x, y, w, 8, '#2b2233');
  for (let k = 4; k < w - 4; k += 6) p.px(x + k, y + 2, '#3b6fb6');
}

function grill(p, x, y, w) {
  p.rect(x, y, w, 12, '#2b2233');
  p.rect(x + 2, y + 2, w - 4, 6, '#55505f');
  for (let k = x + 3; k < x + w - 3; k += 2)
    p.px(k, y + 4 + (k % 3 === 0 ? 1 : 0), hash(k, 3) < 0.5 ? '#f08a3c' : '#d94b3d');
  for (let k = x + 2; k < x + w - 2; k += 4) p.vline(k, y + 1, 7, '#8a929c');
  p.rect(x + 6, y + 12, 3, 30, '#55505f');
  p.rect(x + w - 9, y + 12, 3, 30, '#55505f');
}

function wok(p, cx, y, r) {
  p.ellipse(cx, y + 4, r + 2, 7, '#2b2233');
  p.ellipse(cx, y + 2, r, 5, '#d9a441');
  p.ellipse(cx - 2, y + 1, r - 6, 3, '#f2c14e');
  for (let k = 0; k < 9; k++)
    p.disc(
      cx - r + 6 + ((k * 13) % (r * 2 - 10)),
      y + 1 + (k % 3) - 1,
      2,
      ['#d8b07a', '#f08a3c', '#8a5a3a'][k % 3],
    );
  p.rect(cx - r - 6, y + 2, 6, 2, '#2b2233');
}

function sawsawan(p, x, y) {
  [
    ['#8a4a22', 'Matamis'],
    ['#d94b3d', 'Maanghang'],
    ['#efe6cc', 'Suka'],
  ].forEach(([c], i) => {
    const jx = x + i * 16;
    p.rect(jx, y + 4, 13, 14, '#e8f2f6');
    p.rect(jx + 1, y + 7, 11, 10, c);
    p.rect(jx, y + 2, 13, 3, '#c9d1d9');
    p.line(jx + 10, y - 4, jx + 7, y + 8, '#8a929c');
  });
}

function steamer(p, x, y) {
  for (let k = 0; k < 3; k++) {
    p.rect(x, y + k * 12, 40, 11, '#c9d1d9');
    p.hline(x, y + k * 12, 40, '#eef2f6');
    p.hline(x, y + k * 12 + 10, 40, '#8a929c');
  }
  p.ellipse(x + 20, y - 2, 20, 4, '#d6dde3');
  p.rect(x + 16, y - 6, 8, 4, '#8a929c');
}

function treeTrunk(p, x) {
  p.rect(x, 0, 34, 206, '#6b5440');
  for (let y = 0; y < 206; y += 5) p.hline(x + (y % 3) * 3, y, 8, '#5a4636');
  p.vline(x + 4, 0, 206, '#7d6650');
  p.vline(x + 30, 0, 206, '#4a3a2e');
  // Roots spreading over the sidewalk.
  for (const [dx, len] of [
    [-18, 30],
    [2, 18],
    [24, 34],
    [40, 22],
  ])
    p.line(x + 16, 200, x + 16 + dx + len / 2, 214, '#5a4636');
  canopy(p, x + 16, -6, 40, x + 3, '#3f7d3a');
}

function fridge(p, x, y) {
  p.rect(x, y, 44, 80, '#eef2f6');
  p.stroke(x, y, 44, 80, '#8a929c');
  p.rect(x + 4, y + 6, 36, 60, '#a6d2ea');
  for (let r = 0; r < 3; r++) {
    p.hline(x + 4, y + 24 + r * 18, 36, '#8a929c');
    for (let k = 0; k < 5; k++)
      p.rect(
        x + 6 + k * 7,
        y + 12 + r * 18,
        5,
        11,
        ['#d94b3d', '#f2c14e', '#3b6fb6', '#3a9a6a', '#e98ab0'][(k + r) % 5],
      );
  }
  p.rect(x + 38, y + 30, 2, 12, '#55505f');
}

function poster(p, x, y, w, h, c1, c2) {
  p.rect(x, y, w, h, c1);
  p.rect(x + 3, y + 3, w - 6, h / 2, c2);
  for (let k = 0; k < 3; k++) p.hline(x + 4, y + h / 2 + 6 + k * 4, w - 10, '#ffffffb0');
}

// ---- Two looks -------------------------------------------------------------------------------------------

function kioskBase(p, key, layout) {
  // Wall, ceiling, banners, sign, glass case, counter, red front.
  p.rect(0, 0, FRONT_W, 160, '#e6e1d8');
  for (let y = 8; y < 160; y += 16) p.hline(0, y, FRONT_W, '#d8d3c8');
  for (let x = 0; x < FRONT_W; x += 16) p.vline(x, 0, 160, '#ddd8cd');
  p.rect(0, 0, FRONT_W, 4, '#55505f');
  const items = STALL_ITEMS[key];
  const bannerKeys = [...items, ...items];
  for (let b = 0; b < 4; b++)
    photoBanner(p, 8 + b * 126, 4, 120, 34, bannerKeys.slice(b * 2, b * 2 + 2), b);
  const s = layout.sign;
  printedSign(p, s.x, s.y, s.w, s.h);
  plasticBags(p, 6, 46);
  vendor(p, layout.vendor[0], layout.vendor[1], LOOKS[1]);
  // Glass case: red frame, fluorescent tube, an upper shelf of extra trays, the main shelf.
  const cx0 = 196;
  const cw = 312;
  p.rect(cx0, 50, cw, 100, '#c0392b');
  p.rect(cx0 + 4, 54, cw - 8, 92, '#eef6f8');
  p.rect(cx0 + 8, 56, cw - 16, 3, '#ffffff');
  p.rect(cx0 + 8, 59, cw - 16, 6, '#fffbe0a0');
  p.hline(cx0 + 4, 82, cw - 8, '#c9d1d9');
  for (let k = 0; k < 6; k++) {
    const tx = cx0 + 26 + k * 50;
    tray(p, tx, 78, 34);
    food(p, items[k % items.length], tx, 70, 1);
  }
  // Reflections on the glass.
  for (let k = 0; k < 4; k++) p.line(cx0 + 30 + k * 80, 140, cx0 + 60 + k * 80, 88, '#ffffff70');
  return () => {
    // Called after the food: steel trays under each item, the counter ledge and the red front.
    for (const [x] of layout.items) tray(p, x, 142, 46);
    p.rect(cx0, 146, cw, 4, '#c0392b');
    p.rect(0, 150, FRONT_W, 10, '#55505f');
    p.hline(0, 150, FRONT_W, '#8a8494');
    p.rect(0, 160, FRONT_W, 60, '#d22f2a');
    p.hline(0, 160, FRONT_W, '#e8604a');
    p.rect(0, 214, FRONT_W, 6, '#a8221e');
    for (let x = 0; x < FRONT_W; x += 64) p.vline(x, 162, 52, '#c02a26');
  };
}

function rowBase(p, key, layout, { tree = false } = {}) {
  // Sidewalk, shop interior, overhang, boards, table and cloth.
  p.rect(0, 0, FRONT_W, FRONT_H, '#4a4238');
  // Interior: shelves, posters, a fridge, a stand fan.
  for (const y of [52, 84]) {
    p.rect(60, y, 200, 3, '#8a6a4a');
    for (let k = 0; k < 14; k++)
      p.rect(
        64 + k * 14,
        y - 10,
        10,
        10,
        ['#d94b3d', '#f2c14e', '#efe6cc', '#3a9a6a', '#3b6fb6'][(k + y) % 5],
      );
  }
  fridge(p, 270, 40);
  poster(p, 326, 70, 30, 38, '#f2c14e', '#d94b3d');
  // Concrete overhang and its underside.
  p.rect(0, 0, FRONT_W, 18, '#d4cfc4');
  p.hline(0, 0, FRONT_W, '#e8e4da');
  p.hline(0, 17, FRONT_W, '#a49e92');
  p.rect(0, 18, FRONT_W, 8, '#7a746a');
  for (let x = 0; x < FRONT_W; x += 48) p.rect(x, 18, 6, 8, '#6a645a');
  p.rect(0, 26, FRONT_W, 2, '#00000040');
  p.hline(0, 9, FRONT_W, '#c4bfb4');
  // Menu board (photos of the food) and the black name board (name written by the game).
  const items = STALL_ITEMS[key];
  p.rect(64, 28, 200, 44, '#f4f1ea');
  p.stroke(64, 28, 200, 44, '#8a6a4a');
  p.rect(66, 30, 196, 9, '#8a2b2b');
  for (let k = 0; k < 5; k++) p.hline(70 + k * 38, 33, 24, '#fff4dc');
  items.slice(0, 6).forEach((k, i) => {
    food(p, k, 80 + i * 32, 54, 1);
    p.hline(70 + i * 32, 66, 20, '#8a8494');
  });
  p.rect(288, 24, 196, 40, '#1f1b26');
  p.stroke(290, 26, 192, 36, '#f2c14e');
  p.rect(292, 22, 4, 4, '#8a929c');
  p.rect(476, 22, 4, 4, '#8a929c');
  if (tree) treeTrunk(p, 0);
  else {
    p.rect(0, 28, 52, 178, '#e8e4da');
    for (let y = 34; y < 206; y += 12) p.hline(0, y, 52, '#d8d3c8');
  }
  vendor(p, layout.vendor[0], layout.vendor[1], LOOKS[(key.length * 2) % 6], '#f2c14e');
  return () => {
    // After the food: table top, green floral cloth, crates and the sidewalk.
    p.rect(52, 150, 460, 4, '#f4f1ea');
    p.hline(52, 150, 460, '#ffffff');
    p.rect(52, 154, 460, 44, '#6fa65a');
    for (let y = 156; y < 198; y += 6)
      for (let x = 52 + ((y / 6) % 2) * 6; x < 512; x += 12) {
        p.px(x, y, '#f2f0e0');
        p.px(x + 1, y, '#e98ab0');
        p.px(x, y + 1, '#f2f0e0');
      }
    for (let x = 52; x < 512; x += 8) p.ellipse(x + 4, 198, 4, 2, '#5e9450');
    p.rect(0, 200, FRONT_W, 20, '#bdb8ac');
    for (let x = 0; x < FRONT_W; x += 40) p.vline(x + (x % 3), 200, 20, '#a9a49a');
    for (let k = 0; k < 10; k++)
      p.px(Math.floor(hash(k, 77) * 512), 204 + Math.floor(hash(k, 78) * 14), '#7a9a4a');
    crate(p, 60, 176, 56, 30);
    crate(p, 120, 182, 46, 24, 'foam');
    crate(p, 440, 178, 64, 28);
  };
}

// ---- The stalls ------------------------------------------------------------------------------------------

const PROPS = {
  karinderya: (p) => {
    toyoJug(p, 16, 112);
    blueTub(p, 48, 128);
    cupStack(p, 72, 118);
    waterBottles(p, 92, 122, 3);
    // Bread display (photo detail).
    p.rect(124, 120, 64, 28, '#c0392b');
    p.rect(127, 123, 58, 22, '#eef6f8');
    for (let k = 0; k < 6; k++) p.ellipse(133 + k * 9, 138, 4, 3, '#c98a4a');
  },
  silog: (p) => {
    toyoJug(p, 16, 112);
    blueTub(p, 48, 128);
    cupStack(p, 72, 118);
    // Sizzling plates stacked and a rice pot.
    for (let k = 0; k < 4; k++) p.rect(100, 140 - k * 4, 36, 3, '#2b2233');
    pot(p, 144, 116, 40, 32);
  },
  halohalo: (p) => {
    // Ice shaver and jars of halo-halo toppings.
    p.rect(14, 96, 36, 52, '#3b6fb6');
    p.rect(18, 100, 28, 14, '#c9d1d9');
    p.rect(24, 114, 16, 14, '#eef6f8');
    p.rect(22, 128, 20, 4, '#8a929c');
    ['#8a5ab8', '#f2c14e', '#e98ab0', '#3a9a6a', '#d94b3d', '#c98a4a'].forEach((c, i) => {
      const x = 60 + (i % 3) * 22;
      const y = 104 + Math.floor(i / 3) * 24;
      p.rect(x, y, 18, 20, '#e8f2f6');
      p.rect(x + 2, y + 6, 14, 12, c);
      p.rect(x, y, 18, 4, '#d94b3d');
    });
    cupStack(p, 134, 118);
    cupStack(p, 150, 118);
  },
  palamig: (p) => {
    ['#8a5a2a', '#c9e8a6', '#eef4ee', '#d94b3d', '#f08a3c'].forEach((c, i) =>
      dispenser(p, 100 + i * 66, 66, 56, 62, c, i % 2 ? '#f2c14e' : '#d94b3d'),
    );
    cupStack(p, 460, 112, 36);
    cupStack(p, 476, 116, 32);
  },
  merienda: (p) => {
    p.ellipse(84, 140, 26, 8, '#b8925a');
    for (let k = 0; k < 7; k++) p.ellipse(68 + k * 6, 134 - (k % 2) * 3, 5, 4, '#c98a4a');
    p.rect(150, 132, 84, 4, '#5e9c48');
    steamer(p, 390, 86);
    p.rect(250, 130, 60, 6, '#3a9a6a');
  },
  lugawan: (p) => {
    burner(p, 58, 142, 64);
    pot(p, 62, 96, 54, 46);
    for (let k = 0; k < 6; k++) p.rect(436, 140 - k * 4, 30, 3, k % 2 ? '#f4f1ea' : '#e3ddd0');
    // Calamansi and patis.
    for (let k = 0; k < 5; k++)
      p.disc(470 + (k % 3) * 6, 140 - Math.floor(k / 3) * 5, 2, '#5e9c48');
    p.rect(490, 116, 8, 30, '#c98a2a');
    p.rect(491, 112, 6, 4, '#d22f2a');
  },
  ihaw: (p) => {
    grill(p, 90, 100, 300);
    // Styrofoam cooler with raw skewers, a hand fan (pamaypay).
    crate(p, 400, 104, 44, 44, 'foam');
    for (let k = 0; k < 5; k++) p.line(406 + k * 7, 110, 410 + k * 7, 100, '#c9a26a');
    p.ellipse(470, 120, 12, 14, '#d9c08a');
    for (let k = -10; k < 11; k += 3) p.line(470, 120, 470 + k, 108, '#b89a5a');
    p.line(470, 134, 470, 146, '#8a6a3a');
  },
  tusok: (p) => {
    wok(p, 216, 100, 46);
    sawsawan(p, 452, 124);
    // FEWA poster: black board with big letters and the food (photo detail).
    p.rect(440, 66, 64, 54, '#1f1b26');
    p.stroke(442, 68, 60, 50, '#f2c14e');
    const big = new Pix(24, 7);
    big.text(0, 0, 'FEWA', '#f2c14e', '5x7');
    blitScaled(p, big, 448, 72, 2);
    food(p, 'fewa', 472, 102, 1);
    cupStack(p, 66, 116);
  },
};

function waterFront(p) {
  p.vgrad(0, 0, FRONT_W, 120, ['#bfe0f7', '#e6f2f8']);
  for (let x = -20; x < FRONT_W + 40; x += 46) canopy(p, x, 24, 30, x + 7, '#4f8a3c');
  p.rect(0, 120, FRONT_W, 100, '#d9d5c8');
  for (let y = 126; y < 220; y += 12) p.hline(0, y, FRONT_W, '#cbc6b8');
  // The refill station: a blue cabinet with a big gallon and two taps.
  p.rect(206, 70, 100, 130, '#3b6fb6');
  p.rect(206, 70, 100, 6, '#6d9ad6');
  p.rect(222, 20, 68, 52, '#a6d2ea');
  p.rect(226, 24, 6, 44, '#d6ecf8');
  p.rect(246, 14, 20, 8, '#3b6fb6');
  p.rect(222, 96, 68, 46, '#2f5a94');
  for (const tx of [236, 272]) {
    p.rect(tx, 100, 6, 10, '#c9d1d9');
    p.rect(tx + 1, 110, 4, 4, '#d94b3d');
  }
  p.rect(222, 150, 68, 6, '#c9d1d9');
  treeTrunk(p, 440);
  p.rect(30, 170, 120, 8, '#8b5a3c');
  p.rect(36, 178, 4, 20, '#55505f');
  p.rect(140, 178, 4, 20, '#55505f');
}

export function storefront(key) {
  const layout = LAYOUT[key];
  const p = new Pix(FRONT_W, FRONT_H);
  let finish = () => undefined;
  if (layout.style === 'kiosk') finish = kioskBase(p, key, layout);
  else if (layout.style === 'row')
    finish = rowBase(p, key, layout, { tree: key === 'palamig' || key === 'tusok' });
  else waterFront(p);
  if (PROPS[key]) PROPS[key](p);
  const items = STALL_ITEMS[key];
  if (layout.items.length !== items.length)
    throw new Error(`storefronts.json: ${key} has ${items.length} items`);
  items.forEach((k, i) => food(p, k, layout.items[i][0], layout.items[i][1], 2));
  finish();
  return p;
}

export function storefrontAssets() {
  return Object.keys(STALL_ITEMS).map((key) => ({ key: `front_${key}`, pix: storefront(key) }));
}

export { mix };
