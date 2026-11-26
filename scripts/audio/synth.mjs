// A small offline synthesizer and mixer for the game's audio (DECISIONS R-006, L-031, L-035). No
// dependencies: it renders into Float32Array buses at 22.05 kHz and writes 16-bit mono WAV.
//
// Instruments: an electric piano (three partials and an FM tine whose brightness follows velocity), a
// plucked nylon string (Karplus-Strong), a warm pad (detuned, filtered), a round bass with a filter
// envelope, and drums (kick with a click and a body, snare with a body and room, metallic hats, shaker).
// The mixer gives every bus its own reverb send, a chorus on the keys, gentle side-chain ducking from the
// kick, tape-style saturation, a bus compressor and a limiter, and folds tails back so loops are seamless.

export const SR = 22050;

/** Seeded random (mulberry32), so every build renders the same audio. */
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

export const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const TAU = Math.PI * 2;

/** One-pole low-pass coefficient for a cutoff in Hz. */
const lpA = (hz) => 1 - Math.exp((-TAU * hz) / SR);

export class Mix {
  constructor(seconds, tail = 4) {
    this.len = Math.ceil(seconds * SR);
    this.size = this.len + Math.ceil(tail * SR);
    this.bus = {};
    this.duck = new Float32Array(this.size).fill(1);
  }

  b(name) {
    if (!this.bus[name]) this.bus[name] = new Float32Array(this.size);
    return this.bus[name];
  }

  add(name, i, v) {
    if (i >= 0 && i < this.size) this.b(name)[i] += v;
  }

  // ---- Instruments ---------------------------------------------------------------------------------

  /** Electric piano: fundamental, octave and a soft 3rd partial, a velocity-bright FM tine, tremolo. */
  ep(t, midi, vel, dur, bus = 'keys') {
    const f = midiHz(midi);
    const start = Math.round(t * SR);
    const n = Math.round((dur + 1.4) * SR);
    const bright = 0.6 + vel * 1.2;
    for (let k = 0; k < n; k++) {
      const s = k / SR;
      const rel = s > dur ? Math.exp(-(s - dur) * 5) : 1;
      const env = Math.min(1, s / 0.005) * Math.exp(-s * (1.2 + f / 900)) * rel;
      if (s > 0.01 && env < 1e-4) break; // only once the note has started and faded
      const tine = Math.exp(-s * 18) * bright;
      const mod = Math.sin(TAU * f * 7.02 * s) * tine;
      const trem = 1 + 0.05 * Math.sin(TAU * 3.8 * s);
      const v =
        Math.sin(TAU * f * s + mod) +
        0.22 * Math.sin(TAU * f * 2.001 * s) * Math.exp(-s * 2) +
        0.06 * Math.sin(TAU * f * 3.003 * s) * Math.exp(-s * 4);
      this.add(bus, start + k, v * env * vel * trem * 0.13);
    }
  }

  /** Plucked nylon string (Karplus-Strong) with a softened burst and a body resonance. */
  pluck(t, midi, vel, random, { decay = 0.995, bus = 'pluck', len = 2.6 } = {}) {
    const f = midiHz(midi);
    const N = Math.max(2, Math.round(SR / f));
    const line = new Float32Array(N);
    for (let k = 0; k < N; k++) line[k] = (random() * 2 - 1) * 0.8;
    for (let p = 0; p < 3; p++) for (let k = 1; k < N; k++) line[k] = (line[k] + line[k - 1]) / 2;
    const start = Math.round(t * SR);
    let idx = 0;
    let body = 0;
    for (let k = 0; k < len * SR; k++) {
      const a = line[idx];
      const b2 = line[(idx + 1) % N];
      line[idx] = ((a + b2) / 2) * decay;
      idx = (idx + 1) % N;
      body += 0.18 * (a - body);
      const fade = k < 30 ? k / 30 : 1;
      this.add(bus, start + k, (a * 0.8 + body * 0.4) * vel * fade * 0.24);
    }
  }

  /** A warm pad: three detuned saw-like voices, low-passed, slow attack and release. */
  pad(t, midi, vel, dur, bus = 'pad') {
    const start = Math.round(t * SR);
    const n = Math.round((dur + 1.5) * SR);
    const fs = [0.997, 1, 1.004].map((d) => midiHz(midi) * d);
    const ph = [0, 0.3, 0.7];
    let lp = 0;
    const a = lpA(900);
    for (let k = 0; k < n; k++) {
      const s = k / SR;
      const env = Math.min(1, s / 0.6) * (s > dur ? Math.exp(-(s - dur) * 2.2) : 1);
      let v = 0;
      for (let i = 0; i < 3; i++) {
        ph[i] = (ph[i] + fs[i] / SR) % 1;
        v += ph[i] * 2 - 1;
      }
      lp += a * (v / 3 - lp);
      this.add(bus, start + k, lp * env * vel * 0.1);
    }
  }

  /** Round bass: sine plus a filtered triangle, a little drive, a quick filter envelope. */
  bass(t, midi, vel, dur, bus = 'bass') {
    const f = midiHz(midi);
    const start = Math.round(t * SR);
    const n = Math.round((dur + 0.2) * SR);
    let lp = 0;
    for (let k = 0; k < n; k++) {
      const s = k / SR;
      const env =
        Math.min(1, s / 0.008) * Math.exp(-s * 1.1) * (s > dur ? Math.exp(-(s - dur) * 25) : 1);
      const tri = (2 / Math.PI) * Math.asin(Math.sin(TAU * f * s));
      lp += lpA(260 + 900 * Math.exp(-s * 12)) * (tri - lp);
      const v = Math.tanh(1.4 * (Math.sin(TAU * f * s) * 0.8 + lp * 0.5));
      this.add(bus, start + k, v * env * vel * 0.3);
    }
  }

  kick(t, vel, bus = 'drums') {
    const start = Math.round(t * SR);
    let phase = 0;
    for (let k = 0; k < 0.4 * SR; k++) {
      const s = k / SR;
      const f = 48 + 110 * Math.exp(-s * 32);
      phase += (TAU * f) / SR;
      const click = s < 0.004 ? (1 - s / 0.004) * 0.5 : 0;
      this.add(bus, start + k, (Math.sin(phase) * Math.exp(-s * 7.5) + click) * vel * 0.5);
      // Side-chain: the other buses dip under the kick and come back.
      const i = start + k;
      if (i >= 0 && i < this.size)
        this.duck[i] = Math.min(this.duck[i], 1 - 0.32 * vel * Math.exp(-s * 9));
    }
  }

  snare(t, vel, random, bus = 'drums') {
    const start = Math.round(t * SR);
    let lp = 0;
    let prev = 0;
    let hp = 0;
    for (let k = 0; k < 0.3 * SR; k++) {
      const s = k / SR;
      const noise = random() * 2 - 1;
      lp += 0.45 * (noise - lp);
      hp = 0.92 * (hp + lp - prev);
      prev = lp;
      const body = (Math.sin(TAU * 185 * s) + 0.5 * Math.sin(TAU * 330 * s)) * Math.exp(-s * 26);
      this.add(bus, start + k, (hp * Math.exp(-s * 14) * 0.9 + body * 0.45) * vel * 0.2);
    }
  }

  /** Metallic hats: six square waves at inharmonic ratios, high-passed (a classic drum machine trick). */
  hat(t, vel, open = false, bus = 'drums') {
    const start = Math.round(t * SR);
    const freqs = [205.3, 304.4, 369.6, 522.7, 540, 800].map((f) => f * 2.3);
    const n = (open ? 0.22 : 0.06) * SR;
    let prev = 0;
    let lp = 0;
    for (let k = 0; k < n; k++) {
      const s = k / SR;
      let v = 0;
      for (const f of freqs) v += Math.sign(Math.sin(TAU * f * s));
      v /= 6;
      const hp = v - prev;
      prev = v;
      lp += 0.6 * (hp - lp);
      this.add(bus, start + k, lp * Math.exp(-s * (open ? 14 : 60)) * vel * 0.09);
    }
  }

  /**
   * Soft hats: a short burst of band-limited noise (about 2.5 to 6.5 kHz), much gentler than the square-wave
   * hats. Takes its own random source so swapping hat types never changes the rest of a song.
   */
  softHat(t, vel, random, open = false, bus = 'drums') {
    const start = Math.round(t * SR);
    const n = (open ? 0.18 : 0.05) * SR;
    const hi = lpA(6500);
    const lo = lpA(2500);
    let a = 0;
    let b = 0;
    for (let k = 0; k < n; k++) {
      const s = k / SR;
      const noise = random() * 2 - 1;
      a += hi * (noise - a);
      b += lo * (a - b);
      const env = Math.min(1, s / 0.002) * Math.exp(-s * (open ? 16 : 70));
      this.add(bus, start + k, (a - b) * env * vel * 0.11);
    }
  }

  shaker(t, vel, random, bus = 'drums') {
    const start = Math.round(t * SR);
    let prev = 0;
    for (let k = 0; k < 0.07 * SR; k++) {
      const s = k / SR;
      const noise = random() * 2 - 1;
      const hp = noise - prev;
      prev = noise;
      const env = Math.min(1, s / 0.012) * Math.exp(-s * 45);
      this.add(bus, start + k, hp * env * vel * 0.035);
    }
  }

  /** Vinyl: a quiet hiss and sparse crackles on their own bus (not ducked). */
  vinyl(random, amount = 1) {
    let lp = 0;
    for (let i = 0; i < this.len; i++) {
      lp += 0.05 * (random() * 2 - 1 - lp);
      this.add('vinyl', i, lp * 0.01 * amount);
      if (random() < 0.0007 * amount) {
        const amp = (random() * 0.5 + 0.2) * 0.1;
        for (let k = 0; k < 14; k++)
          this.add('vinyl', i + k, amp * (random() * 2 - 1) * Math.exp(-k / 3));
      }
    }
  }

  // ---- Mixing --------------------------------------------------------------------------------------

  /**
   * Mix the buses: level, ducking, chorus on the keys, a shared reverb fed by per-bus sends, tape
   * saturation, glue compression and a limiter. With `loop`, tails fold back onto the start.
   */
  master({ levels = {}, sends = {}, loop = true, cutoff = 7000, peak = 0.8 } = {}) {
    const N = this.size;
    const dry = new Float32Array(N);
    const send = new Float32Array(N);
    for (const [name, buf] of Object.entries(this.bus)) {
      const lvl = levels[name] ?? 1;
      const snd = sends[name] ?? 0.15;
      const ducked = name !== 'drums' && name !== 'vinyl';
      const x = name === 'keys' ? chorus(buf) : buf;
      for (let i = 0; i < N; i++) {
        const v = x[i] * lvl * (ducked ? this.duck[i] : 1);
        dry[i] += v;
        send[i] += v * snd;
      }
    }
    const wet = reverb(send);
    let out = new Float32Array(N);
    for (let i = 0; i < N; i++) out[i] = dry[i] + wet[i];
    if (loop) {
      const folded = new Float32Array(this.len);
      for (let i = 0; i < N; i++) folded[i % this.len] += out[i];
      out = folded;
    }
    return finish(out, { loop, cutoff, peak });
  }
}

/** A gentle chorus: the signal plus a copy through a slowly modulated short delay. */
function chorus(x) {
  const out = new Float32Array(x.length);
  const base = 0.012 * SR;
  const depth = 0.003 * SR;
  for (let i = 0; i < x.length; i++) {
    const d = base + depth * Math.sin((TAU * 0.8 * i) / SR);
    const j = i - d;
    const j0 = Math.floor(j);
    const fr = j - j0;
    const a = j0 >= 0 ? x[j0] : 0;
    const b = j0 + 1 >= 0 && j0 + 1 < x.length ? x[j0 + 1] : 0;
    out[i] = x[i] * 0.8 + (a + (b - a) * fr) * 0.45;
  }
  return out;
}

/** Schroeder reverb (four damped combs, two all-passes) with a little pre-delay. */
function reverb(x) {
  const wet = new Float32Array(x.length);
  const pre = Math.round(0.018 * SR);
  for (const [d, g] of [
    [1557, 0.82],
    [1617, 0.81],
    [1491, 0.8],
    [1422, 0.8],
  ]) {
    const D = Math.round((d * SR) / 44100);
    const c = new Float32Array(D);
    let ci = 0;
    let lp = 0;
    for (let i = 0; i < x.length; i++) {
      const input = i >= pre ? x[i - pre] : 0;
      const o = c[ci];
      lp = o * 0.6 + lp * 0.4;
      c[ci] = input + lp * g;
      ci = (ci + 1) % D;
      wet[i] += o * 0.22;
    }
  }
  for (const [d, g] of [
    [556, 0.5],
    [341, 0.5],
  ]) {
    const D = Math.round((d * SR) / 44100);
    const a = new Float32Array(D);
    let ai = 0;
    for (let i = 0; i < wet.length; i++) {
      const bv = a[ai];
      const o = -wet[i] + bv;
      a[ai] = wet[i] + bv * g;
      ai = (ai + 1) % D;
      wet[i] = o;
    }
  }
  return wet;
}

/** Warm low-pass, DC removal, tape saturation, glue compression, limiter, normalise. */
function finish(out, { loop, cutoff, peak }) {
  const a = lpA(cutoff);
  let y = 0;
  for (let pass = 0; pass < (loop ? 2 : 1); pass++)
    for (let i = 0; i < out.length; i++) {
      y += a * (out[i] - y);
      if (pass === (loop ? 1 : 0)) out[i] = y;
    }
  let mean = 0;
  for (const v of out) mean += v;
  mean /= out.length;
  let max = 0;
  for (const v of out) max = Math.max(max, Math.abs(v - mean));
  const pre = max > 0 ? 0.9 / max : 1;
  // Envelope-follower compressor (soft) for glue, then tape-style saturation.
  let env = 0;
  const atk = 1 - Math.exp(-1 / (0.01 * SR));
  const rel = 1 - Math.exp(-1 / (0.2 * SR));
  for (let i = 0; i < out.length; i++) {
    const v = (out[i] - mean) * pre;
    const lvl = Math.abs(v);
    env += (lvl > env ? atk : rel) * (lvl - env);
    const thr = 0.35;
    const gain = env > thr ? Math.pow(thr / env, 0.35) : 1;
    out[i] = Math.tanh(v * gain * 1.3) / Math.tanh(1.3);
  }
  let p = 0;
  for (const v of out) p = Math.max(p, Math.abs(v));
  const g = p > 0 ? peak / p : 1;
  for (let i = 0; i < out.length; i++) out[i] *= g;
  if (!loop) {
    // Short fades for one-shots so they never click.
    const f = Math.min(out.length >> 1, Math.round(0.004 * SR));
    for (let i = 0; i < f; i++) {
      out[i] *= i / f;
      out[out.length - 1 - i] *= i / f;
    }
  }
  return out;
}

/** 16-bit mono PCM WAV. */
export function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVE', 8);
  head.write('fmt ', 12);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(SR, 24);
  head.writeUInt32LE(SR * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}
