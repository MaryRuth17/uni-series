/**
 * Logical size vs render size (DECISIONS D-040).
 * Every scene lays things out on the SPEC's 640×360 grid, but the canvas renders at RENDER_SCALE× that
 * (1920×1080), and every camera zooms by RENDER_SCALE. Pixel art stays chunky and exact, while text is
 * drawn at full resolution, so it stays sharp instead of being stretched from 8 px.
 */
import type Phaser from 'phaser';

export const VIEW_W = 640;
export const VIEW_H = 360;
export const RENDER_SCALE = 3;

/** A camera config that shows the 640×360 world on the full RENDER_SCALE× canvas. */
export function cameraConfig(): Phaser.Types.Cameras.Scene2D.CameraConfig {
  return {
    zoom: RENDER_SCALE,
    scrollX: VIEW_W / 2 - (VIEW_W * RENDER_SCALE) / 2,
    scrollY: VIEW_H / 2 - (VIEW_H * RENDER_SCALE) / 2,
  };
}

/** Scene settings: the key plus the zoomed main camera. Use in every scene's constructor. */
export function sceneConfig(key: string): Phaser.Types.Scenes.SettingsConfig {
  return { key, cameras: cameraConfig() };
}

/** Add a second full-screen camera with the same zoom (e.g. the campus map's fixed UI camera). */
export function addViewCamera(scene: Phaser.Scene): Phaser.Cameras.Scene2D.Camera {
  const cam = scene.cameras.add(0, 0, VIEW_W * RENDER_SCALE, VIEW_H * RENDER_SCALE);
  cam.setZoom(RENDER_SCALE).centerOn(VIEW_W / 2, VIEW_H / 2);
  return cam;
}
