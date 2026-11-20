/**
 * HelloScene (M0 placeholder)
 * Shows: the working title and build version, proving the game boots locally and on GitHub Pages.
 * Listens to: nothing.
 * Replaced by Boot -> Preloader -> Title in M1, which moves all text into i18n.
 */
import Phaser from 'phaser';

export class HelloScene extends Phaser.Scene {
  constructor() {
    super('Hello');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2 - 12, 'Uni Series — hello', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#F2B33D',
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 + 16, `v${__APP_VERSION__}`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#FFF4DC',
      })
      .setOrigin(0.5);
  }
}
