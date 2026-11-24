/**
 * LagoonMapScene — the Lagoon during a vacant (SPEC-pup-lagoon §4.2, §10.1, §10.3) — L6 art
 * Shows: the illustrated Lagoon at the §10.1 positions (stall row with windows, red kiosks, the tusok cart
 * with its FEWA board, the brick plaza with the LAGOON planter, the green lagoon with white posts and
 * railings, the tambayan benches, the water station, shade trees), locked stalls with closed shutters,
 * life (students on the benches, latag sellers, dancers and a singer in the plaza), live pila lines of
 * students, the player, the top bar (vacant, slot, event, pause) and the HUD column (listahan, busog
 * meter, wallet). Tap a stall to see its storefront (sign, food on display with prices, the vendor, the
 * menu); Prev / Next flip through the stalls; Pumila walks there and joins the line; tap the ground to
 * walk. Buying at the counter arrives in L3.
 * Listens to: pointer (taps, stall hover names); keyboard (1–8 storefronts, Left / Right = prev / next,
 * Enter = Pumila, Esc = close / leave, P = pause);
 * LagoonVacant events (pilaChanged, atCounter); the frame update (walking and the pila, clamped to 100 ms).
 */
import Phaser from 'phaser';
import { sceneConfig } from '../../../ui/view';
import { t } from '../../../core/i18n';
import { services } from '../../../core/services';
import { FADE_MS } from '../../../home/config';
import { Button } from '../../../ui/Button';
import { openOverlay } from '../../../ui/overlay';
import { panel } from '../../../ui/Panel';
import { COLORS, TEXT, textStyle } from '../../../ui/theme';
import { avatarSprite } from '../../../ui/avatar';
import { PAUSE } from '../../../scenes/PauseScene';
import { EVENTS, LAGOON_LIFE, STALL_KEYS_ORDER, VIEW, WALK_SPEED } from '../config';
import { MENU } from '../data/menu';
import { STALLS, stallDef } from '../data/stalls';
import { STALL_NODE, START_NODE, WAYPOINT_EDGES, WAYPOINT_NODES } from '../data/waypoints';
import { lineText, loadProgress } from '../lagoonSave';
import { purchaseEffect } from '../logic/Catalog';
import { LagoonVacant } from '../logic/LagoonVacant';
import type { GeneratedVacant } from '../logic/ListahanGen';
import { moneyTotal, toPieces } from '../logic/Money';
import type { StallKey } from '../logic/types';
import { Walker, WaypointGraph } from '../logic/Walker';
import { LAGOON_INTRO, LAGOON_MAP } from './LagoonIntroScene';

const GRAPH = new WaypointGraph(WAYPOINT_NODES, WAYPOINT_EDGES);

/** Which way each stall's pila grows from its node (§10.1: down from the windows, right of the kiosks). */
const QUEUE_DIR: Readonly<Record<StallKey, { x: number; y: number }>> = {
  palamig: { x: 0, y: 1 },
  merienda: { x: 0, y: 1 },
  lugawan: { x: 0, y: 1 },
  ihaw: { x: 0, y: 1 },
  karinderya: { x: 1, y: 0 },
  silog: { x: 1, y: 0 },
  halohalo: { x: 1, y: 0 },
  tusok: { x: 1, y: 0 },
  water: { x: 0, y: 0 },
};

export class LagoonMapScene extends Phaser.Scene {
  private vacant!: LagoonVacant;
  private walker!: Walker;
  private player!: Phaser.GameObjects.Container;
  private pending: StallKey | null = null;
  private speed = WALK_SPEED;
  private queues = new Map<StallKey, Phaser.GameObjects.Container>();
  private board: Phaser.GameObjects.Container | null = null;
  private boardStall: StallKey | null = null;
  private boardPila: Phaser.GameObjects.Text | null = null;
  private status!: Phaser.GameObjects.Container;
  private hud!: Phaser.GameObjects.Container;
  private tip: Phaser.GameObjects.Text | null = null;

  constructor() {
    super(sceneConfig(LAGOON_MAP));
  }

  create(data: { gen?: GeneratedVacant }): void {
    if (!data.gen) {
      this.scene.start(LAGOON_INTRO);
      return;
    }
    const progress = loadProgress(services().save);
    this.vacant = new LagoonVacant(data.gen, {
      suki: progress.suki,
      owned: progress.owned,
      saveSeed: progress.saveSeed,
    });
    const rainSlow = data.gen.rain && !progress.owned.includes('payong');
    this.speed = WALK_SPEED * (rainSlow ? EVENTS.rainWalkFactor : 1);
    this.walker = new Walker(GRAPH, START_NODE);
    this.pending = null;
    this.board = null;
    this.boardStall = null;
    this.queues.clear();

    this.drawGround();
    this.drawStalls();
    this.drawPlayer();
    this.drawTopBar();
    this.hud = this.add.container(0, 0).setDepth(80);
    this.drawHud();
    this.status = this.add.container(0, 0).setDepth(85);
    for (const s of this.vacant.gen.open) this.drawQueue(s);
    this.bindKeys();
    this.cameras.main.fadeIn(FADE_MS, 0x2b, 0x22, 0x33);
  }

  override update(_time: number, delta: number): void {
    if (!this.vacant) return;
    const dt = Math.min(delta, 100);
    this.vacant.update(dt);
    if (this.walker.update(dt, this.speed)) this.arrived();
    this.player.setPosition(this.walker.pos.x, this.walker.pos.y);
    this.player.setDepth(20 + this.walker.pos.y / 10);
    for (const e of this.vacant.drainEvents()) {
      if (e.type === 'pilaChanged') this.drawQueue(e.stall);
      if (e.type === 'atCounter') this.drawStatus();
    }
    this.boardPila?.setText(
      t('pupLagoon.board.pila', {
        n: this.boardStall ? this.vacant.pilaLength(this.boardStall) : 0,
      }),
    );
  }

  // ---- Drawing ---------------------------------------------------------------------------------

  private drawGround(): void {
    const ground = this.add.image(0, VIEW.topBar.h, 'lagoon_ground').setOrigin(0).setInteractive();
    ground.on('pointerup', (p: Phaser.Input.Pointer) =>
      this.walkTo(GRAPH.nearest(p.worldX, p.worldY)),
    );
    const P = VIEW.plaza;
    this.add
      .image(P.x, P.y + 16, 'lagoon_plaza_sign')
      .setOrigin(0.5, 1)
      .setDepth(this.depthAt(P.y + 16));
    const L = VIEW.lagoon;
    this.add.image(L.x, L.y, 'lagoon_pond_rail').setDepth(this.depthAt(L.y));
    if (!services().save.data.settings.reducedMotion) {
      // Ripples on the water.
      for (let i = 0; i < 6; i++) {
        const r = this.add
          .ellipse(L.x - 40 + ((i * 17) % 80), L.y - 20 + ((i * 23) % 40), 8, 3)
          .setStrokeStyle(1, 0x8fbf8a, 0.8)
          .setDepth(1);
        this.tweens.add({
          targets: r,
          scale: 2,
          alpha: 0,
          duration: 1800,
          delay: i * 600,
          repeat: -1,
          repeatDelay: 1400,
        });
      }
    }
    for (const x of VIEW.benches)
      this.add
        .image(x, LAGOON_LIFE.bench.y, 'lagoon_bench')
        .setDepth(this.depthAt(LAGOON_LIFE.bench.y));
    this.drawLife();
    // Shade trees over everything on the ground.
    this.add.image(0, VIEW.topBar.h, 'lagoon_canopy').setOrigin(0).setDepth(70);
  }

  /** People on the map: students on the benches, latag sellers, dancers and a singer (owner, L6). */
  private drawLife(): void {
    const reduced = services().save.data.settings.reducedMotion;
    const make = (key: string, texture: string, frames: number[], ms: number): void => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(texture, { frames }),
        duration: ms * frames.length,
        repeat: -1,
      });
    };
    make('lagoon_dance_0', 'lagoon_dancer', [0, 1, 2, 3], LAGOON_LIFE.danceMs);
    make('lagoon_dance_1', 'lagoon_dancer', [4, 5, 6, 7], LAGOON_LIFE.danceMs);
    make('lagoon_sing', 'lagoon_singer', [0, 1], LAGOON_LIFE.danceMs * 2);
    for (let i = 0; i < 6; i++)
      make(`lagoon_sit_${i}`, 'lagoon_sitter', [i * 2, i * 2 + 1], LAGOON_LIFE.sitterMs);
    const person = (sprite: Phaser.GameObjects.Sprite, anim: string | null): void => {
      sprite.setOrigin(0.5, 1).setDepth(this.depthAt(sprite.y));
      if (anim && !reduced) sprite.play({ key: anim, startFrame: Math.floor(sprite.x) % 2 });
    };
    VIEW.benches.forEach((x, b) => {
      const [a, c] = LAGOON_LIFE.sitters[b];
      person(
        this.add.sprite(x - 6, LAGOON_LIFE.bench.y + 2, 'lagoon_sitter', a * 2),
        `lagoon_sit_${a}`,
      );
      person(
        this.add.sprite(x + 10, LAGOON_LIFE.bench.y + 2, 'lagoon_sitter', c * 2),
        `lagoon_sit_${c}`,
      );
    });
    for (const [v, x, y] of LAGOON_LIFE.latag)
      this.add.image(x, y, `lagoon_latag_${v}`).setOrigin(0.5, 1).setDepth(this.depthAt(y));
    for (const [outfit, x, y] of LAGOON_LIFE.dancers)
      person(this.add.sprite(x, y, 'lagoon_dancer', outfit * 4), `lagoon_dance_${outfit}`);
    person(
      this.add.sprite(LAGOON_LIFE.singer.x, LAGOON_LIFE.singer.y, 'lagoon_singer', 0),
      'lagoon_sing',
    );
    for (const [v, x, y, left] of LAGOON_LIFE.browsers)
      person(this.add.sprite(x, y, `walker_${v}`, 0).setScale(0.75).setFlipX(left), null);
  }

  /** People and props sort by their feet: lower on the screen draws in front. */
  private depthAt(y: number): number {
    return 20 + y / 10;
  }

  private drawStalls(): void {
    const open = new Set(this.vacant.gen.open);
    const R = VIEW.stallRow;
    this.add.image(R.x, R.y, 'lagoon_stallrow').setOrigin(0).setDepth(2);
    const reduced = services().save.data.settings.reducedMotion;
    for (const s of STALLS) {
      const isOpen = open.has(s.key);
      const box = this.stallBox(s.key);
      if (!box) continue;
      let img: Phaser.GameObjects.Image;
      if (VIEW.windows[s.key] !== undefined) {
        img = this.add.image(box.x, box.y, `stall_window_${s.key}`, isOpen ? 1 : 0).setDepth(3);
      } else if (VIEW.kiosks[s.key] !== undefined) {
        img = this.add
          .image(box.x, box.y, `kiosk_${s.key}`, isOpen ? 1 : 0)
          .setDepth(this.depthAt(box.y + box.h / 2));
      } else if (s.key === 'tusok') {
        const cart = this.add
          .image(box.x, box.y, 'cart_tusok', 0)
          .setDepth(this.depthAt(box.y + box.h / 2));
        if (isOpen && !reduced) {
          // Steam puffs from the wok.
          let f = 0;
          this.time.addEvent({
            delay: 500,
            loop: true,
            callback: () => cart.setFrame((f = 1 - f)),
          });
        }
        if (!isOpen) cart.setTint(0x9a9494);
        img = cart;
      } else {
        img = this.add
          .image(box.x, box.y, 'water_station', isOpen ? 1 : 0)
          .setDepth(this.depthAt(box.y + box.h / 2));
      }
      img.setInteractive({ useHandCursor: true }).on('pointerup', () => this.openBoard(s.key));
      // Hover (desktop): the stall's name pops up above it.
      img.on('pointerover', () => this.showTip(s.key, box.x, box.y - box.h / 2 - 4));
      img.on('pointerout', () => this.tip?.destroy());
    }
  }

  private showTip(stall: StallKey, x: number, y: number): void {
    this.tip?.destroy();
    const open = this.vacant.gen.open.includes(stall);
    const name = stall === 'water' ? t('pupLagoon.stall.water') : t(`pupLagoon.stall.${stall}`);
    this.tip = this.add
      .text(
        Phaser.Math.Clamp(x, 60, VIEW.mapRight - 60),
        Math.max(VIEW.topBar.h + 12, y),
        open ? name : `${name}: ${t('pupLagoon.map.closed')}`,
        textStyle(8, TEXT.cream, { backgroundColor: '#2B2233', padding: { x: 4, y: 2 } }),
      )
      .setOrigin(0.5, 1)
      .setDepth(88);
  }

  private stallBox(key: StallKey): { x: number; y: number; w: number; h: number } | null {
    const wx = VIEW.windows[key];
    if (wx !== undefined) return { x: wx, y: VIEW.window.cy, w: VIEW.window.w, h: VIEW.window.h };
    const ky = VIEW.kiosks[key];
    if (ky !== undefined)
      return {
        x: VIEW.kiosk.x + VIEW.kiosk.w / 2,
        y: ky + VIEW.kiosk.h / 2,
        w: VIEW.kiosk.w,
        h: VIEW.kiosk.h,
      };
    if (key === 'tusok')
      return { x: VIEW.tusokCart.x, y: VIEW.tusokCart.y, w: VIEW.tusokCart.w, h: VIEW.tusokCart.h };
    if (key === 'water')
      return { x: VIEW.water.x, y: VIEW.water.y, w: VIEW.water.w, h: VIEW.water.h };
    return null;
  }

  private drawPlayer(): void {
    const profile = services().save.data.profile;
    const body = profile
      ? avatarSprite(this, 0, -12, profile, 0.5)
      : this.add.rectangle(0, -10, 12, 20, COLORS.yellow).setStrokeStyle(1, COLORS.ink);
    const marker = this.add.triangle(0, -30, -4, 0, 4, 0, 0, 5, COLORS.red);
    this.player = this.add.container(this.walker.pos.x, this.walker.pos.y, [body, marker]);
  }

  private drawQueue(stall: StallKey): void {
    this.queues.get(stall)?.destroy();
    const node = GRAPH.node(STALL_NODE[stall]);
    const dir = QUEUE_DIR[stall];
    const c = this.add.container(node.x, node.y).setDepth(this.depthAt(node.y));
    const place = this.vacant.location?.stall === stall ? this.vacant.playerPlace() : null;
    const total = this.vacant.pilaLength(stall);
    for (let i = 0; i < total; i++) {
      if (place !== null && i === place) continue; // the player stands here
      const x = dir.x * i * VIEW.queueGap;
      const y = dir.y * i * VIEW.queueGap;
      const v = ((i + stall.length) % 6) + 1;
      c.add(
        this.add
          .sprite(x, y, `walker_${v}`, 0)
          .setOrigin(0.5, 1)
          .setScale(0.75)
          .setFlipX(dir.x > 0),
      );
    }
    this.queues.set(stall, c);
    if (place !== null && !this.walker.moving) {
      this.walker.pos.x = node.x + dir.x * place * VIEW.queueGap;
      this.walker.pos.y = node.y + dir.y * place * VIEW.queueGap;
    }
    this.drawStatus();
  }

  private drawTopBar(): void {
    const g = this.vacant.gen;
    this.add.rectangle(320, VIEW.topBar.h / 2, 640, VIEW.topBar.h, COLORS.ink).setDepth(80);
    this.add
      .text(
        8,
        VIEW.topBar.h / 2,
        t('pupLagoon.hud.vacant', { n: g.def.n, slot: t(`pupLagoon.slot.${g.def.slot}`) }),
        textStyle(8, TEXT.cream),
      )
      .setOrigin(0, 0.5)
      .setDepth(81);
    if (g.event) {
      const eventText =
        g.event === 'promo' && g.promo
          ? t(`pupLagoon.promo.${g.promo.key}`)
          : g.event === 'longLine' && g.longLineStall
            ? t('pupLagoon.event.longLine', { stall: t(`pupLagoon.stall.${g.longLineStall}`) })
            : t(`pupLagoon.event.${g.event}`);
      this.add
        .text(150, VIEW.topBar.h / 2, eventText, textStyle(8, TEXT.gold))
        .setOrigin(0, 0.5)
        .setDepth(81);
    }
    if (g.rain) {
      const rain = this.add.graphics().setDepth(70).setAlpha(0.35);
      rain.lineStyle(1, 0x9db4c0);
      for (let i = 0; i < 90; i++) {
        const x = (i * 53) % VIEW.mapRight;
        const y = VIEW.topBar.h + ((i * 97) % (360 - VIEW.topBar.h));
        rain.lineBetween(x, y, x - 2, y + 6);
      }
    }
    new Button(this, 620, VIEW.topBar.h / 2, 'II', () => this.pause(), {
      width: 28,
      height: 18,
    }).setDepth(82);
  }

  private drawHud(): void {
    this.hud.removeAll(true);
    const v = this.vacant;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.hud.add(o);
      return o;
    };
    add(this.add.rectangle(576, 192, 128, 336, 0x3a3346));
    const Lh = VIEW.listahan;
    add(
      this.add
        .rectangle(Lh.x + Lh.w / 2, Lh.y + Lh.h / 2, Lh.w, Lh.h, 0xfffbef)
        .setStrokeStyle(1, COLORS.ink),
    );
    add(this.add.text(Lh.x + 6, Lh.y + 4, t('pupLagoon.hud.listahan'), textStyle(8, TEXT.grey)));
    let y = Lh.y + 18;
    for (const line of v.gen.lines) {
      const done = v.listahan.isLineDone(line.id);
      const units = line.qty > 1 ? ` ${v.listahan.doneUnits(line.id)}/${line.qty}` : '';
      const text = add(
        this.add.text(
          Lh.x + 6,
          y,
          `${done ? '[x]' : '[ ]'} ${lineText(line)}${units}`,
          textStyle(8, done ? TEXT.grey : TEXT.ink, {
            wordWrap: { width: Lh.w - 10 },
          }),
        ),
      );
      y += text.height + 3;
    }
    const B = VIEW.busog;
    add(
      this.add
        .rectangle(B.x + B.w / 2, B.y + B.h / 2, B.w, B.h, 0xfff4dc)
        .setStrokeStyle(1, COLORS.ink),
    );
    add(
      this.add
        .text(
          B.x + B.w / 2,
          B.y + B.h / 2,
          t('pupLagoon.hud.busog', { n: v.busog, target: v.gen.busogTarget }),
          textStyle(8),
        )
        .setOrigin(0.5),
    );
    const W = VIEW.wallet;
    add(
      this.add
        .rectangle(W.x + W.w / 2, W.y + W.h / 2, W.w, W.h, 0xfff4dc)
        .setStrokeStyle(1, COLORS.ink),
    );
    add(
      this.add.text(
        W.x + 6,
        W.y + 4,
        t('pupLagoon.hud.wallet', { total: moneyTotal(v.wallet.money) }),
        textStyle(8),
      ),
    );
    add(
      this.add.text(
        W.x + 6,
        W.y + 20,
        toPieces(v.wallet.money)
          .map((p) => `₱${p}`)
          .join(' '),
        textStyle(8, TEXT.ink, {
          wordWrap: { width: W.w - 10 },
        }),
      ),
    );
  }

  /** The line/counter panel at the bottom of the map. */
  private drawStatus(): void {
    this.status.removeAll(true);
    const loc = this.vacant.location;
    if (!loc) return;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.status.add(o);
      return o;
    };
    add(panel(this, 256, 336, 300, 32));
    if (loc.at === 'pila') {
      add(
        this.add
          .text(
            120,
            336,
            t('pupLagoon.pila.waiting', { n: this.vacant.playerPlace() ?? 0 }),
            textStyle(8),
          )
          .setOrigin(0, 0.5),
      );
      add(
        new Button(this, 352, 336, t('pupLagoon.pila.leave'), () => this.leaveLine(), {
          width: 88,
          height: 20,
        }),
      );
    } else {
      add(
        this.add
          .text(112, 330, t('pupLagoon.counter.title'), textStyle(8, TEXT.red))
          .setOrigin(0, 0.5),
      );
      add(this.add.text(112, 342, t('pupLagoon.counter.soon'), textStyle(8)).setOrigin(0, 0.5));
      add(
        new Button(this, 370, 336, t('pupLagoon.ui.leave'), () => this.leaveLine(), {
          width: 60,
          height: 20,
        }),
      );
    }
  }

  // ---- Storefronts (owner request, L6; replaces the §10.2 menu board) -----------------------------

  /** The front of a stall: its sign, food on display with prices, the vendor, and the menu below. */
  private openBoard(stall: StallKey): void {
    this.closeBoard();
    this.tip?.destroy();
    const B = VIEW.front;
    const g = this.vacant.gen;
    const isOpen = g.open.includes(stall);
    const c = this.add.container(B.x, B.y).setDepth(90);
    const top = -B.h / 2 + 6;
    c.add(this.add.rectangle(0, 0, VIEW.mapRight, 360, COLORS.ink, 0.4).setInteractive());
    c.add(panel(this, 0, 0, B.w, B.h).setInteractive());
    const front = this.add.image(0, top + 85, `front_${stall}`);
    if (!isOpen) front.setTint(0x8a8494);
    c.add(front);
    const name = stall === 'water' ? t('pupLagoon.stall.water') : t(`pupLagoon.stall.${stall}`);
    c.add(this.add.text(0, top + 17, name, textStyle(16, TEXT.red)).setOrigin(0.5));
    const items = MENU.filter((m) => m.stall === stall && m.orderable !== false);
    if (stall === 'tusok')
      c.add(
        this.add
          .text(
            0,
            top + 44,
            t('pupLagoon.front.fewa'),
            textStyle(8, TEXT.cream, { backgroundColor: '#D94B3D', padding: { x: 4, y: 2 } }),
          )
          .setOrigin(0.5),
      );
    const vendor = stallDef(stall).vendor;
    if (vendor)
      c.add(
        this.add
          .text(
            -192,
            top + 166,
            t(`pupLagoon.vendor.${vendor}`),
            textStyle(8, TEXT.cream, { backgroundColor: '#2B2233', padding: { x: 3, y: 1 } }),
          )
          .setOrigin(0, 1),
      );
    this.boardPila = null;

    if (!isOpen) {
      const msg =
        stall === 'water' ? t('pupLagoon.board.needsTumbler') : t('pupLagoon.front.closed');
      c.add(
        this.add
          .text(
            0,
            top + 90,
            msg,
            textStyle(16, TEXT.cream, {
              align: 'center',
              wordWrap: { width: 300 },
              backgroundColor: '#2B2233',
              padding: { x: 6, y: 4 },
            }),
          )
          .setOrigin(0.5),
      );
    }
    // Price tags under the food on the counter (they follow promos and sell-outs).
    const slot = 300 / Math.max(items.length, 1);
    const tagY = top + (stall === 'tusok' ? 74 : stall === 'water' ? 112 : 66) + 50;
    items.forEach((m, i) => {
      const e = purchaseEffect(m.key, undefined, g.promo);
      const sold = this.vacant.isSoldOut(m.key);
      c.add(
        this.add
          .text(
            -150 + slot * i + slot / 2,
            tagY,
            sold ? t('pupLagoon.board.soldOut') : `₱${e.price}`,
            textStyle(8, sold ? TEXT.grey : TEXT.red, {
              backgroundColor: '#FFF4DC',
              padding: { x: 2, y: 0 },
            }),
          )
          .setOrigin(0.5, 0),
      );
    });
    // The menu: food, name, price, cravings and busog.
    const gridTop = top + 174;
    items.forEach((m, i) => {
      const e = purchaseEffect(m.key, undefined, g.promo);
      const sold = this.vacant.isSoldOut(m.key);
      const x = -B.w / 2 + 10 + (i % 3) * 158;
      const y = gridTop + Math.floor(i / 3) * 42;
      const color = sold ? TEXT.grey : TEXT.ink;
      c.add(this.add.image(x + 12, y + 14, `food_${m.key}`).setAlpha(sold ? 0.4 : 1));
      c.add(
        this.add.text(
          x + 28,
          y + 2,
          t(m.nameKey),
          textStyle(8, color, { wordWrap: { width: 92 } }),
        ),
      );
      c.add(
        this.add
          .text(
            x + 152,
            y + 2,
            sold ? t('pupLagoon.board.soldOut') : `₱${e.price}`,
            textStyle(8, sold ? TEXT.grey : TEXT.red),
          )
          .setOrigin(1, 0),
      );
      const tags = [...e.tags, ...(e.free?.tags ?? [])]
        .map((tag) => t(`pupLagoon.tag.${tag}`))
        .join(', ');
      c.add(
        this.add.text(
          x + 28,
          y + 26,
          `${tags} · ${t('pupLagoon.board.busog', { n: e.busog * e.copies })}`,
          textStyle(8, TEXT.grey, { wordWrap: { width: 126 } }),
        ),
      );
    });

    const by = B.h / 2 - 16;
    c.add(
      new Button(this, -B.w / 2 + 44, by, t('pupLagoon.front.prev'), () => this.flipBoard(-1), {
        width: 76,
        height: 20,
      }),
    );
    c.add(
      new Button(this, B.w / 2 - 44, by, t('pupLagoon.front.next'), () => this.flipBoard(1), {
        width: 76,
        height: 20,
      }),
    );
    if (isOpen && stall !== 'water') {
      this.boardPila = this.add.text(-B.w / 2 + 90, by, '', textStyle(8)).setOrigin(0, 0.5);
      c.add(this.boardPila);
    }
    if (isOpen) {
      c.add(
        new Button(this, 30, by, t('pupLagoon.ui.queue'), () => this.queueAt(stall), {
          width: 80,
          height: 20,
          fill: COLORS.yellow,
          textColor: TEXT.red,
        }),
      );
    }
    c.add(
      new Button(this, 112, by, t('ui.close'), () => this.closeBoard(), { width: 60, height: 20 }),
    );
    this.board = c;
    this.boardStall = stall;
  }

  /** Prev / Next: the stalls in their 1–8 order, then the water station. */
  private flipBoard(dir: 1 | -1): void {
    const order: StallKey[] = [...STALL_KEYS_ORDER, 'water'];
    const i = order.indexOf(this.boardStall ?? order[0]);
    this.openBoard(order[(i + dir + order.length) % order.length]);
  }

  private closeBoard(): void {
    this.board?.destroy();
    this.board = null;
    this.boardStall = null;
    this.boardPila = null;
  }

  // ---- Walking and the pila (§4.2) -------------------------------------------------------------

  private queueAt(stall: StallKey): void {
    this.closeBoard();
    if (this.vacant.location?.stall === stall) return;
    this.walkTo(STALL_NODE[stall], stall);
  }

  /** Walk to a node; walking away from a line leaves it. */
  private walkTo(node: string, stall: StallKey | null = null): void {
    if (this.board) {
      this.closeBoard();
      return;
    }
    if (this.vacant.location && !this.leaveLine()) return;
    this.pending = stall;
    this.walker.goTo(node);
    if (!this.walker.moving) this.arrived();
  }

  private arrived(): void {
    const stall = this.pending;
    this.pending = null;
    if (!stall) return;
    if (stall === 'water') {
      this.vacant.refillTumbler();
      this.drawHud();
      return;
    }
    this.vacant.joinPila(stall);
    this.drawQueue(stall);
  }

  /** Leave the line or the counter. False if the grill still holds the player at the counter. */
  private leaveLine(): boolean {
    const loc = this.vacant.location;
    if (!loc) return true;
    const r = loc.at === 'counter' ? this.vacant.leaveCounter() : this.vacant.leavePila();
    if (!r.ok) return false;
    this.walker.stop();
    const node = GRAPH.node(STALL_NODE[loc.stall]);
    this.walker.pos.x = node.x;
    this.walker.pos.y = node.y;
    this.walker.at = node.id;
    this.drawQueue(loc.stall);
    this.drawStatus();
    return true;
  }

  // ---- Keys and pause --------------------------------------------------------------------------

  private bindKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    STALL_KEYS_ORDER.forEach((stall, i) =>
      kb.on(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT'][i]}`, () =>
        this.openBoard(stall),
      ),
    );
    kb.on('keydown-LEFT', () => {
      if (this.board) this.flipBoard(-1);
    });
    kb.on('keydown-RIGHT', () => {
      if (this.board) this.flipBoard(1);
    });
    kb.on('keydown-ENTER', () => {
      if (this.boardStall && this.vacant.gen.open.includes(this.boardStall))
        this.queueAt(this.boardStall);
    });
    kb.on('keydown-ESC', () => {
      if (this.board) this.closeBoard();
      else this.leaveLine();
    });
    kb.on('keydown-P', () => this.pause());
    this.events.once('shutdown', () => kb.removeAllListeners());
  }

  private pause(): void {
    openOverlay(this, PAUSE);
  }
}
