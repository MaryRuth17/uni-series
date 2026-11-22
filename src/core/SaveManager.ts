/**
 * One versioned JSON save in localStorage (SPEC §9; DECISIONS D-016: version 1 holds every section).
 * Every storage access is wrapped in try/catch: private mode or an itch.io iframe can block storage,
 * and the game then keeps running on in-memory data and reports 'save:failed' once.
 * A save that fails to parse or has an unknown version is copied to the backup key and replaced.
 */

export const SAVE_KEY = 'uni-series-save';
export const BACKUP_KEY = 'uni-series-save-backup';
export const SAVE_VERSION = 1;

export type Language = 'en' | 'fil';
export type Theme = 'auto' | 'golden';
export type MapView = 'map' | 'list';

export interface SettingsData {
  musicVolume: number;
  sfxVolume: number;
  language: Language;
  chillMode: boolean;
  reducedMotion: boolean;
  tutorialSeen: Record<string, boolean>;
}

export interface Profile {
  name: string;
  skin: number;
  hair: number;
  outfit: number;
  lace: number;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  createdAt: string;
  settings: SettingsData;
  /** The School ID; null until the player makes one (SPEC-homepage §3.3). */
  profile: Profile | null;
  home: { lastStop: number; mapView: MapView; theme: Theme };
  stickers: string[];
  /** Each minigame owns its own progress shape, e.g. 'pup-lagoon' → LagoonProgress. */
  minigames: Record<string, unknown>;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function defaultSave(now: Date, reducedMotion: boolean): SaveData {
  return {
    version: SAVE_VERSION,
    createdAt: now.toISOString(),
    settings: {
      musicVolume: 0.6,
      sfxVolume: 0.8,
      language: 'en',
      chillMode: false,
      reducedMotion,
      tutorialSeen: {},
    },
    profile: null,
    home: { lastStop: 7, mapView: 'map', theme: 'auto' },
    stickers: [],
    minigames: {},
  };
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Turn stored JSON into current SaveData, or null if it is not a save we understand.
 * Version 1 is current; later versions add step-by-step upgrades here (v1 → v2 → …).
 * Missing fields are filled from the defaults so older or partial saves still load.
 */
export function migrate(raw: unknown, defaults: SaveData): SaveData | null {
  if (!isObject(raw) || raw.version !== SAVE_VERSION) return null;
  const settings = isObject(raw.settings) ? raw.settings : {};
  const home = isObject(raw.home) ? raw.home : {};
  const profile = isObject(raw.profile) ? (raw.profile as unknown as Profile) : null;
  return {
    ...defaults,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : defaults.createdAt,
    settings: { ...defaults.settings, ...(settings as Partial<SettingsData>) },
    profile,
    home: { ...defaults.home, ...(home as Partial<SaveData['home']>) },
    stickers: Array.isArray(raw.stickers) ? raw.stickers.filter((s) => typeof s === 'string') : [],
    minigames: isObject(raw.minigames) ? raw.minigames : {},
  };
}

/** window.localStorage if it can actually be written, otherwise null. */
export function browserStorage(): StorageLike | null {
  try {
    const s = window.localStorage;
    const probe = '__uni_series_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export class SaveManager {
  data: SaveData;
  /** False once storage is missing or a write fails; the game continues in memory. */
  available: boolean;
  private readonly storage: StorageLike | null;
  private readonly onFail: (reason: 'unavailable' | 'write') => void;
  private readonly defaults: () => SaveData;
  private warned = false;

  constructor(
    storage: StorageLike | null,
    opts: {
      now?: () => Date;
      reducedMotion?: boolean;
      onFail?: (reason: 'unavailable' | 'write') => void;
    } = {},
  ) {
    this.storage = storage;
    this.onFail = opts.onFail ?? (() => {});
    const now = opts.now ?? (() => new Date());
    this.defaults = () => defaultSave(now(), opts.reducedMotion ?? false);
    this.available = storage !== null;
    this.data = this.load();
  }

  load(): SaveData {
    if (!this.storage) {
      this.fail('unavailable');
      return this.defaults();
    }
    let text: string | null;
    try {
      text = this.storage.getItem(SAVE_KEY);
    } catch {
      this.available = false;
      this.fail('unavailable');
      return this.defaults();
    }
    if (text === null) return this.defaults();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    const migrated = migrate(parsed, this.defaults());
    if (migrated) return migrated;
    try {
      this.storage.setItem(BACKUP_KEY, text);
    } catch {
      // Backup is best effort.
    }
    return this.defaults();
  }

  /** Write the current data. Returns false (and warns once) if storage refuses. */
  save(): boolean {
    if (!this.storage || !this.available) {
      this.fail('unavailable');
      return false;
    }
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.data));
      return true;
    } catch {
      this.available = false;
      this.fail('write');
      return false;
    }
  }

  /** Change the data and save in one step. */
  update(change: (data: SaveData) => void): boolean {
    change(this.data);
    return this.save();
  }

  /** Settings → Reset progress: everything back to defaults except the settings themselves. */
  resetProgress(): boolean {
    const settings = this.data.settings;
    this.data = { ...this.defaults(), settings };
    return this.save();
  }

  private fail(reason: 'unavailable' | 'write'): void {
    if (this.warned) return;
    this.warned = true;
    this.onFail(reason);
  }
}
