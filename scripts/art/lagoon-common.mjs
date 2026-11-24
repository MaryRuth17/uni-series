// Shared helpers for the Lagoon art: repeatable hash, tree canopies, small people, scaled blits.
import { shade } from './pix.mjs';
import { SKINS } from './avatar.mjs';

export const INK = '#2b2233';

export function hash(...n) {
  let h = 2166136261;
  for (const v of n) {
    h ^= (v | 0) + 0x9e3779b9;
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
}

export const hexOf = (c) =>
  `#${c
    .slice(0, 3)
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;

/** Copy src onto p at an integer scale (nearest neighbour), skipping transparent pixels. */
export function blitScaled(p, src, x, y, s = 1) {
  for (let yy = 0; yy < src.h; yy++)
    for (let xx = 0; xx < src.w; xx++) {
      const c = src.get(xx, yy);
      if (!c || !c[3]) continue;
      p.rect(Math.round(x + xx * s), Math.round(y + yy * s), s, s, hexOf(c));
    }
}

export function canopy(p, cx, cy, r, seed, base = '#3f7d3a') {
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

/** A tiny person (about 10×18), front view; x, y = feet centre. */
export function person(
  p,
  x,
  y,
  { skin, hair, shirt, pants = '#3b4a6b', sit = false, arm = 0, long = false, lace = null },
) {
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
  p.rect(x - 4, top + 1 - (arm === 1 ? 3 : 0), 1, 4, skin);
  p.rect(x + 3, top + 1 - (arm === 2 ? 3 : 0), 1, 4, skin);
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

export const LOOKS = [
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

/**
 * A big street tree (acacia or narra): a forked trunk with branches showing through, and a crown of many
 * leaf clusters in four shades with bright leaf specks, so it reads as foliage rather than a ball.
 */
export function acacia(
  p,
  x,
  groundY,
  h,
  spread,
  seed,
  { base = '#3f7d3a', trunk = '#5a4632' } = {},
) {
  const crownY = groundY - h;
  // Trunk and branches.
  p.rect(x - 4, crownY + h * 0.35, 8, groundY - (crownY + h * 0.35), trunk);
  p.vline(x - 4, crownY + h * 0.35, groundY - (crownY + h * 0.35), shade(trunk, 0.2));
  p.vline(x + 3, crownY + h * 0.35, groundY - (crownY + h * 0.35), shade(trunk, -0.25));
  for (let k = 0; k < 6; k++) {
    const ex = x + (hash(seed, k, 9) - 0.5) * spread * 1.6;
    const ey = crownY + hash(seed, k, 10) * h * 0.3;
    p.line(x, Math.round(crownY + h * 0.4), Math.round(ex), Math.round(ey), trunk);
    p.line(
      x + 1,
      Math.round(crownY + h * 0.4),
      Math.round(ex) + 1,
      Math.round(ey),
      shade(trunk, -0.2),
    );
  }
  // Leaf clusters, darkest first.
  const shades = [shade(base, -0.28), shade(base, -0.12), base, shade(base, 0.16)];
  shades.forEach((c, layer) => {
    const n = Math.round((spread * h) / 140);
    for (let k = 0; k < n; k++) {
      const a = hash(seed, layer, k, 1) * Math.PI * 2;
      const d = Math.sqrt(hash(seed, layer, k, 2));
      const cx = x + Math.cos(a) * d * spread;
      const cy = crownY + Math.sin(a) * d * h * 0.32 - layer * 2;
      const r = 4 + Math.floor(hash(seed, layer, k, 3) * 6) - layer;
      if (hash(seed, layer, k, 4) < 0.12 && layer < 2) continue; // gaps show sky and branches
      p.disc(Math.round(cx), Math.round(cy), Math.max(2, r), c);
    }
  });
  for (let k = 0; k < (spread * h) / 30; k++) {
    const a = hash(seed, k, 5) * Math.PI * 2;
    const d = Math.sqrt(hash(seed, k, 6));
    p.px(
      Math.round(x + Math.cos(a) * d * spread),
      Math.round(crownY + Math.sin(a) * d * h * 0.3 - 4),
      shade(base, 0.4),
    );
  }
}
