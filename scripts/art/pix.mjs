// A tiny pixel canvas for hand-authored pixel art (DECISIONS R-006). Colors are '#rrggbb' or '#rrggbbaa'.
import { encodePng } from './png.mjs';
import { FONTS } from './font.mjs';

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export function hex(c) {
  if (Array.isArray(c)) return c;
  const s = c.replace('#', '');
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
    s.length >= 8 ? parseInt(s.slice(6, 8), 16) : 255,
  ];
}

export function toHex([r, g, b, a = 255]) {
  const h = (v) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}${a === 255 ? '' : h(a)}`;
}

/** Lighten (f > 0) or darken (f < 0) a color by a fraction. */
export function shade(c, f) {
  const [r, g, b, a] = hex(c);
  const t = f > 0 ? 255 : 0;
  const k = Math.abs(f);
  return toHex([r + (t - r) * k, g + (t - g) * k, b + (t - b) * k, a]);
}

export function mix(c1, c2, t) {
  const a = hex(c1);
  const b = hex(c2);
  return toHex(a.map((v, i) => v + (b[i] - v) * t));
}

export class Pix {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
  }

  /** Set one pixel; translucent colors blend over what is there. */
  px(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b, a] = hex(c);
    const i = (y * this.w + x) * 4;
    if (a >= 255) {
      this.d[i] = r;
      this.d[i + 1] = g;
      this.d[i + 2] = b;
      this.d[i + 3] = 255;
      return;
    }
    const sa = a / 255;
    const da = this.d[i + 3] / 255;
    const oa = sa + da * (1 - sa);
    if (oa === 0) return;
    for (const [k, v] of [r, g, b].entries()) {
      this.d[i + k] = (v * sa + this.d[i + k] * da * (1 - sa)) / oa;
    }
    this.d[i + 3] = oa * 255;
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    const i = (y * this.w + x) * 4;
    return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]];
  }

  clear(x, y, w, h) {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) {
        if (i < 0 || j < 0 || i >= this.w || j >= this.h) continue;
        this.d.fill(0, (j * this.w + i) * 4, (j * this.w + i) * 4 + 4);
      }
    }
  }

  rect(x, y, w, h, c) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, c);
  }

  hline(x, y, w, c) {
    this.rect(x, y, w, 1, c);
  }

  vline(x, y, h, c) {
    this.rect(x, y, 1, h, c);
  }

  /** 1 px outline. */
  stroke(x, y, w, h, c) {
    this.hline(x, y, w, c);
    this.hline(x, y + h - 1, w, c);
    this.vline(x, y, h, c);
    this.vline(x + w - 1, y, h, c);
  }

  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  ellipse(cx, cy, rx, ry, c) {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if ((x * x) / (rx * rx + 0.25) + (y * y) / (ry * ry + 0.25) <= 1)
          this.px(cx + x, cy + y, c);
      }
    }
  }

  disc(cx, cy, r, c) {
    this.ellipse(cx, cy, r, r, c);
  }

  /** Ordered (Bayer 4×4) dither: share of c2 over c1, 0..1. */
  dither(x, y, w, h, c1, c2, share) {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) {
        this.px(i, j, (BAYER4[j & 3][i & 3] + 0.5) / 16 < share ? c2 : c1);
      }
    }
  }

  /** Vertical gradient through color stops, dithered between bands (pixel-art sky). */
  vgrad(x, y, w, h, stops) {
    for (let j = 0; j < h; j++) {
      const t = (j / Math.max(1, h - 1)) * (stops.length - 1);
      const k = Math.min(stops.length - 2, Math.floor(t));
      const f = t - k;
      for (let i = 0; i < w; i++) {
        this.px(
          x + i,
          y + j,
          (BAYER4[j & 3][(x + i) & 3] + 0.5) / 16 < f ? stops[k + 1] : stops[k],
        );
      }
    }
  }

  /** A raised block: base fill, light top/left edge, dark bottom/right edge, ink outline. */
  bevel(x, y, w, h, base, { outline = '#2b2233', light = 0.25, dark = 0.3 } = {}) {
    this.rect(x, y, w, h, base);
    this.hline(x + 1, y + 1, w - 2, shade(base, light));
    this.vline(x + 1, y + 1, h - 2, shade(base, light));
    this.hline(x + 1, y + h - 2, w - 2, shade(base, -dark));
    this.vline(x + w - 2, y + 1, h - 2, shade(base, -dark));
    if (outline) this.stroke(x, y, w, h, outline);
  }

  /** Darken a region (shadow) by blending black at an alpha. */
  shadow(x, y, w, h, alpha = 0.25) {
    this.rect(x, y, w, h, toHex([0, 0, 0, alpha * 255]));
  }

  textWidth(str, font = '5x7') {
    const f = FONTS[font];
    let w = 0;
    for (const ch of str) w += (f.glyphs[ch] ?? f.glyphs['?'])[0].length + f.spacing;
    return Math.max(0, w - f.spacing);
  }

  /** Draw text with a pixel font; returns the width. Optional 1 px shadow color. */
  text(x, y, str, c, font = '5x7', shadowColor = null) {
    const f = FONTS[font];
    let cx = x;
    for (const ch of str) {
      const g = f.glyphs[ch] ?? f.glyphs['?'];
      g.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) {
          if (row[i] !== '#') continue;
          if (shadowColor) this.px(cx + i + 1, y + j + 1, shadowColor);
          this.px(cx + i, y + j, c);
        }
      });
      cx += g[0].length + f.spacing;
    }
    return cx - x - f.spacing;
  }

  textCentered(cx, y, str, c, font = '5x7', shadowColor = null) {
    return this.text(Math.round(cx - this.textWidth(str, font) / 2), y, str, c, font, shadowColor);
  }

  /** Copy another Pix onto this one (transparent pixels skipped), optionally mirrored. */
  blit(src, dx, dy, flipX = false) {
    for (let j = 0; j < src.h; j++) {
      for (let i = 0; i < src.w; i++) {
        const p = src.get(flipX ? src.w - 1 - i : i, j);
        if (p && p[3] > 0) this.px(dx + i, dy + j, toHex(p));
      }
    }
  }

  /** Add a 1 px outline around every opaque shape (pixel-art sprite outline). */
  outline(c = '#2b2233') {
    const solid = (x, y) => (this.get(x, y)?.[3] ?? 0) > 0;
    const marks = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (solid(x, y)) continue;
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))
          marks.push([x, y]);
      }
    }
    for (const [x, y] of marks) this.px(x, y, c);
  }

  png() {
    return encodePng(this.w, this.h, this.d);
  }
}

/** Lay frames side by side into one spritesheet. */
export function sheet(frames) {
  const w = frames[0].w;
  const h = frames[0].h;
  const out = new Pix(w * frames.length, h);
  frames.forEach((f, i) => out.blit(f, i * w, 0));
  return out;
}

/** Seeded random for repeatable textures (mulberry32). */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
