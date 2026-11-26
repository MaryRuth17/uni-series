// Lagoon Merienda UI art (SPEC-pup-lagoon §11 "Food, money and UI"): coins and bills (original designs, no
// faces, seals or security features: SPEC-pup-lagoon §15), notebook pages for the Vacant card and the HUD,
// pencil check boxes, rice bowls for the busog meter, time-of-day icons, a paper price tag, and the
// How to play pictures.
import { Pix, shade, sheet } from './pix.mjs';
import { foodPix } from './lagoon-food.mjs';
import { INK, LOOKS, canopy, person } from './lagoon-common.mjs';

// ---- Money ----------------------------------------------------------------------------------------

/** A coin: rim, face, embossed value. Bimetallic coins have an inner disc of the other metal. */
function coin(value, size, outer, inner = null) {
  const p = new Pix(size, size);
  const c = (size - 1) / 2;
  const r = Math.floor(size / 2) - 1;
  p.disc(c, c, r, shade(outer, -0.25));
  p.disc(c, c, r - 1, outer);
  if (inner) p.disc(c, c, r - 3, inner);
  // Rim highlight (upper left) and shade (lower right).
  for (let a = 0; a < 40; a++) {
    const ang = (a / 40) * Math.PI * 2;
    const x = Math.round(c + Math.cos(ang) * (r - 1));
    const y = Math.round(c + Math.sin(ang) * (r - 1));
    if (ang > Math.PI * 0.9 && ang < Math.PI * 1.6) p.px(x, y, shade(outer, 0.45));
    if (ang > Math.PI * 1.9 || ang < Math.PI * 0.6) p.px(x, y, shade(outer, -0.2));
  }
  const str = String(value);
  const w = p.textWidth(str, '3x5');
  p.text(
    Math.round(c - w / 2) + 1,
    Math.round(c - 2) + 1,
    str,
    shade(inner ?? outer, -0.45),
    '3x5',
  );
  p.text(Math.round(c - w / 2), Math.round(c - 2), str, shade(inner ?? outer, 0.5), '3x5');
  p.outline(INK);
  return p;
}

/** A bill: coloured paper, a frame, the value in the corners and large in the middle, a generic flower. */
function bill(value, base, w = 36, h = 18) {
  const p = new Pix(w, h);
  p.rect(0, 0, w, h, base);
  p.stroke(1, 1, w - 2, h - 2, shade(base, 0.35));
  p.stroke(2, 2, w - 4, h - 4, shade(base, -0.2));
  for (let x = 4; x < w - 4; x += 3) p.px(x, 3 + ((x / 3) % 2), shade(base, 0.2));
  // A generic sampaguita-like flower (top right), the value large on the left and small bottom right.
  const fx = w - 8;
  const fy = 6;
  for (const [dx, dy] of [
    [0, -2],
    [2, 0],
    [0, 2],
    [-2, 0],
  ])
    p.disc(fx + dx, fy + dy, 1, '#fff8e6');
  p.px(fx, fy, '#f2c14e');
  const big = new Pix(18, 7);
  big.text(0, 0, String(value), '#fff8e6', '5x7');
  p.blit(big, 5, 5);
  p.outline(INK);
  return p;
}

// ---- Notebook pages, checks, bowls, icons, tags ------------------------------------------------------

/** Lined notebook paper with a red margin, spiral rings on top and a soft shadow. */
function notebook(w, h, { spiral = 'top', lineGap = 14, margin = 34, top = 30 } = {}) {
  const p = new Pix(w, h);
  p.rect(4, 4, w - 4, h - 4, '#00000030');
  p.rect(0, 0, w - 4, h - 4, '#fffcf2');
  for (let y = top; y < h - 8; y += lineGap) p.hline(2, y, w - 8, '#cfe0f2');
  p.vline(margin, 2, h - 8, '#f2a6a6');
  p.vline(margin + 1, 2, h - 8, '#f8c8c8');
  // Paper grain.
  for (let k = 0; k < (w * h) / 60; k++) {
    const x = (k * 37) % (w - 6);
    const y = (k * 53) % (h - 6);
    p.px(x + 1, y + 1, '#f3ecdc');
  }
  // A folded corner (lower right).
  for (let k = 0; k < 12; k++) p.hline(w - 4 - 12 + k, h - 4 - 1 - k, 12 - k, '#efe6d0');
  p.line(w - 16, h - 5, w - 5, h - 16, '#d8cfb8');
  if (spiral === 'top') {
    // Spiral binding: a punched hole and a wire loop over the top edge.
    for (let x = 14; x < w - 14; x += 14) {
      p.disc(x, 6, 2, '#3a3346');
      p.rect(x - 2, -1, 1, 7, '#8a929c');
      p.rect(x + 2, -1, 1, 7, '#6a727c');
      p.hline(x - 1, -1, 3, '#d6dde3');
    }
  } else if (spiral === 'left') {
    for (let y = 10; y < h - 10; y += 12) {
      p.disc(4, y, 2, '#3a3346');
      p.rect(-1, y - 1, 6, 3, '#9aa3ad');
    }
  }
  p.stroke(0, 0, w - 4, h - 4, '#d8cfb8');
  return p;
}

function checkBoxes() {
  return sheet(
    [0, 1].map((ticked) => {
      const p = new Pix(12, 12);
      p.stroke(1, 2, 9, 9, '#55505f');
      p.px(1, 2, '#8a8494');
      if (ticked) {
        p.line(3, 6, 5, 9, '#2f8a4a');
        p.line(5, 9, 10, 1, '#2f8a4a');
        p.line(4, 6, 6, 9, '#3a9a6a');
      }
      return p;
    }),
  );
}

function bowls() {
  return sheet(
    [0, 1].map((full) => {
      const p = new Pix(12, 12);
      for (let y = 6; y < 11; y++) {
        const half = 5 - Math.floor(((y - 6) * (y - 6)) / 5);
        p.hline(6 - half, y, half * 2, full ? '#f4f1ea' : '#e3ddd0');
      }
      p.hline(1, 7, 10, '#3b6fb6');
      if (full) {
        p.ellipse(6, 5, 4, 2, '#ffffff');
        p.px(4, 4, '#e8e4da');
        p.px(7, 3, '#e8e4da');
      } else p.hline(2, 6, 8, '#c9c4b6');
      p.outline(INK);
      return p;
    }),
  );
}

function slotIcons() {
  const frames = [];
  for (const [sunY, sky, sun] of [
    [9, '#bfe0f7', '#f2c14e'],
    [5, '#8fc4ec', '#ffe08a'],
    [11, '#f0a060', '#f08a3c'],
  ]) {
    const p = new Pix(16, 16);
    p.disc(7.5, 7.5, 7, sky);
    p.disc(8, sunY, 3, sun);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      p.px(Math.round(8 + Math.cos(a) * 5), Math.round(sunY + Math.sin(a) * 5), sun);
    }
    p.rect(1, 12, 14, 3, '#5e9c48');
    p.outline(INK);
    frames.push(p);
  }
  return sheet(frames);
}

/** A small paper price tag (nine-slice source): cream card, a string hole on the left. */
function priceTag() {
  const p = new Pix(16, 12);
  p.rect(0, 0, 16, 12, '#fff8e6');
  p.stroke(0, 0, 16, 12, '#b8a888');
  p.hline(1, 10, 14, '#efe6d0');
  p.disc(3, 6, 1, '#b8a888');
  return p;
}

// ---- How to play pictures (104×72) --------------------------------------------------------------------

function frameBg(p, sky = '#bfe0f7') {
  p.vgrad(0, 0, 104, 48, [sky, '#eef6f8']);
  p.rect(0, 48, 104, 24, '#d9d5c8');
  for (let x = 0; x < 104; x += 12) p.vline(x, 48, 24, '#cbc6b8');
}

function howPictures() {
  const pics = [];
  // 1. Your baon and your listahan for this vacant.
  {
    const p = new Pix(104, 72);
    frameBg(p, '#f2e6c8');
    const nb = notebook(52, 60, { spiral: 'top', lineGap: 9, margin: 10, top: 14 });
    p.blit(nb, 6, 6);
    for (let k = 0; k < 4; k++) {
      p.stroke(14, 14 + k * 9, 5, 5, '#55505f');
      if (k < 2) {
        p.line(15, 16 + k * 9, 16, 18 + k * 9, '#2f8a4a');
        p.line(16, 18 + k * 9, 19, 13 + k * 9, '#2f8a4a');
      }
      p.hline(22, 16 + k * 9, 22 - (k % 2) * 6, '#55505f');
    }
    p.blit(bill(50, '#c0392b'), 60, 30);
    p.blit(coin(10, 16, '#c9d1d9', '#e2b23c'), 64, 50);
    p.blit(coin(5, 14, '#d9a441'), 82, 52);
    p.blit(coin(1, 12, '#c9d1d9'), 86, 38);
    // A pencil.
    p.line(58, 20, 90, 8, '#f2c14e');
    p.line(58, 21, 90, 9, '#e0a030');
    p.px(57, 21, '#2b2233');
    p.rect(88, 6, 4, 3, '#e98ab0');
    pics.push(p);
  }
  // 2. Look at a stall, then line up (pumila).
  {
    const p = new Pix(104, 72);
    frameBg(p);
    p.rect(4, 8, 62, 46, '#d22f2a');
    p.rect(4, 4, 62, 6, '#9a2b22');
    p.rect(8, 12, 54, 22, '#eef6f8');
    p.hline(8, 12, 54, '#ffffff');
    for (let k = 0; k < 2; k++) p.blit(foodPix(['adobo_meal', 'fewa'][k]), 10 + k * 26, 11);
    p.rect(4, 34, 62, 4, '#55505f');
    person(p, 50, 66, LOOKS[2]);
    person(p, 64, 66, LOOKS[1]);
    person(p, 78, 66, LOOKS[4]);
    person(p, 92, 66, { ...LOOKS[0], arm: 2 });
    // A "your turn" arrow.
    p.rect(88, 30, 3, 12, '#d94b3d');
    for (let k = 0; k < 4; k++) p.hline(86 + k, 42 + k, 7 - k * 2, '#d94b3d');
    pics.push(p);
  }
  // 3. Pay with coins and bills, count your sukli.
  {
    const p = new Pix(104, 72);
    frameBg(p, '#f2e6c8');
    p.rect(0, 40, 104, 8, '#c9b48a');
    p.hline(0, 40, 104, '#e0cfa6');
    // Vendor across the counter.
    person(p, 72, 40, { ...LOOKS[1], arm: 1 });
    // A hand giving a bill, sukli coming back.
    p.rect(10, 26, 20, 8, '#e8b48f');
    p.blit(bill(100, '#6a4ab0'), 20, 18);
    p.blit(coin(20, 18, '#e2b23c', '#c9d1d9'), 48, 46);
    p.blit(coin(10, 16, '#c9d1d9', '#e2b23c'), 66, 50);
    p.blit(coin(5, 14, '#d9a441'), 84, 52);
    // Sparkles: correct sukli!
    for (const [x, y] of [
      [44, 44],
      [86, 46],
      [64, 46],
    ]) {
      p.px(x, y - 2, '#ffffff');
      p.px(x, y + 2, '#ffffff');
      p.px(x - 2, y, '#ffffff');
      p.px(x + 2, y, '#ffffff');
      p.px(x, y, '#f2c14e');
    }
    pics.push(p);
  }
  // 4. Eat with the barkada; leftover goes to the alkansya.
  {
    const p = new Pix(104, 72);
    frameBg(p);
    canopy(p, 30, 10, 26, 5, '#3f7d3a');
    p.rect(28, 20, 4, 30, '#5a4632');
    p.rect(6, 54, 62, 5, '#8b5a3c');
    p.rect(10, 59, 3, 8, '#55505f');
    p.rect(60, 59, 3, 8, '#55505f');
    person(p, 16, 56, { ...LOOKS[1], sit: true });
    person(p, 30, 56, { ...LOOKS[2], sit: true, arm: 2 });
    person(p, 44, 56, { ...LOOKS[4], sit: true });
    person(p, 58, 56, { ...LOOKS[0], sit: true, arm: 1 });
    // Bamboo alkansya with a coin dropping in.
    p.rect(80, 30, 16, 36, '#c9a26a');
    for (let y = 36; y < 66; y += 9) p.hline(80, y, 16, '#8a6a3a');
    p.vline(82, 30, 36, '#e0c088');
    p.rect(85, 28, 6, 3, '#3e2a1a');
    p.blit(coin(1, 12, '#e2b23c'), 82, 12);
    p.outline(INK);
    pics.push(p);
  }
  return sheet(pics);
}

export function lagoonUiAssets() {
  return [
    { key: 'coin_1', pix: coin(1, 12, '#c9d1d9') },
    { key: 'coin_5', pix: coin(5, 14, '#d9a441') },
    { key: 'coin_10', pix: coin(10, 16, '#c9d1d9', '#e2b23c') },
    { key: 'coin_20', pix: coin(20, 18, '#e2b23c', '#c9d1d9') },
    { key: 'bill_50', pix: bill(50, '#c0392b') },
    { key: 'bill_100', pix: bill(100, '#6a4ab0') },
    {
      key: 'note_card',
      pix: notebook(424, 300, { spiral: 'top', lineGap: 14, margin: 34, top: 44 }),
    },
    {
      key: 'note_hud',
      pix: notebook(124, 176, { spiral: 'top', lineGap: 12, margin: 12, top: 22 }),
    },
    {
      key: 'note_how',
      pix: notebook(472, 300, { spiral: 'top', lineGap: 16, margin: 20, top: 46 }),
    },
    { key: 'ui_check', pix: checkBoxes(), frame: [12, 12] },
    { key: 'ui_bowl', pix: bowls(), frame: [12, 12] },
    { key: 'ui_slot', pix: slotIcons(), frame: [16, 16] },
    { key: 'ui_tag', pix: priceTag() },
    { key: 'lagoon_how', pix: howPictures(), frame: [104, 72] },
  ];
}
