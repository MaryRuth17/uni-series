/**
 * A tap-only button (SPEC §6): three states (normal, hover, pressed moves down 1 px), a tap sound
 * (sfx_click unless `sound` says otherwise), optional disabled look and icon. Drawn with the nine-slice art: `ui_board` (the yellow jeepney route
 * board, for main actions) or `ui_button` (cream, tinted for other colours).
 */
import Phaser from 'phaser';
import { services } from '../core/services';
import { COLORS, TEXT, textStyle } from './theme';

export interface ButtonOptions {
  width: number;
  height: number;
  /** COLORS.yellow uses the route-board art; COLORS.cream (default) the cream button; others tint it. */
  fill?: number;
  textColor?: string;
  fontSize?: number;
  /** Texture key of a 16×16 icon shown instead of (or beside) the label. */
  icon?: string;
  /**
   * Sound on tap: defaults to sfx_click. Pass another key for a themed sound, or null when the handler
   * plays its own, so two sounds never stack (L-037).
   */
  sound?: string | null;
}

const SLICE = 6;

export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.NineSlice;
  readonly label: Phaser.GameObjects.Text;
  private readonly baseTint: number;
  private enabled = true;
  private onClick: () => void;
  private readonly sound: string | null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    onClick: () => void,
    opts: ButtonOptions,
  ) {
    super(scene, x, y);
    this.onClick = onClick;
    this.sound = opts.sound === undefined ? 'sfx_click' : opts.sound;
    const fill = opts.fill ?? COLORS.cream;
    const board = fill === COLORS.yellow;
    const h = Math.max(opts.height, SLICE * 2);
    this.bg = scene.add.nineslice(
      0,
      0,
      board ? 'ui_board' : 'ui_button',
      undefined,
      opts.width,
      h,
      SLICE,
      SLICE,
      SLICE,
      SLICE,
    );
    this.baseTint = board || fill === COLORS.cream ? 0xffffff : fill;
    this.bg.setTint(this.baseTint);
    this.label = scene.add
      .text(
        0,
        -1,
        text,
        textStyle(opts.fontSize ?? 8, opts.textColor ?? TEXT.ink, { align: 'center' }),
      )
      .setOrigin(0.5);
    this.add([this.bg, this.label]);
    if (opts.icon) {
      const icon = scene.add.image(text ? -opts.width / 2 + 11 : 0, -1, opts.icon);
      this.add(icon);
      if (text) this.label.setX(6);
    }
    this.setSize(opts.width, h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => this.enabled && this.bg.setTint(this.shade(this.baseTint, 0.9)));
    this.on('pointerout', () => {
      this.bg.setTint(this.enabled ? this.baseTint : COLORS.grey);
      this.label.setY(-1);
    });
    this.on('pointerdown', () => this.enabled && this.label.setY(0));
    this.on('pointerup', () => {
      this.label.setY(-1);
      if (!this.enabled) return;
      if (this.sound) services().audio.sfx(this.sound);
      this.onClick();
    });
    scene.add.existing(this);
  }

  setText(text: string): this {
    this.label.setText(text);
    return this;
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.bg.setTint(enabled ? this.baseTint : COLORS.grey);
    this.label.setAlpha(enabled ? 1 : 0.6);
    return this;
  }

  /** Highlight as the selected option of a toggle (e.g. Girl / Boy, EN / FIL). */
  setSelected(selected: boolean): this {
    this.bg.setTint(selected ? 0xf2c14e : this.baseTint);
    return this;
  }

  setHandler(onClick: () => void): this {
    this.onClick = onClick;
    return this;
  }

  /** Run the click as if tapped (keyboard shortcuts). */
  press(): void {
    if (this.enabled) this.onClick();
  }

  private shade(color: number, f: number): number {
    const c = Phaser.Display.Color.IntegerToColor(color);
    return Phaser.Display.Color.GetColor(c.red * f, c.green * f, c.blue * f);
  }
}
