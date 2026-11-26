import { describe, expect, it } from 'vitest';
import en from '../../../src/i18n/en.json';
import fil from '../../../src/i18n/fil.json';
import commonManifest from '../../../public/assets/common/manifest.json';
import commonPack from '../../../public/assets/common/pack.json';
import homeManifest from '../../../public/assets/home/manifest.json';
import homePack from '../../../public/assets/home/pack.json';
import mapManifest from '../../../public/assets/map/manifest.json';
import mapPack from '../../../public/assets/map/pack.json';
import lagoonManifest from '../../../public/assets/lagoon/manifest.json';
import lagoonPack from '../../../public/assets/lagoon/pack.json';
import audioHome from '../../../public/assets/audio/audio_home.json';
import audioLagoon from '../../../public/assets/audio/audio_lagoon.json';
import { MENU } from '../../../src/minigames/pup-lagoon/data/menu';
import { STALLS } from '../../../src/minigames/pup-lagoon/data/stalls';
import { SFX } from '../../../src/minigames/pup-lagoon/config';
import storefronts from '../../../src/minigames/pup-lagoon/data/storefronts.json';

interface ManifestEntry {
  key: string;
  url: string;
  width: number;
  height: number;
  frame: number[] | null;
}

const manifest: ManifestEntry[] = [
  ...homeManifest,
  ...commonManifest,
  ...mapManifest,
  ...lagoonManifest,
];
const packFiles = [
  ...homePack.home.files,
  ...commonPack.common.files,
  ...mapPack.map.files,
  ...lagoonPack.lagoon.files,
];
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

describe('Lagoon art (L6)', () => {
  it('has food art for every menu item and a storefront for every stall', () => {
    for (const m of MENU) expect(byKey.has(`food_${m.key}`), m.key).toBe(true);
    expect(byKey.has('food_fewa')).toBe(true);
    for (const s of STALLS) {
      expect(byKey.get(`front_${s.key}`)?.width, s.key).toBe(512);
      expect(byKey.get(`front_${s.key}`)?.height, s.key).toBe(220);
    }
  });

  it('places a price tag under every orderable item of every storefront', () => {
    const layout = storefronts as unknown as Record<string, { items: number[][] }>;
    for (const s of STALLS) {
      const items = MENU.filter((m) => m.stall === s.key && m.orderable !== false);
      expect(layout[s.key].items.length, s.key).toBe(items.length);
      for (const [x, y] of layout[s.key].items) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(512);
        expect(y).toBeLessThan(220);
      }
    }
  });

  it('has the PUP front for the intro and the How to play pictures', () => {
    expect(byKey.get('lagoon_intro')?.width).toBe(960);
    expect(frames('lagoon_how')).toBe(4);
  });

  it('has the money, notebook pages and HUD pieces (L6 polish)', () => {
    for (const k of ['coin_1', 'coin_5', 'coin_10', 'coin_20', 'bill_50', 'bill_100'])
      expect(byKey.has(k), k).toBe(true);
    for (const k of ['note_card', 'note_hud', 'note_how', 'ui_tag'])
      expect(byKey.has(k), k).toBe(true);
    expect(frames('ui_check')).toBe(2);
    expect(frames('ui_bowl')).toBe(2);
    expect(frames('ui_slot')).toBe(3);
    expect(byKey.get('lagoon_how')?.frame).toEqual([104, 72]);
  });
});

describe('music, ambience and sound effects (L-031, L-035)', () => {
  it('ships the loops and every sound effect the game plays, with relative URLs', () => {
    const home = audioHome.audio_home.files.map((f) => f.key);
    const lagoon = audioLagoon.audio_lagoon.files.map((f) => f.key);
    expect(home).toContain('music_home');
    expect(home).toContain('sfx_click');
    expect(lagoon).toEqual(['music_lagoon', 'amb_lagoon']);
    for (const key of Object.values(SFX)) expect(home, key).toContain(key);
    for (const f of [...audioHome.audio_home.files, ...audioLagoon.audio_lagoon.files]) {
      expect(f.type).toBe('audio');
      expect(f.url.startsWith('assets/audio/')).toBe(true);
    }
  });
});
