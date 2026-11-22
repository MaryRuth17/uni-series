/**
 * LandingScene ("Tara, laro!", SPEC-homepage §3) — H2 living landing (greybox shapes until H4 art)
 * Shows: the living U-Belt street (StreetView: sky and lights by time of day, drifting clouds, the LRT-2
 * train, walkers, passing jeepneys, carts, barker, tappable surprises), and on top of it the UNI SERIES
 * logo, subtitle, TARA, LARO!, Sticker Book / Settings / Credits icons, the Student ID chip and the
 * disclaimer footer. The first tap of the session dims-then-brightens ("Pindutin para magsimula"),
 * unlocks audio and drops the logo in. TARA, LARO! drives the parked jeepney away, then fades to the map.
 * Listens to: pointer, keyboard (Enter = TARA, LARO!), the frame update (moves the street).
 */
import Phaser from 'phaser';
import { gameEvents } from '../core/GameEvents';
import { t } from '../core/i18n';
import { services } from '../core/services';
import { DEPTH, FADE_MS, LANDING, PALETTE } from '../home/config';
import { StreetView } from '../home/StreetView';
import { isDecember, phaseAt } from '../home/TimeOfDay';
import { Button } from '../ui/Button';
import { openOverlay } from '../ui/overlay';
import { COLORS, SCENES, TEXT, textStyle } from '../ui/theme';
import { avatarPreview } from './IdCardScene';

const REGISTRY_STARTED = 'landing.started';
const REGISTRY_WELCOMED = 'landing.welcomed';

export class LandingScene extends Phaser.Scene {
  private logo!: Phaser.GameObjects.Container;
  private street!: StreetView;
  private leaving = false;

  constructor() {
    super(SCENES.landing);
  }

  create(): void {
    this.leaving = false;
    const save = services().save.data;
    const reduced = save.settings.reducedMotion;
    const now = new Date();
    this.street = new StreetView(this, phaseAt(now, save.home.theme), reduced, isDecember(now));
    this.street.build();
    this.drawUi(reduced);

    this.input.keyboard?.on('keydown-ENTER', () => this.play());
    this.events.once('shutdown', () => this.input.keyboard?.removeAllListeners());
    this.cameras.main.fadeIn(FADE_MS, 0x2b, 0x22, 0x33);

    if (!this.registry.get(REGISTRY_STARTED)) this.showTapToStart(reduced);
    else this.welcome();
  }

  override update(_time: number, delta: number): void {
    this.street.update(Math.min(delta, 100));
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
    this.logo = this.add.container(L.logo.x, L.logo.y, [logoBox, logoText]).setDepth(DEPTH.ui);
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
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    new Button(this, L.play.x, L.play.y, t('landing.play'), () => this.play(), {
      width: L.play.w,
      height: L.play.h,
      fill: PALETTE.jeepYellow,
      textColor: TEXT.red,
      fontSize: 16,
    }).setDepth(DEPTH.ui);

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
      }).setDepth(DEPTH.ui);
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
      chip.setDepth(DEPTH.ui);
    }

    this.add
      .rectangle(320, L.footer.y + L.footer.h / 2, 640, L.footer.h, COLORS.ink, 0.75)
      .setDepth(DEPTH.ui);
    this.add
      .text(
        4,
        L.footer.y + 2,
        t('ui.version', { version: __APP_VERSION__ }),
        textStyle(8, TEXT.cream),
      )
      .setDepth(DEPTH.ui);
    this.add
      .text(320, L.footer.y + 2, t('landing.disclaimer'), textStyle(8, TEXT.cream))
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.ui);
  }

  private showTapToStart(reduced: boolean): void {
    const dim = this.add
      .rectangle(320, 180, 640, 360, COLORS.dim, 0.7)
      .setInteractive()
      .setDepth(DEPTH.ui + 10);
    const label = this.add
      .text(320, 230, t('landing.tapToStart'), textStyle(16, TEXT.cream))
      .setOrigin(0.5)
      .setDepth(DEPTH.ui + 10);
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
        targets: this.street.parkedJeep,
        x: 720,
        duration: 800,
        ease: 'Sine.easeIn',
        onComplete: go,
      });
  }
}
