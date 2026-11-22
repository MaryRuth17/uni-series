/**
 * AlbumScene (overlay, SPEC-homepage §7 hook; photos from SPEC-pup-lagoon OC-6)
 * Shows: the barkada photo album placeholder: how many photos exist and "Malapit na!".
 * Listens to: pointer; Esc closes.
 */
import Phaser from 'phaser';
import { t } from '../core/i18n';
import { services } from '../core/services';
import type { LagoonProgress } from '../minigames/pup-lagoon/logic/Progress';
import { Button } from '../ui/Button';
import { closeOverlay, type OverlayData } from '../ui/overlay';
import { backdrop, panel } from '../ui/Panel';
import { SCENES, TEXT, textStyle } from '../ui/theme';

export class AlbumScene extends Phaser.Scene {
  private from = SCENES.landing as string;

  constructor() {
    super(SCENES.album);
  }

  init(data: OverlayData): void {
    this.from = data.from;
  }

  create(): void {
    backdrop(this);
    panel(this, 320, 180, 280, 160);
    this.add.text(320, 120, t('album.title'), textStyle(16)).setOrigin(0.5);
    const lagoon = services().save.data.minigames['pup-lagoon'] as
      Partial<LagoonProgress> | undefined;
    const count = Array.isArray(lagoon?.album) ? lagoon.album.length : 0;
    this.add.text(320, 160, t('album.count', { count }), textStyle(8)).setOrigin(0.5);
    this.add.text(320, 180, t('album.soon'), textStyle(8, TEXT.grey)).setOrigin(0.5);
    new Button(this, 320, 228, t('ui.close'), () => this.close(), { width: 80, height: 20 });
    this.input.keyboard?.on('keydown-ESC', () => this.close());
    this.events.once('shutdown', () => this.input.keyboard?.removeAllListeners());
  }

  private close(): void {
    closeOverlay(this, this.from);
  }
}
