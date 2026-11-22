/**
 * LagoonMapScene — the Lagoon during a vacant (SPEC-pup-lagoon §4.2, §10.1, §10.3) — L2 greybox
 * Shows: the whole Lagoon as labelled shapes at the §10.1 positions (stall row with windows, red kiosks,
 * plaza with the LAGOON sign, the Lagoon, tusok cart, tambayan benches, water station), locked stalls with
 * closed shutters, live pila lines of students, the player, the top bar (vacant, slot, event, pause) and
 * the HUD column (listahan, busog meter, wallet). Tap a stall to open its menu board (even from far away);
 * Pumila walks there along the paths and joins the line; tap the ground to walk; the player can leave a
 * line any time. Buying at the counter arrives in L3.
 * Listens to: pointer; keyboard (1–8 menu boards, Enter = Pumila, Esc = close / leave, P = pause);
 * LagoonVacant events (pilaChanged, atCounter); the frame update (walking and the pila, clamped to 100 ms).
 */
import Phaser from 'phaser';
import { t } from '../../../core/i18n';
import { services } from '../../../core/services';
import { FADE_MS } from '../../../home/config';
import { Button } from '../../../ui/Button';
import { openOverlay } from '../../../ui/overlay';
import { panel } from '../../../ui/Panel';
import { COLORS, TEXT, textStyle } from '../../../ui/theme';
import { avatarPreview } from '../../../scenes/IdCardScene';
import { PAUSE } from '../../../scenes/PauseScene';
import { EVENTS, STALL_KEYS_ORDER, VIEW, WALK_SPEED } from '../config';
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

  constructor() {
    super(LAGOON_MAP);
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
    const ground = this.add
      .rectangle(
        VIEW.mapRight / 2,
        (360 + VIEW.topBar.h) / 2,
        VIEW.mapRight,
        360 - VIEW.topBar.h,
        0xd9d6cc,
      )
      .setInteractive();
    ground.on('pointerup', (p: Phaser.Input.Pointer) => this.walkTo(GRAPH.nearest(p.x, p.y)));

    const P = VIEW.plaza;
    this.add.circle(P.x, P.y, P.r, 0xb5563d).setStrokeStyle(4, 0xf2eee4);
    this.add.circle(P.x, P.y, P.r - 18).setStrokeStyle(3, 0xf2eee4);
    this.add
      .polygon(P.x, P.y, [12, 0, 36, 0, 48, 20, 36, 40, 12, 40, 0, 20], 0xc75b3b)
      .setStrokeStyle(1, COLORS.ink);
    this.add.rectangle(P.x, P.y - 4, 44, 12, 0xd94b3d).setStrokeStyle(1, COLORS.ink);
    this.add.text(P.x, P.y - 4, t('pupLagoon.map.sign'), textStyle(8, TEXT.cream)).setOrigin(0.5);

    const L = VIEW.lagoon;
    this.add.ellipse(L.x, L.y, L.w + 6, L.h + 6, 0xbdb8ac);
    this.add.ellipse(L.x, L.y, L.w, L.h, 0x5e8c61);
    this.add.text(L.x, L.y, t('pupLagoon.map.lagoon'), textStyle(8, TEXT.cream)).setOrigin(0.5);

    const T = VIEW.tambayan;
    this.add
      .rectangle(T.x + T.w / 2, T.y + T.h / 2, T.w, T.h, 0xcfc8b6)
      .setStrokeStyle(1, 0xa8a090);
    this.add.text(T.x + 6, T.y + 40, t('pupLagoon.map.tambayan'), textStyle(8, TEXT.grey));
    for (const x of VIEW.benches) {
      this.add.rectangle(x, T.y + 18, 48, 20, 0x8b5a3c).setStrokeStyle(1, COLORS.ink);
    }
    for (const x of [140, 230, 350, 440]) this.add.circle(x, T.y + 6, 14, 0x4f7f3a, 0.55);
  }

  private drawStalls(): void {
    const open = new Set(this.vacant.gen.open);
    const R = VIEW.stallRow;
    this.add
      .rectangle(R.x + R.w / 2, R.y + R.h / 2, R.w, R.h, 0xf2eee4)
      .setStrokeStyle(1, COLORS.ink);
    this.add.rectangle(R.x + R.w / 2, R.y + 4, R.w, 8, 0x2b3a5e);

    for (const s of STALLS) {
      const isOpen = open.has(s.key);
      const box = this.stallBox(s.key);
      if (!box) continue;
      const fill =
        s.key in VIEW.kiosks
          ? isOpen
            ? 0xd94b3d
            : 0x9a8f8f
          : s.key === 'water'
            ? 0x9db4c0
            : isOpen
              ? 0xfff4dc
              : 0x2b3a5e;
      const rect = this.add
        .rectangle(box.x, box.y, box.w, box.h, fill)
        .setStrokeStyle(1, COLORS.ink);
      if (s.key === 'water' && !isOpen) rect.setAlpha(0.4);
      const name = s.key === 'water' ? t('pupLagoon.stall.water') : t(`pupLagoon.stall.${s.key}`);
      const label = isOpen || s.key === 'water' ? name : t('pupLagoon.map.closed');
      // The tusok cart and the water station are too small to hold their names: label them outside.
      const outside = s.key === 'tusok' || s.key === 'water';
      const at = outside
        ? s.key === 'tusok'
          ? { x: box.x, y: box.y - box.h / 2 - 2, ox: 0.5, oy: 1, wrap: 90 }
          : { x: box.x - box.w / 2 - 3, y: box.y, ox: 1, oy: 0.5, wrap: 70 }
        : { x: box.x, y: box.y, ox: 0.5, oy: 0.5, wrap: box.w - 4 };
      const color = outside ? TEXT.ink : isOpen && !(s.key in VIEW.kiosks) ? TEXT.ink : TEXT.cream;
      this.add
        .text(
          at.x,
          at.y,
          label,
          textStyle(8, color, { align: 'center', wordWrap: { width: at.wrap } }),
        )
        .setOrigin(at.ox, at.oy);
      if (isOpen && s.key !== 'water') {
        // Red and yellow balloon pairs at every open stall (§11 art notes).
        this.add.circle(box.x - box.w / 2 + 6, box.y - box.h / 2 + 6, 3, 0xd94b3d);
        this.add.circle(box.x - box.w / 2 + 12, box.y - box.h / 2 + 6, 3, 0xf2c14e);
      }
      rect.setInteractive({ useHandCursor: true }).on('pointerup', () => this.openBoard(s.key));
    }
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
      ? avatarPreview(this, 0, -12, profile, 0.45)
      : this.add.rectangle(0, -10, 12, 20, COLORS.yellow).setStrokeStyle(1, COLORS.ink);
    const marker = this.add.triangle(0, -30, -4, 0, 4, 0, 0, 5, COLORS.red);
    this.player = this.add.container(this.walker.pos.x, this.walker.pos.y, [body, marker]);
  }

  private drawQueue(stall: StallKey): void {
    this.queues.get(stall)?.destroy();
    const node = GRAPH.node(STALL_NODE[stall]);
    const dir = QUEUE_DIR[stall];
    const c = this.add.container(node.x, node.y).setDepth(18);
    const place = this.vacant.location?.stall === stall ? this.vacant.playerPlace() : null;
    const total = this.vacant.pilaLength(stall);
    for (let i = 0; i < total; i++) {
      if (place !== null && i === place) continue; // the player stands here
      const x = dir.x * i * VIEW.queueGap;
      const y = dir.y * i * VIEW.queueGap;
      c.add(this.add.rectangle(x, y - 6, 7, 12, 0x8a8494).setStrokeStyle(1, COLORS.ink));
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

  // ---- Menu boards (§10.2) ---------------------------------------------------------------------

  private openBoard(stall: StallKey): void {
    this.closeBoard();
    const B = VIEW.board;
    const g = this.vacant.gen;
    const isOpen = g.open.includes(stall);
    const c = this.add.container(B.x, B.y).setDepth(90);
    c.add(panel(this, 0, 0, B.w, B.h).setInteractive());
    const name = stall === 'water' ? t('pupLagoon.stall.water') : t(`pupLagoon.stall.${stall}`);
    c.add(this.add.text(-B.w / 2 + 52, -B.h / 2 + 8, name, textStyle(8, TEXT.red)));
    const vendor = stallDef(stall).vendor;
    c.add(
      this.add
        .rectangle(-B.w / 2 + 24, -B.h / 2 + 22, 32, 32, 0xe8b48f)
        .setStrokeStyle(1, COLORS.ink),
    );
    if (vendor)
      c.add(
        this.add.text(
          -B.w / 2 + 52,
          -B.h / 2 + 20,
          t(`pupLagoon.vendor.${vendor}`),
          textStyle(8, TEXT.grey),
        ),
      );
    this.boardPila = null;

    let y = -B.h / 2 + 46;
    if (!isOpen) {
      const msg = stall === 'water' ? t('pupLagoon.board.needsTumbler') : t('pupLagoon.map.closed');
      c.add(
        this.add
          .text(
            0,
            0,
            msg,
            textStyle(8, TEXT.ink, { align: 'center', wordWrap: { width: B.w - 30 } }),
          )
          .setOrigin(0.5),
      );
    } else {
      for (const m of MENU) {
        if (m.stall !== stall || m.orderable === false) continue;
        const e = purchaseEffect(m.key, undefined, g.promo);
        const sold = this.vacant.isSoldOut(m.key);
        const tags = [...e.tags, ...(e.free?.tags ?? [])]
          .map((tag) => t(`pupLagoon.tag.${tag}`))
          .join(', ');
        const color = sold ? TEXT.grey : TEXT.ink;
        c.add(this.add.text(-B.w / 2 + 10, y, t(m.nameKey), textStyle(8, color)));
        c.add(
          this.add
            .text(
              B.w / 2 - 10,
              y,
              sold ? t('pupLagoon.board.soldOut') : `₱${e.price}`,
              textStyle(8, color),
            )
            .setOrigin(1, 0),
        );
        c.add(
          this.add.text(
            -B.w / 2 + 18,
            y + 10,
            `${tags} · ${t('pupLagoon.board.busog', { n: e.busog * e.copies })}`,
            textStyle(8, TEXT.grey),
          ),
        );
        y += 24;
      }
      if (stall !== 'water') {
        this.boardPila = this.add
          .text(-B.w / 2 + 10, B.h / 2 - 22, '', textStyle(8))
          .setOrigin(0, 0.5);
        c.add(this.boardPila);
      }
    }
    if (isOpen) {
      c.add(
        new Button(this, 40, B.h / 2 - 22, t('pupLagoon.ui.queue'), () => this.queueAt(stall), {
          width: 72,
          height: 20,
          fill: COLORS.yellow,
          textColor: TEXT.red,
        }),
      );
    }
    c.add(
      new Button(this, 110, B.h / 2 - 22, t('ui.close'), () => this.closeBoard(), {
        width: 56,
        height: 20,
      }),
    );
    this.board = c;
    this.boardStall = stall;
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
