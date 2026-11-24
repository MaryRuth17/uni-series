// Lagoon Merienda art (SPEC-pup-lagoon §11, owner requests in DECISIONS L-019 to L-029): the PUP front
// for the arrival intro, the stall storefronts, the food and the UI (money, notebook pages, How to play).
// Original pixel art drawn from the owner's photos without tracing; no school initials, official signs,
// real stall names or brands (SPEC §13, SPEC-pup-lagoon §15).
import { Pix, mix, shade } from './pix.mjs';
import { foodAssets } from './lagoon-food.mjs';
import { STALL_ITEMS, storefrontAssets } from './lagoon-fronts.mjs';
import { lagoonUiAssets } from './lagoon-ui.mjs';
import { LOOKS, acacia, hash, person } from './lagoon-common.mjs';

// ---- The PUP front on Anonas St (960×360), for the intro pan ----------------------------------------
// Left to right: the street with utility poles and a tangle of wires (birds on them), big acacias behind
// a maroon wall with a dark stone marker and a bronze relief, the gate under a white canopy (the game
// writes a greeting on its maroon beam) with a guard and students, a white iron fence on a red base, the
// tall white pylon of three slabs (left plain), a streetlight, a fishball cart, a pedicab and vendor
// umbrellas on the sidewalk, dappled shade, a manhole and fallen leaves.

function wires(p, from, to, sag, color = '#2b2233') {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const n = Math.max(2, Math.round(Math.abs(x1 - x0)));
  let prev = null;
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag;
    if (prev) p.line(Math.round(prev[0]), Math.round(prev[1]), Math.round(x), Math.round(y), color);
    prev = [x, y];
    pts.push(prev);
  }
  return pts;
}

function utilityPole(p, x, top) {
  p.rect(x - 3, top, 7, 286 - top, '#9a9486');
  p.vline(x - 3, top, 286 - top, '#b8b2a6');
  p.vline(x + 3, top, 286 - top, '#7a746a');
  for (let y = top + 60; y < 280; y += 40) p.hline(x - 3, y, 7, '#8a847a');
  p.rect(x - 22, top + 10, 44, 3, '#7a746a');
  p.rect(x - 16, top + 26, 32, 3, '#7a746a');
  for (const dx of [-20, -8, 8, 20]) p.rect(x + dx - 1, top + 7, 3, 3, '#e8e4da');
  // Transformer and a junction box with a coil of extra cable.
  p.rect(x + 5, top + 34, 12, 18, '#6a6f78');
  p.rect(x + 5, top + 34, 12, 3, '#8a929c');
  p.rect(x - 14, top + 60, 10, 12, '#55505f');
  p.ellipse(x - 9, top + 82, 6, 4, '#2b2233');
  p.ellipse(x - 9, top + 82, 4, 2, '#4a4450');
  // Posters on the pole.
  p.rect(x - 4, 200, 9, 12, '#f2c14e');
  p.rect(x - 4, 214, 9, 10, '#ffffff');
}

function streetlight(p, x) {
  p.rect(x - 2, 40, 4, 246, '#8a929c');
  p.vline(x - 2, 40, 246, '#b0b8c0');
  p.line(x, 46, x + 40, 30, '#8a929c');
  p.line(x, 47, x + 40, 31, '#6a727c');
  p.rect(x + 34, 25, 18, 6, '#d6dde3');
  p.hline(x + 35, 31, 16, '#fff6c9');
}

function bird(p, x, y) {
  p.rect(x, y, 3, 2, '#2b2233');
  p.px(x + 3, y, '#2b2233');
  p.px(x - 1, y + 1, '#2b2233');
}

function introPanorama() {
  const W = 960;
  const p = new Pix(W, 360);
  p.vgrad(0, 0, W, 240, ['#3f8edc', '#6fb2ea', '#a8d4f2', '#d8ecf8']);
  for (const [x, y, w] of [
    [90, 54, 80],
    [330, 22, 60],
    [520, 36, 96],
    [760, 18, 50],
    [880, 64, 70],
  ]) {
    p.ellipse(x, y, w / 2, 8, '#ffffff');
    p.ellipse(x - w / 4, y + 3, w / 4, 6, '#f4f8fb');
    p.ellipse(x + w / 5, y - 3, w / 5, 5, '#ffffff');
    p.hline(x - w / 2 + 6, y + 8, w - 12, '#e2eef6');
  }
  // Far tree line, then the big acacias behind the wall.
  for (let x = -10; x < W + 20; x += 22) {
    const h = 30 + Math.floor(hash(x, 1) * 18);
    for (let k = 0; k < 4; k++)
      p.disc(x + k * 5, 232 - h + k * 3, 9 - k, shade('#4f8a3c', -0.05 * k));
  }
  for (const [x, h, s] of [
    [40, 170, 70],
    [230, 210, 110],
    [420, 220, 120],
    [600, 190, 90],
    [800, 170, 80],
    [930, 190, 80],
  ])
    acacia(p, x, 240, h, s, x + 3, { base: x % 3 ? '#3f7d3a' : '#4a8a3a' });
  // Sidewalk with a painted curb, the concrete street, dappled shade, a manhole, leaves.
  p.rect(0, 272, W, 12, '#cfcabe');
  p.hline(0, 272, W, '#e6e1d6');
  for (let x = 0; x < W; x += 30) p.vline(x, 272, 12, '#bdb8ac');
  p.rect(0, 284, W, 3, '#f4f1ea');
  for (let x = 0; x < W; x += 24) p.rect(x, 284, 12, 3, x > 360 && x < 700 ? '#f2c14e' : '#e8e4da');
  p.rect(0, 287, W, 73, '#b8b4aa');
  for (let y = 296; y < 360; y += 22) p.hline(0, y, W, '#aaa69c');
  for (let x = 0; x < W; x += 60) p.vline(x + ((x / 60) % 2) * 20, 287, 73, '#aaa69c');
  for (let k = 0; k < 90; k++)
    p.px(Math.floor(hash(k, 1) * W), 289 + Math.floor(hash(k, 2) * 70), '#9e9a90');
  for (let k = 0; k < 40; k++) {
    const x = Math.floor(hash(k, 3) * W);
    const y = 290 + Math.floor(hash(k, 4) * 68);
    const c = ['#8a7a3a', '#a08a4a', '#6f8a3a'][k % 3];
    p.px(x, y, c);
    p.px(x + 1, y, c);
  }
  for (const [cx, cy, r] of [
    [230, 300, 60],
    [420, 298, 70],
    [600, 300, 50],
    [800, 296, 46],
  ])
    for (let y = cy - 10; y < cy + 14; y++)
      for (let x = cx - r; x < cx + r; x++)
        if (Math.hypot((x - cx) / r, (y - cy) / 12) < 1 && hash(x >> 2, y >> 1, 9) < 0.5)
          p.px(x, y, '#00000022');
  p.ellipse(330, 330, 14, 5, '#8a847a');
  p.ellipse(330, 330, 11, 3, '#9a9488');
  for (let k = -9; k < 10; k += 3) p.vline(330 + k, 328, 4, '#7a746a');
  // Far left: the street going on, a low wall.
  p.rect(0, 236, 180, 36, '#e8e2d4');
  for (let x = 0; x < 180; x += 24) p.vline(x, 236, 36, '#d6d0c2');
  p.rect(0, 232, 180, 4, '#f4f1ea');
  // Maroon wall with the stone marker and the bronze relief.
  p.rect(180, 196, 300, 76, '#8a3a32');
  p.rect(176, 190, 308, 8, '#a54a40');
  p.hline(176, 190, 308, '#c06a5a');
  p.rect(176, 198, 308, 2, '#00000030');
  for (let y = 204; y < 272; y += 8) p.hline(180, y, 300, '#7a3029');
  for (let y = 200; y < 272; y += 16)
    for (let x = 180 + ((y / 8) % 2) * 12; x < 480; x += 24) p.vline(x, y, 8, '#7a3029');
  for (let k = 0; k < 30; k++)
    p.px(180 + Math.floor(hash(k, 21) * 300), 200 + Math.floor(hash(k, 22) * 70), '#9a4a40');
  // The stone marker: a dark slab with a raised border, a title bar and lines of text.
  p.rect(202, 204, 90, 62, '#3e3a3a');
  p.rect(204, 206, 86, 58, '#2e2a2a');
  p.stroke(207, 209, 80, 52, '#8a847a');
  p.rect(214, 213, 66, 5, '#b8a878');
  for (let k = 0; k < 8; k++) {
    const w = 60 - ((k * 7) % 14);
    p.hline(247 - w / 2, 223 + k * 4, w, '#7a746a');
    if (k % 2 === 0) p.hline(247 - w / 2 + 3, 224 + k * 4, w - 8, '#5a5450');
  }
  p.rect(206, 264, 82, 4, '#55505f');
  // The bronze relief: a row of figures working and studying, with a sun behind them.
  p.rect(302, 202, 154, 50, '#3e3024');
  p.rect(304, 204, 150, 46, '#5a4632');
  p.disc(379, 226, 16, '#6a5038');
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    p.line(
      379,
      226,
      379 + Math.round(Math.cos(a) * 20),
      226 + Math.round(Math.sin(a) * 14),
      '#6a5038',
    );
  }
  for (let k = 0; k < 12; k++) {
    const x = 312 + k * 12;
    const y = 230 + (k % 3) * 3;
    p.ellipse(x, y + 6, 4, 9, '#7a5e42');
    p.disc(x, y - 6, 3, '#8a6e50');
    p.px(x - 1, y - 7, '#b89a72');
    p.vline(x - 3, y, 10, '#9a7e5a');
    if (k % 3 === 0) p.line(x + 3, y - 2, x + 8, y - 8, '#8a6e50');
    if (k % 3 === 1) p.rect(x - 3, y - 1, 6, 4, '#a08060');
  }
  p.stroke(304, 204, 150, 46, '#2e2218');
  // A green notice board by the wall.
  p.rect(158, 236, 18, 22, '#3a7a4a');
  p.stroke(158, 236, 18, 22, '#2b5a3a');
  for (let k = 0; k < 4; k++) p.hline(161, 240 + k * 4, 12, '#e8e4da');
  p.rect(166, 258, 2, 14, '#55505f');
  // The gate under a white canopy; its maroon beam carries the game's greeting.
  p.rect(470, 214, 170, 8, '#f4f1ea');
  p.hline(470, 214, 170, '#ffffff');
  p.rect(470, 222, 170, 3, '#00000040');
  for (const x of [480, 556, 626]) {
    p.rect(x, 222, 8, 50, '#f4f1ea');
    p.vline(x + 7, 222, 50, '#cfc9bc');
  }
  p.rect(488, 225, 138, 47, '#3a3236');
  p.rect(488, 225, 138, 10, '#4a4044');
  for (let x = 492; x < 622; x += 10) p.vline(x, 236, 30, '#2e282c');
  p.rect(506, 192, 172, 18, '#7a2626');
  p.hline(506, 192, 172, '#9a3a32');
  p.hline(506, 209, 172, '#4a1616');
  p.rect(502, 190, 4, 24, '#f4f1ea');
  p.rect(678, 190, 4, 24, '#f4f1ea');
  // A security guard by the gate and students going in.
  person(p, 474, 272, {
    skin: LOOKS[2].skin,
    hair: '#1f1b26',
    shirt: '#2f4a8a',
    pants: '#1f2a4a',
    arm: 1,
  });
  p.rect(469, 252, 9, 2, '#1f2a4a');
  for (let k = 0; k < 6; k++)
    person(p, 500 + k * 21, 271 - (k % 2), { ...LOOKS[k % 6], arm: k % 3 });
  // White iron fence on a red base, hedges behind.
  for (let x = 640; x < 960; x += 8) {
    p.ellipse(x + 4, 232, 6, 5, '#4f8a3c');
    p.px(x + 3, 229, '#6fae4e');
  }
  p.rect(640, 236, 320, 36, '#efece4');
  for (let x = 640; x < 960; x += 5) {
    p.vline(x, 236, 28, '#b8b4aa');
    p.px(x, 235, '#8a8494');
  }
  p.hline(640, 236, 320, '#ffffff');
  p.hline(640, 250, 320, '#d8d4ca');
  p.rect(640, 264, 320, 8, '#b8402f');
  p.hline(640, 264, 320, '#d9604a');
  for (let x = 640; x < 960; x += 40) p.rect(x, 230, 6, 42, '#f4f1ea');
  // The tall pylon: three white slabs of slightly different heights (left plain; no initials).
  const px0 = 700;
  for (const [dx, top, w] of [
    [0, 70, 30],
    [32, 56, 30],
    [64, 76, 30],
  ]) {
    p.rect(px0 + dx, top, w, 272 - top, '#f4f1ea');
    p.vline(px0 + dx, top, 272 - top, '#ffffff');
    p.vline(px0 + dx + 1, top, 272 - top, '#fbfaf6');
    p.vline(px0 + dx + w - 1, top, 272 - top, '#cfc9bc');
    p.vline(px0 + dx + w - 2, top, 272 - top, '#e2ddd0');
    p.rect(px0 + dx + w, top + 6, 2, 272 - top - 6, '#a9a394');
    p.hline(px0 + dx, top, w, '#ffffff');
    for (let y = top + 40; y < 270; y += 50) p.hline(px0 + dx + 2, y, w - 4, '#e2ddd0');
    for (let k = 0; k < 8; k++)
      p.px(px0 + dx + 3 + ((k * 7) % (w - 6)), top + 20 + ((k * 31) % (240 - top)), '#e8e4da');
  }
  p.rect(px0 - 6, 262, 108, 10, '#d8d2c4');
  p.hline(px0 - 6, 262, 108, '#e8e4da');
  // Poles, a streetlight and the famous tangle of wires, with birds on them.
  utilityPole(p, 150, 70);
  utilityPole(p, 600, 40);
  streetlight(p, 660);
  const sets = [
    [[0, 90], [150, 80], 10],
    [[0, 100], [150, 96], 12],
    [[0, 112], [150, 104], 8],
    [[150, 80], [600, 50], 30],
    [[150, 84], [600, 56], 40],
    [[150, 96], [600, 66], 34],
    [[150, 100], [600, 74], 50],
    [[150, 108], [600, 80], 44],
    [[150, 112], [600, 90], 60],
    [[600, 50], [960, 30], 26],
    [[600, 60], [960, 46], 36],
    [[600, 74], [960, 70], 30],
    [[600, 80], [960, 92], 22],
    [[600, 90], [960, 100], 40],
  ];
  const lines = sets.map(([a, b, s], i) => wires(p, a, b, s, i % 4 === 3 ? '#3a3346' : '#2b2233'));
  for (const [li, at] of [
    [3, 0.3],
    [3, 0.34],
    [5, 0.62],
    [10, 0.4],
    [10, 0.45],
    [10, 0.5],
  ]) {
    const pt = lines[li][Math.floor(lines[li].length * at)];
    bird(p, Math.round(pt[0]), Math.round(pt[1]) - 2);
  }
  // Yellow barricades.
  for (let x = 380; x < 470; x += 18) {
    p.rect(x, 262, 14, 3, '#f2c14e');
    p.rect(x, 266, 14, 2, '#2b2233');
    p.rect(x + 1, 265, 2, 10, '#c9a030');
    p.rect(x + 11, 265, 2, 10, '#c9a030');
  }
  // A fishball cart with a steaming wok and its vendor.
  p.rect(270, 258, 40, 16, '#c9d1d9');
  p.hline(270, 258, 40, '#eef2f6');
  p.rect(270, 266, 40, 2, '#d94b3d');
  p.ellipse(282, 257, 8, 3, '#2b2233');
  p.ellipse(282, 256, 6, 2, '#d9a441');
  p.px(280, 250, '#ffffffa0');
  p.px(284, 247, '#ffffff80');
  p.disc(274, 276, 3, '#2b2233');
  p.disc(306, 276, 3, '#2b2233');
  person(p, 318, 274, { ...LOOKS[4], arm: 2 });
  // A pedicab with a blue sidecar, a roof and its driver.
  p.rect(780, 262, 46, 24, '#3b8ad0');
  p.hline(780, 262, 46, '#6aaee8');
  p.rect(784, 254, 38, 10, '#6aaee8');
  p.rect(778, 248, 50, 4, '#ffffff');
  p.vline(780, 252, 10, '#8a929c');
  p.vline(826, 252, 10, '#8a929c');
  p.rect(786, 266, 14, 8, '#d94b3d');
  for (const wx of [790, 818, 846]) {
    p.disc(wx, 288, 6, '#2b2233');
    p.disc(wx, 288, 3, '#8a929c');
  }
  p.line(826, 270, 846, 288, '#55505f');
  p.line(836, 262, 846, 288, '#55505f');
  person(p, 838, 276, { ...LOOKS[2], shirt: '#55505f', arm: 1 });
  // Vendor carts with umbrellas.
  for (const [x, c] of [
    [880, '#ffffff'],
    [930, '#f2c14e'],
  ]) {
    p.vline(x, 226, 46, '#8a8494');
    for (let k = 0; k < 9; k++)
      p.hline(x - 4 - k * 3, 222 + k, 9 + k * 6, k % 2 ? mix(c, '#000000', 0.08) : c);
    p.rect(x - 18, 262, 36, 22, '#7fc0d8');
    p.rect(x - 18, 262, 36, 4, '#f4f1ea');
    for (let k = 0; k < 5; k++)
      p.rect(x - 15 + k * 7, 256, 5, 6, ['#d94b3d', '#f2c14e', '#3a9a6a', '#e98ab0', '#3b6fb6'][k]);
    p.disc(x - 12, 286, 3, '#2b2233');
    p.disc(x + 12, 286, 3, '#2b2233');
  }
  person(p, 902, 272, { ...LOOKS[5], arm: 2 });
  return p;
}

// ---- Export ---------------------------------------------------------------------------------------------

export function lagoonAssets() {
  return [
    { key: 'lagoon_intro', pix: introPanorama() },
    ...lagoonUiAssets(),
    ...storefrontAssets(),
    ...foodAssets(Object.values(STALL_ITEMS).flat().concat(['free_iced_tea'])),
  ];
}
