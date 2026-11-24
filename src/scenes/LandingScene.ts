/**
 * LandingScene ("Tara, laro!", SPEC-homepage §3) — H4 pixel art (DECISIONS D-040 to D-042)
 * Shows: the living U-Belt street (StreetView: sky and lights by time of day, drifting clouds, the LRT-2
 * train, walkers, passing jeepneys, carts, barker, tappable surprises), and on top of it the UNI SERIES
 * logo, subtitle, the play button, Sticker Book / Settings / Credits icons, the English | Filipino toggle
 * (usable even on the tap-to-start screen), the Student ID chip and the disclaimer footer. The first tap of the session dims-then-brightens ("Pindutin para magsimula"),
 * unlocks audio and drops the logo in. TARA, LARO! drives the parked jeepney away, then fades to the map.
 * Listens to: pointer, keyboard (Enter = TARA, LARO!), the frame update (moves the street).
 */
import Phaser from 'phaser';
import { sceneConfig } from '../ui/view';
import { gameEvents } from '../core/GameEvents';
import { t } from '../core/i18n';
import { services } from '../core/services';
import { DEPTH, FADE_MS, LANDING, PALETTE } from '../home/config';
import { StreetView } from '../home/StreetView';
import { isDecember, phaseAt } from '../home/TimeOfDay';
import { Button } from '../ui/Button';
import { openOverlay } from '../ui/overlay';
import { COLORS, SCENES, TEXT, textStyle } from '../ui/theme';
import { avatarSprite } from '../ui/avatar';
import type { Language } from '../core/SaveManager';

const REGISTRY_STARTED = 'landing.started';
const REGISTRY_WELCOMED = 'landing.welcomed';

export class LandingScene extends Phaser.Scene {
  private logo!: Phaser.GameObjects.Container;
  private street!: StreetView;
  private leaving = false;

  constructor() {
    super(sceneConfig(SCENES.landing));
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
    // logo_uniseries: jeepney sign-painter lettering baked in scripts/art/ui.mjs.
    this.logo = this.add
      .container(L.logo.x, L.logo.y, [this.add.image(0, 0, 'logo_uniseries')])
      .setDepth(DEPTH.ui);
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

    const icons: [string, () => void][] = [
      ['icon_stickers', () => openOverlay(this, SCENES.stickerBook)],
      ['icon_settings', () => openOverlay(this, SCENES.settings)],
      ['icon_credits', () => openOverlay(this, SCENES.credits)],
    ];
    icons.forEach(([icon, onClick], i) => {
      new Button(this, L.icons.xs[i], L.icons.y, '', onClick, {
        width: L.icons.size,
        height: L.icons.size,
        icon,
      }).setDepth(DEPTH.ui);
    });
    this.drawLanguageToggle();

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
      chip.add(avatarSprite(this, -46, -3, profile, 0.5));
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

  /**
   * English | Filipino (DECISIONS D-042): English by default. It sits above the tap-to-start dim so a
   * first-time player can pick a language before starting. Switching redraws the landing in that language.
   */
  private drawLanguageToggle(): void {
    const current = services().settings.get('language');
    const make = (lang: Language, x: number): void => {
      new Button(
        this,
        x,
        LANDING.icons.y,
        t(`settings.language.${lang}`),
        () => {
          if (services().settings.get('language') === lang) return;
          services().settings.set('language', lang);
          this.scene.restart();
        },
        { width: 44, height: 22 },
      )
        .setSelected(current === lang)
        .setDepth(DEPTH.ui + 11);
    };
    make('en', 462);
    make('fil', 508);
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
      this.cameras.main.once('camerafadeoutcomplete', () =>
        this.scene.start(SCENES.campusMap, { from: 'landing' }),
      );
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
