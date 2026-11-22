/**
 * Player settings on top of SaveManager (SPEC §9 Settings screen). Every change saves and emits
 * 'settings:changed' (and 'language:changed' for the language).
 */
import type { EventBus, GameEventMap } from './GameEvents';
import type { SaveManager, SettingsData } from './SaveManager';

type Editable = Exclude<keyof SettingsData, 'tutorialSeen'>;

export class Settings {
  private readonly saves: SaveManager;
  private readonly events: EventBus<GameEventMap>;

  constructor(saves: SaveManager, events: EventBus<GameEventMap>) {
    this.saves = saves;
    this.events = events;
  }

  get<K extends keyof SettingsData>(key: K): SettingsData[K] {
    return this.saves.data.settings[key];
  }

  set<K extends Editable>(key: K, value: SettingsData[K]): void {
    const clean =
      key === 'musicVolume' || key === 'sfxVolume'
        ? ((Math.round(Math.min(1, Math.max(0, value as number)) * 10) / 10) as SettingsData[K])
        : value;
    this.saves.update((d) => {
      d.settings[key] = clean;
    });
    this.events.emit('settings:changed', { key });
    if (key === 'language')
      this.events.emit('language:changed', { language: clean as 'en' | 'fil' });
  }

  /** Step a volume by ±0.1, clamped to 0..1. */
  stepVolume(key: 'musicVolume' | 'sfxVolume', dir: 1 | -1): number {
    this.set(key, this.get(key) + dir * 0.1);
    return this.get(key);
  }

  setTutorialSeen(id: string, seen: boolean): void {
    this.saves.update((d) => {
      d.settings.tutorialSeen[id] = seen;
    });
    this.events.emit('settings:changed', { key: 'tutorialSeen' });
  }
}
