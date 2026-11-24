/**
 * CreditsScene (overlay, SPEC §13, SPEC-homepage §10)
 * Shows: the unofficial-fan-project disclaimer, the OpenStreetMap credit, font and engine licences,
 * the art and music note, and the game-prices note.
 * Listens to: pointer; Esc closes.
 */
import Phaser from 'phaser';
import { sceneConfig } from '../ui/view';
import { t } from '../core/i18n';
import { Button } from '../ui/Button';
import { closeOverlay, type OverlayData } from '../ui/overlay';
import { backdrop, panel } from '../ui/Panel';
import { SCENES, textStyle } from '../ui/theme';

export class CreditsScene extends Phaser.Scene {
  private from = SCENES.landing as string;

  constructor() {
    super(sceneConfig(SCENES.credits));
  }

  init(data: OverlayData): void {
    this.from = data.from;
  }

  create(): void {
    backdrop(this);
    panel(this, 320, 180, 400, 260);
    this.add.text(320, 66, t('credits.title'), textStyle(16)).setOrigin(0.5);
    const lines = [
      'credits.disclaimer',
      'credits.map',
      'credits.font',
      'credits.engine',
      'credits.art',
      'credits.prices',
    ];
    let y = 88;
    for (const key of lines) {
      const text = this.add.text(
        320,
        y,
        t(key),
        textStyle(8, undefined, { align: 'center', wordWrap: { width: 360 } }),
      );
      text.setOrigin(0.5, 0);
      y += text.height + 8;
    }
    new Button(this, 320, 290, t('ui.close'), () => this.close(), { width: 80, height: 20 });
    this.input.keyboard?.on('keydown-ESC', () => this.close());
    this.events.once('shutdown', () => this.input.keyboard?.removeAllListeners());
  }

  private close(): void {
    closeOverlay(this, this.from);
  }
}
