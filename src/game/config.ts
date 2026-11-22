import Phaser from 'phaser';
import { LagoonIntroScene } from '../minigames/pup-lagoon/scenes/LagoonIntroScene';
import { LagoonMapScene } from '../minigames/pup-lagoon/scenes/LagoonMapScene';
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
  width: 640,
  height: 360,
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
    LagoonIntroScene,
    LagoonMapScene,
    PauseScene,
    ToastScene,
  ],
};
