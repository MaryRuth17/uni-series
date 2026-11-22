import { describe, expect, it } from 'vitest';
import { EventBus, type GameEventMap } from '../../../src/core/GameEvents';
import { SaveManager, type StorageLike } from '../../../src/core/SaveManager';
import { Settings } from '../../../src/core/Settings';

const memory = (): StorageLike => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

describe('Settings', () => {
  it('saves each change and emits events', () => {
    const storage = memory();
    const events = new EventBus<GameEventMap>();
    const seen: string[] = [];
    events.on('settings:changed', ({ key }) => seen.push(key));
    events.on('language:changed', ({ language }) => seen.push(`lang:${language}`));
    const s = new Settings(new SaveManager(storage), events);
    s.set('language', 'fil');
    s.set('reducedMotion', true);
    expect(seen).toEqual(['language', 'lang:fil', 'reducedMotion']);
    const reloaded = new SaveManager(storage);
    expect(reloaded.data.settings.language).toBe('fil');
    expect(reloaded.data.settings.reducedMotion).toBe(true);
  });

  it('clamps volumes to 0..1 in steps of 0.1', () => {
    const s = new Settings(new SaveManager(memory()), new EventBus<GameEventMap>());
    for (let i = 0; i < 6; i++) s.stepVolume('musicVolume', 1);
    expect(s.get('musicVolume')).toBe(1);
    for (let i = 0; i < 15; i++) s.stepVolume('sfxVolume', -1);
    expect(s.get('sfxVolume')).toBe(0);
    s.set('musicVolume', 0.33);
    expect(s.get('musicVolume')).toBe(0.3);
  });

  it('remembers tutorials per minigame', () => {
    const s = new Settings(new SaveManager(memory()), new EventBus<GameEventMap>());
    s.setTutorialSeen('pup-lagoon', true);
    expect(s.get('tutorialSeen')).toEqual({ 'pup-lagoon': true });
  });
});
