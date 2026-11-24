// Bakes every art asset to PNG plus a Phaser asset pack (DECISIONS R-006). Run: npm run art
// Optional: node scripts/art/build.mjs --preview <dir>  writes composed previews for review.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { landingAssets } from './landing.mjs';
import { uiAssets } from './ui.mjs';
import { avatarAssets } from './avatar.mjs';
import { mapAssets } from './map.mjs';
import { Pix } from './pix.mjs';

const SETS = [
  { name: 'home', dir: 'public/assets/home', assets: landingAssets() },
  { name: 'common', dir: 'public/assets/common', assets: [...uiAssets(), ...avatarAssets()] },
  { name: 'map', dir: 'public/assets/map', assets: mapAssets() },
];

for (const set of SETS) {
  mkdirSync(set.dir, { recursive: true });
  const files = [];
  for (const a of set.assets) {
    writeFileSync(join(set.dir, `${a.key}.png`), a.pix.png());
    const url = `${set.dir.replace(/^public\//, '')}/${a.key}.png`;
    files.push(
      a.frame
        ? {
            type: 'spritesheet',
            key: a.key,
            url,
            frameConfig: { frameWidth: a.frame[0], frameHeight: a.frame[1] },
          }
        : { type: 'image', key: a.key, url },
    );
  }
  writeFileSync(
    join(set.dir, 'pack.json'),
    `${JSON.stringify({ [set.name]: { files } }, null, 2)}\n`,
  );
  // Sizes for tests and tools (Phaser only reads pack.json).
  const manifest = set.assets.map((x) => ({
    key: x.key,
    url: `${set.dir.replace(/^public\//, '')}/${x.key}.png`,
    width: x.pix.w,
    height: x.pix.h,
    frame: x.frame ?? null,
  }));
  writeFileSync(join(set.dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`${set.name}: ${files.length} assets → ${set.dir}`);
}

const previewAt = process.argv.indexOf('--preview');
if (previewAt > 0) {
  const dir = process.argv[previewAt + 1];
  mkdirSync(dir, { recursive: true });
  const get = (key) => SETS.flatMap((s) => s.assets).find((a) => a.key === key);
  const frame = (key, i = 0) => {
    const a = get(key);
    if (!a.frame) return a.pix;
    const [fw, fh] = a.frame;
    const p = new Pix(fw, fh);
    for (let y = 0; y < fh; y++)
      for (let x = 0; x < fw; x++) {
        const c = a.pix.get(i * fw + x, y);
        if (c && c[3]) p.px(x, y, `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`);
      }
    return p;
  };
  for (const phase of ['umaga', 'tanghali', 'hapon', 'gabi']) {
    const lit = phase === 'gabi' ? 2 : phase === 'hapon' ? 1 : 0;
    const s = new Pix(640, 360);
    s.blit(get(`sky_${phase}`).pix, 0, 0);
    s.blit(get('cloud_1').pix, 70, 30);
    s.blit(get('cloud_3').pix, 300, 18);
    s.blit(get(`city_far_${phase}`).pix, 0, 120);
    s.blit(get('lrt_track').pix, 0, 170);
    s.blit(frame('lrt_train', phase === 'gabi' ? 1 : 0), 300, 147);
    ['dorm', 'print', 'carinderia', 'sarisari', 'milktea'].forEach((k, i) =>
      s.blit(frame(`shop_${k}`, lit), 12 + i * 124, 188),
    );
    s.blit(get('wires').pix, 0, 184);
    s.blit(get('sidewalk').pix, 0, 300);
    s.blit(get('street').pix, 0, 318);
    s.blit(get('cart_fishball').pix, 32, 278);
    s.blit(get('stop_sign').pix, 104, 272);
    s.blit(frame('barker', 1), 138, 292);
    s.blit(get('cart_sorbetes').pix, 546, 284);
    s.blit(frame('streetlight', lit ? 1 : 0), 494, 232);
    s.blit(frame('jeep_1', 0), 160, 310);
    s.blit(get('jeep_board').pix, 154, 300);
    s.blit(frame('jeep_3', 1), 380, 316, true);
    s.blit(get('tricycle').pix, 590, 316);
    s.blit(frame('cat', 0), 222, 306);
    s.blit(get('dog').pix, 60, 308);
    for (let v = 1; v <= 6; v++) s.blit(frame(`walker_${v}`, v % 4), 240 + v * 30, 294);
    // 2× nearest-neighbour so details are visible when reviewing.
    const big = new Pix(1280, 720);
    for (let y = 0; y < 360; y++)
      for (let x = 0; x < 640; x++) {
        const c = s.get(x, y);
        if (!c || !c[3]) continue;
        const h = `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
        big.rect(x * 2, y * 2, 2, 2, h);
      }
    writeFileSync(join(dir, `landing-${phase}.png`), big.png());
  }
  // Campus map previews: day and night (navy tint plus the lights overlay).
  const geo = JSON.parse(readFileSync('src/map/mapGeometry.json', 'utf8'));
  const shorts = {
    'ust-paskuhan': 'ust',
    'feu-deco': 'feu',
    'nu-peprally': 'nu',
    'ue-bookhunt': 'ue',
    'sanbeda-shoot': 'sanbeda',
    'ceu-lab': 'ceu',
    'pup-lagoon': 'pup',
  };
  for (const night of [false, true]) {
    const s = new Pix(640, 360);
    s.blit(get('map_ubelt').pix, 0, 0);
    if (night) {
      s.rect(0, 0, 640, 360, '#1d234859');
      const l = get('map_lights').pix;
      for (let y = 0; y < 360; y++)
        for (let x = 0; x < 640; x++) {
          const c = l.get(x, y);
          if (!c || !c[3]) continue;
          const b = s.get(x, y);
          const a = c[3] / 255;
          s.px(
            x,
            y,
            `#${[0, 1, 2]
              .map((k) =>
                Math.min(255, Math.round(b[k] + c[k] * a))
                  .toString(16)
                  .padStart(2, '0'),
              )
              .join('')}`,
          );
        }
    }
    for (const [id, c] of Object.entries(geo.campuses)) {
      const img = frame(`map_campus_${shorts[id]}`, night ? 1 : 0);
      s.blit(img, Math.round(c.x - img.w / 2), c.y + 12 - img.h);
      s.blit(frame('map_pin', id === 'pup-lagoon' ? 0 : 1), c.x - 11, c.y + 12 - img.h - 28);
    }
    s.blit(frame('map_jeep', 0), 540 - 9, 224 - 4);
    const big = new Pix(1280, 720);
    for (let y = 0; y < 360; y++)
      for (let x = 0; x < 640; x++) {
        const c = s.get(x, y);
        if (!c || !c[3]) continue;
        big.rect(
          x * 2,
          y * 2,
          2,
          2,
          `#${c
            .slice(0, 3)
            .map((v) => v.toString(16).padStart(2, '0'))
            .join('')}`,
        );
      }
    writeFileSync(join(dir, `map-${night ? 'gabi' : 'day'}.png`), big.png());
  }
  console.log(`previews → ${dir}`);
}
