/**
 * The living U-Belt street behind the landing UI (SPEC-homepage §3.1, §3.4, §3.5) — H2 greybox.
 * Draws every layer with shapes (sky by phase, clouds, far city, LRT-2 track and train, wires with
 * banderitas, the shop row, sidewalk carts, barker, street with the parked jeepney), moves the pooled
 * walkers, passing jeepneys and the train that StreetSpawner schedules, and plays the tappable surprises.
 * Art replaces the shapes in H4 using the §8 keys; positions and timing stay.
 */
import Phaser from 'phaser';
import { t } from '../core/i18n';
import { Random } from '../core/Random';
import { services } from '../core/services';
import { COLORS, TEXT, textStyle } from '../ui/theme';
import { DEPTH, JEEP_COLORS, LANDING, PALETTE, ROUTES, SKY, STREET, WALKER_COLORS } from './config';
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

export class StreetView {
  private readonly scene: Phaser.Scene;
  private readonly phase: Phase;
  private readonly reduced: boolean;
  private readonly december: boolean;
  private readonly rng = new Random(Date.now() >>> 0);
  private readonly spawner: StreetSpawner;
  private readonly surprises = new Surprises();
  private readonly movers: Mover[] = [];
  private readonly clouds: Phaser.GameObjects.Container[] = [];
  private readonly lights: Phaser.GameObjects.Rectangle[] = [];
  private train!: Mover;
  private trainWindows: Phaser.GameObjects.Rectangle[] = [];
  private trainShadow!: Phaser.GameObjects.Rectangle;
  /** The jeepney parked at the stop; LandingScene drives it away on TARA, LARO! */
  parkedJeep!: Phaser.GameObjects.Container;
  private routeSign!: Phaser.GameObjects.Text;
  private routeIndex = 0;

  constructor(scene: Phaser.Scene, phase: Phase, reduced: boolean, december: boolean) {
    this.scene = scene;
    this.phase = phase;
    this.reduced = reduced;
    this.december = december;
    this.spawner = new StreetSpawner(this.rng, phase);
  }

  build(): void {
    this.drawSky();
    this.drawCity();
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
        if (c.x < -60) c.x = 700;
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

  // ---- Layers ----------------------------------------------------------------------------------

  private drawSky(): void {
    const s = this.scene;
    const [top, bottom] = SKY[this.phase];
    const g = s.add.graphics().setDepth(DEPTH.sky);
    g.fillGradientStyle(top, top, bottom, bottom, 1);
    g.fillRect(0, 0, 640, LANDING.sky.h);
    if (this.phase === 'gabi') {
      for (let i = 0; i < 40; i++) {
        s.add
          .rectangle(
            this.rng.int(0, 639),
            this.rng.int(4, 110),
            1,
            1,
            PALETTE.glow,
            this.rng.float(0.4, 1),
          )
          .setDepth(DEPTH.sky);
      }
      s.add.circle(520, 48, 12, 0xf3ecd2).setDepth(DEPTH.sky);
    } else {
      const sun = { umaga: [110, 70], tanghali: [470, 28], hapon: [560, 120] }[this.phase];
      s.add.circle(sun[0], sun[1], 16, 0xffe08a, 0.95).setDepth(DEPTH.sky);
    }
    const cloudColor = this.phase === 'gabi' ? 0x4a4570 : 0xfff4dc;
    for (const [x, y] of [
      [90, 40],
      [300, 24],
      [500, 70],
    ]) {
      const c = s.add
        .container(x, y, [
          s.add.ellipse(0, 0, 44, 12, cloudColor, 0.85),
          s.add.ellipse(-10, -5, 22, 12, cloudColor, 0.85),
          s.add.ellipse(8, -6, 20, 12, cloudColor, 0.85),
        ])
        .setDepth(DEPTH.sky + 1);
      this.clouds.push(c);
    }
  }

  private drawCity(): void {
    const s = this.scene;
    const city = s.add.container(0, 0).setDepth(DEPTH.city);
    const base = LANDING.city.y + LANDING.city.h;
    const heights = [34, 52, 28, 60, 40, 22, 48, 36, 56, 30, 44, 26, 50, 38];
    let x = 0;
    heights.forEach((h, i) => {
      const w = 34 + (i % 3) * 8;
      city.add(s.add.rectangle(x + w / 2, base - h / 2, w, h, PALETTE.city));
      if (this.phase === 'gabi' || this.phase === 'hapon') {
        for (let wy = base - h + 6; wy < base - 6; wy += 9) {
          if (this.rng.chance(0.45))
            city.add(s.add.rectangle(x + 6 + this.rng.int(0, w - 12), wy, 2, 3, PALETTE.glow, 0.8));
        }
      }
      x += w + 2;
    });
    // A water tank and a church dome, as generic Manila skyline shapes.
    city.add(s.add.rectangle(236, base - 74, 22, 14, PALETTE.city));
    city.add(s.add.rectangle(230, base - 64, 2, 10, PALETTE.city));
    city.add(s.add.rectangle(242, base - 64, 2, 10, PALETTE.city));
    city.add(s.add.circle(430, base - 58, 14, PALETTE.city));
    city.add(s.add.rectangle(430, base - 76, 2, 10, PALETTE.city));
    if (!this.reduced) {
      this.scene.tweens.add({
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
    const L = LANDING.track;
    for (const x of [132, 256, 380, 504]) {
      s.add.rectangle(x, (L.y + 318) / 2, 8, 318 - L.y, 0x8a8a96).setDepth(DEPTH.track);
    }
    s.add.rectangle(320, L.y + L.h / 2, 640, L.h, 0x9a9aa6).setDepth(DEPTH.track);
    s.add.rectangle(320, L.y + 1, 640, 2, 0xc9c9d2).setDepth(DEPTH.track);

    const night = this.phase === 'gabi';
    const w = STREET.train.width;
    const body = s.add.rectangle(0, 0, w, 22, 0xe6e6ee).setStrokeStyle(1, COLORS.ink);
    const stripe = s.add.rectangle(0, 6, w, 4, PALETTE.lrt);
    const parts: Phaser.GameObjects.GameObject[] = [body, stripe];
    this.trainWindows = [];
    for (let i = 0; i < 10; i++) {
      const win = s.add.rectangle(-w / 2 + 14 + i * 21, -4, 14, 8, night ? PALETTE.glow : 0x3b4a6b);
      this.trainWindows.push(win);
      parts.push(win);
    }
    const obj = s.add
      .container(-w, STREET.train.y, parts)
      .setDepth(DEPTH.track + 1)
      .setVisible(false);
    obj.setSize(w, 22).setInteractive({ useHandCursor: true });
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
    const L = LANDING.shops;
    const night = this.phase === 'gabi';
    SHOPS.forEach((key, i) => {
      const x = 12 + i * 124 + 58;
      const shop = s.add.container(x, 0).setDepth(DEPTH.shops);
      shop.add(
        s.add
          .rectangle(0, L.y + L.h / 2 + 4, 116, L.h - 8, PALETTE.walls[i])
          .setStrokeStyle(1, COLORS.ink),
      );
      shop.add(s.add.rectangle(0, L.y + 12, 116, 6, 0x8b5a3c));
      // Signboard (lights up at hapon/gabi).
      const sign = s.add
        .rectangle(0, L.y + 28, 104, 22, night ? PALETTE.glow : 0xf6efe0)
        .setStrokeStyle(1, COLORS.ink);
      shop.add(sign);
      this.lights.push(sign);
      shop.add(
        s.add
          .text(
            0,
            L.y + 28,
            t(`landing.sign.${key}`),
            textStyle(8, TEXT.ink, { align: 'center', wordWrap: { width: 100 } }),
          )
          .setOrigin(0.5),
      );
      for (const wx of [-34, 0, 34]) {
        const win = s.add
          .rectangle(wx, L.y + 60, 22, 18, night ? PALETTE.glow : 0x5d6b85)
          .setStrokeStyle(1, COLORS.ink);
        shop.add(win);
        this.lights.push(win);
      }
      const doorX = key === 'dorm' ? 48 : 0;
      shop.add(
        s.add
          .rectangle(doorX, L.y + L.h - 14, key === 'dorm' ? 14 : 24, 28, 0x5a3c2c)
          .setStrokeStyle(1, COLORS.ink),
      );
      this.shopDetails(shop, key, L.y);
      if (key === 'print') {
        s.add
          .zone(x, L.y + L.h / 2, 116, L.h)
          .setDepth(DEPTH.shops + 1)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => this.surprise('print'));
      }
    });
  }

  private shopDetails(
    shop: Phaser.GameObjects.Container,
    key: (typeof SHOPS)[number],
    top: number,
  ): void {
    const s = this.scene;
    if (key === 'dorm') {
      // Laundry on the balcony line, under the window sign.
      shop.add(s.add.rectangle(0, top + 42, 92, 1, COLORS.ink));
      [0xd94b3d, 0xf2c14e, 0x3b6fb6, 0xfff4dc].forEach((c, i) =>
        shop.add(s.add.rectangle(-36 + i * 22, top + 46, 10, 7, c)),
      );
      // tarp_board_passers (96×32): a generic congratulations banner, no real names.
      shop.add(s.add.rectangle(-8, top + 84, 96, 30, 0xfff4dc).setStrokeStyle(1, PALETTE.jeepRed));
      shop.add(
        s.add
          .text(
            -8,
            top + 84,
            t('landing.tarp'),
            textStyle(8, TEXT.red, { align: 'center', wordWrap: { width: 92 } }),
          )
          .setOrigin(0.5),
      );
    }
    if (key === 'carinderia') {
      for (let i = 0; i < 4; i++)
        shop.add(
          s.add
            .rectangle(-36 + i * 24, top + 82, 18, 6, [0x8b5a3c, 0xf2c14e, 0x3a9a6a, 0xd94b3d][i])
            .setStrokeStyle(1, COLORS.ink),
        );
    }
    if (key === 'sarisari') {
      for (let col = 0; col < 4; col++) {
        for (let r = 0; r < 4; r++)
          shop.add(
            s.add.rectangle(
              -42 + col * 6,
              top + 74 + r * 6,
              4,
              5,
              [0xd94b3d, 0xf2c14e, 0x3b6fb6, 0x3a9a6a][(col + r) % 4],
            ),
          );
      }
      shop.add(s.add.rectangle(16, top + 78, 76, 12, 0xffffff).setStrokeStyle(1, COLORS.ink));
      shop.add(
        s.add.text(16, top + 78, t('landing.sign.utang'), textStyle(8, TEXT.red)).setOrigin(0.5),
      );
    }
    if (key === 'milktea') {
      shop.add(s.add.rectangle(36, top + 86, 10, 16, 0xc9a27e).setStrokeStyle(1, COLORS.ink));
      shop.add(s.add.rectangle(36, top + 92, 10, 4, 0x2b2233));
    }
  }

  private drawWires(): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.shops + 2);
    g.lineStyle(1, COLORS.ink, 0.8);
    const sag = (x: number, y0: number, depth: number): number =>
      y0 + depth * Math.sin((Math.PI * (x % 160)) / 160);
    const colors = [PALETTE.jeepRed, PALETTE.jeepYellow, PALETTE.jeepBlue, PALETTE.jeepGreen];
    for (const [y0, d] of [
      [188, 8],
      [194, 10],
    ]) {
      g.beginPath();
      g.moveTo(0, y0);
      for (let x = 4; x <= 640; x += 4) g.lineTo(x, sag(x, y0, d));
      g.strokePath();
    }
    for (let x = 6, i = 0; x < 640; x += 14, i++) {
      const y = sag(x, 188, 8);
      const flag = s.add
        .triangle(x, y + 4, 0, 0, 8, 0, 4, 8, colors[i % 4])
        .setDepth(DEPTH.shops + 3)
        .setOrigin(0.5, 0);
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
          .star(x, sag(x, 194, 10) + 12, 5, 4, 9, PALETTE.jeepRed)
          .setStrokeStyle(1, PALETTE.glow)
          .setDepth(DEPTH.shops + 3);
      }
    }
  }

  private drawSidewalk(): void {
    const s = this.scene;
    const L = LANDING.sidewalk;
    s.add.rectangle(320, L.y + L.h / 2, 640, L.h, 0xb9b0a3).setDepth(DEPTH.sidewalk);
    s.add.rectangle(320, L.y + L.h - 1, 640, 2, 0x8f877c).setDepth(DEPTH.sidewalk);
    const d = DEPTH.sidewalk + 2;

    // Fishball cart with steam, and a dog asleep under it.
    const fx = STREET.fishballX;
    s.add.rectangle(fx, 298, 40, 18, 0x8b5a3c).setStrokeStyle(1, COLORS.ink).setDepth(d);
    s.add.rectangle(fx, 286, 44, 4, 0xd94b3d).setDepth(d);
    s.add.circle(fx - 12, 312, 4, COLORS.ink).setDepth(d);
    s.add.circle(fx + 12, 312, 4, COLORS.ink).setDepth(d);
    s.add.ellipse(fx + 26, 314, 18, 7, 0xa0784a).setDepth(d);
    this.steam(fx, 284, d + 1);

    // Jeepney stop sign and the barker.
    s.add.rectangle(STREET.stopSignX, 292, 2, 34, 0x6d6d78).setDepth(d);
    s.add
      .rectangle(STREET.stopSignX, 274, 44, 12, PALETTE.jeepYellow)
      .setStrokeStyle(1, COLORS.ink)
      .setDepth(d);
    s.add
      .text(STREET.stopSignX, 274, t('landing.stopSign'), textStyle(8, TEXT.red))
      .setOrigin(0.5)
      .setDepth(d);
    const arm = s.add.rectangle(6, -8, 3, 10, 0xe8b48f).setOrigin(0.5, 1);
    const barker = s.add
      .container(STREET.barkerX, 306, [
        s.add.rectangle(0, 2, 10, 14, 0xf2c14e).setStrokeStyle(1, COLORS.ink),
        s.add.rectangle(0, -9, 8, 8, 0xe8b48f).setStrokeStyle(1, COLORS.ink),
        arm,
      ])
      .setDepth(d + 1);
    barker.setSize(20, 30).setInteractive({ useHandCursor: true });
    barker.on('pointerup', () => this.surprise('barker'));
    if (!this.reduced) {
      s.tweens.add({
        targets: arm,
        angle: { from: -30, to: 30 },
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    }

    // Sorbetes cart (or taho in the morning).
    const taho = this.phase === 'umaga';
    const cart = s.add.container(STREET.cartX, 300).setDepth(d);
    if (taho) {
      cart.add([
        s.add.rectangle(-10, 0, 14, 18, 0xc9d1d9).setStrokeStyle(1, COLORS.ink),
        s.add.rectangle(10, 0, 14, 18, 0xc9d1d9).setStrokeStyle(1, COLORS.ink),
        s.add.rectangle(0, -12, 34, 2, 0x8b5a3c),
      ]);
    } else {
      cart.add([
        s.add.rectangle(0, 0, 36, 20, 0xf2c14e).setStrokeStyle(1, COLORS.ink),
        s.add.rectangle(0, -4, 36, 4, PALETTE.jeepRed),
        s.add.rectangle(0, 4, 36, 4, PALETTE.jeepBlue),
        s.add.circle(14, -14, 3, 0xc9d1d9).setStrokeStyle(1, COLORS.ink),
      ]);
    }
    cart.add([s.add.circle(-10, 12, 4, COLORS.ink), s.add.circle(10, 12, 4, COLORS.ink)]);
    cart.setSize(40, 32).setInteractive({ useHandCursor: true });
    cart.on('pointerup', () => this.surprise('cart'));

    // Streetlight; at night the cat sleeps under it.
    const lx = STREET.streetlightX;
    s.add.rectangle(lx, 268, 2, 64, 0x6d6d78).setDepth(d);
    s.add.rectangle(lx + 6, 236, 14, 3, 0x6d6d78).setDepth(d);
    if (this.phase === 'gabi') {
      s.add.circle(lx + 10, 240, 14, PALETTE.glow, 0.25).setDepth(d);
      this.cat(lx + 10, 312, true);
    }
  }

  private drawStreet(): void {
    const s = this.scene;
    const L = LANDING.street;
    s.add.rectangle(320, L.y + (L.h + 12) / 2, 640, L.h + 12, 0x4a4453).setDepth(DEPTH.street);
    for (let x = 10; x < 640; x += 40)
      s.add.rectangle(x, 345, 20, 2, 0xc9c1b0, 0.6).setDepth(DEPTH.street);

    // Parked jeepney at the stop with a signboard that cycles routes, and a cat on its roof.
    this.parkedJeep = this.jeep(STREET.parkedJeepX, 328, PALETTE.jeepRed, true);
    this.parkedJeep.setDepth(DEPTH.street + 1);
    this.parkedJeep.setSize(72, 40).setInteractive({ useHandCursor: true });
    this.parkedJeep.on('pointerup', () => this.surprise('jeep'));
    if (this.phase !== 'gabi') this.cat(STREET.parkedJeepX + 32, 297, false);

    // Tricycle parked at the corner, driver napping.
    const tx = STREET.tricycleX;
    s.add
      .rectangle(tx, 330, 30, 18, 0x3a9a6a)
      .setStrokeStyle(1, COLORS.ink)
      .setDepth(DEPTH.street + 1);
    s.add.circle(tx - 10, 340, 5, COLORS.ink).setDepth(DEPTH.street + 1);
    s.add.circle(tx + 12, 340, 5, COLORS.ink).setDepth(DEPTH.street + 1);
    s.add
      .text(tx + 4, 312, t('landing.zzz'), textStyle(8, TEXT.cream))
      .setOrigin(0.5)
      .setDepth(DEPTH.street + 2);

    // Pools: passing jeepneys and walkers.
    for (let i = 0; i < STREET.jeep.cap; i++) {
      const j = this.jeep(-100, STREET.jeep.y, JEEP_COLORS[0], false)
        .setDepth(DEPTH.street + 3)
        .setVisible(false);
      this.movers.push({ obj: j, kind: 'jeep', dir: 1, speed: 0, active: false });
    }
    for (let i = 0; i < STREET.walker.cap; i++) {
      const w = s.add
        .container(-100, STREET.walker.y)
        .setDepth(DEPTH.sidewalk + 1)
        .setVisible(false);
      this.movers.push({ obj: w, kind: 'walker', dir: 1, speed: 0, active: false });
    }
  }

  private jeep(x: number, y: number, color: number, parked: boolean): Phaser.GameObjects.Container {
    const s = this.scene;
    const parts: Phaser.GameObjects.GameObject[] = [
      s.add.rectangle(0, 0, 72, 26, color).setStrokeStyle(1, COLORS.ink),
      s.add.rectangle(0, 6, 72, 3, PALETTE.chrome),
      s.add.rectangle(-36, -4, 6, 14, PALETTE.chrome),
      s.add.rectangle(-38, -14, 4, 6, PALETTE.chrome),
    ];
    for (let i = 0; i < 4; i++) parts.push(s.add.rectangle(-18 + i * 14, -4, 10, 8, 0x3b4a6b));
    parts.push(s.add.circle(-22, 14, 6, COLORS.ink), s.add.circle(22, 14, 6, COLORS.ink));
    if (parked) {
      parts.push(s.add.rectangle(4, -19, 92, 12, PALETTE.jeepYellow).setStrokeStyle(1, COLORS.ink));
      this.routeSign = s.add.text(4, -19, ROUTES[0], textStyle(8, TEXT.red)).setOrigin(0.5);
      parts.push(this.routeSign);
    }
    return s.add.container(x, y, parts);
  }

  private cat(x: number, y: number, asleep: boolean): void {
    const s = this.scene;
    const cat = s.add
      .container(x, y, [
        s.add.ellipse(0, 0, 14, 7, 0xd9a066).setStrokeStyle(1, COLORS.ink),
        s.add.circle(asleep ? -7 : 6, -3, 3, 0xd9a066).setStrokeStyle(1, COLORS.ink),
      ])
      .setDepth(DEPTH.street + 2);
    cat.setSize(20, 14).setInteractive({ useHandCursor: true });
    cat.on('pointerup', () => this.surprise('cat'));
  }

  private steam(x: number, y: number, depth: number): void {
    const s = this.scene;
    if (this.reduced) {
      s.add.circle(x, y - 6, 3, 0xffffff, 0.5).setDepth(depth);
      return;
    }
    s.time.addEvent({
      delay: 450,
      loop: true,
      callback: () => {
        const puff = s.add.circle(x + this.rng.int(-8, 8), y, 3, 0xffffff, 0.7).setDepth(depth);
        s.tweens.add({
          targets: puff,
          y: y - 16,
          alpha: 0,
          scale: 1.8,
          duration: 1200,
          onComplete: () => puff.destroy(),
        });
      },
    });
  }

  // ---- Lights: signs and windows switch on one by one (§3.1, §3.4) ------------------------------

  private startLights(): void {
    if (this.phase !== 'hapon') return;
    const order = shuffle(this.rng, [...this.lights.keys()]);
    let i = 0;
    this.scene.time.addEvent({
      delay: STREET.signOnEveryMs,
      repeat: order.length - 1,
      callback: () => this.lights[order[i++]]?.setFillStyle(PALETTE.glow),
    });
  }

  private cycleRoute(): void {
    this.routeIndex = (this.routeIndex + 1) % ROUTES.length;
    this.routeSign.setText(ROUTES[this.routeIndex]);
  }

  // ---- Spawning ------------------------------------------------------------------------------

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
      (m.obj.list[0] as Phaser.GameObjects.Rectangle).setFillStyle(JEEP_COLORS[e.variant]);
      m.obj.setScale(e.dir, 1);
    } else {
      this.dressWalker(m.obj, e.variant);
    }
  }

  /** Students with ID laces, umbrellas at noon, coffee in the morning, folders, drafting tubes, whites. */
  private dressWalker(w: Phaser.GameObjects.Container, variant: number): void {
    const s = this.scene;
    s.tweens.killTweensOf(w);
    w.removeAll(true);
    w.setY(STREET.walker.y);
    const shirt = WALKER_COLORS[variant];
    w.add([
      s.add.rectangle(-2, 10, 3, 6, COLORS.ink),
      s.add.rectangle(2, 10, 3, 6, COLORS.ink),
      s.add.rectangle(0, 1, 10, 12, shirt).setStrokeStyle(1, COLORS.ink),
      s.add
        .rectangle(0, -9, 8, 8, [0xf5d0b0, 0xc98e66, 0xa46b45][variant % 3])
        .setStrokeStyle(1, COLORS.ink),
      s.add.rectangle(0, 0, 1, 8, PALETTE.jeepRed),
    ]);
    if (variant === 2)
      w.add(s.add.rectangle(-6, -2, 3, 18, 0x9a9aa6).setStrokeStyle(1, COLORS.ink));
    if (variant === 3) w.add(s.add.rectangle(6, 2, 5, 7, 0xf2c14e).setStrokeStyle(1, COLORS.ink));
    if (variant === 4) w.add(s.add.rectangle(-6, 1, 4, 9, 0x3b6fb6).setStrokeStyle(1, COLORS.ink));
    if (this.phase === 'tanghali' && this.rng.chance(0.6)) {
      w.add([
        s.add.rectangle(4, -10, 1, 10, COLORS.ink),
        s.add.arc(4, -15, 9, 180, 360, false, [0xd94b3d, 0x3b6fb6, 0x2b2233][variant % 3]),
      ]);
    }
    if (this.phase === 'umaga' && this.rng.chance(0.4))
      w.add(s.add.rectangle(7, 0, 4, 5, 0xffffff).setStrokeStyle(1, COLORS.ink));
    if (!this.reduced)
      s.tweens.add({ targets: w, y: STREET.walker.y - 1, duration: 180, yoyo: true, repeat: -1 });
  }

  // ---- Surprises (§3.5) --------------------------------------------------------------------------

  private surprise(key: SurpriseKey): void {
    if (!this.surprises.trigger(key)) return;
    const s = this.scene;
    const audio = services().audio;
    switch (key) {
      case 'jeep':
        audio.sfx('sfx_jeep_horn');
        this.bubble(STREET.barkerX, 278, t(this.rng.pick(BARKER_LINES)));
        this.bubble(this.parkedJeep.x, 296, t('landing.beep'));
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
        this.bubble(STREET.barkerX, 278, t(this.rng.pick(BARKER_LINES)));
        break;
      case 'cart': {
        audio.sfx('sfx_sorbetes_bell');
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
        audio.sfx('sfx_printer');
        for (let i = 0; i < 3; i++) {
          const paper = s.add
            .rectangle(136 + 12, 250, 6, 8, 0xffffff)
            .setStrokeStyle(1, COLORS.ink)
            .setDepth(DEPTH.ui - 1);
          s.tweens.add({
            targets: paper,
            x: paper.x + this.rng.int(-30, 30),
            y: 210 + this.rng.int(0, 20),
            angle: this.rng.int(-90, 90),
            alpha: 0,
            duration: 1000,
            delay: i * 120,
            onComplete: () => paper.destroy(),
          });
        }
        break;
      case 'cat': {
        audio.sfx('sfx_meow');
        const at =
          this.phase === 'gabi'
            ? { x: STREET.streetlightX + 10, y: 296 }
            : { x: STREET.parkedJeepX + 32, y: 281 };
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
        audio.sfx('sfx_lrt_chime');
        s.tweens.add({
          targets: this.trainWindows,
          alpha: 0.2,
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
