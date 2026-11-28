// UI kit art (SPEC §6 UI style, SPEC-homepage §8): logo, nine-slice panels and buttons, icons.
import { Pix, shade } from './pix.mjs';
import { FONTS } from './font.mjs';

const INK = '#2b2233';

/** "UNI SERIES" in jeepney sign-painter lettering: arched, chrome-lit red, yellow and ink outline, shadow. */
function logo() {
  const scale = 5;
  const text = 'UNI SERIES';
  const f = FONTS['5x7'];
  let w = 0;
  for (const ch of text) w += (f.glyphs[ch][0].length + 1) * scale;
  w -= scale;
  const pad = 8;
  const W = w + pad * 2;
  const H = 7 * scale + pad * 2 + 8;
  // 1. Letter mask, arched upward in the middle.
  const mask = new Pix(W, H);
  let cx = pad;
  for (const ch of text) {
    const g = f.glyphs[ch];
    g.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] !== '#') continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const x = cx + i * scale + dx;
            const arch = Math.round(6 * Math.sin((Math.PI * (x - pad)) / w));
            mask.px(x, pad + 6 + j * scale + dy - arch, '#ffffff');
          }
        }
      }
    });
    cx += (g[0].length + 1) * scale;
  }
  const solid = (x, y) => (mask.get(x, y)?.[3] ?? 0) > 0;
  const near = (x, y, r) => {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++)
        if (Math.abs(dx) + Math.abs(dy) <= r && solid(x + dx, y + dy)) return true;
    return false;
  };
  const out = new Pix(W, H);
  // 2. Drop shadow, ink outline, yellow outline.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (near(x - 3, y - 3, 3)) out.px(x, y, '#1a1424');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (near(x, y, 3)) out.px(x, y, INK);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (near(x, y, 2)) out.px(x, y, '#f2c14e');
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (near(x, y, 1) && !solid(x, y)) out.px(x, y, '#d9982e');
  // 3. Red fill with a chrome band across the upper part of each letter and a shaded lower part.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!solid(x, y)) continue;
      const arch = Math.round(6 * Math.sin((Math.PI * (x - pad)) / w));
      const local = y - (pad + 6 - arch);
      let c = '#d94b3d';
      if (local < 6) c = '#ff8a72';
      if (local === 2 || local === 3) c = '#ffd9cc';
      if (local > 24) c = '#a8352a';
      if (!solid(x, y - 1)) c = '#ffffff';
      out.px(x, y, c);
    }
  }
  return out;
}

/** Nine-slice source: rounded cream panel with a bevel. Corners 6 px. */
function panel(base = '#fff4dc') {
  const p = new Pix(24, 24);
  p.rect(1, 1, 22, 22, base);
  p.hline(2, 0, 20, INK);
  p.hline(2, 23, 20, INK);
  p.vline(0, 2, 20, INK);
  p.vline(23, 2, 20, INK);
  p.px(1, 1, INK);
  p.px(22, 1, INK);
  p.px(1, 22, INK);
  p.px(22, 22, INK);
  p.hline(2, 1, 20, '#ffffff');
  p.vline(1, 2, 19, '#ffffff');
  p.hline(2, 21, 20, shade(base, -0.12));
  p.hline(2, 22, 20, shade(base, -0.22));
  p.vline(22, 2, 20, shade(base, -0.18));
  return p;
}

/** Nine-slice source: a button with a raised bottom edge. */
function button(base, edge) {
  const p = new Pix(24, 24);
  p.rect(1, 1, 22, 19, base);
  p.rect(1, 19, 22, 4, edge);
  p.hline(2, 0, 20, INK);
  p.hline(2, 23, 20, INK);
  p.vline(0, 2, 20, INK);
  p.vline(23, 2, 20, INK);
  p.px(1, 1, INK);
  p.px(22, 1, INK);
  p.px(1, 22, INK);
  p.px(22, 22, INK);
  p.hline(2, 1, 20, shade(base, 0.45));
  p.hline(2, 2, 20, shade(base, 0.2));
  p.hline(1, 19, 22, shade(edge, -0.2));
  return p;
}

/** Nine-slice source: the yellow jeepney route board with corner bolts. */
function routeBoard() {
  const p = button('#f2c14e', '#c9932a');
  for (const [x, y] of [
    [3, 3],
    [20, 3],
    [3, 16],
    [20, 16],
  ]) {
    p.px(x, y, '#8a929c');
    p.px(x - 1, y, '#c9d1d9');
  }
  return p;
}

function icon(draw) {
  const p = new Pix(16, 16);
  draw(p);
  return p;
}

const ICONS = {
  icon_settings: (p) => {
    p.disc(8, 8, 6, '#8a929c');
    for (const [x, y] of [
      [8, 1],
      [8, 15],
      [1, 8],
      [15, 8],
      [3, 3],
      [13, 3],
      [3, 13],
      [13, 13],
    ])
      p.disc(x, y, 1, '#8a929c');
    p.disc(8, 8, 5, '#c9d1d9');
    p.disc(7, 7, 2, '#ffffff');
    p.disc(8, 8, 2, INK);
    p.outline(INK);
  },
  icon_credits: (p) => {
    p.disc(8, 8, 7, '#3b6fb6');
    p.disc(7, 7, 5, '#5a8ad0');
    p.rect(7, 7, 2, 5, '#ffffff');
    p.rect(7, 4, 2, 2, '#ffffff');
    p.outline(INK);
  },
  icon_stickers: (p) => {
    p.rect(2, 2, 12, 12, '#d94b3d');
    p.rect(3, 3, 10, 10, '#e86a5a');
    p.vline(8, 2, 12, '#a8352a');
    p.disc(11, 6, 2, '#f2c14e');
    p.disc(5, 10, 1, '#f2c14e');
    p.outline(INK);
  },
  icon_album: (p) => {
    p.rect(2, 3, 12, 10, '#ffffff');
    p.rect(3, 4, 10, 6, '#78b2e4');
    p.rect(3, 8, 10, 2, '#3a9a6a');
    p.disc(10, 6, 1, '#f2c14e');
    p.outline(INK);
  },
  icon_home: (p) => {
    p.line(2, 8, 8, 2, '#d94b3d');
    p.line(8, 2, 14, 8, '#d94b3d');
    for (let y = 3; y < 8; y++) p.hline(8 - (y - 2), y, (y - 2) * 2 + 1, '#d94b3d');
    p.rect(4, 8, 8, 6, '#fff4dc');
    p.rect(7, 10, 2, 4, '#8b5a3c');
    p.outline(INK);
  },
  icon_map: (p) => {
    p.rect(2, 3, 4, 10, '#f2e2b4');
    p.rect(6, 3, 4, 10, '#e6d2a0');
    p.rect(10, 3, 4, 10, '#f2e2b4');
    p.line(3, 11, 12, 5, '#d94b3d');
    p.outline(INK);
  },
  /** Close X for card headers (IdCard): a red tile with a white X, so it reads on the ink header bar. */
  icon_close: (p) => {
    p.rect(2, 2, 12, 12, '#d94b3d');
    p.hline(2, 2, 12, '#e86a5a');
    p.hline(2, 13, 12, '#a8352a');
    for (let i = 0; i < 6; i++) {
      p.rect(5 + i, 5 + i, 1, 1, '#ffffff');
      p.rect(6 + i, 5 + i, 1, 1, '#ffffff');
      p.rect(10 - i, 5 + i, 1, 1, '#ffffff');
      p.rect(11 - i, 5 + i, 1, 1, '#ffffff');
    }
    p.outline(INK);
  },
  icon_list: (p) => {
    for (const y of [3, 7, 11]) {
      p.rect(2, y, 2, 2, '#d94b3d');
      p.rect(5, y, 9, 2, '#fff4dc');
    }
    p.outline(INK);
  },
};

export function uiAssets() {
  return [
    { key: 'logo_uniseries', pix: logo() },
    { key: 'ui_panel', pix: panel() },
    { key: 'ui_button', pix: button('#fff4dc', '#c9b99a') },
    { key: 'ui_board', pix: routeBoard() },
    ...Object.entries(ICONS).map(([key, draw]) => ({ key, pix: icon(draw) })),
  ];
}
