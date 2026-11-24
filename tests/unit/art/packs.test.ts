import { describe, expect, it } from 'vitest';
import en from '../../../src/i18n/en.json';
import fil from '../../../src/i18n/fil.json';
import commonManifest from '../../../public/assets/common/manifest.json';
import commonPack from '../../../public/assets/common/pack.json';
import homeManifest from '../../../public/assets/home/manifest.json';
import homePack from '../../../public/assets/home/pack.json';
import mapManifest from '../../../public/assets/map/manifest.json';
import mapPack from '../../../public/assets/map/pack.json';

interface ManifestEntry {
  key: string;
  url: string;
  width: number;
  height: number;
  frame: number[] | null;
}

const manifest: ManifestEntry[] = [...homeManifest, ...commonManifest, ...mapManifest];
const packFiles = [...homePack.home.files, ...commonPack.common.files, ...mapPack.map.files];
const byKey = new Map(manifest.map((m) => [m.key, m]));
const frames = (key: string): number => {
  const m = byKey.get(key) as ManifestEntry;
  return m.frame ? m.width / m.frame[0] : 1;
};

describe('baked art packs (scripts/art, DECISIONS R-006)', () => {
  it('has every texture the landing, UI kit and School ID use', () => {
    const needed = [
      ...['umaga', 'tanghali', 'hapon', 'gabi'].flatMap((p) => [`sky_${p}`, `city_far_${p}`]),
      'cloud_1',
      'cloud_2',
      'cloud_3',
      'lrt_track',
      'lrt_train',
      ...['dorm', 'print', 'carinderia', 'sarisari', 'milktea'].map((s) => `shop_${s}`),
      'wires',
      'banderita',
      'sidewalk',
      'street',
      'cart_fishball',
      'cart_sorbetes',
      'cart_taho',
      'stop_sign',
      'streetlight',
      'tricycle',
      'cat',
      'dog',
      'barker',
      ...[1, 2, 3, 4, 5, 6].map((i) => `walker_${i}`),
      ...[1, 2, 3, 4].map((i) => `jeep_${i}`),
      'jeep_board',
      'logo_uniseries',
      'ui_panel',
      'ui_button',
      'ui_board',
      ...['settings', 'credits', 'stickers', 'album', 'home', 'map', 'list'].map(
        (i) => `icon_${i}`,
      ),
      ...['girl', 'boy'].flatMap((g) => [
        `avatar_body_${g}`,
        `avatar_hair_${g}`,
        `avatar_outfit_${g}`,
      ]),
      'avatar_lace',
      'map_ubelt',
      'map_lights',
      'map_pin',
      'map_jeep',
      'map_train',
      'map_mini',
      'map_boat',
      'map_hyacinth',
      'map_bird',
      ...['ust', 'feu', 'nu', 'ue', 'sanbeda', 'ceu', 'pup'].map((c) => `map_campus_${c}`),
    ];
    const packed = new Set(packFiles.map((f) => f.key));
    for (const k of needed) {
      expect(byKey.has(k), k).toBe(true);
      expect(packed.has(k), k).toBe(true);
    }
  });

  it('uses relative URLs and spritesheets that divide evenly into frames', () => {
    for (const f of packFiles) expect(f.url.startsWith('/'), f.key).toBe(false);
    for (const m of manifest) {
      if (!m.frame) continue;
      expect(m.width % m.frame[0], m.key).toBe(0);
      expect(m.height, m.key).toBe(m.frame[1]);
    }
  });

  it('has the options the School ID offers: 6 skins, 8 hair, 4 outfits, 6 laces; 3 shop frames', () => {
    for (const g of ['girl', 'boy']) {
      expect(frames(`avatar_body_${g}`)).toBe(6);
      expect(frames(`avatar_hair_${g}`)).toBe(8);
      expect(frames(`avatar_outfit_${g}`)).toBe(4);
    }
    expect(frames('avatar_lace')).toBe(6);
    expect(frames('shop_dorm')).toBe(3);
  });

  it('bakes a full-screen map and night lights, and a day and night frame per campus', () => {
    for (const k of ['map_ubelt', 'map_lights']) {
      expect(byKey.get(k)?.width).toBe(640);
      expect(byKey.get(k)?.height).toBe(360);
    }
    for (const c of ['ust', 'feu', 'nu', 'ue', 'sanbeda', 'ceu', 'pup'])
      expect(frames(`map_campus_${c}`)).toBe(2);
    expect(frames('map_mini')).toBe(6);
  });
});

describe('language (D-042)', () => {
  it('menus are English by default with a Filipino version', () => {
    expect(en['landing.play']).toBe("LET'S PLAY!");
    expect(fil['landing.play']).toBe('TARA, LARO!');
    expect(fil['landing.tapToStart']).toBe('Pindutin para magsimula');
    for (const key of ['id.girl', 'id.boy', 'id.gender', 'settings.language']) {
      expect(en[key as keyof typeof en], key).toBeTruthy();
      expect(fil[key as keyof typeof fil], key).toBeTruthy();
    }
  });
});
