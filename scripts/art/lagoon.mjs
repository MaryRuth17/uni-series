// Lagoon Merienda art (SPEC-pup-lagoon §11, owner requests in DECISIONS L-019 to L-026): the PUP front
// for the arrival intro, the How to play pictures, the stall storefronts and the food. Original pixel art
// drawn from the owner's photos without tracing; no school initials, official signs, real stall names or
// brands (SPEC §13, SPEC-pup-lagoon §15).
import { Pix, mix, sheet } from './pix.mjs';
import { foodAssets } from './lagoon-food.mjs';
import { STALL_ITEMS, storefrontAssets } from './lagoon-fronts.mjs';
import { INK, LOOKS, canopy, hash, person } from './lagoon-common.mjs';

// ---- The PUP front on Anonas St (960×360), for the intro pan ----------------------------------------
// Left to right: the street with a utility pole and a tangle of wires, big acacia trees behind a maroon
// wall with a dark stone marker and a bronze relief, the gate under a white canopy (the game writes a
// greeting on its maroon beam), a white iron fence on a red base, the tall white pylon of three slabs
// (left plain), a streetlight, a pedicab and vendor umbrellas on the sidewalk.

function wires(p, from, to, sag, color = '#2b2233') {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const n = Math.max(2, Math.round(Math.abs(x1 - x0)));
  let prev = null;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag;
    if (prev) p.line(Math.round(prev[0]), Math.round(prev[1]), Math.round(x), Math.round(y), color);
    prev = [x, y];
  }
}

function utilityPole(p, x, top) {
  p.rect(x - 3, top, 7, 300 - top, '#9a9486');
  p.vline(x - 3, top, 300 - top, '#b8b2a6');
  p.vline(x + 3, top, 300 - top, '#7a746a');
  p.rect(x - 22, top + 10, 44, 3, '#7a746a');
  p.rect(x - 16, top + 26, 32, 3, '#7a746a');
  p.rect(x + 5, top + 34, 12, 18, '#6a6f78');
  p.rect(x + 5, top + 34, 12, 3, '#8a929c');
}

function introPanorama() {
  const W = 960;
  const p = new Pix(W, 360);
  p.vgrad(0, 0, W, 240, ['#4f98e2', '#7fbcee', '#cfe8f7']);
  for (const [x, y, w] of [
    [90, 60, 70],
    [520, 36, 90],
    [860, 70, 60],
  ]) {
    p.ellipse(x, y, w / 2, 8, '#ffffff');
    p.ellipse(x - w / 4, y + 3, w / 4, 6, '#f4f8fb');
  }
  // Big shade trees behind the wall.
  for (const [x, y, r] of [
    [40, 150, 60],
    [230, 110, 90],
    [400, 100, 100],
    [580, 120, 80],
    [760, 140, 70],
    [930, 120, 80],
  ])
    canopy(p, x, y, r, x + 11, '#3f7d3a');
  for (let x = -20; x < W + 40; x += 30) canopy(p, x, 200, 24, x + 31, '#4f8a3c');
  // Street (concrete) and sidewalk.
  p.rect(0, 272, W, 12, '#c9c4b6');
  p.hline(0, 272, W, '#e0dbd0');
  p.rect(0, 284, W, 76, '#b8b4aa');
  for (let y = 290; y < 360; y += 22) p.hline(0, y, W, '#aaa69c');
  for (let x = 0; x < W; x += 60) p.vline(x + ((x / 60) % 2) * 20, 284, 76, '#aaa69c');
  for (let k = 0; k < 60; k++)
    p.px(Math.floor(hash(k, 1) * W), 286 + Math.floor(hash(k, 2) * 72), '#9e9a90');
  // Far left: the street going on, a low wall.
  p.rect(0, 236, 180, 36, '#e8e2d4');
  for (let x = 0; x < 180; x += 24) p.vline(x, 236, 36, '#d6d0c2');
  // Maroon wall with the stone marker and the bronze relief.
  p.rect(180, 196, 300, 76, '#8a3a32');
  p.rect(176, 190, 308, 8, '#a54a40');
  p.hline(176, 190, 308, '#c06a5a');
  for (let y = 204; y < 272; y += 8) p.hline(180, y, 300, '#7a3029');
  p.rect(204, 206, 86, 58, '#2e2a2a');
  p.stroke(206, 208, 82, 54, '#6a645a');
  p.rect(214, 212, 66, 4, '#8a847a');
  for (let k = 0; k < 9; k++) p.hline(214, 220 + k * 4, 50 + (k % 3) * 6, '#6a645a');
  p.rect(304, 204, 150, 46, '#5a4632');
  for (let k = 0; k < 14; k++) {
    const x = 310 + k * 10;
    p.ellipse(x, 222 + (k % 3) * 4, 4, 10, k % 2 ? '#7a5e42' : '#6a5038');
    p.disc(x, 210 + (k % 2) * 3, 3, '#8a6e50');
  }
  p.stroke(304, 204, 150, 46, '#3e3024');
  // The gate under a white canopy; its maroon beam carries the game's greeting.
  p.rect(470, 214, 170, 8, '#f4f1ea');
  p.hline(470, 214, 170, '#ffffff');
  p.rect(470, 222, 170, 3, '#00000030');
  for (const x of [480, 556, 626]) p.rect(x, 222, 8, 50, '#f4f1ea');
  p.rect(488, 225, 138, 47, '#3a3236');
  p.rect(488, 225, 138, 10, '#4a4044');
  p.rect(506, 192, 172, 18, '#7a2626');
  p.hline(506, 192, 172, '#9a3a32');
  p.hline(506, 209, 172, '#4a1616');
  p.rect(502, 190, 4, 24, '#f4f1ea');
  p.rect(678, 190, 4, 24, '#f4f1ea');
  // People in the gateway.
  for (let k = 0; k < 5; k++) person(p, 500 + k * 24, 271, { ...LOOKS[k % 6], arm: k % 3 });
  // White iron fence on a red base, hedges behind.
  for (let x = 640; x < 960; x += 8) p.ellipse(x + 4, 232, 6, 5, '#4f8a3c');
  p.rect(640, 236, 320, 36, '#efece4');
  for (let x = 640; x < 960; x += 5) p.vline(x, 236, 28, '#b8b4aa');
  p.hline(640, 236, 320, '#ffffff');
  p.rect(640, 264, 320, 8, '#b8402f');
  p.hline(640, 264, 320, '#d9604a');
  // The tall pylon: three white slabs of slightly different heights (left plain; no initials).
  const px0 = 700;
  for (const [dx, top, w] of [
    [0, 70, 30],
    [32, 56, 30],
    [64, 76, 30],
  ]) {
    p.rect(px0 + dx, top, w, 272 - top, '#f4f1ea');
    p.vline(px0 + dx, top, 272 - top, '#ffffff');
    p.vline(px0 + dx + w - 1, top, 272 - top, '#cfc9bc');
    p.rect(px0 + dx + w, top + 6, 2, 272 - top - 6, '#b8b2a6');
    for (let y = top + 40; y < 270; y += 50) p.hline(px0 + dx + 2, y, w - 4, '#e2ddd0');
  }
  p.rect(px0 - 6, 262, 108, 10, '#d8d2c4');
  // Utility poles, a streetlight and the famous tangle of wires.
  utilityPole(p, 150, 70);
  utilityPole(p, 600, 40);
  p.line(600, 44, 640, 30, '#8a929c');
  p.rect(636, 26, 14, 5, '#d6dde3');
  for (const [a, b, s] of [
    [[0, 90], [150, 80], 10],
    [[0, 100], [150, 96], 12],
    [[150, 80], [600, 50], 30],
    [[150, 84], [600, 56], 40],
    [[150, 96], [600, 66], 34],
    [[150, 100], [600, 74], 50],
    [[150, 108], [600, 80], 44],
    [[600, 50], [960, 30], 26],
    [[600, 60], [960, 46], 36],
    [[600, 74], [960, 70], 30],
    [[600, 80], [960, 92], 22],
  ])
    wires(p, a, b, s);
  // Yellow barricades, a pedicab, vendor carts with umbrellas.
  for (let x = 380; x < 470; x += 18) {
    p.rect(x, 262, 14, 3, '#f2c14e');
    p.rect(x + 1, 265, 2, 10, '#c9a030');
    p.rect(x + 11, 265, 2, 10, '#c9a030');
  }
  p.rect(780, 262, 46, 24, '#3b8ad0');
  p.rect(784, 254, 38, 10, '#6aaee8');
  p.rect(780, 250, 46, 4, '#ffffff');
  p.disc(790, 288, 6, '#2b2233');
  p.disc(818, 288, 6, '#2b2233');
  p.disc(840, 288, 6, '#2b2233');
  p.line(826, 270, 840, 288, '#55505f');
  for (const [x, c] of [
    [880, '#ffffff'],
    [930, '#f2c14e'],
  ]) {
    p.vline(x, 226, 46, '#8a8494');
    for (let k = 0; k < 9; k++)
      p.hline(x - 4 - k * 3, 222 + k, 9 + k * 6, k % 2 ? mix(c, '#000000', 0.08) : c);
    p.rect(x - 18, 262, 36, 22, '#7fc0d8');
    p.rect(x - 18, 262, 36, 4, '#f4f1ea');
  }
  return p;
}

// ---- How-to-play icons (48×48) --------------------------------------------------------------------------

function howIcons() {
  const frames = [];
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
  {
    const p = new Pix(48, 48);
    p.rect(4, 8, 30, 22, '#d94b3d');
    p.rect(8, 12, 22, 10, '#e8f2f6');
    p.rect(2, 4, 34, 5, '#2b3a5e');
    person(p, 12, 46, LOOKS[1]);
    person(p, 24, 46, LOOKS[2]);
    person(p, 36, 46, LOOKS[4]);
    p.outline(INK);
    frames.push(p);
  }
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
  return [
    { key: 'lagoon_intro', pix: introPanorama() },
    { key: 'lagoon_how', pix: howIcons(), frame: [48, 48] },
    ...storefrontAssets(),
    ...foodAssets(Object.values(STALL_ITEMS).flat().concat(['free_iced_tea'])),
  ];
}
