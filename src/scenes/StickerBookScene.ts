/**
 * StickerBookScene (overlay, SPEC §3 Sticker Book; SPEC-homepage §7 hook)
 * Shows: 7 sticker slots, one per campus; earned stickers in colour, the rest as grey silhouettes,
 * and a "Malapit na!" note until sticker art exists.
 * Listens to: pointer; Esc closes.
 */
import Phaser from 'phaser';
import { sceneConfig } from '../ui/view';
import { t } from '../core/i18n';
import { services } from '../core/services';
import { ROSTER } from '../minigames/roster';
import { Button } from '../ui/Button';
import { closeOverlay, type OverlayData } from '../ui/overlay';
import { backdrop, panel } from '../ui/Panel';
import { COLORS, SCENES, TEXT, textStyle } from '../ui/theme';

export class StickerBookScene extends Phaser.Scene {
  private from = SCENES.landing as string;

  constructor() {
    super(sceneConfig(SCENES.stickerBook));
  }

  init(data: OverlayData): void {
    this.from = data.from;
  }

  create(): void {
    backdrop(this);
    panel(this, 320, 180, 360, 240);
    this.add.text(320, 76, t('stickers.title'), textStyle(16)).setOrigin(0.5);
    const stickers = services().save.data.stickers;
    ROSTER.forEach((entry, i) => {
      const x = 200 + (i % 4) * 80;
      const y = 130 + Math.floor(i / 4) * 80;
      const has = stickers.includes(entry.stickerId);
      this.add.circle(x, y, 26, has ? COLORS.gold : 0xcfc6b5).setStrokeStyle(1, COLORS.ink);
      this.add
        .text(x, y + 36, entry.campus, textStyle(8, has ? TEXT.ink : TEXT.grey))
        .setOrigin(0.5);
    });
    this.add.text(320, 262, t('stickers.soon'), textStyle(8, TEXT.grey)).setOrigin(0.5);
    new Button(this, 320, 284, t('ui.close'), () => this.close(), { width: 80, height: 20 });
    this.input.keyboard?.on('keydown-ESC', () => this.close());
    this.events.once('shutdown', () => this.input.keyboard?.removeAllListeners());
  }

  private close(): void {
    closeOverlay(this, this.from);
  }
}
