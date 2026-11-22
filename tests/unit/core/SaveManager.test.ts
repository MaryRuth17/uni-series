import { describe, expect, it, vi } from 'vitest';
import {
  BACKUP_KEY,
  defaultSave,
  migrate,
  SAVE_KEY,
  SaveManager,
  type StorageLike,
} from '../../../src/core/SaveManager';

class MemoryStorage implements StorageLike {
  items = new Map<string, string>();
  getItem(k: string): string | null {
    return this.items.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.items.set(k, v);
  }
}

class BrokenStorage implements StorageLike {
  getItem(): string | null {
    throw new Error('SecurityError');
  }
  setItem(): void {
    throw new Error('QuotaExceededError');
  }
}

const now = () => new Date('2026-11-22T08:00:00Z');

describe('SaveManager', () => {
  it('starts from defaults (SPEC §9 volumes) and saves JSON under the save key', () => {
    const storage = new MemoryStorage();
    const m = new SaveManager(storage, { now });
    expect(m.data.settings.musicVolume).toBe(0.6);
    expect(m.data.settings.sfxVolume).toBe(0.8);
    expect(m.data.profile).toBeNull();
    expect(m.data.home).toEqual({ lastStop: 7, mapView: 'map', theme: 'auto' });
    m.update((d) => (d.stickers = ['sticker-pup']));
    expect(JSON.parse(storage.getItem(SAVE_KEY) as string).stickers).toEqual(['sticker-pup']);
    expect(new SaveManager(storage, { now }).data.stickers).toEqual(['sticker-pup']);
  });

  it('backs up an unreadable save and starts fresh', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '{not json');
    const m = new SaveManager(storage, { now });
    expect(storage.getItem(BACKUP_KEY)).toBe('{not json');
    expect(m.data.stickers).toEqual([]);

    storage.setItem(SAVE_KEY, JSON.stringify({ version: 99 }));
    new SaveManager(storage, { now });
    expect(storage.getItem(BACKUP_KEY)).toBe(JSON.stringify({ version: 99 }));
  });

  it('keeps running in memory and warns once when storage is blocked', () => {
    const onFail = vi.fn();
    const m = new SaveManager(new BrokenStorage(), { now, onFail });
    expect(m.available).toBe(false);
    expect(m.update((d) => (d.settings.musicVolume = 0.2))).toBe(false);
    expect(m.data.settings.musicVolume).toBe(0.2);
    expect(onFail).toHaveBeenCalledTimes(1);

    const none = vi.fn();
    new SaveManager(null, { now, onFail: none }).save();
    expect(none).toHaveBeenCalledTimes(1);
  });

  it('warns when a write fails later (quota)', () => {
    const storage = new MemoryStorage();
    const onFail = vi.fn();
    const m = new SaveManager(storage, { now, onFail });
    storage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    expect(m.save()).toBe(false);
    expect(onFail).toHaveBeenCalledWith('write');
  });

  it('migrate fills missing fields from defaults and rejects unknown versions', () => {
    const d = defaultSave(now(), true);
    const partial = migrate({ version: 1, settings: { language: 'fil' }, stickers: ['a', 3] }, d);
    expect(partial?.settings.language).toBe('fil');
    expect(partial?.settings.reducedMotion).toBe(true);
    expect(partial?.stickers).toEqual(['a']);
    expect(partial?.home.mapView).toBe('map');
    expect(migrate({ version: 2 }, d)).toBeNull();
    expect(migrate('nope', d)).toBeNull();
  });

  it('reset progress keeps settings', () => {
    const m = new SaveManager(new MemoryStorage(), { now });
    m.update((d) => {
      d.settings.language = 'fil';
      d.profile = { name: 'Ana', skin: 1, hair: 2, outfit: 0, lace: 3 };
      d.minigames['pup-lagoon'] = { vacants: 3 };
    });
    m.resetProgress();
    expect(m.data.settings.language).toBe('fil');
    expect(m.data.profile).toBeNull();
    expect(m.data.minigames).toEqual({});
  });
});
