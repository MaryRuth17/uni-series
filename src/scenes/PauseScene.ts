/**
 * PauseScene (overlay, SPEC §3 Pause) — shared by every minigame
 * Shows: Tuloy (resume), Settings, and Balik sa mapa (leave the minigame; an unfinished round is not
 * saved). "Restart Day" from SPEC §3 is gone: Lagoon Merienda has no days (SPEC-pup-lagoon OC-1).
 * The minigame scene underneath is paused, so its logic update stops (AGENTS gotcha: pausing = not
 * calling update).
 * Listens to: pointer; Esc or P resumes.
 */
import Phaser from 'phaser';
import { t } from '../core/i18n';
import { FADE_MS } from '../home/config';
import { Button } from '../ui/Button';
import { closeOverlay, openOverlay, type OverlayData } from '../ui/overlay';
import { backdrop, panel } from '../ui/Panel';
import { SCENES, textStyle } from '../ui/theme';

export const PAUSE = 'Pause';

export class PauseScene extends Phaser.Scene {
  private from = SCENES.campusMap as string;

  constructor() {
    super(PAUSE);
  }

  init(data: Partial<OverlayData>): void {
    // Settings may restart this overlay without data (after a language change); keep the scene to return to.
    this.from = data.from ?? this.from;
  }

  create(): void {
    backdrop(this);
    panel(this, 320, 180, 200, 150);
    this.add.text(320, 124, t('pause.title'), textStyle(16)).setOrigin(0.5);
    new Button(this, 320, 160, t('pause.resume'), () => this.resume(), { width: 140, height: 22 });
    new Button(this, 320, 188, t('pause.settings'), () => openOverlay(this, SCENES.settings), {
      width: 140,
      height: 22,
    });
    new Button(this, 320, 216, t('pause.map'), () => this.toMap(), { width: 140, height: 22 });
    this.input.keyboard?.on('keydown-ESC', () => this.resume());
    this.input.keyboard?.on('keydown-P', () => this.resume());
    this.events.once('shutdown', () => this.input.keyboard?.removeAllListeners());
  }

  private resume(): void {
    closeOverlay(this, this.from);
  }

  private toMap(): void {
    this.scene.stop(this.from);
    this.cameras.main.fadeOut(FADE_MS, 0x2b, 0x22, 0x33);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENES.campusMap));
  }
}
