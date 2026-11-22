/**
 * ToastScene (always on top, launched by the Preloader)
 * Shows: short messages at the bottom of the screen, one at a time.
 * Listens to: gameEvents 'toast' and 'save:failed' (shows the "Hindi ma-save" warning).
 */
import Phaser from 'phaser';
import { gameEvents } from '../core/GameEvents';
import { t } from '../core/i18n';
import { COLORS, SCENES, TEXT, textStyle } from '../ui/theme';

const DEFAULT_MS = 2000;

export class ToastScene extends Phaser.Scene {
  private box!: Phaser.GameObjects.Container;
  private label!: Phaser.GameObjects.Text;
  private bg!: Phaser.GameObjects.Rectangle;
  private queue: { text: string; ms: number }[] = [];
  private showing = false;

  constructor() {
    super(SCENES.toast);
  }

  create(): void {
    const { width, height } = this.scale;
    this.bg = this.add.rectangle(0, 0, 10, 18, COLORS.ink, 0.92).setStrokeStyle(1, COLORS.cream);
    this.label = this.add.text(0, 0, '', textStyle(8, TEXT.cream)).setOrigin(0.5);
    this.box = this.add.container(width / 2, height - 30, [this.bg, this.label]).setAlpha(0);

    const offToast = gameEvents.on('toast', ({ text, ms }) => this.enqueue(text, ms ?? DEFAULT_MS));
    const offFail = gameEvents.on('save:failed', () => this.enqueue(t('ui.storageWarn'), 3000));
    this.events.once('shutdown', () => {
      offToast();
      offFail();
    });
  }

  private enqueue(text: string, ms: number): void {
    this.queue.push({ text, ms });
    if (!this.showing) this.next();
  }

  private next(): void {
    const item = this.queue.shift();
    if (!item) {
      this.showing = false;
      return;
    }
    this.showing = true;
    this.scene.bringToTop();
    this.label.setText(item.text);
    this.bg.setSize(this.label.width + 16, 18);
    this.bg.setPosition(0, 0);
    this.box.setAlpha(1);
    this.time.delayedCall(item.ms, () => {
      this.tweens.add({
        targets: this.box,
        alpha: 0,
        duration: 200,
        onComplete: () => this.next(),
      });
    });
  }
}
