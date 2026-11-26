// Bakes the game's audio to public/assets/audio (DECISIONS R-006, L-031, L-035). Run: npm run audio
//
// Music — two cozy lo-fi loops, 16 bars each, arranged like a real track: an intro (keys, pad and a soft
// arpeggio), a groove with a melodic motif (call and response on a nylon guitar), a two-bar breakdown,
// and a second groove with the motif up an octave and a drum fill that leads back to the top.
//   music_home   — landing, campus map, Coming soon: C major, 84 BPM.
//   music_lagoon — PUP intro, Vacant card, stalls, results: F major, 76 BPM. Softer than the home loop
//   (noise hats instead of square-wave hats, less vinyl crackle, a lower low-pass, a lower peak; L-037).
// Ambience — amb_lagoon: a warm crowd murmur, a few birds, leaves, rare spoon clinks and a far-off jeepney
//   horn, low-passed and quiet so it sits under the music (L-037).
// Sound effects — taps, tabs, food in and out of the tray, coins, bills, the register, sukli, the pencil
// check, errors, page flips, a win jingle and a gentle game-over tune; the landing surprises (jeepney horn,
// sorbetes bell, printer, meow, LRT chime, barker) and the map pin. All are low-passed (most energy under
// 3 kHz) so repeated taps never hiss (L-037).
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
    hats: 'metal',
    vinyl: 0.9,
    peak: 0.72,
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
    cutoff: 4800,
    hats: 'soft',
    vinyl: 0.3,
    peak: 0.6,
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
  // Soft hats draw their own noise, so the rest of the song stays note-for-note the same.
  const hatNoise = rng(song.seed + 1000);
  const hat = (t, vel, open = false) =>
    song.hats === 'soft' ? mix.softHat(t, vel, hatNoise, open) : mix.hat(t, vel, open);
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
        if ((bar % 4 === 3 || fill) && e === 7) hat(at(bar, e), 0.55, true);
        else hat(at(bar, e), (e % 2 ? 0.42 : 0.68) * (0.8 + r() * 0.3) * (breakdown ? 0.7 : 1));
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
  mix.vinyl(r, song.vinyl);
  return mix.master({
    levels: { keys: 0.95, pluck: 0.9, pad: 0.45, bass: 0.82, drums: 0.9, vinyl: 0.7 },
    sends: { keys: 0.28, pluck: 0.32, pad: 0.4, drums: 0.08, bass: 0.02, vinyl: 0 },
    cutoff: song.cutoff,
    peak: song.peak,
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
    let w1 = 0;
    let w2 = 0;
    const warm = 1 - Math.exp((-TAU * 1100) / SR);
    for (let i = 0; i < mix.len; i++) {
      const s = i / SR;
      const noise = r() * 2 - 1;
      lp += (1 - Math.exp((-TAU * centre) / SR)) * (noise - lp);
      lp2 += (1 - Math.exp((-TAU * centre * 0.6) / SR)) * (lp - lp2);
      // Two more low-pass stages round off the hiss above the voices (L-037).
      w1 += warm * (lp - lp2 - w1);
      w2 += warm * (w1 - w2);
      const bp = w2;
      const talk =
        Math.max(0, Math.sin(TAU * rate * s + phase) * 0.6 + 0.4) *
        (0.6 + 0.4 * Math.sin(TAU * 0.11 * s + v));
      mix.add('crowd', i, bp * talk * 0.3);
    }
  }
  // Birds: little chirp phrases.
  for (let t = 0.5; t < seconds - 1; t += 3 + r() * 4) {
    const base = 1900 + r() * 700;
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
        mix.add('birds', start + k, Math.sin(ph) * env * 0.018);
      }
    }
  }
  // Leaves: slow swells of low-passed noise (a soft rustle, not hiss).
  let lp = 0;
  const leafA = 1 - Math.exp((-TAU * 900) / SR);
  for (let i = 0; i < mix.len; i++) {
    const s = i / SR;
    lp += leafA * (r() * 2 - 1 - lp);
    const sw = Math.pow(Math.max(0, Math.sin(TAU * 0.07 * s) * Math.sin(TAU * 0.023 * s + 1)), 2);
    mix.add('leaves', i, lp * sw * 0.05);
  }
  // Spoon and plate clinks.
  for (let t = 2; t < seconds - 1; t += 5 + r() * 5) {
    const start = Math.round(t * SR);
    const fs = [1500 + r() * 300, 2300 + r() * 300];
    for (let k = 0; k < 0.25 * SR; k++) {
      const s = k / SR;
      let v = 0;
      fs.forEach((f, j) => (v += Math.sin(TAU * f * s) * Math.exp(-s * (22 + j * 12))));
      mix.add('fx', start + k, v * 0.01);
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
    cutoff: 3000,
    peak: 0.3,
  });
}

// ---- Sound effects -------------------------------------------------------------------------------------

/**
 * One sound effect. The low-pass (`cutoff`) keeps taps warm: most energy stays under 3 kHz, so a sound that
 * plays twenty times a round never hisses (L-037).
 */
function sfx(seconds, draw, { peak = 0.6, cutoff = 4200 } = {}) {
  const mix = new Mix(seconds, 0.6);
  draw(mix, rng(seconds * 1000));
  return mix.master({ loop: false, cutoff, peak, sends: { fx: 0.12 } });
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
    mix.add('fx', start + k, (v / fs.length) * Math.min(1, s / 0.002) * vol);
  }
};
/** A short burst of low-passed noise (paper, a drawer, a pencil). */
const noiseBurst = (mix, r, t, dur, vol, cutoff = 2500) => {
  const start = Math.round(t * SR);
  let lp = 0;
  let lp2 = 0;
  const a = 1 - Math.exp((-TAU * cutoff) / SR);
  for (let k = 0; k < dur * SR; k++) {
    const s = k / SR;
    lp += a * (r() * 2 - 1 - lp);
    lp2 += a * (lp - lp2);
    mix.add('fx', start + k, lp2 * Math.sin(Math.PI * Math.min(1, s / dur)) * vol);
  }
};
const note = (mix, r, t, midi, vel, kind = 'ep') => {
  if (kind === 'ep') mix.ep(t, midi, vel, 0.5, 'fx');
  else mix.pluck(t, midi, vel, r, { bus: 'fx', len: 1.2 });
};
/**
 * A tiny voice: harmonics of a gliding pitch, shaped by one moving formant (the vowel) and a fixed low one.
 * `f0` and `formant` are functions of the time in the sound (0..dur).
 */
const voice = (mix, t, dur, f0, formant, vol) => {
  const start = Math.round(t * SR);
  let ph = 0;
  for (let k = 0; k < dur * SR; k++) {
    const s = k / SR;
    const f = f0(s);
    ph += (TAU * f) / SR;
    const F = formant(s);
    let v = 0;
    for (let h = 1; h <= 10; h++) {
      const fh = f * h;
      if (fh > 3400) break;
      const amp = Math.exp(-(((fh - F) / 380) ** 2)) + 0.45 * Math.exp(-(((fh - 650) / 260) ** 2));
      v += (Math.sin(ph * h) * amp) / h ** 0.3;
    }
    const env = Math.min(1, s / 0.03) * Math.min(1, (dur - s) / 0.08);
    mix.add('fx', start + k, v * env * vol);
  }
};
/** A jeepney horn honk: two detuned saw-ish tones a major third apart, low-passed (a friendly beep). */
const honk = (mix, t, dur, vol) => {
  const start = Math.round(t * SR);
  const fs = [415, 523];
  const ph = [0, 0.4];
  let lp = 0;
  let lp2 = 0;
  const a = 1 - Math.exp((-TAU * 1400) / SR);
  for (let k = 0; k < dur * SR; k++) {
    const s = k / SR;
    let v = 0;
    for (let i = 0; i < 2; i++) {
      ph[i] = (ph[i] + (fs[i] * (1 + 0.004 * Math.sin(TAU * 6 * s))) / SR) % 1;
      v += ph[i] * 2 - 1;
    }
    lp += a * (v / 2 - lp);
    lp2 += a * (lp - lp2);
    const env = Math.min(1, s / 0.012) * Math.min(1, (dur - s) / 0.03);
    mix.add('fx', start + k, lp2 * env * vol);
  }
};

const SFX = {
  sfx_click: () =>
    sfx(0.12, (m, r) => {
      blip(m, 0, 1400, 1100, 0.03, 0.5);
      noiseBurst(m, r, 0, 0.012, 0.2, 3000);
    }),
  // A soft wooden tok, like tapping a menu board.
  sfx_tab: () =>
    sfx(0.16, (m, r) => {
      blip(m, 0, 760, 600, 0.05, 0.6, 'tri');
      noiseBurst(m, r, 0, 0.02, 0.2, 1800);
    }),
  sfx_add: () =>
    sfx(0.25, (m) => {
      blip(m, 0, 320, 760, 0.08, 0.7);
      metal(m, 0.05, [1760, 2640], 40, 0.12);
    }),
  sfx_remove: () => sfx(0.2, (m) => blip(m, 0, 700, 300, 0.09, 0.6)),
  sfx_coin: () =>
    sfx(
      0.4,
      (m) => {
        metal(m, 0, [2350, 3520, 4400], 26, 0.7);
        metal(m, 0.06, [2480, 3700], 34, 0.2);
      },
      { peak: 0.45, cutoff: 5000 },
    ),
  // Paper bill: two soft flicks.
  sfx_bill: () =>
    sfx(0.28, (m, r) => {
      noiseBurst(m, r, 0, 0.05, 0.45, 2200);
      noiseBurst(m, r, 0.06, 0.06, 0.3, 1800);
    }),
  sfx_pay: () =>
    sfx(
      0.9,
      (m, r) => {
        noiseBurst(m, r, 0, 0.05, 0.5, 700); // drawer thunk
        blip(m, 0, 140, 90, 0.08, 0.5);
        metal(m, 0.08, [1568, 2349, 3136], 9, 0.6); // ka-ching bell
        metal(m, 0.22, [2093, 3136], 9, 0.4);
      },
      { peak: 0.55 },
    ),
  sfx_sukli: () =>
    sfx(
      0.8,
      (m) => {
        for (let k = 0; k < 4; k++) metal(m, k * 0.08, [2300 + k * 140, 3450 + k * 120], 30, 0.5);
      },
      { peak: 0.45, cutoff: 5000 },
    ),
  // Pencil tick: two short soft strokes.
  sfx_check: () =>
    sfx(0.28, (m, r) => {
      noiseBurst(m, r, 0, 0.04, 0.35, 2000);
      noiseBurst(m, r, 0.06, 0.07, 0.45, 2400);
    }),
  sfx_error: () =>
    sfx(0.5, (m) => {
      blip(m, 0, 330, 300, 0.14, 0.45, 'tri');
      blip(m, 0.17, 262, 220, 0.2, 0.45, 'tri');
    }),
  sfx_page: () =>
    sfx(0.32, (m, r) => {
      let lp = 0;
      let lp2 = 0;
      for (let k = 0; k < 0.26 * SR; k++) {
        const s = k / SR;
        const a = 1 - Math.exp((-TAU * (500 + 1600 * (s / 0.26))) / SR);
        lp += a * (r() * 2 - 1 - lp);
        lp2 += a * (lp - lp2);
        m.add('fx', k, lp2 * Math.sin(Math.PI * (s / 0.26)) * 0.5);
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
        [79, 84].forEach((n, i) => metal(m, 0.6 + i * 0.12, [midiHz(n), midiHz(n) * 2.01], 5, 0.2));
      },
      { peak: 0.7, cutoff: 5000 },
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
      { peak: 0.65 },
    ),

  // ---- Landing surprises (SPEC-homepage §3.5) and the map -------------------------------------------
  // Jeepney horn: "beep-beep!"
  sfx_jeep_horn: () =>
    sfx(
      0.55,
      (m) => {
        honk(m, 0, 0.14, 0.6);
        honk(m, 0.2, 0.22, 0.6);
      },
      { peak: 0.55, cutoff: 3000 },
    ),
  // Sorbetes cart hand bell: "kling-kling".
  sfx_sorbetes_bell: () =>
    sfx(
      0.9,
      (m) => {
        for (let k = 0; k < 3; k++) metal(m, k * 0.13, [1320, 2240, 3010], 11, 0.55 - k * 0.1);
      },
      { peak: 0.5, cutoff: 4000 },
    ),
  // Photocopier: three soft motor pulses and a paper slide.
  sfx_printer: () =>
    sfx(
      0.75,
      (m, r) => {
        for (let k = 0; k < 3; k++) {
          noiseBurst(m, r, k * 0.13, 0.08, 0.5, 600);
          blip(m, k * 0.13, 120, 100, 0.08, 0.35, 'tri');
        }
        noiseBurst(m, r, 0.42, 0.22, 0.3, 1400);
      },
      { peak: 0.5, cutoff: 2500 },
    ),
  // Cat: "mi-aow", a little voice whose vowel opens and closes.
  sfx_meow: () =>
    sfx(
      0.6,
      (m) =>
        voice(
          m,
          0,
          0.5,
          (s) => 520 + 240 * Math.sin(Math.PI * Math.min(1, s / 0.42)) - 60 * (s / 0.5),
          (s) => 2200 - 1400 * Math.sin(Math.PI * Math.min(1, s / 0.45)),
          0.35,
        ),
      { peak: 0.5, cutoff: 3200 },
    ),
  // LRT-2 door chime: three soft descending notes.
  sfx_lrt_chime: () =>
    sfx(1.4, (m, r) => [76, 72, 67].forEach((n, i) => note(m, r, i * 0.22, n, 0.55, 'ep')), {
      peak: 0.55,
      cutoff: 3500,
    }),
  // The barker calls out: a cheerful "ho-ey!" (two vowels, the pitch rising).
  sfx_barker: () =>
    sfx(
      0.6,
      (m) => {
        voice(
          m,
          0,
          0.2,
          (s) => 170 + 30 * (s / 0.2),
          () => 700,
          0.4,
        );
        voice(
          m,
          0.22,
          0.3,
          (s) => 230 + 40 * Math.sin(Math.PI * (s / 0.3)),
          (s) => 900 + 900 * (s / 0.3),
          0.4,
        );
      },
      { peak: 0.5, cutoff: 3000 },
    ),
  // Map stop: a soft wooden pop.
  sfx_pin: () =>
    sfx(0.18, (m, r) => {
      blip(m, 0, 520, 780, 0.06, 0.6, 'tri');
      noiseBurst(m, r, 0, 0.015, 0.15, 1500);
    }),
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
