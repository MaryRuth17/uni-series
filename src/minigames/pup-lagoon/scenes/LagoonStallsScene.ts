/**
 * LagoonStallsScene — buying merienda at the Lagoon, one storefront at a time (owner change, DECISIONS L-026)
 * Shows: the current stall's front (front_<stall> art) with its name, promo sign and live price tags, steam
 * from the pots and the grill, the line of students in front of it (the player too, once lined up), the menu
 * (food, name, price, cravings, busog), Prev / Next through the stalls, Pumila / Leave line (Refill at the
 * water station), the top bar (vacant, slot, event, pause) and the HUD column (listahan, busog, wallet).
 * There is no walkable map: Pumila joins the line at once. Buying at the counter arrives in L3.
 * Listens to: pointer; keyboard (1–8 stalls, ← / → prev / next, Enter = Pumila, Esc = leave the line,
 * P = pause); LagoonVacant events (pilaChanged, atCounter, ticked); the frame update (the pila, ≤ 100 ms).
 */
import Phaser from 'phaser';
import { sceneConfig } from '../../../ui/view';
import { t } from '../../../core/i18n';
import { services } from '../../../core/services';
import { FADE_MS } from '../../../home/config';
import { Button } from '../../../ui/Button';
import { openOverlay } from '../../../ui/overlay';
import { COLORS, TEXT, textStyle } from '../../../ui/theme';
import { avatarSprite } from '../../../ui/avatar';
import { PAUSE } from '../../../scenes/PauseScene';
import { FRONT, STALL_KEYS_ORDER, VIEW } from '../config';
import { MENU } from '../data/menu';
import storefronts from '../data/storefronts.json';
import { lineText, loadProgress } from '../lagoonSave';
import { purchaseEffect } from '../logic/Catalog';
import { LagoonVacant } from '../logic/LagoonVacant';
import type { GeneratedVacant } from '../logic/ListahanGen';
import { moneyTotal, toPieces } from '../logic/Money';
import type { StallKey } from '../logic/types';
import { LAGOON_INTRO, LAGOON_STALLS } from './LagoonIntroScene';

interface FrontLayout {
  style: 'kiosk' | 'row' | 'water';
  items: number[][];
  name: { x: number; y: number; color: string };
  sign?: { x: number; y: number; w: number; h: number };
  steam: number[][];
}
const LAYOUT = storefronts as unknown as Record<StallKey, FrontLayout>;
/** Prev / Next order: the stalls in their 1–8 order, then the water station. */
const ORDER: readonly StallKey[] = [...STALL_KEYS_ORDER, 'water'];

export class LagoonStallsScene extends Phaser.Scene {
  private vacant!: LagoonVacant;
  private stall: StallKey = 'karinderya';
  private front!: Phaser.GameObjects.Container;
  private line!: Phaser.GameObjects.Container;
  private bar!: Phaser.GameObjects.Container;
  private hud!: Phaser.GameObjects.Container;
  private steam: Phaser.Time.TimerEvent | null = null;
  private reduced = false;

  constructor() {
    super(sceneConfig(LAGOON_STALLS));
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
    this.reduced = services().save.data.settings.reducedMotion;
    this.steam = null;
    // Start at the first open stall.
    this.stall = ORDER.find((s) => this.vacant.gen.open.includes(s)) ?? 'karinderya';

    this.add.rectangle(VIEW.mapRight / 2, 192, VIEW.mapRight, 336, 0xefe9dc);
    this.front = this.add.container(0, 0);
    this.line = this.add.container(0, 0).setDepth(10);
    this.bar = this.add.container(0, 0).setDepth(20);
    this.drawTopBar();
    this.hud = this.add.container(0, 0).setDepth(80);
    this.drawHud();
    this.showStall(this.stall);
    this.bindKeys();
    this.cameras.main.fadeIn(FADE_MS, 0x2b, 0x22, 0x33);
  }

  override update(_time: number, delta: number): void {
    if (!this.vacant) return;
    this.vacant.update(Math.min(delta, 100));
    for (const e of this.vacant.drainEvents()) {
      if (e.type === 'pilaChanged' || e.type === 'atCounter') {
        this.drawLine();
        this.drawBar();
      }
      if (e.type === 'ticked') this.drawHud();
    }
  }

  // ---- The storefront ----------------------------------------------------------------------------

  private get busy(): boolean {
    return this.vacant.location !== null;
  }

  private showStall(stall: StallKey): void {
    this.stall = stall;
    this.front.removeAll(true);
    this.steam?.remove();
    this.steam = null;
    const F = FRONT;
    const L = LAYOUT[stall];
    const g = this.vacant.gen;
    const isOpen = g.open.includes(stall);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.front.add(o);
      return o;
    };
    const art = add(this.add.image(F.x, F.y, `front_${stall}`).setOrigin(0));
    if (!isOpen) art.setTint(0x8a8494);

    // The stall's name: on the red front (kiosks) or on the black board (stall row).
    const name = stall === 'water' ? t('pupLagoon.stall.water') : t(`pupLagoon.stall.${stall}`);
    const maxW = L.style === 'row' ? 184 : 440;
    let label = this.add.text(L.name.x, F.y + L.name.y, name, textStyle(16, L.name.color));
    if (label.width > maxW) {
      label.destroy();
      label = this.add.text(L.name.x, F.y + L.name.y, name, textStyle(8, L.name.color));
    }
    add(label.setOrigin(0.5));
    if (L.sign) {
      const s = L.sign;
      add(
        this.add
          .text(
            s.x + s.w / 2,
            F.y + s.y + s.h / 2 + 2,
            t(`pupLagoon.front.sign.${stall}`),
            textStyle(8, TEXT.red, { align: 'center', wordWrap: { width: s.w - 8 } }),
          )
          .setOrigin(0.5),
      );
    }
    if (stall === 'tusok')
      add(
        this.add
          .text(
            300,
            F.y + 178,
            t('pupLagoon.front.fewa'),
            textStyle(8, TEXT.cream, { backgroundColor: '#D94B3D', padding: { x: 4, y: 2 } }),
          )
          .setOrigin(0.5),
      );

    // Price tags under the food on display (they follow promos and sell-outs).
    const items = MENU.filter((m) => m.stall === stall && m.orderable !== false);
    items.forEach((m, i) => {
      const [x, y] = L.items[i] ?? [0, 0];
      const e = purchaseEffect(m.key, undefined, g.promo);
      const sold = this.vacant.isSoldOut(m.key);
      add(
        this.add
          .text(
            x,
            F.y + y + 28,
            sold ? t('pupLagoon.board.soldOut') : `₱${e.price}`,
            textStyle(8, sold ? TEXT.grey : TEXT.red, {
              backgroundColor: '#FFF4DC',
              padding: { x: 2, y: 0 },
            }),
          )
          .setOrigin(0.5, 0),
      );
    });
    if (!isOpen) {
      const msg =
        stall === 'water' ? t('pupLagoon.board.needsTumbler') : t('pupLagoon.front.closed');
      add(
        this.add
          .text(
            F.x + F.w / 2,
            F.y + F.h / 2,
            msg,
            textStyle(16, TEXT.cream, {
              align: 'center',
              wordWrap: { width: 320 },
              backgroundColor: '#2B2233',
              padding: { x: 8, y: 6 },
            }),
          )
          .setOrigin(0.5),
      );
    }

    // The menu: food, name, price, cravings and busog.
    items.forEach((m, i) => {
      const e = purchaseEffect(m.key, undefined, g.promo);
      const sold = this.vacant.isSoldOut(m.key);
      // Two columns, three rows: name and price on top, cravings and busog below.
      const x = 8 + (i % 2) * 252;
      const y = FRONT.menuY + Math.floor(i / 2) * FRONT.menuRowH;
      const color = sold ? TEXT.grey : TEXT.ink;
      add(this.add.image(x + 12, y + 12, `food_${m.key}`).setAlpha(sold ? 0.4 : 1));
      add(this.add.text(x + 28, y + 1, t(m.nameKey), textStyle(8, color)));
      add(
        this.add
          .text(
            x + 244,
            y + 1,
            sold ? t('pupLagoon.board.soldOut') : `₱${e.price}`,
            textStyle(8, sold ? TEXT.grey : TEXT.red),
          )
          .setOrigin(1, 0),
      );
      const tags = [...e.tags, ...(e.free?.tags ?? [])]
        .map((tag) => t(`pupLagoon.tag.${tag}`))
        .join(', ');
      add(
        this.add.text(
          x + 28,
          y + 12,
          `${tags} · ${t('pupLagoon.board.busog', { n: e.busog * e.copies })}`,
          textStyle(8, TEXT.grey),
        ),
      );
    });

    // Steam and smoke rising from pots, woks and the grill.
    if (isOpen && !this.reduced && L.steam.length) {
      this.steam = this.time.addEvent({
        delay: FRONT.steamMs,
        loop: true,
        callback: () => {
          const [x, y] = L.steam[Phaser.Math.Between(0, L.steam.length - 1)];
          const puff = this.add
            .circle(x + Phaser.Math.Between(-4, 4), F.y + y, 3, 0xffffff, 0.6)
            .setDepth(5);
          this.tweens.add({
            targets: puff,
            y: puff.y - 22,
            scale: 2,
            alpha: 0,
            duration: 1400,
            onComplete: () => puff.destroy(),
          });
        },
      });
    }
    this.drawLine();
    this.drawBar();
  }

  /** The line of students in front of the stall, with the player in their place. */
  private drawLine(): void {
    this.line.removeAll(true);
    const stall = this.stall;
    if (!this.vacant.gen.open.includes(stall) || stall === 'water') return;
    const total = this.vacant.pilaLength(stall);
    const here = this.vacant.location?.stall === stall;
    const place = here ? this.vacant.playerPlace() : null;
    const atCounter = here && this.vacant.location?.at === 'counter';
    const feet = FRONT.y + FRONT.h + 2;
    const shown = Math.min(total, FRONT.lineMax);
    for (let i = 0; i < shown; i++) {
      const x = FRONT.lineX + i * FRONT.lineGap;
      if ((place !== null && i === place) || (atCounter && i === 0)) {
        const profile = services().save.data.profile;
        if (profile) this.line.add(avatarSprite(this, x, feet - 16, profile, 0.62));
        this.line.add(this.add.triangle(x, feet - 38, -4, 0, 4, 0, 0, 5, COLORS.red));
        continue;
      }
      const v = ((i + stall.length) % 6) + 1;
      this.line.add(
        this.add.sprite(x, feet, `walker_${v}`, 0).setOrigin(0.5, 1).setScale(1.25).setFlipX(true),
      );
    }
    if (total > shown)
      this.line.add(
        this.add
          .text(
            FRONT.lineX + shown * FRONT.lineGap,
            feet - 14,
            `+${total - shown}`,
            textStyle(8, TEXT.ink, { backgroundColor: '#FFF4DC', padding: { x: 2, y: 1 } }),
          )
          .setOrigin(0.5),
      );
  }

  /** Prev / Next, where this stall is in the list, and Pumila / Leave line / Refill. */
  private drawBar(): void {
    this.bar.removeAll(true);
    const y = FRONT.barY;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.bar.add(o);
      return o;
    };
    add(this.add.rectangle(VIEW.mapRight / 2, y, VIEW.mapRight, 32, 0xe2dccd));
    const busy = this.busy;
    add(
      new Button(this, 44, y, t('pupLagoon.front.prev'), () => this.flip(-1), {
        width: 76,
        height: 20,
      }),
    ).setEnabled(!busy);
    add(
      new Button(this, VIEW.mapRight - 44, y, t('pupLagoon.front.next'), () => this.flip(1), {
        width: 76,
        height: 20,
      }),
    ).setEnabled(!busy);
    const loc = this.vacant.location;
    const open = this.vacant.gen.open.includes(this.stall);
    let status = `${ORDER.indexOf(this.stall) + 1}/${ORDER.length}`;
    if (open && this.stall !== 'water')
      status += ` · ${t('pupLagoon.board.pila', { n: this.vacant.pilaLength(this.stall) })}`;
    if (loc?.at === 'pila')
      status = t('pupLagoon.pila.waiting', { n: this.vacant.playerPlace() ?? 0 });
    if (loc?.at === 'counter')
      status = `${t('pupLagoon.counter.title')} ${t('pupLagoon.counter.soon')}`;
    add(
      this.add
        .text(170, y, status, textStyle(8, loc ? TEXT.red : TEXT.ink, { wordWrap: { width: 150 } }))
        .setOrigin(0.5),
    );
    if (loc) {
      add(
        new Button(this, 340, y, t('pupLagoon.pila.leave'), () => this.leaveLine(), {
          width: 92,
          height: 20,
        }),
      );
    } else if (open && this.stall === 'water') {
      add(
        new Button(this, 340, y, t('pupLagoon.front.refill'), () => this.refill(), {
          width: 92,
          height: 20,
          fill: COLORS.yellow,
          textColor: TEXT.red,
        }),
      );
    } else if (open) {
      add(
        new Button(this, 340, y, t('pupLagoon.ui.queue'), () => this.queue(), {
          width: 92,
          height: 20,
          fill: COLORS.yellow,
          textColor: TEXT.red,
        }),
      );
    }
  }

  private flip(dir: 1 | -1): void {
    if (this.busy) return;
    const i = ORDER.indexOf(this.stall);
    this.showStall(ORDER[(i + dir + ORDER.length) % ORDER.length]);
  }

  private queue(): void {
    if (this.vacant.joinPila(this.stall).ok) {
      this.drawLine();
      this.drawBar();
    }
  }

  private refill(): void {
    if (this.vacant.refillTumbler().ok) this.drawHud();
  }

  /** Leave the line or the counter. False if the grill still holds the player at the counter. */
  private leaveLine(): boolean {
    const loc = this.vacant.location;
    if (!loc) return true;
    const r = loc.at === 'counter' ? this.vacant.leaveCounter() : this.vacant.leavePila();
    if (!r.ok) return false;
    this.drawLine();
    this.drawBar();
    return true;
  }

  // ---- Top bar and HUD ---------------------------------------------------------------------------

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
      const rain = this.add.graphics().setDepth(15).setAlpha(0.35);
      rain.lineStyle(1, 0x9db4c0);
      for (let i = 0; i < 70; i++) {
        const x = (i * 53) % VIEW.mapRight;
        const y = FRONT.y + ((i * 97) % FRONT.h);
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
          textStyle(8, done ? TEXT.grey : TEXT.ink, { wordWrap: { width: Lh.w - 10 } }),
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
        textStyle(8, TEXT.ink, { wordWrap: { width: W.w - 10 } }),
      ),
    );
  }

  // ---- Keys and pause ----------------------------------------------------------------------------

  private bindKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    STALL_KEYS_ORDER.forEach((stall, i) =>
      kb.on(
        `keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT'][i]}`,
        () => {
          if (!this.busy) this.showStall(stall);
        },
      ),
    );
    kb.on('keydown-LEFT', () => this.flip(-1));
    kb.on('keydown-RIGHT', () => this.flip(1));
    kb.on('keydown-ENTER', () => {
      if (this.busy) return;
      if (this.stall === 'water') this.refill();
      else if (this.vacant.gen.open.includes(this.stall)) this.queue();
    });
    kb.on('keydown-ESC', () => this.leaveLine());
    kb.on('keydown-P', () => this.pause());
    this.events.once('shutdown', () => kb.removeAllListeners());
  }

  private pause(): void {
    openOverlay(this, PAUSE);
  }
}
