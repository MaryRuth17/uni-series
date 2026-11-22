/**
 * LandingScene ("Tara, laro!", SPEC-homepage §3) — H1 greybox
 * Shows: the U-Belt street corner as labelled layers (sky by time of day, far city, LRT-2 track,
 * shop row, sidewalk, street with a parked jeepney), the UNI SERIES logo, subtitle, TARA, LARO!,
 * Sticker Book / Settings / Credits icons, the Student ID chip and the disclaimer footer.
 * First tap of the session dims-then-brightens ("Pindutin para magsimula") and unlocks audio.
 * Listens to: pointer and keyboard (Enter = TARA, LARO!).
 */
import Phaser from 'phaser';
import { gameEvents } from '../core/GameEvents';
import { t } from '../core/i18n';
import { services } from '../core/services';
import { FADE_MS, LANDING, PALETTE, SKY } from '../home/config';
import { phaseAt } from '../home/TimeOfDay';
import { Button } from '../ui/Button';
import { openOverlay } from '../ui/overlay';
import { COLORS, SCENES, TEXT, textStyle } from '../ui/theme';
import { avatarPreview } from './IdCardScene';

const REGISTRY_STARTED = 'landing.started';
const REGISTRY_WELCOMED = 'landing.welcomed';

export class LandingScene extends Phaser.Scene {
  private logo!: Phaser.GameObjects.Container;
  private jeep!: Phaser.GameObjects.Container;
  private leaving = false;

  constructor() {
    super(SCENES.landing);
  }

  create(): void {
    this.leaving = false;
    const save = services().save.data;
    const reduced = save.settings.reducedMotion;
    this.drawStreet(phaseAt(new Date(), save.home.theme));
    this.drawUi(reduced);

    this.input.keyboard?.on('keydown-ENTER', () => this.play());
    this.events.once('shutdown', () => this.input.keyboard?.removeAllListeners());
    this.cameras.main.fadeIn(FADE_MS, 0x2b, 0x22, 0x33);

    if (!this.registry.get(REGISTRY_STARTED)) this.showTapToStart(reduced);
    else this.welcome();
  }

  private drawStreet(phase: keyof typeof SKY): void {
    const L = LANDING;
    const [top, bottom] = SKY[phase];
    const sky = this.add.graphics();
    sky.fillGradientStyle(top, top, bottom, bottom, 1);
    sky.fillRect(0, L.sky.y, 640, L.sky.h);
    this.add.rectangle(320, L.city.y + L.city.h / 2, 640, L.city.h, PALETTE.city, 0.8);
    this.layerLabel(8, L.city.y + 4, t('landing.layer.city'));
    this.add.rectangle(320, L.track.y + L.track.h / 2, 640, L.track.h, 0x9a9aa6);
    this.layerLabel(8, L.track.y + 4, t('landing.layer.lrt'));
    for (const x of [60, 220, 420, 580]) this.add.rectangle(x, 252, 8, 132, 0x8a8a96);

    const shops = ['dorm', 'print', 'carinderia', 'sarisari', 'milktea'];
    shops.forEach((key, i) => {
      const x = 12 + i * 124;
      this.add
        .rectangle(x + 58, L.shops.y + L.shops.h / 2 + 4, 116, L.shops.h - 8, PALETTE.walls[i])
        .setStrokeStyle(1, COLORS.ink);
      this.add
        .text(
          x + 58,
          L.shops.y + 50,
          t(`landing.shop.${key}`),
          textStyle(8, TEXT.ink, { align: 'center', wordWrap: { width: 100 } }),
        )
        .setOrigin(0.5);
    });

    this.add.rectangle(320, L.sidewalk.y + L.sidewalk.h / 2, 640, L.sidewalk.h, 0xb9b0a3);
    this.layerLabel(8, L.sidewalk.y + 4, t('landing.layer.sidewalk'));
    this.add.rectangle(320, L.street.y + L.street.h / 2, 640, L.street.h + 12, 0x4a4453);
    this.layerLabel(8, L.street.y + 4, t('landing.layer.street'), TEXT.cream);

    const body = this.add.rectangle(0, 0, 72, 28, PALETTE.jeepRed).setStrokeStyle(1, COLORS.ink);
    const label = this.add.text(0, 0, t('landing.jeep'), textStyle(8, TEXT.cream)).setOrigin(0.5);
    this.jeep = this.add.container(190, L.street.y + 14, [body, label]);
  }

  private layerLabel(x: number, y: number, text: string, color: string = TEXT.ink): void {
    this.add.text(x, y, text, textStyle(8, color)).setAlpha(0.7);
  }

  private drawUi(reduced: boolean): void {
    const L = LANDING;
    const logoBox = this.add
      .rectangle(0, 0, L.logo.w, L.logo.h, PALETTE.jeepYellow)
      .setStrokeStyle(2, COLORS.ink);
    const logoText = this.add
      .text(
        0,
        0,
        t('landing.logo'),
        textStyle(32, TEXT.red, { stroke: '#2B2233', strokeThickness: 4 }),
      )
      .setOrigin(0.5);
    this.logo = this.add.container(L.logo.x, L.logo.y, [logoBox, logoText]);
    if (!reduced) {
      this.tweens.add({
        targets: this.logo,
        y: L.logo.y - L.logoBobPx,
        duration: L.logoBobMs / 2,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    this.add
      .text(
        L.subtitle.x,
        L.subtitle.y,
        t('landing.subtitle'),
        textStyle(8, TEXT.cream, { stroke: '#2B2233', strokeThickness: 2 }),
      )
      .setOrigin(0.5);

    new Button(this, L.play.x, L.play.y, t('landing.play'), () => this.play(), {
      width: L.play.w,
      height: L.play.h,
      fill: PALETTE.jeepYellow,
      textColor: TEXT.red,
      fontSize: 16,
    });

    const icons: [string, string, () => void][] = [
      ['landing.icon.stickers', 'S', () => openOverlay(this, SCENES.stickerBook)],
      ['landing.icon.settings', '*', () => openOverlay(this, SCENES.settings)],
      ['landing.icon.credits', 'i', () => openOverlay(this, SCENES.credits)],
    ];
    icons.forEach(([, glyph, onClick], i) => {
      new Button(this, L.icons.xs[i], L.icons.y, glyph, onClick, {
        width: L.icons.size,
        height: L.icons.size,
        fontSize: 16,
      });
    });

    const profile = services().save.data.profile;
    if (profile) {
      const chip = new Button(
        this,
        L.idChip.x,
        L.idChip.y,
        '',
        () => openOverlay(this, SCENES.idCard),
        {
          width: L.idChip.w,
          height: L.idChip.h,
        },
      );
      chip.add(avatarPreview(this, -46, 0, profile, 0.4));
      chip.label.setText(profile.name).setX(10);
    }

    this.add.rectangle(320, L.footer.y + L.footer.h / 2, 640, L.footer.h, COLORS.ink, 0.75);
    this.add.text(
      4,
      L.footer.y + 2,
      t('ui.version', { version: __APP_VERSION__ }),
      textStyle(8, TEXT.cream),
    );
    this.add
      .text(320, L.footer.y + 2, t('landing.disclaimer'), textStyle(8, TEXT.cream))
      .setOrigin(0.5, 0);
  }

  private showTapToStart(reduced: boolean): void {
    const dim = this.add.rectangle(320, 180, 640, 360, COLORS.dim, 0.7).setInteractive();
    const label = this.add
      .text(320, 230, t('landing.tapToStart'), textStyle(16, TEXT.cream))
      .setOrigin(0.5);
    this.logo.setVisible(false);
    dim.once('pointerup', () => {
      this.registry.set(REGISTRY_STARTED, true);
      dim.destroy();
      label.destroy();
      this.logo.setVisible(true);
      if (!reduced) {
        const y = this.logo.y;
        this.logo.y = -60;
        this.tweens.add({ targets: this.logo, y, duration: 600, ease: 'Bounce.easeOut' });
      }
      this.welcome();
    });
  }

  private welcome(): void {
    const profile = services().save.data.profile;
    if (!profile || this.registry.get(REGISTRY_WELCOMED)) return;
    this.registry.set(REGISTRY_WELCOMED, true);
    gameEvents.emit('toast', {
      text: t('landing.welcomeBack', { name: profile.name }),
      ms: LANDING.welcomeMs,
    });
  }

  private play(): void {
    if (this.leaving || !this.registry.get(REGISTRY_STARTED)) return;
    if (!services().save.data.profile) {
      openOverlay(this, SCENES.idCard, { next: 'map' });
      return;
    }
    this.leaving = true;
    const reduced = services().save.data.settings.reducedMotion;
    const go = (): void => {
      this.cameras.main.fadeOut(FADE_MS, 0x2b, 0x22, 0x33);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENES.campusMap));
    };
    if (reduced) go();
    else
      this.tweens.add({
        targets: this.jeep,
        x: 720,
        duration: 800,
        ease: 'Sine.easeIn',
        onComplete: go,
      });
  }
}
