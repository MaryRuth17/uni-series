/**
 * Overlay scenes (Settings, Sticker Book, Album, Credits, School ID) open on top of the current scene.
 * The scene underneath is paused, so it ignores taps and keys, and resumes (or restarts, when its
 * text must change) when the overlay closes.
 */
import type Phaser from 'phaser';

export interface OverlayData {
  /** Scene key to return to. */
  from: string;
}

export function openOverlay(scene: Phaser.Scene, key: string, data: object = {}): void {
  scene.scene.pause();
  scene.scene.launch(key, { from: scene.scene.key, ...data });
  scene.scene.bringToTop(key);
}

/** Close the overlay; restart the scene underneath when it has to redraw (language, reset, profile). */
export function closeOverlay(overlay: Phaser.Scene, from: string, restartFrom = false): void {
  if (restartFrom) {
    overlay.scene.stop(from);
    overlay.scene.start(from);
  } else {
    overlay.scene.resume(from);
    overlay.scene.stop();
  }
}
