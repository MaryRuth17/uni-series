/**
 * ComingSoonScene (SPEC-homepage §5, §7)
 * Shows: "Ginagawa pa 'to!" for a minigame whose intro scene does not exist yet, with a Back button.
 * Listens to: pointer; Enter or Esc goes back to the campus map.
 */
import Phaser from 'phaser';
import { sceneConfig } from '../ui/view';
import { t } from '../core/i18n';
import { FADE_MS } from '../home/config';
import { Button } from '../ui/Button';
import { panel } from '../ui/Panel';
import { SCENES, TEXT, textStyle } from '../ui/theme';

export class ComingSoonScene extends Phaser.Scene {
  private leaving = false;

  constructor() {
    super(sceneConfig(SCENES.comingSoon));
  }

  create(data: { id?: string }): void {
    this.leaving = false;
    this.add.rectangle(320, 180, 640, 360, 0x5e8c61);
    panel(this, 320, 170, 320, 140);
    this.add.text(320, 128, t('comingSoon.title'), textStyle(16, TEXT.red)).setOrigin(0.5);
    const title = data.id ? t(`roster.${data.id}.title`) : '';
    this.add
      .text(
        320,
        162,
        t('comingSoon.body', { title }),
        textStyle(8, TEXT.ink, { align: 'center', wordWrap: { width: 280 } }),
      )
      .setOrigin(0.5);
    new Button(this, 320, 212, t('ui.back'), () => this.back(), { width: 96, height: 24 });
    this.input.keyboard?.on('keydown-ENTER', () => this.back());
    this.input.keyboard?.on('keydown-ESC', () => this.back());
    this.events.once('shutdown', () => this.input.keyboard?.removeAllListeners());
    this.cameras.main.fadeIn(FADE_MS, 0x2b, 0x22, 0x33);
  }

  private back(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(FADE_MS, 0x2b, 0x22, 0x33);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENES.campusMap));
  }
}
