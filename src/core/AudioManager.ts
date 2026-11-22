/**
 * Music and sound effects (SPEC §6, SPEC-homepage §6). Music cross-fades over 600 ms between screens.
 * Volumes come from Settings. Phaser mutes on hidden tabs and unlocks audio on the first tap.
 * Until the art and audio pass (H4/L6) no sounds exist, so every call is a safe no-op.
 */
import Phaser from 'phaser';
import type { Settings } from './Settings';

const CROSSFADE_MS = 600;

export class AudioManager {
  private readonly game: Phaser.Game;
  private readonly settings: Settings;
  private music: Phaser.Sound.BaseSound | null = null;
  private musicKey: string | null = null;

  constructor(game: Phaser.Game, settings: Settings) {
    this.game = game;
    this.settings = settings;
  }

  /** Start a music loop, fading out the current one. Unknown keys are ignored. */
  playMusic(key: string, scene: Phaser.Scene): void {
    if (key === this.musicKey) return;
    const old = this.music;
    this.music = null;
    this.musicKey = key;
    if (old) {
      scene.tweens.add({
        targets: old,
        volume: 0,
        duration: CROSSFADE_MS,
        onComplete: () => old.destroy(),
      });
    }
    if (!this.game.cache.audio.exists(key)) return;
    const music = this.game.sound.add(key, { loop: true, volume: 0 });
    music.play();
    this.music = music;
    scene.tweens.add({
      targets: music,
      volume: this.settings.get('musicVolume'),
      duration: CROSSFADE_MS,
    });
  }

  /** Play a one-shot sound effect at the SFX volume. Unknown keys are ignored. */
  sfx(key: string): void {
    if (!this.game.cache.audio.exists(key)) return;
    this.game.sound.play(key, { volume: this.settings.get('sfxVolume') });
  }

  /** Apply a changed music volume to the playing loop. */
  applyVolumes(): void {
    if (this.music && 'setVolume' in this.music) {
      (this.music as Phaser.Sound.WebAudioSound).setVolume(this.settings.get('musicVolume'));
    }
  }
}
