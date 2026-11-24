/**
 * PreloaderScene (SPEC-homepage §6 transitions)
 * Shows: the loading bar as a road with a tiny jeepney whose signboard shows the percent, and
 * "Sumasakay na…". Loads the art packs (assets/home, assets/common) and Pixelify Sans, then starts the
 * toast layer and the Landing screen.
 * Listens to: the loader's 'progress' event.
 */
import Phaser from 'phaser';
import { sceneConfig } from '../ui/view';
import { gameEvents } from '../core/GameEvents';
import { t } from '../core/i18n';
import { services } from '../core/services';
import { FADE_MS, PALETTE } from '../home/config';
import { COLORS, SCENES, TEXT, textStyle } from '../ui/theme';

const FONT_URL = 'assets/fonts/PixelifySans.ttf';
const ROAD = { x: 160, y: 200, w: 320 };

export class PreloaderScene extends Phaser.Scene {
  private jeep!: Phaser.GameObjects.Container;
  private sign!: Phaser.GameObjects.Text;

  constructor() {
    super(sceneConfig(SCENES.preloader));
  }

  preload(): void {
    this.add.rectangle(ROAD.x + ROAD.w / 2, ROAD.y, ROAD.w, 10, 0x4a4453);
    this.add.rectangle(ROAD.x + ROAD.w / 2, ROAD.y, ROAD.w, 1, COLORS.cream, 0.6);
    const body = this.add.rectangle(0, -10, 24, 12, PALETTE.jeepRed).setStrokeStyle(1, COLORS.ink);
    const board = this.add
      .rectangle(0, -20, 26, 8, PALETTE.jeepYellow)
      .setStrokeStyle(1, COLORS.ink);
    this.sign = this.add.text(0, -20, '0%', textStyle(8, TEXT.red)).setOrigin(0.5);
    this.jeep = this.add.container(ROAD.x, ROAD.y, [body, board, this.sign]);
    this.add.text(320, ROAD.y + 24, t('ui.loading'), textStyle(8, TEXT.cream)).setOrigin(0.5);

    this.load.on('progress', (value: number) => this.setProgress(value * 0.8));
    // Baked art (scripts/art, DECISIONS R-006): the landing street and the shared UI kit and avatar parts.
    this.load.pack('home', 'assets/home/pack.json', 'home');
    this.load.pack('common', 'assets/common/pack.json', 'common');
    this.load.pack('map', 'assets/map/pack.json', 'map');
    this.load.pack('lagoon', 'assets/lagoon/pack.json', 'lagoon');
  }

  create(): void {
    const done = (): void => {
      this.setProgress(1);
      this.scene.launch(SCENES.toast);
      if (!services().save.available) {
        gameEvents.emit('toast', { text: t('ui.storageWarn'), ms: 3000 });
      }
      this.cameras.main.fadeOut(FADE_MS, 0x2b, 0x22, 0x33);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENES.landing));
    };
    loadFont().then(done, done);
  }

  private setProgress(value: number): void {
    this.jeep.x = ROAD.x + ROAD.w * value;
    this.sign.setText(`${Math.round(value * 100)}%`);
  }
}

/** Load Pixelify Sans before any scene draws text (SPEC §6). Fails quietly to the fallback font. */
async function loadFont(): Promise<void> {
  if (typeof FontFace === 'undefined' || !document.fonts) return;
  const face = new FontFace('Pixelify Sans', `url(${FONT_URL})`);
  document.fonts.add(await face.load());
  await document.fonts.load('16px "Pixelify Sans"');
}
