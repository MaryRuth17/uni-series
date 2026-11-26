/**
 * Music and sound effects (SPEC §6, SPEC-homepage §6). Music cross-fades over 600 ms between screens.
 * Volumes come from Settings. Phaser mutes on hidden tabs and unlocks audio on the first tap.
 * Sounds are baked by scripts/audio (DECISIONS L-031, L-035); unknown keys are safe no-ops.
 * An optional ambience loop (e.g. the Lagoon crowd and birds) plays under the music at a lower volume.
 */
import Phaser from 'phaser';
import type { Settings } from './Settings';

const CROSSFADE_MS = 600;
/** Ambience plays at this share of the music volume. */
const AMBIENCE_SHARE = 0.45;

export class AudioManager {
  private readonly game: Phaser.Game;
  private readonly settings: Settings;
  private music: Phaser.Sound.BaseSound | null = null;
  private musicKey: string | null = null;
  private ambience: Phaser.Sound.BaseSound | null = null;
  private ambienceKey: string | null = null;

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

  /** Start (or, with null, fade out) the ambience loop under the music. Unknown keys are ignored. */
  setAmbience(key: string | null, scene: Phaser.Scene): void {
    if (key === this.ambienceKey) return;
    const old = this.ambience;
    this.ambience = null;
    this.ambienceKey = key;
    if (old) {
      scene.tweens.add({
        targets: old,
        volume: 0,
        duration: CROSSFADE_MS,
        onComplete: () => old.destroy(),
      });
    }
    if (!key || !this.game.cache.audio.exists(key)) return;
    const amb = this.game.sound.add(key, { loop: true, volume: 0 });
    amb.play();
    this.ambience = amb;
    scene.tweens.add({
      targets: amb,
      volume: this.settings.get('musicVolume') * AMBIENCE_SHARE,
      duration: CROSSFADE_MS * 2,
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
    if (this.ambience && 'setVolume' in this.ambience) {
      (this.ambience as Phaser.Sound.WebAudioSound).setVolume(
        this.settings.get('musicVolume') * AMBIENCE_SHARE,
      );
    }
  }
}
