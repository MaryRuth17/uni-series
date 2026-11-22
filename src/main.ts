import Phaser from 'phaser';
import { t } from './core/i18n';
import { initServices } from './core/services';
import { gameConfig } from './game/config';

const game = new Phaser.Game(gameConfig);
initServices(game);

// Landscape only (SPEC §9): on phones held upright, show "Paki-rotate ang phone mo" and pause.
const rotate = document.getElementById('rotate');
const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
const applyOrientation = (): void => {
  if (rotate) rotate.querySelector('p')!.textContent = t('ui.rotate');
  if (portrait.matches) game.pause();
  else if (game.isPaused) game.resume();
};
portrait.addEventListener('change', applyOrientation);
game.events.once(Phaser.Core.Events.READY, applyOrientation);

// Read-only handle for the Playwright smoke test (tests/e2e) to check which scenes are running.
(window as unknown as { __uniGame?: Phaser.Game }).__uniGame = game;
