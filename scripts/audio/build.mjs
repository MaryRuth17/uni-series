// Bakes the game's audio to public/assets/audio (DECISIONS R-006, L-031, L-035). Run: npm run audio
//
// Music — two cozy lo-fi loops, 16 bars each, arranged like a real track: an intro (keys, pad and a soft
// arpeggio), a groove with a melodic motif (call and response on a nylon guitar), a two-bar breakdown,
// and a second groove with the motif up an octave and a drum fill that leads back to the top.
//   music_home   — landing, campus map, Coming soon: C major, 84 BPM.
//   music_lagoon — PUP intro, Vacant card, stalls, results: F major, 76 BPM.
// Ambience — amb_lagoon: crowd murmur, birds, leaves, spoon clinks and a far-off jeepney horn.
// Sound effects — taps, tabs, food in and out of the tray, coins, bills, the register, sukli, the pencil
// check, errors, page flips, a win jingle and a gentle game-over tune.
// Files: 16-bit mono WAV at 22.05 kHz. Two packs: audio_home (preloaded) and audio_lagoon (loaded when
// arriving at PUP).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Mix, SR, midiHz, rng, wav } from './synth.mjs';

const OUT = 'public/assets/audio';
const TAU = Math.PI * 2;

// ---- Music --------------------------------------------------------------------------------------------

const SONGS = [
  {
    key: 'music_home',
    pack: 'audio_home',
    bpm: 84,
    seed: 11,
    swing: 0.1,
    chords: [
      [[55, 59, 60, 64], 36],
      [[55, 57, 60, 64], 45],
      [[53, 57, 60, 62], 38],
      [[53, 55, 59, 62], 43],
      [[53, 57, 60, 64], 41],
      [[55, 59, 62, 64], 40],
      [[53, 57, 60, 62], 38],
      [[53, 55, 60, 62], 43],
    ],
    scale: [67, 69, 72, 74, 76, 79, 81, 84],
    cutoff: 7200,
  },
  {
    key: 'music_lagoon',
    pack: 'audio_lagoon',
    bpm: 76,
    seed: 23,
    swing: 0.12,
    chords: [
      [[53, 57, 60, 64], 41],
      [[55, 57, 60, 64], 45],
      [[53, 57, 58, 62], 46],
      [[52, 55, 58, 60], 48],
      [[53, 57, 60, 62], 38],
      [[53, 58, 62, 65], 43],
      [[53, 57, 58, 62], 46],
      [[52, 55, 58, 62], 48],
    ],
    scale: [65, 67, 69, 72, 74, 77, 79, 81],
    cutoff: 6600,
  },
];

/** A two-bar melodic motif: 16 eighth-note slots, each a scale step or null (a rest). */
function motif(r, len = 16) {
  const out = [];
  let step = 3 + Math.floor(r() * 2);
  for (let i = 0; i < len; i++) {
    const strong = i % 4 === 0;
    if (r() > (strong ? 0.8 : 0.42)) {
      out.push(null);
      continue;
    }
    step += Math.floor(r() * 5) - 2;
    step = Math.max(0, Math.min(6, step));
    out.push(step);
  }
  out[14] = null;
  out[15] = null; // breathe at the end of the phrase
  return out;
}

function compose(song) {
  const beat = 60 / song.bpm;
  const bars = song.chords.length * 2;
  const mix = new Mix(bars * 4 * beat);
  const r = rng(song.seed);
  const at = (bar, eighth) =>
    (bar * 4 + Math.floor(eighth / 2) + (eighth % 2 ? 0.5 + song.swing : 0)) * beat;
  const at16 = (bar, sixteenth) => (bar * 4 + sixteenth / 4) * beat;
  const A = motif(r);
  const B = motif(r);
  const nearestStep = (midi) => {
    let best = 0;
    song.scale.forEach((m, i) => {
      if (Math.abs(m - midi) < Math.abs(song.scale[best] - midi)) best = i;
    });
    return best;
  };

  for (let bar = 0; bar < bars; bar++) {
    const [voicing, root] = song.chords[bar % song.chords.length];
    const intro = bar < 2;
    const breakdown = bar === 10 || bar === 11;
    const fill = bar === bars - 1;
    const hum = () => (r() - 0.5) * 0.012;

    // Keys: a slow strum on 1, a lighter re-strike on the "and" of 2; the breakdown holds the chord.
    voicing.forEach((m, k) =>
      mix.ep(
        at(bar, 0) + k * 0.016 + hum(),
        m,
        (intro ? 0.45 : 0.56) + r() * 0.08,
        (breakdown ? 3.6 : 1.9) * beat,
      ),
    );
    if (!breakdown)
      voicing
        .slice(1)
        .forEach((m, k) => mix.ep(at(bar, 3) + k * 0.012 + hum(), m, 0.3 + r() * 0.06, 1.1 * beat));
    // Pad: the chord's top and bottom, softly underneath.
    mix.pad(at(bar, 0), voicing[1], 0.6, 3.8 * beat);
    mix.pad(at(bar, 0), voicing[voicing.length - 1], 0.5, 3.8 * beat);

    // Bass.
    if (!intro) {
      mix.bass(at(bar, 0), root, 0.95, (breakdown ? 3.5 : 1.4) * beat);
      if (!breakdown) {
        mix.bass(at(bar, 3), root + (r() < 0.5 ? 12 : 7), 0.45, 0.4 * beat);
        mix.bass(at(bar, 4), r() < 0.7 ? root : root + 7, 0.72, 1.2 * beat);
        if (r() < 0.4) mix.bass(at(bar, 7), root + 10, 0.4, 0.3 * beat);
      }
    }

    // Drums.
    if (!intro && !breakdown) {
      mix.kick(at(bar, 0), 0.95);
      mix.kick(at(bar, 3), 0.6);
      if (r() < 0.35) mix.kick(at(bar, 7), 0.45);
      mix.snare(at(bar, 2) + 0.02, 0.62, r);
      mix.snare(at(bar, 6) + 0.02, 0.7, r);
      if (r() < 0.3) mix.snare(at(bar, 5) + 0.02, 0.18, r); // ghost note
    }
    if (!intro) {
      for (let e = 0; e < 8; e++) {
        if ((bar % 4 === 3 || fill) && e === 7) mix.hat(at(bar, e), 0.55, true);
        else mix.hat(at(bar, e), (e % 2 ? 0.42 : 0.68) * (0.8 + r() * 0.3) * (breakdown ? 0.7 : 1));
      }
    }
    if (bar >= 1)
      for (let s = 0; s < 16; s++)
        if (s % 2 || r() < 0.5) mix.shaker(at16(bar, s) + hum(), s % 4 === 2 ? 0.9 : 0.55, r);
    if (fill) for (let s = 12; s < 16; s++) mix.snare(at16(bar, s), 0.25 + (s - 12) * 0.12, r);

    // Guitar: arpeggios in the intro, the motif in the grooves (A A' B B'), up an octave at the end.
    if (intro || breakdown) {
      for (let e = 0; e < 8; e++)
        if (e % 2 === 0 || r() < 0.5)
          mix.pluck(
            at(bar, e) + hum(),
            voicing[e % voicing.length] + 12,
            (intro ? 0.42 : 0.35) + r() * 0.1,
            r,
          );
      continue;
    }
    const section = bar < 6 ? A : bar < 10 ? B : A;
    const half = (bar - 2) % 2;
    const up = bar >= 12 ? 1 : 0;
    for (let e = 0; e < 8; e++) {
      let step = section[half * 8 + e];
      if (step === null) continue;
      if (e === 0) step = nearestStep(voicing[Math.floor(r() * voicing.length)] + 12);
      if (bar % 4 === 3 && e === 6) step = Math.min(7, step + 1); // answer the phrase
      const midi = song.scale[Math.min(song.scale.length - 1, step + up * 2)];
      mix.pluck(at(bar, e) + hum(), midi, (e % 2 ? 0.55 : 0.75) * (bar >= 12 ? 1 : 0.92), r);
    }
  }
  mix.vinyl(r, 0.9);
  return mix.master({
    levels: { keys: 0.95, pluck: 0.9, pad: 0.45, bass: 0.82, drums: 0.9, vinyl: 0.7 },
    sends: { keys: 0.28, pluck: 0.32, pad: 0.4, drums: 0.08, bass: 0.02, vinyl: 0 },
    cutoff: song.cutoff,
    peak: 0.72,
  });
}

// ---- Ambience ----------------------------------------------------------------------------------------

function ambience() {
  const seconds = 30;
  const mix = new Mix(seconds, 2);
  const r = rng(77);
  // Crowd murmur: several band-passed "voices", each with a syllable-like wobble.
  for (let v = 0; v < 7; v++) {
    const centre = 300 + r() * 500;
    const rate = 3 + r() * 2.5;
    const phase = r() * TAU;
    let lp = 0;
    let lp2 = 0;
    for (let i = 0; i < mix.len; i++) {
      const s = i / SR;
      const noise = r() * 2 - 1;
      lp += (1 - Math.exp((-TAU * centre) / SR)) * (noise - lp);
      lp2 += (1 - Math.exp((-TAU * centre * 0.6) / SR)) * (lp - lp2);
      const bp = lp - lp2;
      const talk =
        Math.max(0, Math.sin(TAU * rate * s + phase) * 0.6 + 0.4) *
        (0.6 + 0.4 * Math.sin(TAU * 0.11 * s + v));
      mix.add('crowd', i, bp * talk * 0.18);
    }
  }
  // Birds: little chirp phrases.
  for (let t = 0.5; t < seconds - 1; t += 1.5 + r() * 3) {
    const base = 2400 + r() * 1400;
    const count = 2 + Math.floor(r() * 4);
    for (let c = 0; c < count; c++) {
      const start = Math.round((t + c * (0.09 + r() * 0.05)) * SR);
      let ph = 0;
      const dur = 0.05 + r() * 0.04;
      for (let k = 0; k < dur * SR; k++) {
        const s = k / SR;
        const f = base * (1 + 0.35 * (s / dur)) + 120 * Math.sin(TAU * 40 * s);
        ph += (TAU * f) / SR;
        const env = Math.sin(Math.PI * (s / dur));
        mix.add('birds', start + k, Math.sin(ph) * env * 0.05);
      }
    }
  }
  // Leaves: slow soft noise swells.
  let lp = 0;
  for (let i = 0; i < mix.len; i++) {
    const s = i / SR;
    lp += 0.2 * (r() * 2 - 1 - lp);
    const sw = Math.pow(Math.max(0, Math.sin(TAU * 0.07 * s) * Math.sin(TAU * 0.023 * s + 1)), 2);
    mix.add('leaves', i, (r() * 2 - 1 - lp) * sw * 0.02);
  }
  // Spoon and plate clinks.
  for (let t = 1; t < seconds - 1; t += 2.5 + r() * 4) {
    const start = Math.round(t * SR);
    const fs = [2100 + r() * 400, 3400 + r() * 500, 5100];
    for (let k = 0; k < 0.25 * SR; k++) {
      const s = k / SR;
      let v = 0;
      fs.forEach((f, j) => (v += Math.sin(TAU * f * s) * Math.exp(-s * (18 + j * 10))));
      mix.add('fx', start + k, v * 0.025);
    }
  }
  // A jeepney horn far away (two tones, muffled).
  const horn = Math.round(14 * SR);
  let hlp = 0;
  for (let k = 0; k < 0.9 * SR; k++) {
    const s = k / SR;
    const on = s < 0.35 || (s > 0.45 && s < 0.85);
    const f = s < 0.4 ? 392 : 330;
    const sq = Math.sign(Math.sin(TAU * f * s)) * 0.5 + Math.sin(TAU * f * 2 * s) * 0.2;
    hlp += 0.08 * (sq - hlp);
    mix.add('fx', horn + k, on ? hlp * 0.05 : 0);
  }
  return mix.master({
    levels: { crowd: 1, birds: 1, leaves: 1, fx: 1 },
    sends: { crowd: 0.1, birds: 0.35, leaves: 0.1, fx: 0.3 },
    cutoff: 8000,
    peak: 0.5,
  });
}

// ---- Sound effects -------------------------------------------------------------------------------------

function sfx(seconds, draw, peak = 0.7) {
  const mix = new Mix(seconds, 0.6);
  draw(mix, rng(seconds * 1000));
  return mix.master({ loop: false, cutoff: 9500, peak, sends: { fx: 0.12 } });
}

const blip = (mix, t, f0, f1, dur, vol, shape = 'sine') => {
  const start = Math.round(t * SR);
  let ph = 0;
  for (let k = 0; k < dur * SR; k++) {
    const s = k / SR;
    const f = f0 + (f1 - f0) * (s / dur);
    ph += (TAU * f) / SR;
    const w = shape === 'tri' ? (2 / Math.PI) * Math.asin(Math.sin(ph)) : Math.sin(ph);
    mix.add('fx', start + k, w * Math.min(1, s / 0.003) * Math.exp(-s * (5 / dur)) * vol);
  }
};
const metal = (mix, t, fs, decay, vol) => {
  const start = Math.round(t * SR);
  for (let k = 0; k < 0.5 * SR; k++) {
    const s = k / SR;
    let v = 0;
    fs.forEach((f, j) => (v += Math.sin(TAU * f * s) * Math.exp(-s * decay * (1 + j * 0.6))));
    mix.add('fx', start + k, (v / fs.length) * Math.min(1, s / 0.001) * vol);
  }
};
const noiseBurst = (mix, r, t, dur, vol, cutoff = 4000, hp = false) => {
  const start = Math.round(t * SR);
  let lp = 0;
  const a = 1 - Math.exp((-TAU * cutoff) / SR);
  for (let k = 0; k < dur * SR; k++) {
    const s = k / SR;
    const n = r() * 2 - 1;
    lp += a * (n - lp);
    const v = hp ? n - lp : lp;
    mix.add('fx', start + k, v * Math.sin(Math.PI * Math.min(1, s / dur)) * vol);
  }
};
const note = (mix, r, t, midi, vel, kind = 'ep') => {
  if (kind === 'ep') mix.ep(t, midi, vel, 0.5, 'fx');
  else mix.pluck(t, midi, vel, r, { bus: 'fx', len: 1.2 });
};

const SFX = {
  sfx_click: () =>
    sfx(0.12, (m, r) => {
      blip(m, 0, 1400, 1100, 0.03, 0.5);
      noiseBurst(m, r, 0, 0.015, 0.25, 5000, true);
    }),
  sfx_tab: () =>
    sfx(0.18, (m, r) => {
      noiseBurst(m, r, 0, 0.07, 0.5, 6000, true);
      blip(m, 0.01, 900, 1300, 0.05, 0.25);
    }),
  sfx_add: () =>
    sfx(0.25, (m) => {
      blip(m, 0, 320, 760, 0.08, 0.7);
      metal(m, 0.05, [2600, 3900], 40, 0.15);
    }),
  sfx_remove: () => sfx(0.2, (m) => blip(m, 0, 700, 300, 0.09, 0.6)),
  sfx_coin: () =>
    sfx(0.4, (m) => {
      metal(m, 0, [2810, 4210, 5630, 7100], 22, 0.8);
      metal(m, 0.06, [2950, 4400], 30, 0.25);
    }),
  sfx_bill: () =>
    sfx(0.3, (m, r) => {
      for (let k = 0; k < 5; k++) noiseBurst(m, r, k * 0.035, 0.05, 0.35 - k * 0.05, 5200, true);
    }),
  sfx_pay: () =>
    sfx(0.9, (m, r) => {
      noiseBurst(m, r, 0, 0.05, 0.5, 900); // drawer thunk
      blip(m, 0, 140, 90, 0.08, 0.5);
      metal(m, 0.08, [1568, 2349, 3136], 6, 0.9); // ka-ching bell
      metal(m, 0.22, [2093, 3136], 6, 0.6);
    }),
  sfx_sukli: () =>
    sfx(0.8, (m) => {
      for (let k = 0; k < 5; k++)
        metal(m, k * 0.07, [2700 + k * 180, 4100 + k * 150, 5600], 26, 0.55);
    }),
  sfx_check: () =>
    sfx(0.3, (m, r) => {
      noiseBurst(m, r, 0, 0.05, 0.35, 3000, true);
      noiseBurst(m, r, 0.07, 0.09, 0.45, 3500, true);
      blip(m, 0.07, 1800, 2400, 0.08, 0.12);
    }),
  sfx_error: () =>
    sfx(0.5, (m) => {
      blip(m, 0, 330, 300, 0.14, 0.45, 'tri');
      blip(m, 0.17, 262, 220, 0.2, 0.45, 'tri');
    }),
  sfx_page: () =>
    sfx(0.35, (m, r) => {
      const start = 0;
      let lp = 0;
      for (let k = 0; k < 0.28 * SR; k++) {
        const s = k / SR;
        const c = 800 + 5000 * (s / 0.28);
        lp += (1 - Math.exp((-TAU * c) / SR)) * (r() * 2 - 1 - lp);
        m.add('fx', start + k, lp * Math.sin(Math.PI * (s / 0.28)) * 0.5);
      }
    }),
  // Win: a bright arpeggio on keys and guitar with a sparkle on top.
  sfx_win: () =>
    sfx(
      2.2,
      (m, r) => {
        [60, 64, 67, 72, 76].forEach((n, i) => {
          note(m, r, i * 0.11, n, 0.7, 'ep');
          note(m, r, i * 0.11 + 0.01, n + 12, 0.55, 'pluck');
        });
        [79, 84].forEach((n, i) =>
          metal(m, 0.6 + i * 0.12, [midiHz(n), midiHz(n) * 2.01], 5, 0.25),
        );
      },
      0.75,
    ),
  // Game over: a gentle falling "aww" on keys, a soft low note to end.
  sfx_lose: () =>
    sfx(
      2.2,
      (m, r) => {
        [67, 65, 63, 62].forEach((n, i) => note(m, r, i * 0.24, n, 0.6, 'ep'));
        note(m, r, 1.0, 50, 0.6, 'ep');
        note(m, r, 1.0, 55, 0.45, 'ep');
      },
      0.7,
    ),
};

// ---- Write -------------------------------------------------------------------------------------------

mkdirSync(OUT, { recursive: true });
const packs = { audio_home: [], audio_lagoon: [] };
const write = (key, samples, pack) => {
  writeFileSync(join(OUT, `${key}.wav`), wav(samples));
  packs[pack].push({ type: 'audio', key, url: `assets/audio/${key}.wav` });
  console.log(`${key}: ${(samples.length / SR).toFixed(2)} s`);
};
for (const song of SONGS) write(song.key, compose(song), song.pack);
write('amb_lagoon', ambience(), 'audio_lagoon');
for (const [key, make] of Object.entries(SFX)) write(key, make(), 'audio_home');
for (const [name, files] of Object.entries(packs))
  writeFileSync(join(OUT, `${name}.json`), `${JSON.stringify({ [name]: { files } }, null, 2)}\n`);
