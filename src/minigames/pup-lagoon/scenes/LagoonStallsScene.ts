/**
 * LagoonStallsScene — buying merienda at the Lagoon, one storefront at a time (DECISIONS L-026, L-030, L-032–L-035)
 * Shows: tabs with every stall along the top; the current stall's front (front_<stall> art) with its
 * name, promo sign, live price tags and steam, and arrows to the other stalls; the menu (tap a food to
 * add it to the tray; a green badge names the listahan lines it ticks); the tray with the total, the
 * money left, Bayad and Kain na!; the payment view (tap coins and bills onto the counter, see the total,
 * what is placed and the sukli, Smart pay, Heto po!); the sawsawan picker for tusok food; the top bar and
 * the cork-board HUD (listahan, busog, wallet). There is no pila: a stall's counter is always free.
 * The owner's rules (L-034): an order that costs more than the money left, finishing with the listahan
 * unfinished, or money that can no longer buy anything still needed, is game over (LagoonResultScene).
 * Listens to: pointer; keyboard (1–8 stalls, ← / → previous / next, B = Bayad, K = Kain na!, Esc = close,
 * P = pause); LagoonVacant events (paid, ticked, grillDone, soldOut); the frame update (grill, ≤ 100 ms).
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
import { PAUSE } from '../../../scenes/PauseScene';
import { FRONT, LAGOON_AMBIENCE, LAGOON_MUSIC, SFX, STALL_KEYS_ORDER, VIEW } from '../config';
import { MENU } from '../data/menu';
import storefronts from '../data/storefronts.json';
import { lineText, loadProgress } from '../lagoonSave';
import { purchaseEffect } from '../logic/Catalog';
import { LagoonVacant } from '../logic/LagoonVacant';
import type { GeneratedVacant } from '../logic/ListahanGen';
import { addMoney, emptyMoney, type Money, moneyTotal, subMoney, toPieces } from '../logic/Money';
import {
  cheapestNeed,
  judgeFinish,
  judgeStuck,
  overspend,
  ticksLine,
  type Verdict,
} from '../logic/RunRules';
import type { ListahanLine, Sawsawan, StallKey } from '../logic/types';
import { bowlRow, walletGrid } from '../objects/lagoonUi';
import { LAGOON_INTRO, LAGOON_STALLS } from './LagoonIntroScene';

export const LAGOON_RESULT = 'LagoonResult';

interface FrontLayout {
  style: 'kiosk' | 'row' | 'water';
  items: number[][];
  name: { x: number; y: number; color: string };
  sign?: { x: number; y: number; w: number; h: number };
  steam: number[][];
}
const LAYOUT = storefronts as unknown as Record<StallKey, FrontLayout>;
const COIN_KEY: Readonly<Record<number, string>> = {
  1: 'coin_1',
  5: 'coin_5',
  10: 'coin_10',
  20: 'coin_20',
  50: 'bill_50',
  100: 'bill_100',
};

export class LagoonStallsScene extends Phaser.Scene {
  private vacant!: LagoonVacant;
  private gen!: GeneratedVacant;
  private stall: StallKey = 'karinderya';
  private order: StallKey[] = [];
  private owned: readonly string[] = [];
  private tabs!: Phaser.GameObjects.Container;
  private front!: Phaser.GameObjects.Container;
  private tray!: Phaser.GameObjects.Container;
  private hud!: Phaser.GameObjects.Container;
  private modal: Phaser.GameObjects.Container | null = null;
  private placed: Money = emptyMoney();
  private steam: Phaser.Time.TimerEvent | null = null;
  private note = '';
  private ended = false;
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
    this.gen = data.gen;
    this.owned = progress.owned;
    this.vacant = new LagoonVacant(data.gen, {
      suki: progress.suki,
      owned: progress.owned,
      saveSeed: progress.saveSeed,
    });
    this.reduced = services().save.data.settings.reducedMotion;
    this.steam = null;
    this.modal = null;
    this.note = '';
    this.ended = false;
    const all: StallKey[] = [...STALL_KEYS_ORDER, 'water'];
    this.order = all.filter((s) => this.vacant.gen.open.includes(s));

    this.add.rectangle(VIEW.mapRight / 2, 192, VIEW.mapRight, 336, 0xefe9dc);
    this.tabs = this.add.container(0, 0).setDepth(12);
    this.front = this.add.container(0, 0);
    this.tray = this.add.container(0, 0).setDepth(20);
    this.drawTopBar();
    this.hud = this.add.container(0, 0).setDepth(80);
    this.drawHud();
    this.goTo(this.order[0] ?? 'karinderya');
    this.bindKeys();
    services().audio.playMusic(LAGOON_MUSIC, this);
    services().audio.setAmbience(LAGOON_AMBIENCE, this);
    this.cameras.main.fadeIn(FADE_MS, 0x2b, 0x22, 0x33);
  }

  override update(_time: number, delta: number): void {
    if (!this.vacant || this.ended) return;
    this.vacant.update(Math.min(delta, 100));
    for (const e of this.vacant.drainEvents()) {
      if (e.type === 'ticked') {
        this.sfx(SFX.check);
        this.drawHud();
      }
      if (e.type === 'grillDone') {
        this.note = '';
        this.drawTray();
        this.drawTabs();
      }
      if (e.type === 'soldOut' || e.type === 'removedFromOrder') this.showStall();
    }
  }

  private sfx(key: string): void {
    services().audio.sfx(key);
  }

  // ---- Moving between stalls ---------------------------------------------------------------------

  /** True while the player cannot leave the counter: food in the tray, or the grill still going. */
  private get locked(): boolean {
    return this.vacant.currentOrder.length > 0 || this.vacant.isGrilling;
  }

  private goTo(stall: StallKey): void {
    if (this.modal || this.ended) return;
    if (stall !== this.stall && this.locked) {
      this.note = this.vacant.isGrilling
        ? t('pupLagoon.front.grilling')
        : t('pupLagoon.front.locked');
      this.sfx(SFX.error);
      this.drawTray();
      return;
    }
    if (this.vacant.location) this.vacant.leaveCounter();
    this.stall = stall;
    if (stall !== 'water') this.vacant.joinPila(stall); // no pila: straight to the counter (L-033)
    this.note = '';
    this.showStall();
  }

  private flip(dir: 1 | -1): void {
    if (this.order.length < 2) return;
    const i = this.order.indexOf(this.stall);
    this.sfx(SFX.tab);
    this.goTo(this.order[(i + dir + this.order.length) % this.order.length]);
  }

  // ---- Tabs ----------------------------------------------------------------------------------------

  private drawTabs(): void {
    this.tabs.removeAll(true);
    const w = VIEW.mapRight / this.order.length;
    const y = FRONT.tabsY;
    this.order.forEach((stall, i) => {
      const on = stall === this.stall;
      const x = i * w;
      const bg = this.add
        .rectangle(x + w / 2, y + FRONT.tabsH / 2, w - 2, FRONT.tabsH, on ? 0xfff4dc : 0xcfc6b0)
        .setStrokeStyle(1, on ? COLORS.red : 0x8a8494);
      this.tabs.add(bg);
      if (on)
        this.tabs.add(this.add.rectangle(x + w / 2, y + FRONT.tabsH - 1, w - 4, 2, COLORS.red));
      const dim = !on && this.locked;
      this.tabs.add(
        this.add
          .text(
            x + w / 2,
            y + FRONT.tabsH / 2,
            t(`pupLagoon.tab.${stall}`),
            textStyle(8, on ? TEXT.red : dim ? TEXT.grey : TEXT.ink),
          )
          .setOrigin(0.5),
      );
      if (!on)
        bg.setInteractive({ useHandCursor: true }).on('pointerup', () => {
          this.sfx(SFX.tab);
          this.goTo(stall);
        });
    });
  }

  // ---- The storefront and the menu -----------------------------------------------------------------

  private showStall(): void {
    const stall = this.stall;
    this.front.removeAll(true);
    this.steam?.remove();
    this.steam = null;
    const F = FRONT;
    const L = LAYOUT[stall];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.front.add(o);
      return o;
    };
    add(this.add.image(F.x, F.y, `front_${stall}`).setOrigin(0).setCrop(0, 0, F.w, F.h));

    const name = t(`pupLagoon.stall.${stall}`);
    const maxW = L.style === 'row' ? 184 : 300;
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

    const items = MENU.filter((m) => m.stall === stall && m.orderable !== false);
    items.forEach((m, i) => {
      const [x, y] = L.items[i] ?? [0, 0];
      const e = purchaseEffect(m.key, undefined, this.gen.promo);
      const sold = this.vacant.isSoldOut(m.key);
      const tag = this.add
        .text(
          x + 2,
          F.y + y + 34,
          sold ? t('pupLagoon.board.soldOut') : `₱${e.price}`,
          textStyle(8, sold ? TEXT.grey : TEXT.red),
        )
        .setOrigin(0.5);
      add(this.add.nineslice(x, F.y + y + 34, 'ui_tag', undefined, tag.width + 12, 13, 5, 3, 3, 3));
      add(tag);
    });

    if (this.order.length > 1) {
      for (const dir of [-1, 1] as const) {
        add(
          new Button(
            this,
            dir < 0 ? 14 : VIEW.mapRight - 14,
            F.y + F.h / 2,
            dir < 0 ? '<' : '>',
            () => this.flip(dir),
            {
              width: 20,
              height: 32,
              fontSize: 16,
            },
          ),
        );
      }
    }

    // The menu: tap a row to add the food to the tray.
    add(this.add.rectangle(VIEW.mapRight / 2, F.menuY - 2, VIEW.mapRight, 1, 0xc9c0aa));
    if (stall === 'water') {
      add(
        this.add.text(
          10,
          F.menuY + 6,
          t('pupLagoon.front.refillHint'),
          textStyle(8, TEXT.ink, { wordWrap: { width: 490 } }),
        ),
      );
    }
    items.forEach((m, i) => {
      if (stall === 'water') return;
      const e = purchaseEffect(m.key, undefined, this.gen.promo);
      const sold = this.vacant.isSoldOut(m.key);
      const x = 4 + (i % 2) * 254;
      const y = F.menuY + Math.floor(i / 2) * F.menuRowH;
      const row = add(
        this.add.rectangle(x + 125, y + 11, 250, F.menuRowH - 2, 0xffffff, 0.001).setOrigin(0.5),
      );
      if (!sold) {
        row.setInteractive({ useHandCursor: true });
        row.on('pointerover', () => row.setFillStyle(0xfff4dc, 0.9));
        row.on('pointerout', () => row.setFillStyle(0xffffff, 0.001));
        row.on('pointerup', () => this.addFood(m.key));
      }
      const color = sold ? TEXT.grey : TEXT.ink;
      add(this.add.image(x + 14, y + 11, `food_${m.key}`).setAlpha(sold ? 0.4 : 1));
      add(this.add.text(x + 30, y + 1, t(m.nameKey), textStyle(8, color)));
      add(
        this.add
          .text(
            x + 220,
            y + 1,
            sold ? t('pupLagoon.board.soldOut') : `₱${e.price}`,
            textStyle(8, sold ? TEXT.grey : TEXT.red),
          )
          .setOrigin(1, 0),
      );
      add(
        this.add.text(
          x + 30,
          y + 12,
          t('pupLagoon.board.busog', { n: e.busog * e.copies }),
          textStyle(8, TEXT.grey),
        ),
      );
      if (!sold) {
        add(this.add.circle(x + 238, y + 11, 8, COLORS.yellow).setStrokeStyle(1, COLORS.ink));
        add(this.add.text(x + 238, y + 11, '+', textStyle(8, TEXT.red)).setOrigin(0.5));
      }
      const lines = sold ? [] : this.openLinesTicked(m.key);
      if (lines.length) {
        const badge = this.add.text(
          x + 98,
          y + 12,
          lines.map((l) => lineText(l)).join(' + '),
          textStyle(8, TEXT.cream),
        );
        add(
          this.add
            .rectangle(x + 84, y + 11, badge.width + 20, 11, 0x3a9a6a)
            .setOrigin(0, 0)
            .setStrokeStyle(1, 0x2b5a3a),
        );
        add(this.add.image(x + 91, y + 16, 'ui_check', 1));
        add(badge);
      }
    });

    if (!this.reduced && L.steam.length) {
      this.steam = this.time.addEvent({
        delay: F.steamMs,
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
    this.drawTabs();
    this.drawTray();
  }

  /** The listahan lines, still open, that this food would tick. */
  private openLinesTicked(item: string): ListahanLine[] {
    const m = MENU.find((x) => x.key === item);
    const sauces: (Sawsawan | undefined)[] = m?.needsSawsawan
      ? ['matamis', 'maanghang', 'suka']
      : [undefined];
    return this.gen.lines.filter(
      (l) =>
        !this.vacant.listahan.isLineDone(l.id) &&
        sauces.some((s) => ticksLine(l, purchaseEffect(item, s, this.gen.promo))),
    );
  }

  // ---- Ordering ------------------------------------------------------------------------------------

  private addFood(item: string, sauce?: Sawsawan): void {
    if (this.modal || this.ended) return;
    const m = MENU.find((x) => x.key === item);
    if (m?.needsSawsawan && !sauce) {
      this.pickSauce(item);
      return;
    }
    const r = this.vacant.addToOrder(item, { sauce });
    if (!r.ok) {
      this.note =
        r.reason === 'trayFull'
          ? t('pupLagoon.tray.full')
          : r.reason === 'grilling'
            ? t('pupLagoon.front.grilling')
            : t('pupLagoon.tray.cannot');
      this.sfx(SFX.error);
    } else {
      this.note = '';
      this.sfx(SFX.add);
    }
    this.drawTray();
    this.drawTabs();
  }

  private pickSauce(item: string): void {
    const c = this.add.container(VIEW.mapRight / 2, FRONT.y + 110).setDepth(60);
    c.add(this.add.rectangle(0, 82, VIEW.mapRight, 336, COLORS.ink, 0.35).setInteractive());
    c.add(panel(this, 0, 0, 300, 96));
    c.add(
      this.add.text(0, -34, t('pupLagoon.sauce.title'), textStyle(16, TEXT.red)).setOrigin(0.5),
    );
    (['matamis', 'maanghang', 'suka'] as const).forEach((s, i) => {
      const jar = ['#8a4a22', '#d94b3d', '#efe6cc'][i];
      c.add(
        this.add
          .rectangle(-96 + i * 96, -4, 18, 20, Phaser.Display.Color.HexStringToColor(jar).color)
          .setStrokeStyle(1, COLORS.ink),
      );
      c.add(
        new Button(
          this,
          -96 + i * 96,
          26,
          t(`pupLagoon.sauce.${s}`),
          () => {
            c.destroy();
            this.modal = null;
            this.addFood(item, s);
          },
          { width: 88, height: 18 },
        ),
      );
    });
    c.add(
      new Button(
        this,
        136,
        -36,
        'x',
        () => {
          c.destroy();
          this.modal = null;
        },
        { width: 18, height: 16 },
      ),
    );
    this.modal = c;
  }

  /** The tray, the total, the money left, the hint, Bayad and Kain na!. */
  private drawTray(): void {
    this.tray.removeAll(true);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.tray.add(o);
      return o;
    };
    const y0 = FRONT.trayY;
    add(
      this.add.rectangle(
        VIEW.mapRight / 2,
        y0 + FRONT.trayH / 2,
        VIEW.mapRight,
        FRONT.trayH,
        0x3a3346,
      ),
    );
    // The steel tray with the chosen food (tap one to put it back).
    add(this.add.rectangle(126, y0 + 15, 244, 26, 0xc9d1d9).setStrokeStyle(1, 0x8a929c));
    const orderList = this.vacant.currentOrder;
    if (!orderList.length && this.stall !== 'water')
      add(
        this.add
          .text(126, y0 + 15, t('pupLagoon.tray.empty'), textStyle(8, TEXT.grey))
          .setOrigin(0.5),
      );
    orderList.forEach((o, i) => {
      const icon = add(
        this.add
          .image(18 + i * 30, y0 + 15, `food_${o.item}`)
          .setInteractive({ useHandCursor: true }),
      );
      icon.on('pointerup', () => {
        if (this.modal) return;
        this.vacant.removeFromOrder(i);
        this.sfx(SFX.remove);
        this.drawTray();
        this.drawTabs();
      });
    });
    const total = this.vacant.orderTotal();
    const money = this.vacant.wallet.total;
    add(
      this.add
        .text(244, y0 + 9, t('pupLagoon.tray.total', { total }), textStyle(8, TEXT.red))
        .setOrigin(1, 0.5),
    );
    add(
      this.add
        .text(
          244,
          y0 + 21,
          t('pupLagoon.tray.money', { money }),
          textStyle(8, total > money ? TEXT.red : TEXT.ink),
        )
        .setOrigin(1, 0.5),
    );
    const hint =
      this.note ||
      (this.vacant.isGrilling
        ? t('pupLagoon.front.grilling')
        : this.stall === 'water'
          ? t('pupLagoon.front.refillHint')
          : orderList.length
            ? t('pupLagoon.front.hintPay')
            : t('pupLagoon.front.hintBuy'));
    add(
      this.add
        .text(
          8,
          y0 + 36,
          hint,
          textStyle(8, this.note ? TEXT.gold : TEXT.cream, { wordWrap: { width: 290 } }),
        )
        .setOrigin(0, 0.5),
    );
    if (this.stall === 'water') {
      add(
        new Button(this, 322, y0 + 26, t('pupLagoon.front.refill'), () => this.refill(), {
          width: 92,
          height: 22,
          fill: COLORS.yellow,
          textColor: TEXT.red,
        }),
      );
    } else {
      const pay = add(
        new Button(this, 322, y0 + 26, t('pupLagoon.ui.pay', { total }), () => this.openPayment(), {
          width: 92,
          height: 22,
          fill: COLORS.yellow,
          textColor: TEXT.red,
        }),
      );
      pay.setEnabled(orderList.length > 0 && !this.vacant.isGrilling);
    }
    const eat = add(
      new Button(this, 446, y0 + 26, t('pupLagoon.ui.eat'), () => this.eat(), {
        width: 112,
        height: 22,
        fill: 0x3a9a6a,
        textColor: TEXT.cream,
      }),
    );
    eat.setEnabled(this.vacant.canEat() && !this.locked);
  }

  // ---- Paying --------------------------------------------------------------------------------------

  private openPayment(): void {
    if (this.modal || this.ended || !this.vacant.currentOrder.length) return;
    const total = this.vacant.orderTotal();
    const short = overspend(total, this.vacant.wallet.total);
    if (short > 0) {
      // Owner rule: buying more than your baon is game over.
      this.lose({ kind: 'overspent', short });
      return;
    }
    this.placed = emptyMoney();
    this.sfx(SFX.page);
    this.drawPayment('');
  }

  private drawPayment(message: string): void {
    this.modal?.destroy();
    const c = this.add.container(0, 0).setDepth(60);
    this.modal = c;
    c.add(
      this.add
        .rectangle(VIEW.mapRight / 2, 192, VIEW.mapRight, 336, COLORS.ink, 0.45)
        .setInteractive(),
    );
    c.add(panel(this, VIEW.mapRight / 2, 186, 480, 280));
    const total = this.vacant.orderTotal();
    const placedTotal = moneyTotal(this.placed);
    c.add(this.add.text(36, 60, t('pupLagoon.pay.title'), textStyle(16, TEXT.red)));
    c.add(
      this.add
        .text(476, 64, t('pupLagoon.pay.total', { total }), textStyle(16, TEXT.ink))
        .setOrigin(1, 0),
    );
    // The counter mat: placed money (tap to take it back).
    c.add(
      this.add.rectangle(VIEW.mapRight / 2, 120, 440, 50, 0xb8925a).setStrokeStyle(1, 0x6b4f36),
    );
    c.add(this.add.text(42, 98, t('pupLagoon.pay.counter'), textStyle(8, TEXT.cream)));
    let x = 44;
    for (const d of toPieces(this.placed)) {
      const img = this.add
        .image(x, 126, COIN_KEY[d])
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true });
      c.add(img);
      img.on('pointerup', () => {
        this.placed = subMoney(this.placed, { ...emptyMoney(), [d]: 1 });
        this.sfx(d >= 50 ? SFX.bill : SFX.coin);
        this.drawPayment('');
      });
      x += img.width + 4;
    }
    // Total, placed and sukli (or what is still missing).
    const info =
      placedTotal >= total
        ? t('pupLagoon.pay.change', { placed: placedTotal, change: placedTotal - total })
        : t('pupLagoon.pay.short', { placed: placedTotal, short: total - placedTotal });
    c.add(
      this.add
        .text(
          VIEW.mapRight / 2,
          158,
          info,
          textStyle(8, placedTotal >= total ? TEXT.ink : TEXT.red),
        )
        .setOrigin(0.5),
    );
    // The wallet: money not yet placed (tap to place it).
    c.add(this.add.text(42, 174, t('pupLagoon.pay.wallet'), textStyle(8, TEXT.grey)));
    const left = subMoney(this.vacant.wallet.money, this.placed);
    let wx = 44;
    let wy = 196;
    for (const d of toPieces(left)) {
      const probe = this.textures.getFrame(COIN_KEY[d]);
      if (wx + probe.width > 470) {
        wx = 44;
        wy += 24;
      }
      const img = this.add
        .image(wx, wy, COIN_KEY[d])
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true });
      c.add(img);
      img.on('pointerup', () => {
        this.placed = addMoney(this.placed, { ...emptyMoney(), [d]: 1 });
        this.sfx(d >= 50 ? SFX.bill : SFX.coin);
        this.drawPayment('');
      });
      wx += img.width + 4;
    }
    c.add(
      this.add
        .text(
          VIEW.mapRight / 2,
          254,
          message || t('pupLagoon.pay.hint'),
          textStyle(8, message ? TEXT.red : TEXT.grey, {
            align: 'center',
            wordWrap: { width: 440 },
          }),
        )
        .setOrigin(0.5),
    );
    c.add(
      new Button(
        this,
        86,
        296,
        t('pupLagoon.pay.smart'),
        () => {
          const s = this.vacant.smartPay();
          if (s) this.placed = s;
          this.sfx(SFX.coin);
          this.drawPayment('');
        },
        { width: 96, height: 20 },
      ),
    );
    c.add(
      new Button(
        this,
        194,
        296,
        t('pupLagoon.pay.clear'),
        () => {
          this.placed = emptyMoney();
          this.drawPayment('');
        },
        { width: 104, height: 20 },
      ),
    );
    c.add(
      new Button(this, 320, 296, t('pupLagoon.pay.go'), () => this.pay(), {
        width: 120,
        height: 22,
        fill: COLORS.yellow,
        textColor: TEXT.red,
        fontSize: 16,
      }).setEnabled(placedTotal >= total),
    );
    c.add(
      new Button(this, 436, 296, t('ui.close'), () => this.closeModal(), { width: 64, height: 20 }),
    );
  }

  private closeModal(): void {
    this.modal?.destroy();
    this.modal = null;
    this.placed = emptyMoney();
  }

  private pay(): void {
    const r = this.vacant.pay(this.placed);
    if (!r.ok) {
      this.sfx(SFX.error);
      this.drawPayment(
        r.reason === 'walangPanukli'
          ? t('pupLagoon.pay.noChange')
          : r.reason === 'kulang'
            ? t('pupLagoon.pay.short', { placed: moneyTotal(this.placed), short: r.short ?? 0 })
            : t('pupLagoon.tray.cannot'),
      );
      return;
    }
    this.closeModal();
    const change = moneyTotal(r.change);
    this.sfx(SFX.pay);
    if (change > 0) this.time.delayedCall(350, () => this.sfx(SFX.sukli));
    this.note = t('pupLagoon.pay.thanks', { change });
    this.drawHud();
    this.showStall();
    this.popText(t('pupLagoon.pay.thanks', { change }));
    // Owner rule: if the money left cannot buy anything still needed, the vacant is lost.
    const open = new Set(this.vacant.gen.open);
    const openLines = this.gen.lines.filter((l) => !this.vacant.listahan.isLineDone(l.id));
    const cheapest = cheapestNeed(openLines, open, this.owned, this.gen.promo, (i) =>
      this.vacant.isSoldOut(i),
    );
    const stuck = judgeStuck(
      this.gen.lines,
      (id) => this.vacant.listahan.isLineDone(id),
      this.vacant.wallet.total,
      cheapest,
    );
    if (stuck) this.time.delayedCall(900, () => this.lose(stuck));
  }

  private refill(): void {
    if (this.vacant.refillTumbler().ok) {
      this.sfx(SFX.pay);
      this.drawHud();
    } else {
      this.note = t('pupLagoon.front.refillUsed');
      this.sfx(SFX.error);
    }
    this.drawTray();
  }

  private popText(text: string): void {
    const pop = this.add
      .text(
        VIEW.mapRight / 2,
        FRONT.y + 110,
        text,
        textStyle(16, TEXT.cream, { backgroundColor: '#3A9A6A', padding: { x: 8, y: 4 } }),
      )
      .setOrigin(0.5)
      .setDepth(70);
    this.tweens.add({
      targets: pop,
      y: pop.y - 24,
      alpha: 0,
      delay: 700,
      duration: 700,
      onComplete: () => pop.destroy(),
    });
  }

  // ---- Ending --------------------------------------------------------------------------------------

  private eat(): void {
    if (this.modal || this.ended || !this.vacant.canEat() || this.locked) return;
    const verdict = judgeFinish(this.gen.lines, (id) => this.vacant.listahan.isLineDone(id));
    if (verdict.kind !== 'win') {
      this.lose(verdict);
      return;
    }
    this.ended = true;
    const result = this.vacant.finish();
    this.leave({ verdict, result });
  }

  private lose(verdict: Verdict): void {
    if (this.ended) return;
    this.ended = true;
    this.closeModal();
    this.leave({ verdict, result: null });
  }

  private leave(data: {
    verdict: Verdict;
    result: ReturnType<LagoonVacant['finish']> | null;
  }): void {
    this.cameras.main.fadeOut(FADE_MS, 0x2b, 0x22, 0x33);
    this.cameras.main.once('camerafadeoutcomplete', () =>
      this.scene.start(LAGOON_RESULT, { ...data, gen: this.gen }),
    );
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
    this.add
      .text(
        150,
        VIEW.topBar.h / 2,
        t('pupLagoon.hud.rule', { baon: g.def.baon }),
        textStyle(8, TEXT.gold),
      )
      .setOrigin(0, 0.5)
      .setDepth(81);
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
    add(this.add.rectangle(576, 192, 128, 336, 0x9a7650));
    for (let i = 0; i < 220; i++)
      add(
        this.add.rectangle(
          513 + ((i * 37) % 126),
          25 + ((i * 53) % 334),
          1,
          1,
          i % 3 ? 0x7e5e3e : 0xb08a60,
        ),
      );
    const pin = (x: number, y: number): void => {
      add(this.add.circle(x + 1, y + 1, 3, 0x000000, 0.3));
      add(this.add.circle(x, y, 3, COLORS.red).setStrokeStyle(1, COLORS.ink));
      add(this.add.rectangle(x - 1, y - 1, 1, 1, 0xffffff));
    };
    const Lh = VIEW.listahan;
    add(this.add.image(Lh.x, Lh.y, 'note_hud').setOrigin(0));
    add(this.add.text(Lh.x + 16, Lh.y + 9, t('pupLagoon.hud.listahan'), textStyle(8, TEXT.grey)));
    let y = Lh.y + 24;
    for (const line of v.gen.lines) {
      const done = v.listahan.isLineDone(line.id);
      const units = line.qty > 1 ? ` ${v.listahan.doneUnits(line.id)}/${line.qty}` : '';
      add(this.add.image(Lh.x + 19, y + 5, 'ui_check', done ? 1 : 0));
      const text = add(
        this.add.text(
          Lh.x + 27,
          y,
          `${lineText(line)}${units}`,
          textStyle(8, done ? TEXT.grey : TEXT.ink, { wordWrap: { width: Lh.w - 36 } }),
        ),
      );
      if (done)
        add(this.add.rectangle(Lh.x + 27, y + 5, text.width, 1, 0x8a8494).setOrigin(0, 0.5));
      y += Math.max(12, text.height + 2);
    }
    const B = VIEW.busog;
    add(panel(this, B.x + B.w / 2, B.y + B.h / 2, B.w, B.h));
    pin(B.x + B.w / 2, B.y + 3);
    add(
      this.add.text(
        B.x + 8,
        B.y + 6,
        t('pupLagoon.hud.busog', { n: v.busog, target: v.gen.busogTarget }),
        textStyle(8),
      ),
    );
    bowlRow(this, add, B.x + 8, B.y + 26, v.busog, v.gen.busogTarget);
    const W = VIEW.wallet;
    add(panel(this, W.x + W.w / 2, W.y + W.h / 2, W.w, W.h));
    pin(W.x + W.w / 2, W.y + 3);
    add(
      this.add.text(
        W.x + 8,
        W.y + 6,
        t('pupLagoon.hud.wallet', { total: moneyTotal(v.wallet.money) }),
        textStyle(8),
      ),
    );
    walletGrid(this, add, W.x + 8, W.y + 32, v.wallet.money, 56);
  }

  // ---- Keys and pause ----------------------------------------------------------------------------

  private bindKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    STALL_KEYS_ORDER.forEach((stall, i) =>
      kb.on(
        `keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT'][i]}`,
        () => {
          if (this.order.includes(stall)) this.goTo(stall);
        },
      ),
    );
    kb.on('keydown-LEFT', () => {
      if (!this.modal) this.flip(-1);
    });
    kb.on('keydown-RIGHT', () => {
      if (!this.modal) this.flip(1);
    });
    kb.on('keydown-B', () => (this.modal ? undefined : this.openPayment()));
    kb.on('keydown-S', () => {
      if (!this.modal || !this.vacant.currentOrder.length) return;
      const s = this.vacant.smartPay();
      if (s) this.placed = s;
      this.drawPayment('');
    });
    kb.on('keydown-ENTER', () => {
      if (
        this.modal &&
        moneyTotal(this.placed) >= this.vacant.orderTotal() &&
        this.vacant.currentOrder.length
      )
        this.pay();
    });
    kb.on('keydown-K', () => this.eat());
    kb.on('keydown-ESC', () => {
      if (this.modal) this.closeModal();
    });
    kb.on('keydown-P', () => this.pause());
    this.events.once('shutdown', () => kb.removeAllListeners());
  }

  private pause(): void {
    openOverlay(this, PAUSE);
  }
}
