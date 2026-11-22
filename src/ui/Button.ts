/**
 * A tap-only button (SPEC §6): three states (normal, hover, pressed moves down 1 px), click sound,
 * optional disabled look. Placeholder shapes until the art pass swaps in the nine-slice `button`.
 */
import Phaser from 'phaser';
import { services } from '../core/services';
import { COLORS, TEXT, textStyle } from './theme';

export interface ButtonOptions {
  width: number;
  height: number;
  fill?: number;
  textColor?: string;
  fontSize?: number;
  stroke?: number;
}

export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Rectangle;
  readonly label: Phaser.GameObjects.Text;
  private readonly fill: number;
  private enabled = true;
  private onClick: () => void;

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
    this.fill = opts.fill ?? COLORS.cream;
    this.bg = scene.add
      .rectangle(0, 0, opts.width, opts.height, this.fill)
      .setStrokeStyle(1, opts.stroke ?? COLORS.ink);
    this.label = scene.add
      .text(
        0,
        0,
        text,
        textStyle(opts.fontSize ?? 8, opts.textColor ?? TEXT.ink, { align: 'center' }),
      )
      .setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.setSize(opts.width, opts.height);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => this.enabled && this.bg.setFillStyle(this.tint(0.92)));
    this.on('pointerout', () => {
      this.bg.setFillStyle(this.enabled ? this.fill : COLORS.grey);
      this.label.setY(0);
    });
    this.on('pointerdown', () => this.enabled && this.label.setY(1));
    this.on('pointerup', () => {
      this.label.setY(0);
      if (!this.enabled) return;
      services().audio.sfx('sfx_click');
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
    this.bg.setFillStyle(enabled ? this.fill : COLORS.grey);
    this.label.setAlpha(enabled ? 1 : 0.6);
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

  private tint(f: number): number {
    const c = Phaser.Display.Color.IntegerToColor(this.fill);
    return Phaser.Display.Color.GetColor(c.red * f, c.green * f, c.blue * f);
  }
}
