// Lagoon Merienda food icons (SPEC-pup-lagoon §11 food_<itemKey>), 24×24, drawn bright and a little
// oversized so they read at small sizes. Built from a few shapes (plate, skewer, cup, bowl, glass, bun)
// with per-item colours. Original art (DECISIONS R-006).
import { Pix, shade } from './pix.mjs';

const INK = '#2b2233';
const S = 24;

function plate(p, cx = 12, cy = 15) {
  p.ellipse(cx, cy + 1, 10, 5, '#00000030');
  p.ellipse(cx, cy, 10, 5, '#f4f1ea');
  p.ellipse(cx, cy, 8, 3, '#e3ddd0');
}

function rice(p, cx, cy) {
  p.ellipse(cx, cy, 4, 3, '#ffffff');
  p.px(cx - 2, cy - 1, '#e8e4da');
  p.px(cx + 1, cy - 2, '#e8e4da');
  p.px(cx - 1, cy + 1, '#e8e4da');
}

function egg(p, cx, cy) {
  p.ellipse(cx, cy, 3, 2, '#ffffff');
  p.disc(cx, cy, 1, '#f2b33d');
}

/** Rice meal: plate, rice on the left, ulam on the right. */
function meal(ulam) {
  const p = new Pix(S, S);
  plate(p);
  rice(p, 8, 13);
  ulam(p, 15, 13);
  p.outline(INK);
  return p;
}

const chunks =
  (c, n = 4) =>
  (p, cx, cy) => {
    for (let i = 0; i < n; i++) {
      const x = cx - 3 + (i % 2) * 3 + (i > 1 ? 1 : 0);
      const y = cy - 2 + Math.floor(i / 2) * 2;
      p.rect(x, y, 3, 2, c);
      p.px(x, y, shade(c, 0.3));
    }
  };

const sauce = (c, bits) => (p, cx, cy) => {
  p.ellipse(cx, cy + 1, 4, 3, shade(c, -0.15));
  chunks(bits, 3)(p, cx, cy);
};

/** A skewer with pieces along a diagonal stick. */
function skewer(pieces, { stick = '#c9a26a', size = 2, gap = 5 } = {}) {
  const p = new Pix(S, S);
  p.line(4, 21, 20, 3, stick);
  pieces.forEach((c, i) => {
    const x = 7 + i * gap * 0.8;
    const y = 17 - i * gap * 0.9;
    p.disc(Math.round(x), Math.round(y), size, c);
    p.px(Math.round(x) - 1, Math.round(y) - 1, shade(c, 0.35));
  });
  p.outline(INK);
  return p;
}

/** A plastic cup with a straw (palamig style). */
function cup(liquid, { bits = null, straw = '#d94b3d', top = null } = {}) {
  const p = new Pix(S, S);
  for (let y = 6; y < 21; y++) {
    const half = 5 - Math.floor((y - 6) / 5);
    p.hline(12 - half, y, half * 2 + 1, y < 8 ? '#e8f2f6' : liquid);
  }
  if (top) p.hline(8, 8, 9, top);
  if (bits)
    for (const [x, y] of [
      [10, 12],
      [13, 15],
      [11, 17],
      [14, 11],
    ])
      p.rect(x, y, 2, 2, bits);
  p.vline(9, 9, 11, '#ffffff60');
  p.line(14, 7, 17, 1, straw);
  p.line(15, 7, 18, 1, straw);
  p.outline(INK);
  return p;
}

function bowl(soup, topping) {
  const p = new Pix(S, S);
  p.ellipse(12, 18, 9, 3, '#00000030');
  for (let y = 11; y < 19; y++) {
    const half = 9 - Math.floor(((y - 11) * (y - 11)) / 9);
    p.hline(12 - half, y, half * 2 + 1, '#f4f1ea');
  }
  p.hline(5, 17, 15, '#d8d2c4');
  p.ellipse(12, 11, 8, 2, soup);
  p.px(9, 10, shade(soup, 0.3));
  topping(p);
  p.hline(4, 13, 17, '#3b6fb6');
  p.outline(INK);
  return p;
}

function glass(layers, top) {
  const p = new Pix(S, S);
  p.rect(7, 6, 10, 15, '#e8f2f6');
  layers.forEach(([c, h], i) => {
    const y = 20 - layers.slice(0, i + 1).reduce((s, [, hh]) => s + hh, 0);
    p.rect(8, y + 1, 8, h, c);
  });
  p.vline(8, 7, 13, '#ffffff70');
  top(p);
  p.rect(6, 21, 12, 1, '#c9d1d9');
  p.outline(INK);
  return p;
}

// ---- Items ----------------------------------------------------------------------------------------

function fewa() {
  // Footlong + egg wrapped around, in a bun: the Lagoon favourite.
  const p = new Pix(S, S);
  p.ellipse(12, 15, 11, 5, '#d9a05a');
  p.ellipse(12, 14, 10, 3, '#e9b872');
  p.rect(1, 11, 22, 3, '#c0392b');
  p.px(1, 11, '#a93226');
  p.px(22, 13, '#a93226');
  p.rect(4, 9, 16, 5, '#f7d046');
  for (let x = 5; x < 19; x += 3) p.vline(x, 9, 5, '#e8b923');
  p.hline(4, 9, 16, '#fbe27a');
  p.line(5, 8, 18, 8, '#d94b3d');
  p.px(8, 7, '#d94b3d');
  p.px(13, 7, '#d94b3d');
  p.outline(INK);
  return p;
}

function pandesal() {
  const p = new Pix(S, S);
  for (const [x, y] of [
    [8, 13],
    [15, 14],
    [12, 9],
  ]) {
    p.ellipse(x, y, 5, 4, '#c98a4a');
    p.ellipse(x - 1, y - 1, 3, 2, '#e0a868');
    p.px(x + 1, y + 1, '#f1e6c8');
  }
  p.outline(INK);
  return p;
}

function turon() {
  const p = new Pix(S, S);
  p.line(3, 20, 20, 4, '#c9a26a');
  for (let k = 0; k < 2; k++) {
    const x = 6 + k * 7;
    const y = 15 - k * 6;
    p.rect(x, y - 2, 8, 5, '#d98a3a');
    p.hline(x, y - 2, 8, '#f2b35a');
    p.hline(x, y + 2, 8, '#9a5a22');
  }
  p.outline(INK);
  return p;
}

function puto() {
  const p = new Pix(S, S);
  const colors = ['#ffffff', '#f2a6c8', '#9fd18a', '#f7d046'];
  colors.forEach((c, i) => {
    const x = 6 + (i % 2) * 8;
    const y = 9 + Math.floor(i / 2) * 7;
    p.ellipse(x + 2, y + 2, 4, 3, c);
    p.hline(x - 1, y + 4, 7, shade(c, -0.2));
    p.px(x + 2, y, '#f2c14e');
  });
  p.outline(INK);
  return p;
}

function siopao() {
  const p = new Pix(S, S);
  p.ellipse(12, 15, 9, 3, '#00000025');
  p.ellipse(12, 12, 9, 7, '#f7f3ea');
  p.ellipse(10, 10, 5, 3, '#ffffff');
  p.disc(12, 7, 1, '#d94b3d');
  p.hline(8, 17, 9, '#e3ddd0');
  p.outline(INK);
  return p;
}

function corn() {
  const p = new Pix(S, S);
  p.line(3, 21, 7, 17, '#c9a26a');
  for (let k = 0; k < 11; k++) {
    const x = 7 + k;
    const y = 16 - k;
    p.disc(x, y, 3, '#f2c94e');
  }
  for (let k = 0; k < 11; k += 2) p.px(8 + k, 15 - k, '#c98a2a');
  for (let k = 1; k < 11; k += 3) p.px(6 + k, 15 - k, '#7a4a1a');
  p.outline(INK);
  return p;
}

function bottle(liquid, cap, label) {
  const p = new Pix(S, S);
  p.rect(9, 7, 6, 15, liquid);
  p.rect(10, 4, 4, 3, liquid);
  p.rect(10, 2, 4, 2, cap);
  p.rect(9, 12, 6, 4, label);
  p.vline(10, 7, 14, '#ffffff60');
  p.outline(INK);
  return p;
}

function icecandy() {
  const p = new Pix(S, S);
  p.rect(9, 3, 6, 17, '#e98ab0');
  p.rect(9, 3, 6, 4, '#f2c14e');
  p.vline(10, 4, 15, '#ffffff70');
  p.rect(9, 20, 6, 1, '#e8f2f6');
  p.px(12, 21, '#e8f2f6');
  p.outline(INK);
  return p;
}

function flan() {
  const p = new Pix(S, S);
  p.ellipse(12, 17, 10, 3, '#c9d1d9');
  p.ellipse(12, 15, 7, 4, '#f2c14e');
  p.ellipse(12, 11, 6, 2, '#a5561c');
  p.rect(6, 11, 13, 4, '#f2c14e');
  p.ellipse(12, 11, 6, 2, '#a5561c');
  p.px(9, 11, '#d98a3a');
  p.outline(INK);
  return p;
}

function tumbler() {
  const p = new Pix(S, S);
  p.rect(8, 5, 8, 16, '#3b6fb6');
  p.rect(8, 3, 8, 2, '#c9d1d9');
  p.vline(9, 5, 15, '#6d9ad6');
  p.rect(8, 10, 8, 3, '#a6d2ea');
  p.outline(INK);
  return p;
}

const ITEMS = {
  adobo_meal: () => meal(sauce('#6b3a22', '#8a4a2a')),
  curry_meal: () => meal(sauce('#d9a441', '#f0c16a')),
  teriyaki_meal: () =>
    meal((p, x, y) => {
      sauce('#8a4a22', '#a85a2a')(p, x, y);
      p.px(x - 1, y - 2, '#ffffff');
      p.px(x + 2, y, '#ffffff');
    }),
  chopsuey_meal: () =>
    meal((p, x, y) => {
      p.ellipse(x, y + 1, 4, 3, '#cfe0b0');
      for (const [dx, dy, c] of [
        [-2, -1, '#3a9a6a'],
        [1, 0, '#f08a3c'],
        [2, -2, '#3a9a6a'],
        [-1, 1, '#f2c14e'],
      ])
        p.rect(x + dx, y + dy, 2, 2, c);
    }),
  liempo_meal: () =>
    meal((p, x, y) => {
      p.rect(x - 3, y - 2, 7, 5, '#a0522d');
      for (let i = 0; i < 7; i += 2) p.vline(x - 3 + i, y - 2, 5, '#5a2a12');
      p.hline(x - 3, y - 2, 7, '#f1e6c8');
    }),
  tonkatsu_meal: () =>
    meal((p, x, y) => {
      for (let i = 0; i < 3; i++) {
        p.rect(x - 4 + i * 3, y - 2, 2, 5, '#d9a050');
        p.px(x - 4 + i * 3, y - 2, '#f2c87a');
      }
    }),
  free_iced_tea: () => cup('#c98a2a', { straw: '#3a9a6a' }),
  fishball: () => skewer(['#d8b07a', '#d8b07a', '#d8b07a']),
  kikiam: () => skewer(['#8a5a3a', '#8a5a3a', '#8a5a3a'], { size: 2 }),
  squidball: () => skewer(['#efe2c0', '#efe2c0', '#efe2c0']),
  tokneneng: () => skewer(['#f08a3c', '#f08a3c'], { size: 3, gap: 7 }),
  kwekkwek: () => skewer(['#f08a3c', '#f08a3c', '#f08a3c'], { size: 2 }),
  fewa,
  gulaman: () => cup('#8a5a2a', { bits: '#3e2a1a' }),
  melon: () => cup('#c9e8a6', { bits: '#f2c27a' }),
  buko: () => cup('#eef4ee', { bits: '#ffffff', straw: '#3a9a6a' }),
  softdrinks: () => bottle('#3e2416', '#d94b3d', '#d94b3d'),
  water_bottle: () => bottle('#cfe8f4', '#3b6fb6', '#3b6fb6'),
  iced_coffee: () => cup('#7a4a2a', { top: '#e8d2b0', straw: '#2b2233' }),
  betamax: () => skewer(['#5a1e1e', '#5a1e1e', '#5a1e1e'], { size: 2 }),
  isaw: () => skewer(['#c9a27a', '#b88a5a', '#c9a27a', '#b88a5a'], { size: 2, gap: 4 }),
  hotdog_stick: () => skewer(['#d94b3d', '#d94b3d', '#d94b3d', '#d94b3d'], { size: 2, gap: 3 }),
  bbq: () => skewer(['#8a3a1a', '#a0522d', '#8a3a1a', '#a0522d'], { size: 2, gap: 4 }),
  mais: corn,
  bbq_rice: () =>
    meal((p, x, y) => {
      p.line(x - 4, y + 3, x + 5, y - 3, '#c9a26a');
      for (let i = 0; i < 3; i++) p.rect(x - 3 + i * 3, y + 1 - i * 2, 3, 2, '#8a3a1a');
    }),
  pandesal,
  turon,
  kamotecue: () => skewer(['#c86a2a', '#d98a3a', '#c86a2a'], { size: 3, gap: 6 }),
  puto,
  bananacue: () => skewer(['#d9902a', '#d9902a'], { size: 3, gap: 7 }),
  siopao,
  lugaw: () =>
    bowl('#efe6cc', (p) => {
      p.px(10, 11, '#3a9a6a');
      p.px(14, 10, '#3a9a6a');
      p.px(12, 11, '#c98a4a');
    }),
  tokwa: () =>
    bowl('#7a4a2a', (p) => {
      for (const [x, y] of [
        [9, 10],
        [13, 10],
        [11, 11],
      ])
        p.rect(x, y, 2, 2, '#f2c87a');
    }),
  lugaw_egg: () =>
    bowl('#efe6cc', (p) => {
      egg(p, 12, 10);
      p.px(8, 11, '#3a9a6a');
    }),
  goto: () =>
    bowl('#e6d6a8', (p) => {
      for (const [x, y] of [
        [9, 10],
        [14, 10],
        [12, 11],
      ])
        p.rect(x, y, 2, 1, '#6b3a22');
      p.px(11, 10, '#3a9a6a');
    }),
  mami: () =>
    bowl('#d9b86a', (p) => {
      for (let x = 6; x < 18; x += 2) p.px(x, 10 + (x % 4 === 0 ? 1 : 0), '#f7d046');
      p.px(12, 10, '#3a9a6a');
    }),
  icecandy,
  iskrambol: () => cup('#f2a6c8', { top: '#7a4a2a', straw: '#f2c14e' }),
  lecheflan: flan,
  maiscon: () =>
    glass(
      [
        ['#f7f0dc', 6],
        ['#f2c94e', 6],
      ],
      (p) => {
        p.disc(12, 7, 2, '#f2c94e');
      },
    ),
  halohalo: () =>
    glass(
      [
        ['#c9a0d8', 3],
        ['#f2c14e', 3],
        ['#e98ab0', 3],
        ['#ffffff', 3],
      ],
      (p) => {
        p.disc(12, 6, 3, '#8a5ab8');
        p.px(14, 4, '#f2c14e');
      },
    ),
  hotsilog: () =>
    meal((p, x, y) => {
      egg(p, x + 1, y + 1);
      p.rect(x - 3, y - 3, 6, 2, '#d94b3d');
    }),
  longsilog: () =>
    meal((p, x, y) => {
      egg(p, x + 1, y + 1);
      p.rect(x - 3, y - 3, 3, 2, '#b8402f');
      p.rect(x + 1, y - 3, 3, 2, '#b8402f');
    }),
  tapsilog: () =>
    meal((p, x, y) => {
      egg(p, x + 1, y + 1);
      p.rect(x - 4, y - 3, 7, 2, '#5a2a12');
    }),
  sisig_rice: () =>
    meal((p, x, y) => {
      p.ellipse(x, y, 4, 3, '#2b2233');
      chunks('#a0522d', 3)(p, x, y);
      p.px(x + 1, y - 1, '#f2c14e');
    }),
  tumbler_water: tumbler,
};

export function foodAssets(menuKeys) {
  return menuKeys.map((key) => {
    const draw = ITEMS[key];
    if (!draw) throw new Error(`No food art for ${key}`);
    return { key: `food_${key}`, pix: draw() };
  });
}

export function foodPix(key) {
  return ITEMS[key]();
}
