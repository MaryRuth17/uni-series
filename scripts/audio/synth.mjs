// A tiny offline synthesizer for the game's music (DECISIONS R-006, L-031). No dependencies: it renders
// into a Float32Array at a fixed sample rate and writes 16-bit mono WAV. Instruments are simple on purpose:
// an electric piano (sine with a soft FM bell attack), a plucked string (Karplus-Strong), a warm sine bass,
// soft drums made from sine sweeps and filtered noise, and vinyl crackle. A small Schroeder reverb and a
// gentle low-pass make it sound like a cozy lo-fi loop.

export const SR = 16000;

/** Seeded random (mulberry32), so every build renders the same music. */
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

export class Track {
  constructor(seconds) {
    this.len = Math.ceil(seconds * SR);
    // Room for reverb and note tails; folded back onto the start for a seamless loop.
    this.buf = new Float32Array(this.len + SR * 4);
  }

  add(i, v) {
    if (i >= 0 && i < this.buf.length) this.buf[i] += v;
  }

  /** Electric piano: a sine with a little 2nd harmonic, a short FM "tine" at the attack, slow decay. */
  ep(t, midi, vel, dur) {
    const f = midiHz(midi);
    const start = Math.round(t * SR);
    const n = Math.round((dur + 1.2) * SR);
    for (let k = 0; k < n; k++) {
      const s = k / SR;
      const env =
        Math.min(1, s / 0.006) * Math.exp(-s * 1.6) * (s > dur ? Math.exp(-(s - dur) * 6) : 1);
      if (env < 1e-4) break;
      const bell = Math.exp(-s * 14) * 0.9;
      const mod = Math.sin(2 * Math.PI * f * 14 * s) * bell * 1.2;
      const trem = 1 + 0.06 * Math.sin(2 * Math.PI * 4.2 * s);
      const v = Math.sin(2 * Math.PI * f * s + mod) + 0.18 * Math.sin(2 * Math.PI * f * 2 * s);
      this.add(start + k, v * env * vel * trem * 0.16);
    }
  }

  /** Plucked string (Karplus-Strong): a short noise burst in a delay line with a soft low-pass. */
  pluck(t, midi, vel, random, decay = 0.994) {
    const f = midiHz(midi);
    const N = Math.max(2, Math.round(SR / f));
    const line = new Float32Array(N);
    for (let k = 0; k < N; k++) line[k] = (random() * 2 - 1) * 0.8;
    // Pre-soften the burst so it sounds like a nylon string, not a harpsichord.
    for (let p = 0; p < 2; p++) for (let k = 1; k < N; k++) line[k] = (line[k] + line[k - 1]) / 2;
    const start = Math.round(t * SR);
    const n = Math.round(2.4 * SR);
    let idx = 0;
    for (let k = 0; k < n; k++) {
      const a = line[idx];
      const b = line[(idx + 1) % N];
      const out = a;
      line[idx] = ((a + b) / 2) * decay;
      idx = (idx + 1) % N;
      const fade = k < 40 ? k / 40 : 1;
      this.add(start + k, out * vel * fade * 0.22);
    }
  }

  /** Warm bass: a sine with a touch of saturation and a soft pluck envelope. */
  bass(t, midi, vel, dur) {
    const f = midiHz(midi);
    const start = Math.round(t * SR);
    const n = Math.round((dur + 0.15) * SR);
    for (let k = 0; k < n; k++) {
      const s = k / SR;
      const env =
        Math.min(1, s / 0.01) * Math.exp(-s * 1.4) * (s > dur ? Math.exp(-(s - dur) * 30) : 1);
      const v = Math.tanh(1.6 * Math.sin(2 * Math.PI * f * s)) * 0.7;
      this.add(start + k, v * env * vel * 0.32);
    }
  }

  kick(t, vel) {
    const start = Math.round(t * SR);
    let phase = 0;
    for (let k = 0; k < 0.35 * SR; k++) {
      const s = k / SR;
      const f = 45 + 75 * Math.exp(-s * 28);
      phase += (2 * Math.PI * f) / SR;
      this.add(start + k, Math.sin(phase) * Math.exp(-s * 9) * vel * 0.42);
    }
  }

  /** A soft lo-fi snare / rim: band-limited noise with a short tone. */
  snare(t, vel, random) {
    const start = Math.round(t * SR);
    let lp = 0;
    let hp = 0;
    let prev = 0;
    for (let k = 0; k < 0.22 * SR; k++) {
      const s = k / SR;
      const noise = random() * 2 - 1;
      lp += 0.35 * (noise - lp);
      hp = 0.9 * (hp + lp - prev);
      prev = lp;
      const tone = Math.sin(2 * Math.PI * 190 * s) * Math.exp(-s * 30);
      this.add(start + k, (hp * 0.8 + tone * 0.4) * Math.exp(-s * 18) * vel * 0.2);
    }
  }

  hat(t, vel, random, open = false) {
    const start = Math.round(t * SR);
    let prev = 0;
    for (let k = 0; k < (open ? 0.18 : 0.05) * SR; k++) {
      const s = k / SR;
      const noise = random() * 2 - 1;
      const hp = noise - prev;
      prev = noise;
      this.add(start + k, hp * Math.exp(-s * (open ? 18 : 70)) * vel * 0.05);
    }
  }

  /** Vinyl crackle and a little hiss over the whole loop. */
  vinyl(random, amount = 1) {
    let lp = 0;
    for (let i = 0; i < this.len; i++) {
      lp += 0.05 * (random() * 2 - 1 - lp);
      this.buf[i] += lp * 0.012 * amount;
      if (random() < 0.0009 * amount) {
        const amp = (random() * 0.5 + 0.2) * 0.12;
        for (let k = 0; k < 12; k++) this.add(i + k, amp * (random() * 2 - 1) * Math.exp(-k / 3));
      }
    }
  }

  /** Fold the tail onto the start, warm it with reverb and a low-pass, normalise, return the loop. */
  master({ reverb = 0.22, cutoff = 5200 } = {}) {
    const x = this.buf;
    // Schroeder reverb: four combs in parallel, two all-passes in series.
    const wet = new Float32Array(x.length);
    for (const [d, g] of [
      [1116, 0.78],
      [1188, 0.77],
      [1277, 0.76],
      [1356, 0.75],
    ]) {
      const D = Math.round((d * SR) / 44100);
      const c = new Float32Array(D);
      let ci = 0;
      let lp = 0;
      for (let i = 0; i < x.length; i++) {
        const out = c[ci];
        lp = out * 0.7 + lp * 0.3;
        c[ci] = x[i] + lp * g;
        ci = (ci + 1) % D;
        wet[i] += out * 0.25;
      }
    }
    for (const [d, g] of [
      [556, 0.5],
      [441, 0.5],
    ]) {
      const D = Math.round((d * SR) / 44100);
      const a = new Float32Array(D);
      let ai = 0;
      for (let i = 0; i < wet.length; i++) {
        const b = a[ai];
        const out = -wet[i] + b;
        a[ai] = wet[i] + b * g;
        ai = (ai + 1) % D;
        wet[i] = out;
      }
    }
    const mixed = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) mixed[i] = x[i] + wet[i] * reverb;
    // Seamless loop: add everything past the loop end back onto the start.
    const out = new Float32Array(this.len);
    for (let i = 0; i < mixed.length; i++) out[i % this.len] += mixed[i];
    // Warm low-pass (run twice round the loop so the filter state wraps too), DC removal, soft limit.
    const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
    let y = 0;
    for (let pass = 0; pass < 2; pass++)
      for (let i = 0; i < out.length; i++) {
        y += a * (out[i] - y);
        if (pass === 1) out[i] = y;
      }
    let mean = 0;
    for (const v of out) mean += v;
    mean /= out.length;
    let peak = 0;
    for (let i = 0; i < out.length; i++) {
      out[i] = Math.tanh((out[i] - mean) * 1.2);
      peak = Math.max(peak, Math.abs(out[i]));
    }
    const gain = 0.7 / peak;
    for (let i = 0; i < out.length; i++) out[i] *= gain;
    return out;
  }
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
