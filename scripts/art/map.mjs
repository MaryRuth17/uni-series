// The U-Belt campus map (SPEC-homepage §4, §8): a top-down illustrated tourist map of Sampaloc, Quiapo,
// San Miguel and Sta. Mesa. Dense rooftops (rust, grey and teal GI sheets, blue water tanks), avenues with
// yellow lines and zebra crossings, the elevated LRT-2, the Pasig River with water hyacinth and bancas,
// Quiapo church with vendor umbrellas, a palengke, a jeepney terminal, barangay basketball courts,
// a fiesta street with banderitas, blue Manila street signs and a compass marked H / T / S / K.
// Geometry comes from src/map/mapGeometry.json, which the game reads too.
import { readFileSync } from 'node:fs';
import { Pix, hex, mix, shade, sheet, toHex } from './pix.mjs';

const GEO = JSON.parse(
  readFileSync(new URL('../../src/map/mapGeometry.json', import.meta.url), 'utf8'),
);
const W = 640;
const H = 360;
const INK = '#2b2233';
const NAVY = '#1d2348';
const GLOW = '#ffe08a';

/** Repeatable hash of integers to [0, 1). */
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

/** Nearest point on a polyline: distance, distance along, signed side (+ = right of travel), direction. */
function polyInfo(px, py, pts) {
  let best = null;
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const L = Math.hypot(dx, dy);
    let t = ((px - ax) * dx + (py - ay) * dy) / (L * L);
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    if (!best || d < best.d) {
      best = {
        d,
        along: acc + t * L,
        side: (dx * (py - ay) - dy * (px - ax)) / L,
        ux: dx / L,
        uy: dy / L,
      };
    }
    acc += L;
  }
  return best;
}

function polyLength(pts) {
  let s = 0;
  for (let i = 0; i < pts.length - 1; i++)
    s += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return s;
}

/** Point and direction at a distance along a polyline. */
function polyAt(pts, d) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const L = Math.hypot(bx - ax, by - ay);
    if (d <= L || i === pts.length - 2) {
      const t = Math.max(0, Math.min(1, d / L));
      return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, ux: (bx - ax) / L, uy: (by - ay) / L };
    }
    d -= L;
  }
  return null;
}

/** y of the LRT line at an x (the line runs left to right). */
function lrtAt(x) {
  const pts = GEO.lrt.points;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    if (x >= ax && x <= bx) return ay + ((x - ax) / (bx - ax)) * (by - ay);
  }
  return pts[0][1];
}

const ROAD_HW = { boulevard: 4.5, avenue: 3.5, street: 2 };
const ROADS = GEO.roads.map((r) => ({ ...r, hw: ROAD_HW[r.kind] }));
const ESPANA = ROADS.find((r) => r.id === 'espana');
const E0 = ESPANA.points[0];
const EN = (() => {
  const [a, b] = ESPANA.points;
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return { ux: (b[0] - a[0]) / L, uy: (b[1] - a[1]) / L };
})();

// ---- City fabric: blocks, lots, alleys -----------------------------------------------------------

const ROOFS = [
  '#b4553d',
  '#b4553d',
  '#c46a43',
  '#9c4a3a',
  '#a85a48',
  '#8f97a3',
  '#a3a9b2',
  '#7f8794',
  '#4f8f8c',
  '#4b78ad',
  '#6e9653',
  '#d4c6a8',
  '#d28a7c',
  '#c99a3e',
  '#b4553d',
  '#8f97a3',
];
const FLAT_ROOFS = ['#d6cfc2', '#c8c1b4', '#e0d8c8', '#bdb8b0'];
const STREET = '#eadfc4';
/** The calming wash (owner feedback on the busy map): share toward paper and grey. */
const PAPER = '#efe5cf';
const CALM = { city: 0.5, road: 0.15, desaturate: 0.45 };
const ALLEY = '#d9caa8';

/** Local grid coordinates: each district has its own street grid angle (like the real city). */
function local(x, y) {
  // North-west of España: the grid runs along the boulevard (Sampaloc toward UST).
  const n = -(x - E0[0]) * EN.uy + (y - E0[1]) * EN.ux;
  if (n < 0) return { s: x * EN.ux + y * EN.uy + 900, t: -x * EN.uy + y * EN.ux + 900, r: 1 };
  if (x > 405 && y < 192) {
    const a = -0.2;
    return {
      s: Math.cos(a) * x - Math.sin(a) * y + 900,
      t: Math.sin(a) * x + Math.cos(a) * y + 900,
      r: 2,
    };
  }
  if (y > 300) {
    const a = 0.12;
    return {
      s: Math.cos(a) * x - Math.sin(a) * y + 900,
      t: Math.sin(a) * x + Math.cos(a) * y + 900,
      r: 3,
    };
  }
  return { s: x + 900, t: y + 900, r: 0 };
}

const BW = 28;
const BH = 18;

/**
 * Classify one pixel of city fabric. Returns { kind: 'street'|'alley'|'roof'|'flat'|'court'|'park', ... }.
 */
function fabric(x, y) {
  const { s, t, r } = local(x, y);
  const row = Math.floor(t / BH);
  const tb = t - row * BH;
  const s2 = s + hash(r, row, 7) * BW;
  const col = Math.floor(s2 / BW);
  const sb = s2 - col * BW;
  if (tb < 2 && hash(r, row, col, 1) > 0.1) return { kind: 'street' };
  if (sb < 2 && hash(r, row, col, 2) > 0.3) return { kind: 'street' };
  const a = Math.max(0, sb - 2);
  const b = Math.max(0, tb - 2);
  const kindRoll = hash(r, row, col, 4);
  const block = { r, row, col, a, b };
  if (kindRoll < 0.06) return { kind: 'flat', ...block, tall: kindRoll < 0.03 };
  if (kindRoll < 0.085) return { kind: 'court', ...block };
  if (kindRoll < 0.11) return { kind: 'park', ...block };
  const lw = 5 + Math.floor(hash(r, row, col, 3) * 3);
  const j = b < 8 ? 0 : 1;
  const v = Math.floor(b) - j * 8;
  const i = Math.floor(a / lw);
  const u = Math.floor(a) - i * lw;
  // Some lots are a passage between houses (eskinita).
  if (j === 1 && u === 0 && hash(r, row, col, i, 9) < 0.25) return { kind: 'alley' };
  return { kind: 'roof', ...block, i, j, u, v, lw };
}

function roofColor(f) {
  const { r, row, col, i, j, u, v, lw } = f;
  const base = ROOFS[Math.floor(hash(r, row, col, i, j, 5) * ROOFS.length)];
  const vertical = hash(r, row, col, i, j, 6) < 0.35;
  let c = base;
  if (vertical) c = shade(base, u < lw / 2 ? 0.1 : -0.12);
  else c = shade(base, v < 4 ? 0.1 : -0.12);
  if ((vertical && u === Math.floor(lw / 2)) || (!vertical && v === 3)) c = shade(base, 0.28);
  // Corrugated GI sheets: faint ribs.
  if (!vertical && u % 2 === 0) c = shade(c, -0.05);
  if (vertical && v % 2 === 0) c = shade(c, -0.05);
  if (u === lw - 1 || v === 7) c = shade(base, -0.35);
  else if (u === 0 || v === 0) c = shade(c, 0.12);
  return c;
}

function flatColor(f, x, y) {
  const base = FLAT_ROOFS[Math.floor(hash(f.r, f.row, f.col, 8) * FLAT_ROOFS.length)];
  const a = Math.floor(f.a);
  const b = Math.floor(f.b);
  if (a === 0 || b === 0) return shade(base, 0.2);
  if (a >= BW - 3 || b >= BH - 3) return shade(base, -0.3);
  if (a === 1 || b === 1) return shade(base, -0.08);
  return hash(x, y, 3) < 0.05 ? shade(base, -0.06) : base;
}

function courtColor(f) {
  const a = Math.floor(f.a);
  const b = Math.floor(f.b);
  const clay = hash(f.r, f.row, f.col, 11) < 0.5 ? '#c0613d' : '#3f7fb0';
  if (a < 2 || a > 23 || b < 2 || b > 13) return '#cfc6b4';
  if (a === 2 || a === 23 || b === 2 || b === 13 || a === 12) return '#f4efe6';
  if ((a === 4 || a === 21) && b >= 6 && b <= 9) return '#f4efe6';
  return clay;
}

// ---- Drawing helpers ----------------------------------------------------------------------------

function tree(p, x, y, r = 3, base = '#3f7d3a') {
  p.ellipse(x + 1, y + 1, r, r, '#00000040');
  p.disc(x, y, r, base);
  p.disc(x - 1, y - 1, Math.max(1, r - 1), shade(base, 0.2));
  p.px(x - 1, y - 2, shade(base, 0.4));
  p.px(x + r - 1, y + 1, shade(base, -0.25));
}

function waterTank(p, x, y) {
  p.px(x + 1, y + 1, '#00000050');
  p.rect(x, y, 2, 2, '#3a7fc4');
  p.px(x, y, '#8ec4f0');
}

/** Blue Manila street sign with white letters (like the real ones on every corner). */
function streetSign(p, cx, cy, str, bg = '#245fb0') {
  const w = p.textWidth(str, '3x5') + 6;
  const x = Math.round(cx - w / 2);
  const y = Math.round(cy - 5);
  p.rect(x + 1, y + 1, w, 10, '#00000040');
  p.rect(x, y, w, 10, bg);
  p.stroke(x + 1, y + 1, w - 2, 8, '#ffffff');
  p.stroke(x, y, w, 10, shade(bg, -0.4));
  p.text(x + 3, y + 3, str, '#ffffff', '3x5');
}

/** Area names: dark letters with a cream halo, like a printed tourist map. */
function areaLabel(p, cx, y, str, color = '#6b4f36') {
  const w = p.textWidth(str, '5x7');
  const x = Math.round(cx - w / 2);
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
  ])
    p.text(x + dx, y + dy, str, '#fbf1d8c0', '5x7');
  p.text(x, y, str, color, '5x7');
}

// ---- Landmarks ------------------------------------------------------------------------------------

/** Quiapo: a baroque church with a dome and twin belfries, a plaza of vendor umbrellas in front. */
function church(p, lights, x, y) {
  // Plaza (stone paving).
  p.rect(x - 2, y - 2, 40, 34, '#dccfb2');
  for (let j = 0; j < 34; j += 3)
    for (let i = (j / 3) % 2; i < 40; i += 4) p.px(x - 2 + i, y - 2 + j, '#cbbd9c');
  // Church: nave (top-down) with transept and dome, facade facing the plaza (south).
  const roof = '#b85a40';
  p.rect(x + 12, y, 12, 22, roof);
  p.rect(x + 6, y + 5, 24, 7, roof);
  for (let j = y; j < y + 22; j += 2) p.hline(x + 12, j, 12, shade(roof, -0.08));
  p.vline(x + 18, y, 22, shade(roof, 0.25));
  p.hline(x + 6, y + 8, 24, shade(roof, 0.25));
  p.rect(x + 24, y + 1, 1, 22, '#00000040');
  p.disc(x + 18, y + 8, 4, '#d9c9a0');
  p.disc(x + 17, y + 7, 2, '#f1e6c8');
  p.px(x + 18, y + 8, '#a5916a');
  // Belfries and facade.
  p.rect(x + 10, y + 21, 16, 3, '#efe3c6');
  p.bevel(x + 9, y + 19, 5, 5, '#e8dcbc', { outline: '#8a7a5a' });
  p.bevel(x + 22, y + 19, 5, 5, '#e8dcbc', { outline: '#8a7a5a' });
  p.px(x + 11, y + 21, '#6d5b3e');
  p.px(x + 24, y + 21, '#6d5b3e');
  // Vendor umbrellas and people on the plaza.
  const colors = ['#d94b3d', '#f2c14e', '#3b6fb6', '#3a9a6a', '#e98ab0', '#ffffff'];
  for (let k = 0; k < 14; k++) {
    const ux = x + 1 + Math.floor(hash(k, 31) * 34);
    const uy = y + 25 + Math.floor(hash(k, 32) * 6);
    const c = colors[k % colors.length];
    p.disc(ux, uy, 1, c);
    p.px(ux + 1, uy + 1, '#00000040');
    lights.px(ux, uy, '#ffcf6a90');
  }
  for (let k = 0; k < 24; k++) {
    p.px(x + Math.floor(hash(k, 33) * 38), y + 23 + Math.floor(hash(k, 34) * 9), colors[k % 6]);
  }
  for (let j = 0; j < 24; j++)
    for (let i = 0; i < 20; i++) lights.px(x + 8 + i, y + j, '#4a3a2018');
}

/** Palengke: long market halls with ridged roofs and rows of colourful tarps. */
function market(p, lights, x, y, w, h) {
  p.rect(x, y, w, h, '#cfc3a6');
  const hall = '#8f97a3';
  for (let k = 0; k < 2; k++) {
    const hy = y + 3 + k * 12;
    p.rect(x + 3, hy, w - 6, 8, hall);
    for (let i = 0; i < w - 6; i += 2) p.vline(x + 3 + i, hy, 8, shade(hall, -0.08));
    p.hline(x + 3, hy + 3, w - 6, shade(hall, 0.3));
    p.hline(x + 3, hy + 7, w - 6, shade(hall, -0.35));
    p.rect(x + 3, hy + 8, w - 6, 1, '#00000040');
  }
  const tarps = ['#d94b3d', '#3b6fb6', '#f2c14e', '#3a9a6a', '#e98ab0', '#f08a3c'];
  for (let i = 0; i < w - 4; i += 4) {
    const c = tarps[Math.floor(hash(i, 41) * tarps.length)];
    p.rect(x + 2 + i, y + h - 5, 3, 3, c);
    p.px(x + 2 + i, y + h - 5, shade(c, 0.3));
    p.px(x + 3 + i, y + h - 2, '#00000040');
    lights.px(x + 3 + i, y + h - 4, '#ffcf6a80');
  }
}

/** A jeepney terminal: rows of parked jeeps under the sun. */
function terminal(p, lights, x, y) {
  p.rect(x, y, 30, 20, '#8b8693');
  for (let i = 0; i < 30; i += 5) p.vline(x + i, y + 1, 18, '#a9a4b0');
  const bodies = ['#d94b3d', '#f2c14e', '#3b6fb6', '#3a9a6a', '#c9d1d9'];
  for (let r = 0; r < 2; r++)
    for (let k = 0; k < 6; k++) {
      if (hash(k, r, 51) < 0.2) continue;
      const jx = x + 1 + k * 5;
      const jy = y + 1 + r * 10;
      const c = bodies[Math.floor(hash(k, r, 52) * bodies.length)];
      p.rect(jx, jy, 3, 8, c);
      p.rect(jx, jy + 2, 3, 5, '#f1ece4');
      p.px(jx + 1, jy + 1, '#c9d1d9');
      p.px(jx + 3, jy + 1, '#00000040');
      lights.px(jx + 1, jy, '#fff6c9');
    }
}

function compass(p, cx, cy) {
  p.disc(cx + 1, cy + 1, 15, '#00000030');
  p.disc(cx, cy, 15, '#fbf1d8');
  p.disc(cx, cy, 14, '#f3e6c8');
  for (let a = 0; a < 32; a++) {
    const ang = (a / 32) * Math.PI * 2;
    p.px(cx + Math.round(Math.cos(ang) * 15), cy + Math.round(Math.sin(ang) * 15), '#8a6f4e');
  }
  // Four-point star; north (Hilaga) in red.
  for (let k = 0; k < 8; k++) {
    p.line(cx, cy - 9 + Math.abs(k - 4), cx, cy, k < 4 ? '#d94b3d' : '#b8402f');
  }
  p.line(cx - 2, cy, cx, cy - 9, '#d94b3d');
  p.line(cx + 2, cy, cx, cy - 9, '#a3382a');
  p.line(cx - 2, cy, cx, cy + 9, '#6b4f36');
  p.line(cx + 2, cy, cx, cy + 9, '#4b3826');
  p.line(cx, cy - 2, cx + 9, cy, '#6b4f36');
  p.line(cx, cy + 2, cx + 9, cy, '#4b3826');
  p.line(cx, cy - 2, cx - 9, cy, '#6b4f36');
  p.line(cx, cy + 2, cx - 9, cy, '#4b3826');
  p.px(cx, cy, '#f2c14e');
  // H, T, S, K: Hilaga, Timog, Silangan, Kanluran.
  p.text(cx - 1, cy - 14, 'H', '#d94b3d', '3x5');
  p.text(cx - 1, cy + 10, 'T', INK, '3x5');
  p.text(cx + 10, cy - 2, 'S', INK, '3x5');
  p.text(cx - 12, cy - 2, 'K', INK, '3x5');
}

/** Banderitas strung across a street: little triangles in fiesta colours. */
function banderitas(p, lights, x0, y0, x1, y1) {
  const colors = ['#d94b3d', '#f2c14e', '#3b6fb6', '#3a9a6a', '#ffffff', '#e98ab0'];
  const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 2);
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const sag = Math.sin(t * Math.PI) * 1.5;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + sag;
    p.px(x, y, '#5a4a3a');
    if (k % 2 === 0) {
      p.px(x, y + 1, colors[(k / 2) % colors.length]);
      lights.px(x, y, '#ffcf6aa0');
    }
  }
}

// ---- The base map ---------------------------------------------------------------------------------

function inCampus(x, y, pad = 0) {
  for (const [id, c] of Object.entries(GEO.campuses)) {
    const dx = Math.abs(x - c.x);
    const dy = Math.abs(y - c.y);
    if (c.shape === 'diamond') {
      if (dx / (c.w / 2 + pad) + dy / (c.h / 2 + pad) <= 1) return { id, c, dx, dy };
    } else if (dx <= c.w / 2 + pad && dy <= c.h / 2 + pad) return { id, c, dx, dy };
  }
  return null;
}

/** Special plots drawn by hand; the fabric leaves them empty. */
const PLOTS = [
  { kind: 'church', x: 20, y: 212, w: 40, h: 34 },
  { kind: 'market', x: 78, y: 214, w: 52, h: 28 },
  { kind: 'terminal', x: 150, y: 218, w: 30, h: 20 },
  { kind: 'park', x: 452, y: 214, w: 36, h: 28 },
  { kind: 'park', x: 330, y: 266, w: 70, h: 14 },
];
const inPlot = (x, y) =>
  PLOTS.find((q) => x >= q.x - 1 && x < q.x + q.w + 1 && y >= q.y - 1 && y < q.y + q.h + 1);

function baseMap() {
  const p = new Pix(W, H);
  const lights = new Pix(W, H);
  const solid = new Uint8Array(W * H); // 1 = building (casts a shadow), 2 = tall building
  const kind = new Array(W * H);
  const lots = [];

  // 1. City fabric.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (inPlot(x, y)) {
        kind[i] = 'plot';
        continue;
      }
      const f = fabric(x, y);
      kind[i] = f.kind;
      let c = STREET;
      if (f.kind === 'roof') {
        c = roofColor(f);
        solid[i] = 1;
        if (f.u === 1 && f.v === 1) lots.push({ x, y, f });
      } else if (f.kind === 'flat') {
        c = flatColor(f, x, y);
        solid[i] = f.tall ? 2 : 1;
        if (Math.floor(f.a) === 3 && Math.floor(f.b) === 3) lots.push({ x, y, f });
      } else if (f.kind === 'court') {
        c = courtColor(f);
        if (Math.floor(f.a) === 2 && Math.floor(f.b) === 2) lots.push({ x, y, f });
      } else if (f.kind === 'park') {
        c = hash(x, y, 12) < 0.3 ? '#93c46c' : '#86b860';
        if (Math.floor(f.a) % 7 === 3 && Math.floor(f.b) % 6 === 3) lots.push({ x, y, f });
      } else if (f.kind === 'alley') c = ALLEY;
      p.px(x, y, c);
    }

  // 2. Hand-placed plots.
  for (const q of PLOTS) {
    if (q.kind === 'church') church(p, lights, q.x + 2, q.y + 2);
    if (q.kind === 'market') market(p, lights, q.x, q.y, q.w, q.h);
    if (q.kind === 'terminal') terminal(p, lights, q.x, q.y);
    if (q.kind === 'park') {
      for (let y = q.y; y < q.y + q.h; y++)
        for (let x = q.x; x < q.x + q.w; x++)
          p.px(x, y, hash(x, y, 13) < 0.3 ? '#93c46c' : '#86b860');
      p.stroke(q.x, q.y, q.w, q.h, '#e6d7b4');
      if (q.w < 50) {
        // A small plaza with a fountain and a monument.
        p.disc(q.x + q.w / 2, q.y + q.h / 2, 7, '#e6d7b4');
        p.disc(q.x + q.w / 2, q.y + q.h / 2, 4, '#6aa9cd');
        p.disc(q.x + q.w / 2, q.y + q.h / 2, 1, '#e6d7b4');
        lights.disc(q.x + q.w / 2, q.y + q.h / 2, 4, '#3a5a8060');
      }
      for (let k = 0; k < q.w / 6; k++)
        lots.push({
          x: q.x + 3 + k * 6,
          y: q.y + 3 + ((k * 7) % Math.max(1, q.h - 6)),
          f: { kind: 'tree' },
        });
    }
  }

  // 3. Roads, sidewalks and zebra crossings.
  const roadAt = new Array(W * H);
  const junctions = [];
  for (const a of ROADS)
    for (const b of ROADS) {
      if (a.id >= b.id) continue;
      for (const pt of [a.points[0], a.points[a.points.length - 1]]) {
        const info = polyInfo(pt[0], pt[1], b.points);
        if (info.d < 2) junctions.push({ x: pt[0], y: pt[1] });
      }
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let best = null;
      for (const r of ROADS) {
        const info = polyInfo(x, y, r.points);
        if (info.d <= r.hw + 1.5 && (!best || info.d - r.hw < best.info.d - best.r.hw))
          best = { r, info };
      }
      if (!best) continue;
      const i = y * W + x;
      roadAt[i] = best;
      solid[i] = 0;
      const { r, info } = best;
      if (info.d > r.hw) {
        p.px(x, y, '#d8ccb0');
        continue;
      }
      let c = r.kind === 'street' ? '#8b8693' : '#6d6976';
      if (hash(x, y, 21) < 0.08) c = shade(c, -0.07);
      const side = Math.abs(info.side);
      if (r.kind === 'boulevard') {
        if (side < 1.2) c = '#7fae5a';
        else if (Math.abs(side - 3) < 0.5 && info.along % 6 < 3) c = '#e8e4dc';
      } else if (r.kind === 'avenue') {
        if (side < 0.5 && info.along % 6 < 3) c = '#f2c14e';
        else if (Math.abs(side - (r.hw - 0.7)) < 0.5) c = shade(c, 0.25);
      }
      // Zebra crossings near junctions.
      for (const j of junctions) {
        const dj = Math.hypot(x - j.x, y - j.y);
        if (dj > r.hw + 3 && dj < r.hw + 6 && r.kind !== 'street') {
          if (Math.floor(info.side + 20) % 2 === 0) c = '#efece4';
        }
      }
      p.px(x, y, c);
      kind[i] = 'road';
    }

  // 4. Shadows: buildings cast to the lower right (afternoon sun from the upper left).
  const shadeAt = [];
  for (let y = 1; y < H; y++)
    for (let x = 1; x < W; x++) {
      const i = y * W + x;
      if (solid[i]) continue;
      const k = kind[i];
      if (k === 'plot' || k === 'park' || k === 'court') continue;
      if (solid[i - W - 1] || solid[i - 1] || (y > 1 && x > 1 && solid[i - 2 * W - 2] === 2))
        shadeAt.push([x, y, solid[i - W - 1] === 2 || solid[i - 2 * W - 2] === 2 ? 0.32 : 0.2]);
    }
  for (const [x, y, a] of shadeAt) p.px(x, y, toHex([40, 24, 30, a * 255]));

  // 5. Water: the Pasig River and its esteros; bridges where roads cross.
  const riverPts = GEO.river.points;
  const rw = GEO.river.width / 2;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const ri = polyInfo(x, y, riverPts);
      let d = ri.d;
      let hw = rw;
      for (const c of GEO.creeks) {
        const ci = polyInfo(x, y, c);
        if (ci.d - 2.5 < d - hw) {
          d = ci.d;
          hw = 2.5;
        }
      }
      if (d > hw + 1.5) continue;
      const i = y * W + x;
      const road = roadAt[i];
      if (road && road.info.d <= road.r.hw + 1.5) {
        // Bridge deck over the water, with railings and a shadow on the water.
        const c = road.info.d > road.r.hw ? '#a9a3b0' : p.get(x, y);
        p.px(x, y, toHex(c));
        if (road.info.d > road.r.hw) p.px(x, y, '#a9a3b0');
        continue;
      }
      solid[i] = 0;
      kind[i] = 'water';
      if (d > hw) {
        p.px(x, y, d > hw + 0.8 ? '#a79d88' : '#cfc5ae');
        continue;
      }
      const near = roadAt[y * W + x - 3] || roadAt[y * W + x + 3];
      let c = d < hw * 0.55 ? '#4f93bd' : '#67a7cc';
      if (hash(Math.floor(x / 3), y, 22) < 0.05) c = '#a6d2ea';
      if (near) c = shade(c, -0.25);
      p.px(x, y, c);
    }

  // 6. Campus grounds: lawns, a perimeter wall, paths, trees.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const hit = inCampus(x, y);
      if (!hit) continue;
      const i = y * W + x;
      if (roadAt[i] && roadAt[i].info.d <= roadAt[i].r.hw) continue;
      solid[i] = 0;
      const { c, dx, dy } = hit;
      const edge =
        c.shape === 'diamond'
          ? dx / (c.w / 2) + dy / (c.h / 2) > 0.96
          : dx > c.w / 2 - 1 || dy > c.h / 2 - 1;
      let col = hash(x, y, 14) < 0.25 ? '#98cc70' : '#8bc163';
      if (c.shape === 'diamond' && dy < c.h / 4 && y < c.y && dx / (c.w / 2) + dy / (c.h / 2) < 0.7)
        col = (Math.floor((x - c.x) / 3) & 1) === 0 ? '#79b357' : '#72ab50';
      if (dx < 1.5 || dy < 1.5) col = '#e6d7b4';
      if (edge) col = '#f3ead2';
      p.px(x, y, col);
    }
  for (const [id, c] of Object.entries(GEO.campuses)) {
    if (id === 'pup-lagoon') {
      // The PUP lagoon: a pond with a walk around it and food stalls on its banks.
      p.ellipse(c.x - 14, c.y + 8, 10, 6, '#e6d7b4');
      p.ellipse(c.x - 14, c.y + 8, 8, 4, '#5f9fc4');
      p.px(c.x - 17, c.y + 7, '#a6d2ea');
      for (let k = 0; k < 6; k++)
        p.rect(c.x - 26 + k * 4, c.y + 15, 3, 2, ['#d94b3d', '#f2c14e', '#3b6fb6'][k % 3]);
    }
    const n = Math.round((c.w + c.h) / 9);
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const per = 2 * (c.w + c.h);
      let d = t * per;
      let tx;
      let ty;
      if (d < c.w) [tx, ty] = [c.x - c.w / 2 + d, c.y - c.h / 2 + 3];
      else if ((d -= c.w) < c.h) [tx, ty] = [c.x + c.w / 2 - 3, c.y - c.h / 2 + d];
      else if ((d -= c.h) < c.w) [tx, ty] = [c.x + c.w / 2 - d, c.y + c.h / 2 - 3];
      else [tx, ty] = [c.x - c.w / 2 + 3, c.y + c.h / 2 - (d - c.w)];
      if (inCampus(tx, ty, -3)) tree(p, Math.round(tx), Math.round(ty), 2, '#3f7d3a');
    }
  }

  // 7. Trees, water tanks, rooftop details, courts at night.
  for (const { x, y, f } of lots) {
    if (kind[y * W + x] === 'road' || kind[y * W + x] === 'water' || inCampus(x, y, 2)) continue;
    if (f.kind === 'tree') {
      tree(p, x, y, 3);
      continue;
    }
    if (f.kind === 'park') {
      tree(p, x, y, 3, hash(x, y) < 0.5 ? '#3f7d3a' : '#4d8a3c');
      continue;
    }
    if (f.kind === 'court') {
      for (let j = 0; j < 12; j++)
        for (let i = 0; i < 22; i++) lights.px(x + i, y + j, '#30302418');
      for (const [i, j] of [
        [0, 0],
        [21, 0],
        [0, 11],
        [21, 11],
      ])
        lights.px(x + i, y + j, '#fff6c9');
      continue;
    }
    if (f.kind === 'flat') {
      for (let k = 0; k < 3; k++) waterTank(p, x + 2 + k * 5, y + 1);
      p.rect(x + 16, y + 4, 4, 3, shade(FLAT_ROOFS[0], -0.25));
      for (let k = 0; k < 8; k++)
        if (hash(x, y, k, 61) < 0.2)
          lights.px(
            x + Math.floor(hash(x, k, 62) * 20),
            y + Math.floor(hash(y, k, 63) * 10),
            '#ffd27a',
          );
      continue;
    }
    const roll = hash(x, y, 71);
    if (roll < 0.1) waterTank(p, x + 1, y);
    else if (roll < 0.17) tree(p, x + 2, y + 2, 2, hash(x, y, 72) < 0.5 ? '#3f7d3a' : '#5a8f3a');
    else if (roll < 0.2) {
      // A clothesline on the roof.
      for (let k = 0; k < 4; k++)
        p.px(x + k, y + 2, ['#ffffff', '#e98ab0', '#3b6fb6', '#f2c14e'][k]);
    }
    if (hash(x, y, 73) < 0.08)
      lights.px(
        x + 1 + Math.floor(hash(x, y, 74) * 3),
        y + 1 + Math.floor(hash(x, y, 75) * 4),
        '#ffcf6a',
      );
  }
  // España is tree-lined; so is the riverside.
  for (let d = 4; d < polyLength(ESPANA.points); d += 9) {
    const q = polyAt(ESPANA.points, d);
    tree(p, Math.round(q.x), Math.round(q.y), 1, '#3f7d3a');
  }

  // 7b. Calm the city (owner, H4): a paper wash over houses, alleys and plots, a lighter one over
  // roads, so campuses, avenues, the LRT-2 and the river read first.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const k = kind[y * W + x];
      if (k === 'water' || inCampus(x, y, 1)) continue;
      const amount = k === 'road' ? CALM.road : CALM.city;
      const [r, g, b] = p.get(x, y);
      const grey = 0.3 * r + 0.59 * g + 0.11 * b;
      const desat = [r, g, b].map((v) => v + (grey - v) * CALM.desaturate);
      const paper = hex(PAPER);
      p.px(x, y, toHex(desat.map((v, n) => v + (paper[n] - v) * amount)));
    }
  // A crisp frame around each campus ground so the stops stand out.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (inCampus(x, y)) continue;
      if (inCampus(x, y, 1.6)) p.px(x, y, '#7a5f40');
      else if (inCampus(x - 1, y - 1, 2.6)) p.px(x, y, '#5a463040');
    }

  // 8. Streetlights along avenues (night overlay) and lamps on bridges.
  for (const r of ROADS) {
    if (r.kind === 'street') continue;
    const len = polyLength(r.points);
    for (let d = 5; d < len; d += 16) {
      const q = polyAt(r.points, d);
      for (const sgn of [-1, 1]) {
        const lx = Math.round(q.x - q.uy * sgn * (r.hw + 1));
        const ly = Math.round(q.y + q.ux * sgn * (r.hw + 1));
        lights.ellipse(lx, ly, 2, 2, '#ffcf6a40');
        lights.px(lx, ly, '#fff2b0');
      }
    }
  }

  // 9. LRT-2: elevated concrete deck with purple edges, a shadow, and three stations.
  const lrt = GEO.lrt.points;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const info = polyInfo(x, y, lrt);
      if (info.d > 7) continue;
      if (info.side > 3 && info.side < 7) {
        p.px(x, y, '#28182840');
        continue;
      }
      if (info.d > 3) continue;
      let c = '#c7c5cf';
      const s = Math.abs(info.side);
      if (s > 2.3) c = '#7b4bb3';
      else if (Math.abs(s - 1.2) < 0.35) c = '#8d8a99';
      else if (Math.floor(info.along) % 8 === 0) c = '#b3b1bc';
      p.px(x, y, c);
    }
  for (const [key, sx] of Object.entries(GEO.lrt.stations)) {
    const sy = lrtAt(sx);
    p.rect(sx - 11, Math.round(sy) - 4, 23, 9, '#28182840');
    p.bevel(sx - 12, Math.round(sy) - 5, 23, 9, '#a585d6', { outline: '#5b3c8a' });
    p.hline(sx - 11, Math.round(sy) - 1, 21, '#d7c6ef');
    for (let k = 0; k < 6; k++) lights.px(sx - 9 + k * 4, Math.round(sy) - 1, '#e0c8ff');
    lights.ellipse(sx, Math.round(sy), 13, 6, '#6040a030');
    void key;
  }

  // 10. River life: water hyacinth, bancas moored by the walls, a ferry station.
  for (let k = 0; k < 40; k++) {
    const d = hash(k, 81) * polyLength(riverPts);
    const q = polyAt(riverPts, d);
    const off = (hash(k, 82) - 0.5) * (rw * 1.4);
    const hx = Math.round(q.x - q.uy * off);
    const hy = Math.round(q.y + q.ux * off);
    if (roadAt[hy * W + hx]) continue;
    p.rect(hx, hy, 3, 2, '#4f8f3c');
    p.px(hx + 1, hy - 1, '#6fae4e');
    if (k % 3 === 0) p.px(hx + 2, hy, '#b48ad8');
  }
  for (let k = 0; k < 6; k++) {
    const q = polyAt(riverPts, 40 + k * 105);
    const bx = Math.round(q.x);
    const by = Math.round(q.y + (k % 2 ? rw - 3 : -rw + 2));
    if (roadAt[by * W + bx]) continue;
    p.rect(bx, by, 7, 2, '#8a5a3a');
    p.hline(bx + 1, by, 5, '#b07a4e');
    p.px(bx - 1, by + 1, '#e8dcc0');
    p.px(bx + 7, by + 1, '#e8dcc0');
  }
  {
    // Ferry station (a floating pontoon) by Quiapo.
    const q = polyAt(riverPts, 128);
    p.bevel(Math.round(q.x) - 8, Math.round(q.y) - rw + 1, 16, 5, '#f1ece4', {
      outline: '#3b6fb6',
    });
    lights.hline(Math.round(q.x) - 7, Math.round(q.y) - rw + 3, 14, '#fff2b0');
  }

  // 11. Fiesta street with banderitas (Sampaloc), and more over a street in Sta. Mesa.
  banderitas(p, lights, 286, 118, 318, 112);
  banderitas(p, lights, 288, 124, 320, 118);
  banderitas(p, lights, 452, 150, 482, 156);
  banderitas(p, lights, 560, 120, 590, 125);

  // 12. Labels: blue street signs, purple LRT signs, area names, the river.
  const signs = [
    ['ESPAÑA BLVD.', 287, 62],
    ['RECTO AVE.', 182, 214],
    ['MAGSAYSAY BLVD.', 598, 199],
    ['MORAYTA', 126, 110],
    ['MENDIOLA', 340, 216],
  ];
  for (const [str, x, y] of signs) streetSign(p, x, y, str);
  for (const [key, sx] of Object.entries(GEO.lrt.stations))
    streetSign(p, sx, lrtAt(sx) - 13, key.toUpperCase(), '#6d3fae');
  streetSign(p, 624, 172, 'LRT-2', '#6d3fae');
  areaLabel(p, 315, 99, 'SAMPALOC', '#9a8468');
  areaLabel(p, 40, 256, 'QUIAPO', '#9a8468');
  areaLabel(p, 470, 100, 'STA. MESA', '#9a8468');
  areaLabel(p, 520, 322, 'PANDACAN', '#9a8468');
  {
    const q = polyAt(riverPts, 262);
    p.textCentered(
      Math.round(q.x),
      Math.round(q.y) - 3,
      'PASIG RIVER',
      '#e8f4fa',
      '5x7',
      '#3f7fa5',
    );
  }
  compass(p, 610, 70);

  // 13. Paper edge.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const e = Math.min(x, y, W - 1 - x, H - 1 - y);
      if (e < 3) p.px(x, y, hash(x, y, 91) < 0.2 ? '#e8d6b0' : '#f3e6c8');
      else if (e === 3) p.px(x, y, '#a88a62');
      else if (e === 4) p.px(x, y, '#00000030');
    }
  return { map: p, lights };
}

// ---- Campus buildings (3/4 view, original designs: no logos, seals or real signage) ------------

function nightOf(c, night) {
  return night ? mix(c, NAVY, 0.5) : c;
}

function windowAt(p, x, y, w, h, night, seed) {
  const lit = night && hash(x, y, seed) < 0.7;
  p.rect(x, y, w, h, lit ? GLOW : night ? '#232a48' : '#3b4a6b');
  p.hline(x, y, w, lit ? '#fff6c9' : night ? '#2f3858' : '#6d7ea3');
}

function groundShadow(p, cx, y, rx) {
  p.ellipse(cx, y, rx, 3, '#00000040');
}

function wall(p, x, y, w, h, c, night) {
  const b = nightOf(c, night);
  p.rect(x, y, w, h, b);
  p.vline(x, y, h, shade(b, 0.15));
  p.vline(x + w - 1, y, h, shade(b, -0.25));
  p.hline(x, y + h - 1, w, shade(b, -0.3));
}

function roofStrip(p, x, y, w, h, c, night) {
  const b = nightOf(c, night);
  p.rect(x, y, w, h, b);
  p.hline(x, y, w, shade(b, 0.25));
  p.hline(x, y + h - 1, w, shade(b, -0.3));
}

/** UST-style: a long colonial hall with a central clock tower and end pavilions. */
function campusUst(night) {
  const p = new Pix(64, 48);
  groundShadow(p, 32, 45, 30);
  const stone = '#efe3c6';
  const roof = '#b4553d';
  roofStrip(p, 3, 20, 58, 4, roof, night);
  wall(p, 3, 24, 58, 20, stone, night);
  for (const x of [2, 51]) {
    roofStrip(p, x, 17, 11, 4, roof, night);
    wall(p, x, 21, 11, 23, shade(stone, 0.05), night);
  }
  for (let r = 0; r < 2; r++)
    for (let k = 0; k < 12; k++) {
      const x = 5 + k * 5 - (k > 5 ? -3 : 0);
      if (x > 56) continue;
      if (x > 24 && x < 38) continue;
      windowAt(p, x, 27 + r * 8, 2, 4, night, 100 + r * 12 + k);
      p.px(x, 26 + r * 8, nightOf(shade(stone, -0.2), night));
    }
  // Central pavilion and tower.
  wall(p, 24, 16, 16, 28, shade(stone, 0.08), night);
  p.rect(23, 15, 18, 2, nightOf('#d8c9a2', night));
  wall(p, 28, 4, 8, 12, stone, night);
  p.disc(32, 9, 2, night ? '#fff2b0' : '#ffffff');
  p.px(32, 9, INK);
  p.px(32, 8, INK);
  p.rect(27, 3, 10, 2, nightOf('#d8c9a2', night));
  p.disc(32, 2, 2, nightOf('#d9a441', night));
  p.vline(32, 0, 1, nightOf('#d9a441', night));
  for (let k = 0; k < 3; k++) windowAt(p, 26 + k * 5, 20, 2, 5, night, 140 + k);
  p.rect(30, 36, 4, 8, night ? '#ffd27a' : '#5a4632');
  p.px(31, 35, nightOf(shade(stone, -0.2), night));
  p.px(32, 35, nightOf(shade(stone, -0.2), night));
  p.outline(INK);
  return p;
}

/** FEU-style: Art Deco, a stepped central pylon with vertical fins. */
function campusFeu(night) {
  const p = new Pix(44, 34);
  groundShadow(p, 22, 31, 20);
  const wallC = '#efdcae';
  roofStrip(p, 2, 12, 40, 3, '#cfc2a0', night);
  wall(p, 2, 15, 40, 15, wallC, night);
  p.hline(2, 15, 40, nightOf('#3a8a78', night));
  for (let k = 0; k < 8; k++)
    if (k !== 3 && k !== 4) windowAt(p, 4 + k * 5, 18, 3, 8, night, 200 + k);
  wall(p, 16, 2, 12, 28, shade(wallC, 0.06), night);
  wall(p, 19, 0, 6, 4, shade(wallC, 0.1), night);
  for (const x of [18, 21, 22, 25]) p.vline(x, 4, 14, nightOf('#c9b27e', night));
  p.disc(22, 7, 2, nightOf('#3a8a78', night));
  p.rect(19, 22, 6, 8, night ? '#ffd27a' : '#3e3446');
  p.hline(18, 21, 8, nightOf('#3a8a78', night));
  p.outline(INK);
  return p;
}

/** NU-style: a modern glass block with a white frame. */
function campusNu(night) {
  const p = new Pix(40, 32);
  groundShadow(p, 20, 29, 18);
  roofStrip(p, 3, 4, 34, 3, '#aab3bd', night);
  wall(p, 3, 7, 34, 21, '#e9edf2', night);
  for (let r = 0; r < 4; r++)
    for (let k = 0; k < 6; k++) {
      const x = 5 + k * 5;
      const y = 9 + r * 4;
      const lit = night && hash(k, r, 300) < 0.6;
      p.rect(x, y, 4, 3, lit ? GLOW : night ? '#26305a' : '#4f7fb8');
      if (!night && (k + r) % 3 === 0) p.px(x + 1, y, '#a6c8ee');
    }
  p.rect(16, 23, 8, 5, night ? '#ffd27a' : '#3b4a6b');
  p.hline(14, 22, 12, nightOf('#f2c14e', night));
  p.rect(30, 1, 5, 3, nightOf('#9aa3ad', night));
  p.outline(INK);
  return p;
}

/** UE-style: red brick with white floor bands. */
function campusUe(night) {
  const p = new Pix(44, 32);
  groundShadow(p, 22, 29, 20);
  roofStrip(p, 2, 8, 40, 3, '#8f949c', night);
  wall(p, 2, 11, 40, 17, '#b5483c', night);
  for (let r = 0; r < 3; r++) {
    p.hline(3, 11 + r * 5, 38, nightOf('#f2ece0', night));
    for (let k = 0; k < 9; k++) windowAt(p, 4 + k * 4, 12 + r * 5, 3, 3, night, 400 + r * 10 + k);
  }
  p.rect(17, 24, 10, 4, night ? '#ffd27a' : '#3e3446');
  p.rect(15, 22, 14, 2, nightOf('#f2ece0', night));
  p.outline(INK);
  return p;
}

/** San Beda-style: white church front with a bell tower and red roof. */
function campusSanBeda(night) {
  const p = new Pix(40, 34);
  groundShadow(p, 20, 31, 18);
  const white = '#f1ece2';
  const red = '#b23a32';
  roofStrip(p, 13, 10, 25, 3, red, night);
  wall(p, 13, 13, 25, 17, white, night);
  for (let k = 0; k < 6; k++) {
    const x = 15 + k * 4;
    p.rect(x, 9 - Math.min(k, 5 - k), 3, 2 + Math.min(k, 5 - k), nightOf(red, night));
  }
  for (let k = 0; k < 4; k++) windowAt(p, 16 + k * 6, 16, 2, 5, night, 500 + k);
  p.rect(23, 23, 5, 7, night ? '#ffd27a' : '#5a3a2a');
  p.px(24, 22, nightOf('#d0c8b8', night));
  p.px(26, 22, nightOf('#d0c8b8', night));
  wall(p, 3, 6, 9, 24, white, night);
  for (let k = 0; k < 4; k++) p.rect(3 + k, 5 - k, 9 - 2 * k, 1, nightOf(red, night));
  p.rect(6, 9, 3, 4, night ? '#ffd27a' : '#3e3446');
  windowAt(p, 6, 17, 3, 4, night, 520);
  p.outline(INK);
  return p;
}

/** CEU-style: neoclassical portico with columns and a gold-trimmed pediment. */
function campusCeu(night) {
  const p = new Pix(40, 32);
  groundShadow(p, 20, 29, 18);
  const cream = '#f2e6c8';
  roofStrip(p, 2, 9, 36, 3, '#c8b89a', night);
  wall(p, 2, 12, 36, 16, cream, night);
  for (let r = 0; r < 2; r++)
    for (let k = 0; k < 8; k++) {
      const x = 4 + k * 4 + (k > 3 ? 8 : 0);
      if (x > 34) continue;
      windowAt(p, x, 14 + r * 6, 2, 4, night, 600 + r * 10 + k);
    }
  // Pediment and columns.
  for (let k = 0; k < 5; k++) p.rect(12 + k * 2, 8 - k, 16 - k * 4, 1, nightOf(cream, night));
  p.hline(12, 8, 16, nightOf('#d8b04a', night));
  wall(p, 12, 9, 16, 19, shade(cream, -0.08), night);
  for (let k = 0; k < 4; k++) {
    p.rect(13 + k * 4, 10, 2, 17, nightOf('#ffffff', night));
    p.vline(14 + k * 4, 10, 17, nightOf('#d9d2c0', night));
  }
  p.rect(18, 22, 4, 6, night ? '#ffd27a' : '#3e3446');
  p.outline(INK);
  return p;
}

/** PUP-style: a long white hall with maroon bands and a tall central pylon. */
function campusPup(night) {
  const p = new Pix(56, 40);
  groundShadow(p, 28, 37, 26);
  const white = '#f1ece4';
  const maroon = '#8a2b2b';
  roofStrip(p, 2, 18, 52, 3, maroon, night);
  wall(p, 2, 21, 52, 15, white, night);
  for (let r = 0; r < 2; r++) {
    p.hline(3, 21 + r * 7, 50, nightOf(maroon, night));
    for (let k = 0; k < 12; k++) {
      const x = 4 + k * 4 + (k > 5 ? 4 : 0);
      if (x > 51) continue;
      windowAt(p, x, 23 + r * 7, 2, 3, night, 700 + r * 20 + k);
    }
  }
  // The pylon.
  for (let y = 1; y < 22; y++) {
    const half = 1 + Math.floor(y / 8);
    p.rect(28 - half, y, half * 2 + 1, 1, nightOf('#e9dcc0', night));
    p.px(28 + half, y, nightOf('#c9b998', night));
  }
  p.rect(27, 0, 3, 2, night ? '#fff2b0' : '#e2b23c');
  p.rect(24, 30, 9, 6, night ? '#ffd27a' : '#3e3446');
  p.rect(22, 28, 13, 2, nightOf(maroon, night));
  p.outline(INK);
  return p;
}

const CAMPUS_DRAW = {
  'ust-paskuhan': ['ust', campusUst],
  'feu-deco': ['feu', campusFeu],
  'nu-peprally': ['nu', campusNu],
  'ue-bookhunt': ['ue', campusUe],
  'sanbeda-shoot': ['sanbeda', campusSanBeda],
  'ceu-lab': ['ceu', campusCeu],
  'pup-lagoon': ['pup', campusPup],
};

// ---- Sprites --------------------------------------------------------------------------------------

/** Map pin: frame 0 playable (red), frame 1 soon (grey). */
/** Map pin, 22×30 with a cream rim so it pops off the map: frame 0 playable (red), 1 soon (slate). */
function pins() {
  return sheet(
    [
      ['#d94b3d', '#f2c14e'],
      ['#4a5578', '#efe5cf'],
    ].map(([body, dot]) => {
      const p = new Pix(22, 30);
      for (let y = 12; y < 26; y++) {
        const half = Math.round(7 * (1 - (y - 12) / 14));
        p.hline(11 - half, y, half * 2 + 1, shade(body, -0.15));
      }
      p.disc(11, 10, 8, body);
      p.disc(10, 9, 6, shade(body, 0.12));
      p.disc(11, 10, 4, dot);
      p.disc(11, 10, 2, shade(dot, 0.4));
      p.px(8, 5, shade(body, 0.55));
      p.px(7, 6, shade(body, 0.4));
      p.outline('#fff8e6');
      p.outline(INK);
      return p;
    }),
  );
}

/** The player's jeepney on the map, side view facing left, wheels in two frames. */
function mapJeep() {
  return sheet(
    [0, 1].map((frame) => {
      const p = new Pix(30, 18);
      const body = '#d94b3d';
      p.rect(8, 2, 21, 2, shade(body, -0.2));
      p.hline(8, 1, 21, '#55505f');
      p.rect(8, 4, 21, 9, body);
      p.hline(8, 4, 21, shade(body, 0.25));
      for (let k = 0; k < 4; k++) {
        p.rect(10 + k * 5, 5, 4, 3, '#2e3a55');
        p.hline(10 + k * 5, 5, 4, '#5d6e92');
      }
      p.hline(8, 9, 21, '#f2c14e');
      p.hline(8, 10, 21, '#3b6fb6');
      p.rect(8, 12, 21, 1, '#c9d1d9');
      p.rect(2, 7, 7, 6, body);
      p.hline(2, 7, 7, shade(body, 0.25));
      p.rect(1, 8, 2, 4, '#c9d1d9');
      p.px(2, 9, '#fff6c9');
      p.rect(6, 4, 3, 3, '#2e3a55');
      p.px(4, 6, '#c9d1d9');
      p.px(3, 5, '#c9d1d9');
      for (const wx of [7, 24]) {
        p.disc(wx, 14, 3, '#1f1b26');
        p.px(wx, 14, '#8a929c');
        if (frame === 0) p.px(wx - 1, 14, '#5a5f6a');
        else p.px(wx, 13, '#5a5f6a');
      }
      p.outline(INK);
      return p;
    }),
  );
}

/** LRT-2 train seen from above (two cars, purple edges), facing right. */
function mapTrain() {
  const p = new Pix(36, 7);
  for (const x0 of [0, 18]) {
    p.rect(x0, 1, 17, 5, '#e9e9f0');
    p.hline(x0, 0, 17, '#7b4bb3');
    p.hline(x0, 6, 17, '#7b4bb3');
    p.rect(x0 + 4, 2, 4, 3, '#b9b8c6');
    p.rect(x0 + 10, 2, 4, 3, '#b9b8c6');
  }
  p.clear(0, 0, 1, 1);
  p.clear(0, 6, 1, 1);
  p.clear(35, 0, 1, 1);
  p.clear(35, 6, 1, 1);
  p.px(35, 3, '#fff6c9');
  return p;
}

/** Tiny traffic seen from above, facing right: four jeeps, a tricycle, a car. */
function mapMini() {
  const jeep = (c) => {
    const p = new Pix(10, 6);
    p.rect(0, 1, 10, 4, shade(c, -0.25));
    p.rect(1, 1, 7, 4, '#f1ece4');
    p.vline(3, 1, 4, '#c9c2b4');
    p.vline(6, 1, 4, '#c9c2b4');
    p.rect(8, 1, 2, 4, c);
    p.px(9, 1, '#fff6c9');
    p.px(9, 4, '#fff6c9');
    return p;
  };
  const tricycle = () => {
    const p = new Pix(10, 6);
    p.rect(2, 1, 5, 3, '#3b6fb6');
    p.hline(2, 1, 5, '#6d9ad6');
    p.rect(3, 4, 4, 1, '#2b2233');
    p.rect(7, 2, 2, 2, '#55505f');
    return p;
  };
  const car = () => {
    const p = new Pix(10, 6);
    p.rect(1, 1, 8, 4, '#e3e3ea');
    p.rect(5, 1, 2, 4, '#3b4a6b');
    p.rect(2, 1, 1, 4, '#9aa3ad');
    return p;
  };
  return sheet([
    jeep('#d94b3d'),
    jeep('#f2c14e'),
    jeep('#3b6fb6'),
    jeep('#3a9a6a'),
    tricycle(),
    car(),
  ]);
}

function mapBoat() {
  const p = new Pix(16, 6);
  p.rect(1, 1, 14, 4, '#f1ece4');
  p.hline(1, 4, 14, '#3b6fb6');
  p.rect(4, 1, 8, 3, '#9aa3ad');
  p.hline(4, 1, 8, '#c9d1d9');
  p.px(15, 2, '#f1ece4');
  p.px(15, 3, '#f1ece4');
  p.px(0, 2, '#d6e8f4');
  p.px(0, 3, '#d6e8f4');
  return p;
}

function mapHyacinth() {
  return sheet(
    [0, 1].map((f) => {
      const p = new Pix(6, 4);
      p.rect(0, 1, 5, 2, '#4f8f3c');
      p.rect(1, 0, 3, 1, '#6fae4e');
      p.px(f ? 4 : 2, 1, '#b48ad8');
      return p;
    }),
  );
}

function mapBird() {
  return sheet(
    [0, 1].map((f) => {
      const p = new Pix(5, 3);
      if (f === 0) {
        p.px(0, 0, INK);
        p.px(1, 1, INK);
        p.px(2, 2, INK);
        p.px(3, 1, INK);
        p.px(4, 0, INK);
      } else {
        p.hline(0, 1, 5, INK);
        p.px(2, 2, INK);
      }
      return p;
    }),
  );
}

// ---- Export ---------------------------------------------------------------------------------------

export function mapAssets() {
  const { map, lights } = baseMap();
  const out = [
    { key: 'map_ubelt', pix: map },
    { key: 'map_lights', pix: lights },
    { key: 'map_pin', pix: pins(), frame: [22, 30] },
    { key: 'map_jeep', pix: mapJeep(), frame: [30, 18] },
    { key: 'map_train', pix: mapTrain() },
    { key: 'map_mini', pix: mapMini(), frame: [10, 6] },
    { key: 'map_boat', pix: mapBoat() },
    { key: 'map_hyacinth', pix: mapHyacinth(), frame: [6, 4] },
    { key: 'map_bird', pix: mapBird(), frame: [5, 3] },
  ];
  for (const [, [short, draw]] of Object.entries(CAMPUS_DRAW)) {
    const day = draw(false);
    out.push({ key: `map_campus_${short}`, pix: sheet([day, draw(true)]), frame: [day.w, day.h] });
  }
  return out;
}

export { hex };
