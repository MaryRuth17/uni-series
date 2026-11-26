/**
 * LagoonOpeningScene — arriving at PUP (owner request, L6): a short intro, then how to play
 * Shows: a camera pan across the PUP front (lagoon_intro, from the owner's photos: the gate with a
 * welcome banner, the guardhouse, the tall white pylon, then the obelisk plaza with the old stone ruins)
 * with students walking and a jeepney passing, the title "Lagoon Merienda"
 * dropping in with its tagline, then the "How to play" card (4 steps with pictures). Got it! goes on to
 * the Vacant card (LagoonIntroScene). Tap or Enter skips the pan; after the first time, Skip jumps
 * straight to the Vacant card.
 * Listens to: pointer; keyboard (Enter / Space = next, Esc = back to the campus map).
 */
import Phaser from 'phaser';
import { addViewCamera, sceneConfig } from '../../../ui/view';
import { t } from '../../../core/i18n';
import { services } from '../../../core/services';
import { FADE_MS } from '../../../home/config';
import { Button } from '../../../ui/Button';
import { COLORS, SCENES, TEXT, textStyle } from '../../../ui/theme';
import { LAGOON_AMBIENCE, LAGOON_MUSIC, OPENING, SFX } from '../config';
import { LAGOON_INTRO } from './LagoonIntroScene';

export const LAGOON_OPENING = 'LagoonOpening';
const HOW_SEEN = 'pup-lagoon-how';
/** Objects at this depth and above belong to the fixed UI camera. */
const UI_DEPTH = 50;

export class LagoonOpeningScene extends Phaser.Scene {
  private stage: 'pan' | 'how' | 'leaving' = 'pan';
  private uiCam!: Phaser.Cameras.Scene2D.Camera;

  constructor() {
    super(sceneConfig(LAGOON_OPENING));
  }

  /** The Lagoon music and ambience load on arrival (about 3.5 MB), so the first screen opens faster. */
  preload(): void {
    if (!this.cache.audio.exists(LAGOON_MUSIC))
      this.load.pack('audio_lagoon', 'assets/audio/audio_lagoon.json', 'audio_lagoon');
  }

  create(): void {
    this.stage = 'pan';
    const reduced = services().save.data.settings.reducedMotion;
    const seen = services().save.data.settings.tutorialSeen[HOW_SEEN] === true;

    this.add.image(0, 0, 'lagoon_intro').setOrigin(0);
    // The gate's banner: a greeting, not the school's official sign (SPEC §13).
    this.add
      .text(OPENING.banner.x, OPENING.banner.y, t('pupLagoon.intro.gate'), textStyle(8, TEXT.cream))
      .setOrigin(0.5)
      .setDepth(5);
    this.makeAnims();
    // Students crossing the plaza and a jeepney passing on the road in front.
    OPENING.walkers.forEach(([variant, x, dir, speed], i) => {
      const w = this.add
        .sprite(x, 279 + (i % 2) * 2, `walker_${variant}`)
        .setOrigin(0.5, 1)
        .setFlipX(dir < 0)
        .setDepth(10 + i);
      if (!reduced) {
        w.play(`walker_${variant}_walk`);
        this.tweens.add({
          targets: w,
          x: x + (dir * speed * OPENING.panMs) / 1000,
          duration: OPENING.panMs,
        });
      }
    });
    if (!reduced) {
      const jeep = this.add
        .sprite(-60, 360, 'jeep_2')
        .setOrigin(0.5, 1)
        .setFlipX(true)
        .setDepth(20);
      jeep.play('jeep_2_drive');
      this.tweens.add({ targets: jeep, x: 1020, duration: OPENING.jeepMs, delay: 600 });
    }

    // The main camera pans across the campus; a fixed camera draws the title and buttons.
    const main = this.cameras.main;
    main.setBounds(0, 0, OPENING.width, 360);
    main.centerOn(320, 180);
    this.uiCam = addViewCamera(this);

    const title = this.add
      .text(320, -30, t('roster.pup-lagoon.title'), textStyle(32, TEXT.red))
      .setOrigin(0.5)
      .setStroke('#FFF4DC', 6)
      .setDepth(UI_DEPTH);
    const tagline = this.add
      .text(320, 92, t('roster.pup-lagoon.tagline'), textStyle(16, TEXT.ink))
      .setOrigin(0.5)
      .setStroke('#FFF4DC', 4)
      .setAlpha(0)
      .setDepth(UI_DEPTH);
    const hint = this.add
      .text(
        320,
        344,
        t('pupLagoon.intro.tap'),
        textStyle(8, TEXT.cream, { backgroundColor: '#2B2233', padding: { x: 4, y: 2 } }),
      )
      .setOrigin(0.5)
      .setDepth(UI_DEPTH);
    if (seen) {
      new Button(this, 604, 20, t('pupLagoon.intro.skip'), () => this.toVacantCard(), {
        width: 56,
        height: 20,
      }).setDepth(UI_DEPTH);
    }
    const tap = this.add
      .zone(320, 180, 640, 360)
      .setInteractive()
      .setDepth(UI_DEPTH - 1);
    tap.on('pointerup', () => this.next());

    if (reduced) {
      title.setY(60);
      tagline.setAlpha(1);
      main.centerOn(OPENING.panTo, 180);
    } else {
      main.pan(OPENING.panTo, 180, OPENING.panMs, 'Sine.easeInOut');
      this.tweens.add({ targets: title, y: 60, duration: 700, delay: 500, ease: 'Back.easeOut' });
      this.tweens.add({ targets: tagline, alpha: 1, duration: 500, delay: 1100 });
      this.tweens.add({ targets: hint, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });
    }
    this.time.delayedCall(reduced ? 1500 : OPENING.panMs + OPENING.holdMs, () => {
      if (this.stage === 'pan') this.showHow();
    });

    this.syncCameras();
    const kb = this.input.keyboard;
    kb?.on('keydown-ENTER', () => this.next());
    kb?.on('keydown-SPACE', () => this.next());
    kb?.on('keydown-ESC', () => this.leave(SCENES.campusMap));
    this.events.once('shutdown', () => kb?.removeAllListeners());
    for (const cam of [main, this.uiCam]) cam.fadeIn(FADE_MS, 0x2b, 0x22, 0x33);
    services().audio.playMusic(LAGOON_MUSIC, this);
    services().audio.setAmbience(LAGOON_AMBIENCE, this);
  }

  private makeAnims(): void {
    const make = (key: string, texture: string, frames: number[], frameRate: number): void => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(texture, { frames }),
        frameRate,
        repeat: -1,
      });
    };
    for (let v = 1; v <= 6; v++) make(`walker_${v}_walk`, `walker_${v}`, [0, 1, 2, 3], 6);
    make('jeep_2_drive', 'jeep_2', [0, 1], 8);
  }

  /** World objects to the panning camera, UI (depth ≥ UI_DEPTH) to the fixed one. */
  private syncCameras(): void {
    for (const obj of this.children.list) {
      const depth = (obj as unknown as { depth: number }).depth;
      if (depth >= UI_DEPTH) this.cameras.main.ignore(obj);
      else this.uiCam.ignore(obj);
    }
  }

  private next(): void {
    if (this.stage === 'pan') this.showHow();
    else if (this.stage === 'how') this.toVacantCard();
  }

  /** The "How to play" card: four steps with pictures. */
  private showHow(): void {
    this.stage = 'how';
    services().audio.sfx(SFX.page);
    const c = this.add.container(320, 186).setDepth(UI_DEPTH + 5);
    c.add(this.add.rectangle(0, -16, 640, 400, COLORS.ink, 0.45).setInteractive());
    // A notebook page with four steps, each a taped-in picture, a number badge, a title and a note.
    c.add(this.add.image(0, 0, 'note_how'));
    c.add(this.add.text(0, -124, t('pupLagoon.how.title'), textStyle(16, TEXT.red)).setOrigin(0.5));
    for (let i = 0; i < 4; i++) {
      const x = -222 + (i % 2) * 226;
      const y = -100 + Math.floor(i / 2) * 108;
      c.add(this.add.rectangle(x + 52, y + 36, 110, 78, 0xffffff).setStrokeStyle(1, 0xb8a888));
      c.add(this.add.image(x, y, 'lagoon_how', i).setOrigin(0));
      c.add(this.add.rectangle(x + 52, y - 3, 30, 8, 0xf2e6a8, 0.8));
      c.add(this.add.circle(x + 2, y + 2, 8, COLORS.red).setStrokeStyle(1, COLORS.ink));
      c.add(this.add.text(x + 2, y + 2, String(i + 1), textStyle(8, TEXT.cream)).setOrigin(0.5));
      c.add(
        this.add.text(
          x + 112,
          y,
          t(`pupLagoon.how.step${i + 1}.title`),
          textStyle(8, TEXT.red, { wordWrap: { width: 104 } }),
        ),
      );
      c.add(
        this.add.text(
          x + 112,
          y + 24,
          t(`pupLagoon.how.step${i + 1}.text`),
          textStyle(8, TEXT.ink, { wordWrap: { width: 104 } }),
        ),
      );
    }
    c.add(
      new Button(this, 0, 124, t('pupLagoon.how.go'), () => this.toVacantCard(), {
        width: 120,
        height: 24,
        fill: COLORS.yellow,
        textColor: TEXT.red,
        fontSize: 16,
      }),
    );
    c.setScale(0.9).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
    this.cameras.main.ignore(c);
  }

  private toVacantCard(): void {
    services().settings.setTutorialSeen(HOW_SEEN, true);
    this.leave(LAGOON_INTRO);
  }

  private leave(target: string): void {
    if (this.stage === 'leaving') return;
    this.stage = 'leaving';
    for (const cam of [this.cameras.main, this.uiCam]) cam.fadeOut(FADE_MS, 0x2b, 0x22, 0x33);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(target));
  }
}
