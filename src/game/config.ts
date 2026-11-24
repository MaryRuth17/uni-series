import Phaser from 'phaser';
import { RENDER_SCALE, VIEW_H, VIEW_W } from '../ui/view';
import { LagoonIntroScene } from '../minigames/pup-lagoon/scenes/LagoonIntroScene';
import { LagoonOpeningScene } from '../minigames/pup-lagoon/scenes/LagoonOpeningScene';
import { LagoonStallsScene } from '../minigames/pup-lagoon/scenes/LagoonStallsScene';
import { AlbumScene } from '../scenes/AlbumScene';
import { BootScene } from '../scenes/BootScene';
import { CampusMapScene } from '../scenes/CampusMapScene';
import { ComingSoonScene } from '../scenes/ComingSoonScene';
import { CreditsScene } from '../scenes/CreditsScene';
import { IdCardScene } from '../scenes/IdCardScene';
import { LandingScene } from '../scenes/LandingScene';
import { PauseScene } from '../scenes/PauseScene';
import { PreloaderScene } from '../scenes/PreloaderScene';
import { SettingsScene } from '../scenes/SettingsScene';
import { StickerBookScene } from '../scenes/StickerBookScene';
import { ToastScene } from '../scenes/ToastScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  // Renders at 3× the 640×360 layout grid so text stays sharp (DECISIONS D-040).
  width: VIEW_W * RENDER_SCALE,
  height: VIEW_H * RENDER_SCALE,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#2B2233',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  // The School ID name field is a real HTML input (DECISIONS H-002).
  dom: { createContainer: true },
  scene: [
    BootScene,
    PreloaderScene,
    LandingScene,
    IdCardScene,
    CampusMapScene,
    ComingSoonScene,
    SettingsScene,
    StickerBookScene,
    AlbumScene,
    CreditsScene,
    LagoonOpeningScene,
    LagoonIntroScene,
    LagoonStallsScene,
    PauseScene,
    ToastScene,
  ],
};
