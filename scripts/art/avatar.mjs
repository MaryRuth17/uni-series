// Player avatar parts (SPEC-homepage §3.3, §8 avatar_<part>_<n>; girl or boy: DECISIONS D-041).
// 48×48 chibi, drawn in layers the game stacks: body (skin) → outfit → lace → hair.
import { Pix, shade, sheet } from './pix.mjs';

const INK = '#2b2233';
export const SKINS = ['#f7d6b8', '#eab996', '#d39a6e', '#b07a4f', '#8a5a36', '#62402a'];

function body(gender, skin) {
  const p = new Pix(48, 48);
  const dark = shade(skin, -0.18);
  // Legs and shoes (mostly covered by the outfit).
  p.rect(19, 35, 4, 9, skin);
  p.rect(25, 35, 4, 9, skin);
  p.vline(22, 35, 9, dark);
  p.vline(28, 35, 9, dark);
  p.rect(18, 43, 6, 3, gender === 'girl' ? '#6b2f3a' : '#2b2233');
  p.rect(24, 43, 6, 3, gender === 'girl' ? '#6b2f3a' : '#2b2233');
  p.hline(18, 43, 6, '#ffffff40');
  p.hline(24, 43, 6, '#ffffff40');
  // Torso and arms.
  p.rect(17, 24, 14, 12, skin);
  p.rect(13, 25, 4, 10, skin);
  p.rect(31, 25, 4, 10, skin);
  p.rect(13, 34, 4, 2, dark);
  p.rect(31, 34, 4, 2, dark);
  // Neck and head.
  p.rect(22, 21, 4, 4, dark);
  p.ellipse(24, 13, 9, 9, skin);
  p.rect(15, 12, 2, 4, dark);
  p.rect(31, 12, 2, 4, dark);
  p.hline(18, 21, 12, dark);
  // Face: eyes with highlights, blush, mouth.
  for (const x of [19, 27]) {
    p.rect(x, 13, 2, 3, INK);
    p.px(x, 13, '#ffffff');
  }
  if (gender === 'girl') {
    p.px(18, 12, INK);
    p.px(29, 12, INK);
  }
  p.rect(17, 17, 2, 1, '#e8828a');
  p.rect(29, 17, 2, 1, '#e8828a');
  p.hline(23, 18, 2, '#8a3a2a');
  p.outline(INK);
  return p;
}

// Hair: [color, draw(p, c)] per style. Drawn over the head; long styles fall past the shoulders.
const HAIR_COLORS = [
  '#2b2233',
  '#4a3226',
  '#2b2233',
  '#7a4a2a',
  '#8a3a22',
  '#2b2233',
  '#4a3226',
  '#b07a4f',
];

/** Hair over the crown, stopping above the eyes (y 13), with short sides by the ears. */
function capTop(p, c) {
  p.ellipse(24, 6, 10, 5, c);
  p.rect(14, 6, 3, 7, c);
  p.rect(31, 6, 3, 7, c);
}

const GIRL_HAIR = [
  (p, c) => {
    // Long straight with bangs.
    capTop(p, c);
    p.rect(14, 8, 4, 18, c);
    p.rect(30, 8, 4, 18, c);
    p.rect(17, 9, 14, 3, c);
  },
  (p, c) => {
    // High ponytail.
    capTop(p, c);
    p.rect(17, 9, 14, 2, c);
    p.ellipse(35, 8, 4, 3, c);
    p.rect(35, 8, 4, 14, c);
    p.px(32, 6, '#d94b3d');
    p.px(33, 6, '#d94b3d');
  },
  (p, c) => {
    // Bob with side part.
    capTop(p, c);
    p.rect(14, 8, 4, 12, c);
    p.rect(30, 8, 4, 12, c);
    p.rect(20, 9, 10, 3, c);
  },
  (p, c) => {
    // Twin braids.
    capTop(p, c);
    p.rect(18, 9, 12, 2, c);
    for (const x of [13, 32]) for (let y = 14; y < 30; y += 3) p.ellipse(x + 1, y, 2, 1, c);
    p.px(14, 30, '#3b6fb6');
    p.px(33, 30, '#3b6fb6');
  },
  (p, c) => {
    // Long wavy.
    capTop(p, c);
    for (let y = 8; y < 30; y++) {
      const off = Math.round(Math.sin(y / 2));
      p.hline(13 + off, y, 4, c);
      p.hline(31 - off, y, 4, c);
    }
    p.rect(17, 9, 14, 3, c);
  },
  (p, c) => {
    // Pixie cut.
    p.ellipse(24, 8, 10, 5, c);
    p.rect(15, 8, 2, 5, c);
    p.rect(31, 8, 2, 5, c);
    p.rect(17, 9, 9, 3, c);
  },
  (p, c) => {
    // Top bun.
    capTop(p, c);
    p.disc(24, 1, 4, c);
    p.rect(17, 9, 14, 2, c);
  },
  (p, c) => {
    // Curly, shoulder length.
    for (const [x, y] of [
      [16, 6],
      [22, 3],
      [28, 4],
      [33, 8],
      [14, 12],
      [34, 14],
      [14, 18],
      [34, 20],
      [19, 6],
      [26, 6],
    ])
      p.disc(x, y, 4, c);
    p.rect(17, 9, 14, 2, c);
  },
];

const BOY_HAIR = [
  (p, c) => {
    // Short crop.
    p.ellipse(24, 7, 10, 5, c);
    p.rect(15, 7, 2, 4, c);
    p.rect(31, 7, 2, 4, c);
    p.rect(18, 9, 12, 2, c);
  },
  (p, c) => {
    // Side part.
    p.ellipse(24, 7, 10, 5, c);
    p.rect(15, 7, 3, 6, c);
    p.rect(31, 7, 2, 5, c);
    p.rect(17, 9, 10, 3, c);
    p.hline(20, 4, 5, shade(c, 0.3));
  },
  (p, c) => {
    // Spiky.
    p.ellipse(24, 8, 10, 4, c);
    for (let x = 15; x < 34; x += 4) {
      p.line(x, 6, x + 1, 0, c);
      p.line(x + 1, 6, x + 2, 1, c);
    }
    p.rect(15, 8, 2, 4, c);
    p.rect(31, 8, 2, 4, c);
  },
  (p, c) => {
    // Buzz cut.
    p.ellipse(24, 7, 9, 4, c);
    p.rect(15, 7, 18, 2, c);
  },
  (p, c) => {
    // Wavy medium.
    capTop(p, c);
    p.rect(17, 9, 14, 3, c);
    for (let y = 10; y < 18; y++) {
      p.px(14 + (y % 2), y, c);
      p.px(33 - (y % 2), y, c);
    }
  },
  (p, c) => {
    // Curly.
    for (const [x, y] of [
      [16, 7],
      [21, 3],
      [27, 3],
      [32, 7],
      [18, 4],
      [30, 4],
      [24, 2],
    ])
      p.disc(x, y, 4, c);
    p.rect(16, 8, 16, 3, c);
  },
  (p, c) => {
    // Undercut with a top fringe.
    p.ellipse(24, 6, 10, 4, c);
    p.rect(15, 9, 18, 2, shade(c, 0.25));
    p.rect(19, 9, 10, 3, c);
  },
  (p, c) => {
    // Man bun.
    capTop(p, c);
    p.disc(24, 1, 3, c);
    p.rect(17, 9, 14, 2, c);
  },
];

function hair(gender, style) {
  const p = new Pix(48, 48);
  const c = HAIR_COLORS[style];
  (gender === 'girl' ? GIRL_HAIR : BOY_HAIR)[style](p, c);
  // Shine.
  p.hline(19, 5, 4, shade(c, 0.35));
  p.outline(INK);
  return p;
}

// Outfits: casual shirt, polo uniform, hoodie, org shirt. Girls' polo uniform has a skirt.
function outfit(gender, kind) {
  const p = new Pix(48, 48);
  const top = ['#3b6fb6', '#ffffff', '#6b2f3a', '#3a9a6a'][kind];
  const bottom =
    kind === 1 ? (gender === 'girl' ? '#2b3a6a' : '#2b2a4a') : kind === 2 ? '#3a3a48' : '#3b5a8a';
  // Bottoms.
  if (gender === 'girl' && kind === 1) {
    for (let y = 34; y < 41; y++)
      p.hline(17 - Math.floor((y - 34) / 2), y, 14 + Math.floor((y - 34) / 2) * 2, bottom);
    for (let x = 16; x < 33; x += 3) p.vline(x, 36, 5, shade(bottom, -0.2));
  } else {
    p.rect(18, 34, 12, 9, bottom);
    p.vline(23, 36, 7, shade(bottom, -0.25));
    p.hline(18, 34, 12, shade(bottom, 0.15));
  }
  // Top with sleeves.
  p.rect(17, 24, 14, 11, top);
  p.rect(13, 25, 4, kind === 2 ? 9 : 4, top);
  p.rect(31, 25, 4, kind === 2 ? 9 : 4, top);
  p.hline(17, 24, 14, shade(top, 0.25));
  p.vline(30, 25, 10, shade(top, -0.2));
  if (kind === 1) {
    // Collar and buttons.
    p.line(20, 23, 23, 26, '#e6e6ee');
    p.line(28, 23, 25, 26, '#e6e6ee');
    for (const y of [28, 31]) p.px(24, y, '#c9c9d2');
  }
  if (kind === 2) {
    // Hood and pocket.
    p.rect(18, 22, 12, 3, shade(top, -0.15));
    p.rect(20, 30, 8, 4, shade(top, -0.15));
    p.vline(22, 25, 4, '#e6e6ee');
    p.vline(26, 25, 4, '#e6e6ee');
  }
  if (kind === 3) {
    // Org shirt print.
    p.rect(20, 27, 8, 4, '#f2c14e');
    p.hline(21, 28, 6, '#2b2233');
  }
  if (kind === 0) p.hline(17, 29, 14, shade(top, 0.15));
  p.outline(INK);
  return p;
}

const LACES = ['#d94b3d', '#f2c14e', '#3b6fb6', '#3a9a6a', '#7b4bb3', '#2b2233'];

function lace(color) {
  const p = new Pix(48, 48);
  p.line(20, 22, 23, 29, color);
  p.line(28, 22, 25, 29, color);
  p.rect(21, 29, 7, 6, '#ffffff');
  p.rect(22, 30, 2, 2, '#9db4c0');
  p.hline(25, 30, 2, '#8a8494');
  p.hline(25, 32, 2, '#8a8494');
  p.stroke(21, 29, 7, 6, INK);
  return p;
}

export function avatarAssets() {
  const out = [];
  for (const g of ['girl', 'boy']) {
    out.push({
      key: `avatar_body_${g}`,
      pix: sheet(SKINS.map((s) => body(g, s))),
      frame: [48, 48],
    });
    out.push({
      key: `avatar_hair_${g}`,
      pix: sheet([0, 1, 2, 3, 4, 5, 6, 7].map((h) => hair(g, h))),
      frame: [48, 48],
    });
    out.push({
      key: `avatar_outfit_${g}`,
      pix: sheet([0, 1, 2, 3].map((k) => outfit(g, k))),
      frame: [48, 48],
    });
  }
  out.push({ key: 'avatar_lace', pix: sheet(LACES.map((c) => lace(c))), frame: [48, 48] });
  return out;
}
