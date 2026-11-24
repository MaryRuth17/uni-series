/**
 * SettingsScene (overlay, SPEC §9 Settings screen + SPEC-homepage §6 additions)
 * Shows: music and SFX volume, language, Reduced Motion, theme (Auto / Golden hour), Chill Mode,
 * fullscreen (where supported), Reset progress with an in-game confirm panel, and Credits.
 * Every change saves immediately. Closing restarts the scene underneath if text or progress changed.
 * Listens to: pointer; Esc closes.
 */
import Phaser from 'phaser';
import { sceneConfig } from '../ui/view';
import { gameEvents } from '../core/GameEvents';
import { t } from '../core/i18n';
import { services } from '../core/services';
import { Button } from '../ui/Button';
import { closeOverlay, type OverlayData } from '../ui/overlay';
import { backdrop, panel } from '../ui/Panel';
import { COLORS, SCENES, TEXT, textStyle } from '../ui/theme';

export class SettingsScene extends Phaser.Scene {
  private from = SCENES.landing as string;
  private redraw = false;
  private rows!: Phaser.GameObjects.Container;
  private confirm: Phaser.GameObjects.Container | null = null;

  constructor() {
    super(sceneConfig(SCENES.settings));
  }

  init(data: OverlayData): void {
    this.from = data.from;
    this.redraw = false;
    this.confirm = null;
  }

  create(): void {
    backdrop(this);
    panel(this, 320, 180, 300, 260);
    this.rows = this.add.container(0, 0);
    this.drawRows();
    this.input.keyboard?.on('keydown-ESC', () => this.close());
    this.events.once('shutdown', () => this.input.keyboard?.removeAllListeners());
  }

  private drawRows(): void {
    this.rows.removeAll(true);
    const s = services().settings;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.rows.add(o);
      return o;
    };
    add(this.add.text(320, 64, t('settings.title'), textStyle(16, TEXT.ink)).setOrigin(0.5));

    let y = 92;
    const row = (label: string, value: string, onClick: () => void, minus?: () => void): void => {
      add(this.add.text(190, y, label, textStyle(8)).setOrigin(0, 0.5));
      if (minus) add(new Button(this, 352, y, '-', minus, { width: 18, height: 16 }));
      add(
        new Button(this, minus ? 410 : 400, y, value, onClick, {
          width: minus ? 70 : 100,
          height: 16,
        }),
      );
      y += 22;
    };
    const pct = (v: number): string => `${Math.round(v * 100)}%`;
    const onOff = (v: boolean): string => t(v ? 'ui.on' : 'ui.off');

    row(
      t('settings.music'),
      `${pct(s.get('musicVolume'))} +`,
      () => this.apply(() => s.stepVolume('musicVolume', 1)),
      () => this.apply(() => s.stepVolume('musicVolume', -1)),
    );
    row(
      t('settings.sfx'),
      `${pct(s.get('sfxVolume'))} +`,
      () => this.apply(() => s.stepVolume('sfxVolume', 1)),
      () => this.apply(() => s.stepVolume('sfxVolume', -1)),
    );
    row(t('settings.language'), t(`settings.language.${s.get('language')}`), () =>
      this.apply(() => s.set('language', s.get('language') === 'en' ? 'fil' : 'en'), true),
    );
    row(t('settings.reducedMotion'), onOff(s.get('reducedMotion')), () =>
      this.apply(() => s.set('reducedMotion', !s.get('reducedMotion')), true),
    );
    const theme = services().save.data.home.theme;
    row(t('settings.theme'), t(`settings.theme.${theme}`), () =>
      this.apply(
        () => services().save.update((d) => (d.home.theme = theme === 'auto' ? 'golden' : 'auto')),
        true,
      ),
    );
    row(t('settings.chill'), onOff(s.get('chillMode')), () =>
      this.apply(() => s.set('chillMode', !s.get('chillMode'))),
    );
    if (this.scale.fullscreen.available) {
      row(t('settings.fullscreen'), onOff(this.scale.isFullscreen), () => {
        this.scale.toggleFullscreen();
      });
    }
    row(t('settings.reset'), '…', () => this.askReset());

    add(
      new Button(
        this,
        260,
        290,
        t('settings.credits'),
        () => {
          this.scene.launch(SCENES.credits, { from: SCENES.settings, overlayOnly: true });
          this.scene.bringToTop(SCENES.credits);
          this.scene.pause();
        },
        { width: 80, height: 20 },
      ),
    );
    add(new Button(this, 380, 290, t('ui.close'), () => this.close(), { width: 80, height: 20 }));
  }

  private apply(change: () => void, redraw = false): void {
    change();
    if (redraw) this.redraw = true;
    services().audio.applyVolumes();
    this.drawRows();
  }

  private askReset(): void {
    if (this.confirm) return;
    const box = this.add.container(320, 180);
    box.add(this.add.rectangle(0, 0, 640, 360, COLORS.dim, 0.5).setInteractive());
    box.add(panel(this, 0, 0, 220, 90));
    box.add(this.add.text(0, -22, t('settings.resetConfirm'), textStyle(8)).setOrigin(0.5));
    box.add(
      new Button(
        this,
        -50,
        18,
        t('settings.resetYes'),
        () => {
          services().save.resetProgress();
          this.registry.set('landing.welcomed', false);
          gameEvents.emit('toast', { text: t('settings.resetDone') });
          this.redraw = true;
          this.closeConfirm();
        },
        { width: 88, height: 20, fill: COLORS.red, textColor: TEXT.cream },
      ),
    );
    box.add(
      new Button(this, 50, 18, t('settings.resetNo'), () => this.closeConfirm(), {
        width: 88,
        height: 20,
      }),
    );
    this.confirm = box;
  }

  private closeConfirm(): void {
    this.confirm?.destroy();
    this.confirm = null;
  }

  private close(): void {
    if (this.confirm) {
      this.closeConfirm();
      return;
    }
    closeOverlay(this, this.from, this.redraw);
  }
}
