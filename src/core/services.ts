/**
 * The shared core services, created once when the game starts (SPEC §8).
 * Scenes import { services } and use services.save, services.settings, services.audio.
 */
import type Phaser from 'phaser';
import { AudioManager } from './AudioManager';
import { gameEvents } from './GameEvents';
import { setLanguage } from './i18n';
import { browserStorage, SaveManager } from './SaveManager';
import { Settings } from './Settings';

export interface Services {
  save: SaveManager;
  settings: Settings;
  audio: AudioManager;
}

let current: Services | null = null;

export function initServices(game: Phaser.Game): Services {
  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const save = new SaveManager(browserStorage(), {
    reducedMotion,
    onFail: (reason) => gameEvents.emit('save:failed', { reason }),
  });
  const settings = new Settings(save, gameEvents);
  setLanguage(save.data.settings.language);
  gameEvents.on('language:changed', ({ language }) => setLanguage(language));
  current = { save, settings, audio: new AudioManager(game, settings) };
  return current;
}

export function services(): Services {
  if (!current) throw new Error('Core services are not initialised');
  return current;
}
