// Bakes every art asset to PNG plus a Phaser asset pack (DECISIONS R-006). Run: npm run art
// Optional: node scripts/art/build.mjs --preview <dir>  writes composed previews for review.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { landingAssets } from './landing.mjs';
import { uiAssets } from './ui.mjs';
import { avatarAssets } from './avatar.mjs';
import { Pix } from './pix.mjs';

const SETS = [
  { name: 'home', dir: 'public/assets/home', assets: landingAssets() },
  { name: 'common', dir: 'public/assets/common', assets: [...uiAssets(), ...avatarAssets()] },
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
  console.log(`previews → ${dir}`);
}
