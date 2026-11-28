/**
 * The living U-Belt street behind the landing UI (SPEC-homepage §3.1, §3.4, §3.5) — H4 pixel art.
 * Places the baked art from scripts/art (sky and skyline by phase, clouds, LRT-2 track and train, five
 * shops whose lights follow the time of day, wires with banderitas, sidewalk, street, carts, barker,
 * streetlight, tricycle, cat and dog, parked jeepney with a route board), moves the pooled walkers,
 * passing jeepneys and the train that StreetSpawner schedules, and plays the tappable surprises.
 */
import Phaser from 'phaser';
import { t } from '../core/i18n';
import { Random } from '../core/Random';
import { services } from '../core/services';
import { COLORS, TEXT, textStyle } from '../ui/theme';
import { DEPTH, HOME_SFX, PALETTE, ROUTES, STREET } from './config';
import { type SpawnEvent, type SpawnKind, StreetSpawner } from './StreetSpawner';
import { type SurpriseKey, Surprises } from './Surprises';
import type { Phase } from './TimeOfDay';

interface Mover {
  obj: Phaser.GameObjects.Container;
  kind: SpawnKind;
  dir: 1 | -1;
  speed: number;
  active: boolean;
}

const BARKER_LINES = ['landing.barker.1', 'landing.barker.2'];
const SHOPS = ['dorm', 'print', 'carinderia', 'sarisari', 'milktea'] as const;
/** Multiply tint for things that do not glow: cool at night, warm at golden hour. */
const AMBIENT_TINT: Readonly<Record<Phase, number>> = {
  umaga: 0xffffff,
  tanghali: 0xffffff,
  hapon: 0xffe6cf,
  gabi: 0x7f88bb,
};
/** Shop frames: 0 lights off, 1 lights on, 2 night (baked in scripts/art/landing.mjs). */
const SHOP_FRAME = { off: 0, on: 1, night: 2 };

export class StreetView {
  private readonly scene: Phaser.Scene;
  private readonly phase: Phase;
  private readonly reduced: boolean;
  private readonly december: boolean;
  private readonly tint: number;
  private readonly rng = new Random(Date.now() >>> 0);
  private readonly spawner: StreetSpawner;
  private readonly surprises = new Surprises();
  private readonly movers: Mover[] = [];
  private readonly clouds: Phaser.GameObjects.Image[] = [];
  private readonly shops: Phaser.GameObjects.Image[] = [];
  private train!: Mover;
  private trainSprite!: Phaser.GameObjects.Image;
  private trainShadow!: Phaser.GameObjects.Rectangle;
  /** The jeepney parked at the stop; LandingScene drives it away on the play button. */
  parkedJeep!: Phaser.GameObjects.Container;
  private parkedJeepSprite!: Phaser.GameObjects.Sprite;
  private routeSign!: Phaser.GameObjects.Text;
  private routeIndex = 0;

  constructor(scene: Phaser.Scene, phase: Phase, reduced: boolean, december: boolean) {
    this.scene = scene;
    this.phase = phase;
    this.reduced = reduced;
    this.december = december;
    this.tint = AMBIENT_TINT[phase];
    this.spawner = new StreetSpawner(this.rng, phase);
  }

  build(): void {
    this.createAnims();
    this.drawSky();
    this.drawTrack();
    this.drawShops();
    this.drawWires();
    this.drawSidewalk();
    this.drawStreet();
    this.startLights();
    this.scene.time.addEvent({
      delay: STREET.routeCycleMs,
      loop: true,
      callback: () => this.cycleRoute(),
    });
  }

  /** Call from the scene's update with the clamped frame delta. */
  update(dtMs: number): void {
    const dt = dtMs / 1000;
    this.surprises.update(dtMs);
    if (!this.reduced) {
      for (const c of this.clouds) {
        c.x -= STREET.cloudSpeed * dt;
        if (c.x < -70) c.x = 700;
      }
    }
    for (const e of this.spawner.update(dtMs)) this.spawn(e);
    for (const m of this.movers) {
      if (!m.active) continue;
      m.obj.x += m.dir * m.speed * dt;
      const margin = m.kind === 'train' ? STREET.train.width / 2 + 10 : 60;
      if ((m.dir === 1 && m.obj.x > 640 + margin) || (m.dir === -1 && m.obj.x < -margin)) {
        m.active = false;
        m.obj.setVisible(false);
        this.spawner.despawn(m.kind);
      }
    }
    const trainOn = this.train.active;
    this.trainShadow.setVisible(trainOn);
    if (trainOn) {
      this.trainShadow.x = this.train.obj.x;
      this.trainShadow.setAlpha(0.12 + this.rng.next() * 0.08);
    }
  }

  /** The parked jeepney pulls out: its wheels start turning (LandingScene tweens it off to the right). */
  startParkedJeep(): void {
    this.parkedJeepSprite.play('jeep_1_drive');
  }

  // ---- Animations -------------------------------------------------------------------------------

  private createAnims(): void {
    const anims = this.scene.anims;
    const make = (key: string, texture: string, frames: number[], frameRate: number): void => {
      if (anims.exists(key)) return;
      anims.create({
        key,
        frames: anims.generateFrameNumbers(texture, { frames }),
        frameRate,
        repeat: -1,
      });
    };
    for (let v = 1; v <= 6; v++) make(`walker_${v}_walk`, `walker_${v}`, [0, 1, 2, 3], 6);
    for (let j = 1; j <= 4; j++) make(`jeep_${j}_drive`, `jeep_${j}`, [0, 1], 8);
    make('barker_wave', 'barker', [0, 1, 2, 1], 4);
  }

  // ---- Layers -----------------------------------------------------------------------------------

  private drawSky(): void {
    const s = this.scene;
    s.add.image(0, 0, `sky_${this.phase}`).setOrigin(0).setDepth(DEPTH.sky);
    const cloudTint =
      this.phase === 'gabi' ? 0x5a5a8a : this.phase === 'hapon' ? 0xffd2b8 : 0xffffff;
    for (const [key, x, y] of [
      ['cloud_1', 90, 40],
      ['cloud_3', 300, 24],
      ['cloud_2', 500, 66],
    ] as const) {
      this.clouds.push(
        s.add
          .image(x, y, key)
          .setDepth(DEPTH.sky + 1)
          .setTint(cloudTint),
      );
    }
    const city = s.add.image(0, 120, `city_far_${this.phase}`).setOrigin(0).setDepth(DEPTH.city);
    if (!this.reduced) {
      s.tweens.add({
        targets: city,
        x: STREET.cityDriftPx,
        duration: STREET.cityDriftMs,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private drawTrack(): void {
    const s = this.scene;
    s.add.image(0, 170, 'lrt_track').setOrigin(0).setDepth(DEPTH.track).setTint(this.tint);
    const w = STREET.train.width;
    this.trainSprite = s.add.image(0, 0, 'lrt_train', this.phase === 'gabi' ? 1 : 0);
    const obj = s.add
      .container(-w, STREET.train.y, [this.trainSprite])
      .setDepth(DEPTH.track + 1)
      .setVisible(false);
    obj.setSize(w, 24).setInteractive({ useHandCursor: true });
    obj.on('pointerup', () => this.surprise('train'));
    this.train = { obj, kind: 'train', dir: 1, speed: STREET.train.speed, active: false };
    this.movers.push(this.train);
    this.trainShadow = s.add
      .rectangle(0, 334, w, 20, COLORS.ink, 0.15)
      .setDepth(DEPTH.street + 1)
      .setVisible(false);
  }

  private drawShops(): void {
    const s = this.scene;
    const frame = this.phase === 'gabi' ? SHOP_FRAME.night : SHOP_FRAME.off;
    SHOPS.forEach((key, i) => {
      const x = 12 + i * 124;
      this.shops.push(s.add.image(x, 188, `shop_${key}`, frame).setOrigin(0).setDepth(DEPTH.shops));
      if (key === 'print') {
        s.add
          .zone(x + 58, 244, 116, 112)
          .setDepth(DEPTH.shops + 1)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => this.surprise('print'));
      }
    });
  }

  private drawWires(): void {
    const s = this.scene;
    s.add
      .image(0, 184, 'wires')
      .setOrigin(0)
      .setDepth(DEPTH.shops + 2);
    const sag = (x: number): number => 186 + 8 * Math.sin((Math.PI * (x % 160)) / 160);
    for (let x = 4, i = 0; x < 640; x += 12, i++) {
      const flag = s.add
        .image(x, sag(x) + 1, 'banderita', i % 4)
        .setOrigin(0.5, 0)
        .setDepth(DEPTH.shops + 3);
      if (!this.reduced) {
        s.tweens.add({
          targets: flag,
          angle: { from: -8, to: 8 },
          duration: 900 + (i % 5) * 120,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: (i % 7) * 90,
        });
      }
    }
    if (this.december) {
      // Parols hang in the gaps between the shop signs.
      for (const x of [132, 256, 380, 504]) {
        s.add
          .star(x, sag(x) + 14, 5, 4, 9, PALETTE.jeepRed)
          .setStrokeStyle(1, PALETTE.glow)
          .setDepth(DEPTH.shops + 3);
      }
    }
  }

  private drawSidewalk(): void {
    const s = this.scene;
    const d = DEPTH.sidewalk + 2;
    const prop = (x: number, y: number, key: string, frame = 0): Phaser.GameObjects.Image =>
      s.add.image(x, y, key, frame).setOrigin(0.5, 1).setDepth(d).setTint(this.tint);
    s.add.image(0, 300, 'sidewalk').setOrigin(0).setDepth(DEPTH.sidewalk).setTint(this.tint);

    prop(STREET.fishballX, 316, 'cart_fishball');
    prop(STREET.fishballX + 30, 317, 'dog');
    this.steam(STREET.fishballX - 4, 294, d + 1);
    prop(STREET.stopSignX, 318, 'stop_sign');

    const barker = s.add
      .sprite(STREET.barkerX + 6, 317, 'barker')
      .setOrigin(0.5, 1)
      .setDepth(d + 1)
      .setTint(this.tint);
    if (!this.reduced) barker.play('barker_wave');
    barker.setInteractive({ useHandCursor: true }).on('pointerup', () => this.surprise('barker'));

    const cart = prop(STREET.cartX, 317, this.phase === 'umaga' ? 'cart_taho' : 'cart_sorbetes');
    cart.setInteractive({ useHandCursor: true }).on('pointerup', () => this.surprise('cart'));

    const lit = this.phase === 'gabi' || this.phase === 'hapon';
    s.add
      .image(STREET.streetlightX, 318, 'streetlight', lit ? 1 : 0)
      .setOrigin(0.5, 1)
      .setDepth(d);
    if (this.phase === 'gabi') {
      s.add.circle(STREET.streetlightX + 6, 238, 16, PALETTE.glow, 0.18).setDepth(d);
      this.cat(STREET.streetlightX + 12, 317, true);
    }
  }

  private drawStreet(): void {
    const s = this.scene;
    s.add.image(0, 318, 'street').setOrigin(0).setDepth(DEPTH.street).setTint(this.tint);

    // Parked jeepney at the stop with a route board that cycles, and a cat on its roof by day. The art
    // faces left; the parked one is mirrored to face right, the way it drives off on TARA, LARO!
    this.parkedJeepSprite = s.add
      .sprite(0, 0, 'jeep_1', 0)
      .setOrigin(0.5, 1)
      .setFlipX(true)
      .setTint(this.tint);
    const board = s.add.image(-4, -44, 'jeep_board');
    this.routeSign = s.add.text(-4, -45, ROUTES[0], textStyle(8, TEXT.red)).setOrigin(0.5);
    this.parkedJeep = s.add
      .container(STREET.parkedJeepX, 350, [this.parkedJeepSprite, board, this.routeSign])
      .setDepth(DEPTH.street + 1);
    this.parkedJeep.setSize(80, 40).setInteractive({ useHandCursor: true });
    this.parkedJeep.input?.hitArea.setTo(0, -20, 80, 40);
    this.parkedJeep.on('pointerup', () => this.surprise('jeep'));
    // The cat rides along (it is part of the jeep container) so it never floats after the jeep leaves.
    if (this.phase !== 'gabi') this.parkedJeep.add(this.cat(-30, -41, false));

    // Tricycle parked at the corner, driver napping.
    s.add
      .image(STREET.tricycleX, 350, 'tricycle')
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.street + 1)
      .setTint(this.tint);
    s.add
      .text(STREET.tricycleX + 10, 312, t('landing.zzz'), textStyle(8, TEXT.cream))
      .setOrigin(0.5)
      .setDepth(DEPTH.street + 2);

    // Pools: passing jeepneys and walkers.
    for (let i = 0; i < STREET.jeep.cap; i++) {
      const sprite = s.add.sprite(0, 0, 'jeep_1').setOrigin(0.5, 1).setTint(this.tint);
      const j = s.add
        .container(-100, 358, [sprite])
        .setDepth(DEPTH.street + 3)
        .setVisible(false);
      this.movers.push({ obj: j, kind: 'jeep', dir: 1, speed: 0, active: false });
    }
    for (let i = 0; i < STREET.walker.cap; i++) {
      const w = s.add
        .container(-100, 317)
        .setDepth(DEPTH.sidewalk + 1)
        .setVisible(false);
      this.movers.push({ obj: w, kind: 'walker', dir: 1, speed: 0, active: false });
    }
  }

  private cat(x: number, y: number, asleep: boolean): Phaser.GameObjects.Image {
    const cat = this.scene.add
      .image(x, y, 'cat', asleep ? 1 : 0)
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.street + 2)
      .setTint(this.tint);
    cat.setInteractive({ useHandCursor: true }).on('pointerup', () => this.surprise('cat'));
    return cat;
  }

  private steam(x: number, y: number, depth: number): void {
    const s = this.scene;
    if (this.reduced) {
      s.add.circle(x, y - 6, 2, 0xffffff, 0.5).setDepth(depth);
      return;
    }
    s.time.addEvent({
      delay: 450,
      loop: true,
      callback: () => {
        const puff = s.add.circle(x + this.rng.int(-6, 6), y, 2, 0xffffff, 0.7).setDepth(depth);
        s.tweens.add({
          targets: puff,
          y: y - 16,
          alpha: 0,
          scale: 2,
          duration: 1200,
          onComplete: () => puff.destroy(),
        });
      },
    });
  }

  // ---- Lights: shops switch on one by one at golden hour (§3.1, §3.4) --------------------------

  private startLights(): void {
    if (this.phase !== 'hapon') return;
    const order = shuffle(this.rng, [...this.shops.keys()]);
    let i = 0;
    this.scene.time.addEvent({
      delay: STREET.signOnEveryMs,
      repeat: order.length - 1,
      callback: () => this.shops[order[i++]]?.setFrame(SHOP_FRAME.on),
    });
  }

  private cycleRoute(): void {
    this.routeIndex = (this.routeIndex + 1) % ROUTES.length;
    this.routeSign.setText(ROUTES[this.routeIndex]);
  }

  // ---- Spawning -------------------------------------------------------------------------------

  private spawn(e: SpawnEvent): void {
    if (e.kind === 'train') {
      this.train.active = true;
      this.train.obj.setVisible(true).setX(-STREET.train.width / 2);
      return;
    }
    const m = this.movers.find((x) => x.kind === e.kind && !x.active);
    if (!m) {
      this.spawner.despawn(e.kind);
      return;
    }
    m.active = true;
    m.dir = e.dir;
    m.speed = e.speed;
    m.obj.setVisible(true).setX(e.dir === 1 ? -40 : 680);
    if (e.kind === 'jeep') {
      const sprite = m.obj.list[0] as Phaser.GameObjects.Sprite;
      sprite.setTexture(`jeep_${e.variant + 1}`).play(`jeep_${e.variant + 1}_drive`);
      // The art faces left: mirror it when driving right.
      sprite.setFlipX(e.dir === 1);
    } else {
      this.dressWalker(m.obj, e.variant, e.dir);
    }
  }

  /** Students (walker_1..6) with umbrellas at noon and coffee in the morning. */
  private dressWalker(w: Phaser.GameObjects.Container, variant: number, dir: 1 | -1): void {
    const s = this.scene;
    w.removeAll(true);
    const sprite = s.add
      .sprite(0, 0, `walker_${variant + 1}`)
      .setOrigin(0.5, 1)
      .setTint(this.tint);
    sprite.setFlipX(dir === -1);
    if (!this.reduced) sprite.play(`walker_${variant + 1}_walk`);
    w.add(sprite);
    if (this.phase === 'tanghali' && this.rng.chance(0.6)) {
      const color = [0xd94b3d, 0x3b6fb6, 0x2b2233][variant % 3];
      w.add([
        s.add.rectangle(4, -24, 1, 10, COLORS.ink),
        s.add.arc(4, -28, 9, 180, 360, false, color).setStrokeStyle(1, COLORS.ink),
      ]);
    }
    if (this.phase === 'umaga' && this.rng.chance(0.4)) {
      w.add(s.add.rectangle(7 * -dir, -12, 3, 4, 0xffffff).setStrokeStyle(1, COLORS.ink));
    }
  }

  // ---- Surprises (§3.5) --------------------------------------------------------------------------

  private surprise(key: SurpriseKey): void {
    if (!this.surprises.trigger(key)) return;
    const s = this.scene;
    const audio = services().audio;
    switch (key) {
      case 'jeep':
        audio.sfx(HOME_SFX.jeepHorn);
        this.bubble(STREET.barkerX + 6, 286, t(this.rng.pick(BARKER_LINES)));
        this.bubble(this.parkedJeep.x + 20, 318, t('landing.beep'));
        if (!this.reduced)
          s.tweens.add({
            targets: this.parkedJeep,
            x: this.parkedJeep.x + 1,
            duration: 50,
            yoyo: true,
            repeat: 3,
          });
        break;
      case 'barker':
        audio.sfx(HOME_SFX.barker);
        this.bubble(STREET.barkerX + 6, 286, t(this.rng.pick(BARKER_LINES)));
        break;
      case 'cart': {
        audio.sfx(HOME_SFX.sorbetesBell);
        const treat = s.add
          .container(STREET.cartX, 284, [
            s.add.triangle(0, 4, -4, 0, 4, 0, 0, 10, 0xd9a066),
            s.add.circle(0, -1, 5, this.phase === 'umaga' ? 0xe8d3b0 : 0xf5a3c7),
          ])
          .setDepth(DEPTH.ui - 1);
        s.tweens.add({
          targets: treat,
          y: 262,
          alpha: 0,
          duration: 900,
          onComplete: () => treat.destroy(),
        });
        break;
      }
      case 'print':
        audio.sfx(HOME_SFX.printer);
        for (let i = 0; i < 3; i++) {
          const paper = s.add
            .rectangle(170, 268, 6, 8, 0xffffff)
            .setStrokeStyle(1, COLORS.ink)
            .setDepth(DEPTH.ui - 1);
          s.tweens.add({
            targets: paper,
            x: paper.x + this.rng.int(-30, 30),
            y: 226 + this.rng.int(0, 20),
            angle: this.rng.int(-90, 90),
            alpha: 0,
            duration: 1000,
            delay: i * 120,
            onComplete: () => paper.destroy(),
          });
        }
        break;
      case 'cat': {
        audio.sfx(HOME_SFX.meow);
        const at =
          this.phase === 'gabi'
            ? { x: STREET.streetlightX + 12, y: 300 }
            : { x: STREET.parkedJeepX - 30, y: 292 };
        this.bubble(at.x, at.y - 6, t('landing.meow'));
        const heart = s.add
          .container(at.x + 14, at.y, [
            s.add.circle(-2, 0, 2.5, PALETTE.jeepRed),
            s.add.circle(2, 0, 2.5, PALETTE.jeepRed),
            s.add.triangle(0, 3, -4.5, 0, 4.5, 0, 0, 5, PALETTE.jeepRed),
          ])
          .setDepth(DEPTH.ui - 1);
        s.tweens.add({
          targets: heart,
          y: at.y - 18,
          alpha: 0,
          duration: 1100,
          onComplete: () => heart.destroy(),
        });
        break;
      }
      case 'train':
        audio.sfx(HOME_SFX.lrtChime);
        s.tweens.add({
          targets: this.trainSprite,
          alpha: 0.4,
          duration: 120,
          yoyo: true,
          repeat: 3,
        });
        break;
    }
  }

  private bubble(x: number, y: number, text: string): void {
    const s = this.scene;
    const label = s.add
      .text(
        x,
        y,
        text,
        textStyle(8, TEXT.ink, { backgroundColor: '#FFF4DC', padding: { x: 3, y: 2 } }),
      )
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.ui - 1);
    s.time.delayedCall(STREET.bubbleMs, () => label.destroy());
  }
}

function shuffle<T>(rng: Random, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
