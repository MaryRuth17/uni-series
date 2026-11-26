// Bakes the game's music to public/assets/audio (DECISIONS R-006, L-031). Run: npm run audio
// Two cozy lo-fi loops, composed here as chord charts and rendered by synth.mjs:
//   music_home   — the landing and the campus map: C major, 84 BPM, light and sunny.
//   music_lagoon — PUP and the Lagoon stalls: F major, 76 BPM, slower and warmer (merienda time).
// Each is 16 bars with a gentle melody on a plucked guitar, electric piano chords, bass, swung drums and
// vinyl crackle, and loops seamlessly. Audio ships as 16-bit mono WAV (no encoder dependency).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SR, Track, rng, wav } from './synth.mjs';

const OUT = 'public/assets/audio';

const SONGS = [
  {
    key: 'music_home',
    bpm: 84,
    seed: 11,
    swing: 0.1,
    // [electric piano voicing (MIDI), bass root (MIDI)], one chord per bar, 8 bars played twice.
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
    cutoff: 5600,
  },
  {
    key: 'music_lagoon',
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
    cutoff: 5000,
  },
];

function compose(song) {
  const beat = 60 / song.bpm;
  const bars = song.chords.length * 2;
  const track = new Track(bars * 4 * beat);
  const r = rng(song.seed);
  /** Time of an 8th-note slot in a bar, with swing on the off-beats. */
  const at = (bar, eighth) =>
    (bar * 4 + Math.floor(eighth / 2) + (eighth % 2 ? 0.5 + song.swing : 0)) * beat;

  let note = Math.floor(song.scale.length / 2);
  for (let bar = 0; bar < bars; bar++) {
    const [voicing, root] = song.chords[bar % song.chords.length];
    const second = bar >= song.chords.length;
    // Electric piano: the chord on beat 1 (a slow strum), a softer re-strike on the "and" of 2.
    voicing.forEach((m, k) => track.ep(at(bar, 0) + k * 0.014, m, 0.55 + r() * 0.08, 1.9 * beat));
    voicing
      .slice(1)
      .forEach((m, k) => track.ep(at(bar, 3) + k * 0.012, m, 0.3 + r() * 0.06, 1.1 * beat));
    // Bass: root, a pickup on the "and" of 2, the root again on 3 (or the fifth).
    track.bass(at(bar, 0), root, 0.9, 1.4 * beat);
    track.bass(at(bar, 3), root + (r() < 0.5 ? 12 : 7), 0.45, 0.4 * beat);
    track.bass(at(bar, 4), r() < 0.7 ? root : root + 7, 0.7, 1.2 * beat);
    // Drums: lazy kick and snare, swung hats; an open hat closes every fourth bar.
    track.kick(at(bar, 0), 0.9);
    track.kick(at(bar, 3), 0.55);
    if (r() < 0.35) track.kick(at(bar, 7), 0.4);
    track.snare(at(bar, 2) + 0.018, 0.65, r);
    track.snare(at(bar, 6) + 0.018, 0.7, r);
    for (let e = 0; e < 8; e++) {
      if (bar % 4 === 3 && e === 7) track.hat(at(bar, e), 0.6, r, true);
      else track.hat(at(bar, e), (e % 2 ? 0.45 : 0.7) * (0.8 + r() * 0.3), r);
    }
    // Plucked guitar: arpeggios for the first two bars, then a gentle wandering melody with rests.
    if (bar < 2) {
      for (let e = 0; e < 8; e++)
        track.pluck(at(bar, e), voicing[e % voicing.length] + 12, 0.5 + r() * 0.15, r);
      continue;
    }
    for (let e = 0; e < 8; e++) {
      const strong = e % 2 === 0;
      const p = (bar % 4 === 3 ? 0.18 : 0.42) * (strong ? 1 : 0.55);
      if (r() > p) continue;
      if (e === 0) {
        // Land on a chord tone at the start of the bar.
        const tone = voicing[Math.floor(r() * voicing.length)] + 12;
        let best = 0;
        song.scale.forEach((m, i) => {
          if (Math.abs(m - tone) < Math.abs(song.scale[best] - tone)) best = i;
        });
        note = best;
      } else {
        note += Math.floor(r() * 5) - 2;
        note = Math.max(0, Math.min(song.scale.length - 1, note));
      }
      const vel = (strong ? 0.75 : 0.55) * (second ? 1 : 0.9);
      track.pluck(at(bar, e) + r() * 0.01, song.scale[note], vel, r, 0.995);
    }
  }
  track.vinyl(r, 1);
  return track.master({ cutoff: song.cutoff });
}

mkdirSync(OUT, { recursive: true });
const files = [];
for (const song of SONGS) {
  const samples = compose(song);
  writeFileSync(join(OUT, `${song.key}.wav`), wav(samples));
  files.push({ type: 'audio', key: song.key, url: `assets/audio/${song.key}.wav` });
  console.log(`${song.key}: ${(samples.length / SR).toFixed(1)} s`);
}
writeFileSync(join(OUT, 'pack.json'), `${JSON.stringify({ audio: { files } }, null, 2)}\n`);
