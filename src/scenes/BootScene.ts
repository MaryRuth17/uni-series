/**
 * BootScene
 * Shows: nothing. Loads the few files the loading bar needs (none yet: the bar is drawn with shapes).
 * Listens to: nothing.
 */
import Phaser from 'phaser';
import { SCENES } from '../ui/theme';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    this.scene.start(SCENES.preloader);
  }
}
