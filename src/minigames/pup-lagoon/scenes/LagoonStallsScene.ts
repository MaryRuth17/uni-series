/**
 * LagoonStallsScene — buying merienda at the Lagoon, one stall at a time (DECISIONS L-026, L-030, L-032–L-035, L-038)
 * Shows: tabs with every stall along the top; the stall banner, laid out like the owner's photo of a Lagoon
 * stall (a calm wall, the vendor in a small window, the name board, the printed promo sign, the counter's
 * edge); the menu as cards, each food once (picture, name, price tag, busog, and a green strip naming the
 * listahan line it ticks; tap a card to add it); one help line; the tray bar (one slot per item the tray
 * holds, the total over the money left, Bayad and Kain na!); the payment view (tap coins and bills onto the
 * counter, see the total, what is placed and the sukli, Smart pay, Heto po!); the sawsawan picker for tusok
 * food; the top bar and the cork-board HUD (listahan, busog, wallet). There is no pila: a stall's counter is
 * always free. The owner's rules (L-034): an order that costs more than the money left, finishing with the
 * listahan unfinished, or money that can no longer buy anything still needed, is game over
 * (LagoonResultScene). Every tap makes one sound (L-037). The guided round (L-039) rings what to tap next
 * and explains it in a speech bubble: on for the first vacant, toggled by the Guide button.
 * Listens to: pointer; keyboard (1–0 stalls, ← / → previous / next, B = Bayad, K = Kain na!, Esc = close,
 * P = pause); LagoonVacant events (paid, ticked, grillDone, soldOut); the frame update (grill, ≤ 100 ms).
 */
import Phaser from 'phaser';
import { sceneConfig } from '../../../ui/view';
import { hasKey, t } from '../../../core/i18n';
import { services } from '../../../core/services';
import { FADE_MS } from '../../../home/config';
import { Button } from '../../../ui/Button';
import { openOverlay } from '../../../ui/overlay';
import { panel } from '../../../ui/Panel';
import { COLORS, TEXT, textStyle } from '../../../ui/theme';
import { PAUSE } from '../../../scenes/PauseScene';
import {
  FRONT,
  LAGOON_AMBIENCE,
  LAGOON_MUSIC,
  SFX,
  STALL_COUNTER,
  STALL_KEYS_ORDER,
  VIEW,
  VISIT,
} from '../config';
import { MENU } from '../data/menu';
import storefronts from '../data/storefronts.json';
import { lineText, loadProgress } from '../lagoonSave';
import { purchaseEffect } from '../logic/Catalog';
import { Guide, type GuideStep } from '../logic/Guide';
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
  /** Top-left of the vendor sprite (20×28 drawn at 3×) in the front art; null at the water station. */
  vendor: number[] | null;
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
  private modalKind: 'sauce' | 'pay' | null = null;
  private sauceFor: string | null = null;
  /** The guided round (L-039): on for the first vacant, toggled by the Guide button. */
  private guide: Guide | null = null;
  private guideLayer!: Phaser.GameObjects.Container;
  private guideTweens: Phaser.Tweens.Tween[] = [];
  private lastGuideKind: GuideStep['kind'] | null = null;
  private placed: Money = emptyMoney();
  private note = '';
  private ended = false;

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
    this.modalKind = null;
    this.sauceFor = null;
    this.guideLayer = this.add.container(0, 0).setDepth(95);
    this.guideTweens = [];
    this.lastGuideKind = null;
    this.guide =
      this.gen.def.special === 'tutorial' &&
      !services().save.data.settings.tutorialSeen['pup-lagoon']
        ? new Guide(this.gen.route.complete)
        : null;
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
      const tabFont = this.order.length >= 10 ? 7 : 8;
      this.tabs.add(
        this.add
          .text(
            x + w / 2,
            y + FRONT.tabsH / 2,
            t(`pupLagoon.tab.${stall}`),
            textStyle(tabFont, on ? TEXT.red : dim ? TEXT.grey : TEXT.ink),
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

  // ---- The stall: banner and menu cards (L-038) -------------------------------------------------------

  /**
   * One stall, laid out like the owner's photo of a Lagoon stall: a calm banner (vendor, name board, promo
   * sign, counter) over the menu, where every food appears once as a card. Nothing else moves.
   */
  private showStall(): void {
    const stall = this.stall;
    this.front.removeAll(true);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.front.add(o);
      return o;
    };
    this.drawBanner(stall, add);

    const items = MENU.filter((m) => m.stall === stall && m.orderable !== false);
    if (stall === 'water') {
      const C = FRONT.cards;
      add(panel(this, VIEW.mapRight / 2, C.y + C.h / 2, 300, C.h));
      add(this.add.image(VIEW.mapRight / 2 - 110, C.y + C.h / 2, 'food_tumbler_water').setScale(2));
      add(
        this.add
          .text(
            VIEW.mapRight / 2 - 76,
            C.y + C.h / 2,
            t('pupLagoon.front.refillHint'),
            textStyle(8, TEXT.ink, { wordWrap: { width: 200 } }),
          )
          .setOrigin(0, 0.5),
      );
    } else {
      items.forEach((m, i) => this.drawCard(m, i, add));
    }
    this.drawTabs();
    this.drawTray();
  }

  /** The banner: wall, vendor window, name board, printed promo sign, and the counter's edge. */
  private drawBanner(
    stall: StallKey,
    add: <T extends Phaser.GameObjects.GameObject>(o: T) => T,
  ): void {
    const B = FRONT.banner;
    const counter = STALL_COUNTER[stall];
    add(this.add.rectangle(0, B.y, VIEW.mapRight, B.h, B.wall).setOrigin(0));
    // The vendor (or, at the water station, the dispenser) in a small framed window.
    const L = LAYOUT[stall];
    const [vx, vy] = L.vendor ? [L.vendor[0] + 2, L.vendor[1] + 18] : [226, 20];
    const V = B.vendor;
    const wy = B.y + 4;
    add(
      this.add
        .image(V.x - vx, wy - vy, `front_${stall}`)
        .setOrigin(0)
        .setCrop(vx, vy, V.w, V.h),
    );
    add(this.add.rectangle(V.x, wy, V.w, V.h).setOrigin(0).setStrokeStyle(1, COLORS.ink));
    // The name board: cream lettering on an ink board with a gold edge (8 px if 16 px would not fit).
    const name = t(`pupLagoon.stall.${stall}`);
    let label = this.add.text(VIEW.mapRight / 2 - 30, B.y + 28, name, textStyle(16, TEXT.cream));
    if (label.width > 240) {
      label.destroy();
      label = this.add.text(VIEW.mapRight / 2 - 30, B.y + 28, name, textStyle(8, TEXT.cream));
    }
    label.setOrigin(0.5);
    add(
      this.add
        .rectangle(label.x, label.y, label.width + 24, label.height + 10, COLORS.ink)
        .setStrokeStyle(1, COLORS.gold),
    );
    add(label);
    // The printed promo sign, when the stall has one (rice meal deal, halo-halo, silog).
    const signKey = `pupLagoon.front.sign.${stall}`;
    if (hasKey(signKey)) {
      const S = B.sign;
      const text = this.add
        .text(
          S.x + S.w / 2,
          B.y + 26,
          t(signKey),
          textStyle(8, TEXT.red, { align: 'center', wordWrap: { width: S.w - 8 } }),
        )
        .setOrigin(0.5);
      add(
        this.add
          .rectangle(S.x, text.y - text.height / 2 - 3, S.w, text.height + 6, 0xffffff)
          .setOrigin(0)
          .setStrokeStyle(1, 0xb8a888),
      );
      add(text);
    }
    // The counter's edge, in the stall's own colour.
    const cy = B.y + B.h - B.counterH;
    add(this.add.rectangle(0, cy, VIEW.mapRight, B.counterH, counter).setOrigin(0));
    add(this.add.rectangle(0, cy, VIEW.mapRight, 1, COLORS.ink).setOrigin(0));
  }

  /**
   * One food card: the picture at 2×, the name, the price tag and busog. A green strip names the listahan
   * line it would tick. Tap anywhere on the card to add it to the tray.
   */
  private drawCard(
    m: (typeof MENU)[number],
    i: number,
    add: <T extends Phaser.GameObjects.GameObject>(o: T) => T,
  ): void {
    const C = FRONT.cards;
    const x = C.left + (i % C.cols) * (C.w + C.gapX);
    const y = C.y + Math.floor(i / C.cols) * (C.h + C.gapY);
    const e = purchaseEffect(m.key, undefined, this.gen.promo);
    const sold = this.vacant.isSoldOut(m.key);
    const card = add(panel(this, x + C.w / 2, y + C.h / 2, C.w, C.h));
    const parts: Phaser.GameObjects.GameObject[] = [];
    const put = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      parts.push(o);
      return add(o);
    };
    put(this.add.image(x + 32, y + 38, `food_${m.key}`).setScale(2));
    put(
      this.add.text(
        x + 62,
        y + 8,
        t(m.nameKey),
        textStyle(8, TEXT.ink, { wordWrap: { width: C.w - 68 } }),
      ),
    );
    const price = this.add
      .text(
        x + 62 + 6,
        y + 47,
        sold ? t('pupLagoon.board.soldOut') : `₱${e.price}`,
        textStyle(8, sold ? TEXT.grey : TEXT.red),
      )
      .setOrigin(0, 0.5);
    put(
      this.add
        .nineslice(x + 62, y + 47, 'ui_tag', undefined, price.width + 12, 13, 5, 3, 3, 3)
        .setOrigin(0, 0.5),
    );
    put(price);
    put(
      this.add.text(
        x + 62,
        y + 58,
        t('pupLagoon.board.busog', { n: e.busog * e.copies }),
        textStyle(8, TEXT.grey),
      ),
    );
    const lines = sold ? [] : this.openLinesTicked(m.key);
    if (lines.length) {
      put(
        this.add
          .rectangle(x + 3, y + C.h - 17, C.w - 6, 13, COLORS.success)
          .setOrigin(0)
          .setStrokeStyle(1, COLORS.successEdge),
      );
      put(this.add.image(x + 11, y + C.h - 10, 'ui_check', 1));
      put(
        this.add
          .text(
            x + 20,
            y + C.h - 10,
            lines.map((l) => lineText(l)).join(' + '),
            textStyle(8, TEXT.cream),
          )
          .setOrigin(0, 0.5),
      );
    }
    if (sold) {
      card.setAlpha(0.5);
      for (const o of parts) (o as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(0.45);
      return;
    }
    card.setInteractive({ useHandCursor: true });
    card.on('pointerover', () => card.setTint(0xe5e5e5));
    card.on('pointerout', () => card.setTint(0xffffff));
    card.on('pointerup', () => this.addFood(m.key));
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
    this.modalKind = 'sauce';
    this.sauceFor = item;
    this.sfx(SFX.tab); // the card tap opens the picker: one soft tap sound
    const c = this.add.container(VIEW.mapRight / 2, FRONT.cards.y + 50).setDepth(60);
    c.add(
      this.add
        .rectangle(0, 192 - (FRONT.cards.y + 50), VIEW.mapRight, 336, COLORS.ink, 0.35)
        .setInteractive(),
    );
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
            this.modalKind = null;
            this.sauceFor = null;
            this.addFood(item, s);
          },
          { width: 88, height: 18, sound: null }, // addFood() plays sfx_add
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
          this.modalKind = null;
          this.sauceFor = null;
          this.updateGuide();
        },
        { width: 18, height: 16 },
      ),
    );
    this.modal = c;
    this.updateGuide();
  }

  /**
   * The help line, then the tray bar: one slot per item the tray holds (tap food to put it back), the total
   * over the money left, Bayad and Kain na!.
   */
  private drawTray(): void {
    this.tray.removeAll(true);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.tray.add(o);
      return o;
    };
    const orderList = this.vacant.currentOrder;
    // The help line (a warning in red when there is one).
    const I = FRONT.info;
    add(this.add.rectangle(0, I.y, VIEW.mapRight, I.h, I.fill).setOrigin(0));
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
        .text(VIEW.mapRight / 2, I.y + I.h / 2, hint, textStyle(8, this.note ? TEXT.red : TEXT.ink))
        .setOrigin(0.5),
    );

    const y0 = FRONT.trayY;
    const mid = y0 + FRONT.trayH / 2;
    add(this.add.rectangle(0, y0, VIEW.mapRight, FRONT.trayH, 0x3a3346).setOrigin(0));
    const S = FRONT.slot;
    for (let i = 0; i < VISIT.maxItems; i++) {
      const sx = 8 + i * (S + 4);
      add(
        this.add
          .rectangle(sx, mid - S / 2, S, S, 0xc9d1d9)
          .setOrigin(0)
          .setStrokeStyle(1, 0x8a929c),
      );
      const o = orderList[i];
      if (!o) continue;
      const icon = add(
        this.add.image(sx + S / 2, mid, `food_${o.item}`).setInteractive({ useHandCursor: true }),
      );
      icon.on('pointerup', () => {
        if (this.modal) return;
        this.vacant.removeFromOrder(i);
        this.sfx(SFX.remove);
        this.drawTray();
        this.drawTabs();
      });
    }
    const total = this.vacant.orderTotal();
    const money = this.vacant.wallet.total;
    const tx = 8 + VISIT.maxItems * (S + 4) + 6;
    add(
      this.add
        .text(tx, mid - 7, t('pupLagoon.tray.total', { total }), textStyle(8, TEXT.cream))
        .setOrigin(0, 0.5),
    );
    add(
      this.add
        .text(
          tx,
          mid + 7,
          t('pupLagoon.tray.money', { money }),
          textStyle(8, total > money ? TEXT.red : TEXT.gold),
        )
        .setOrigin(0, 0.5),
    );
    if (this.stall === 'water') {
      add(
        new Button(this, 324, mid, t('pupLagoon.front.refill'), () => this.refill(), {
          width: 100,
          height: 24,
          fill: COLORS.yellow,
          textColor: TEXT.red,
          sound: null, // refill() plays its own sound
        }),
      );
    } else {
      const pay = add(
        new Button(this, 324, mid, t('pupLagoon.ui.pay', { total }), () => this.openPayment(), {
          width: 100,
          height: 24,
          fill: COLORS.yellow,
          textColor: TEXT.red,
          sound: null, // openPayment() plays the page sound
        }),
      );
      pay.setEnabled(orderList.length > 0 && !this.vacant.isGrilling);
    }
    const eat = add(
      new Button(this, 446, mid, t('pupLagoon.ui.eat'), () => this.eat(), {
        width: 112,
        height: 24,
        fill: COLORS.success,
        textColor: TEXT.cream,
      }),
    );
    eat.setEnabled(this.vacant.canEat() && !this.locked);
    this.updateGuide();
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
    this.modalKind = 'pay';
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
        { width: 96, height: 20, sound: null },
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
    this.updateGuide();
  }

  private closeModal(): void {
    this.modal?.destroy();
    this.modal = null;
    this.modalKind = null;
    this.sauceFor = null;
    this.placed = emptyMoney();
    this.updateGuide();
  }

  private pay(): void {
    const paidStall = this.stall;
    const items = this.vacant.currentOrder.map((o) => ({ item: o.item, sauce: o.sauce }));
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
    const change = moneyTotal(r.change);
    this.guide?.onPaid(paidStall, items, change);
    this.closeModal();
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
        FRONT.cards.y + 50,
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
        const y = FRONT.banner.y + ((i * 97) % (FRONT.info.y - FRONT.banner.y));
        rain.lineBetween(x, y, x - 2, y + 6);
      }
    }
    new Button(
      this,
      578,
      VIEW.topBar.h / 2,
      t('pupLagoon.guide.button'),
      () => this.toggleGuide(),
      {
        width: 48,
        height: 18,
      },
    ).setDepth(82);
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

  // ---- The guided round (L-039) --------------------------------------------------------------------

  private toggleGuide(): void {
    if (this.ended) return;
    if (this.guide) this.guide = null;
    else {
      this.guide = new Guide(this.gen.route.complete);
      // After buying, the proven plan no longer applies: give general tips instead.
      if (this.vacant.canEat()) this.guide.abandon();
    }
    this.updateGuide();
  }

  private clearGuideTweens(): void {
    for (const tw of this.guideTweens) tw.remove();
    this.guideTweens = [];
  }

  /** Redraw the guide: 4-panel spotlight dim, pulsing double ring, bouncing arrow, and speech bubble. */
  private updateGuide(): void {
    if (!this.guideLayer) return;
    this.clearGuideTweens();
    this.guideLayer.removeAll(true);
    const g = this.guide;
    if (!g || this.ended) {
      this.lastGuideKind = null;
      return;
    }
    const reduced = services().save.data.settings.reducedMotion;
    const s = g.step({
      stall: this.stall,
      order: this.vacant.currentOrder.map((o) => ({ item: o.item, sauce: o.sauce })),
      sauceFor: this.sauceFor,
      paying: this.modalKind === 'pay',
      placed: moneyTotal(this.placed),
      total: this.vacant.orderTotal(),
      grilling: this.vacant.isGrilling,
    });
    const isNewStep = this.lastGuideKind !== s.kind;
    this.lastGuideKind = s.kind;
    const target = this.guideTarget(s);

    // The bubble sits over the banner (shifted slightly for tab arrows), or over the tray bar while paying.
    const paying = this.modalKind === 'pay';
    const ack = s.kind === 'intro' || s.kind === 'sukli' || s.kind === 'offPlan';
    const B = paying
      ? { y: 317, h: 42 }
      : s.kind === 'tab'
        ? { y: 66, h: 52 }
        : { y: 42, h: ack ? 54 : 46 };

    // 1. 4-rectangle spotlight dim backdrop (leaves target bright and directly clickable).
    if (target) {
      const pad = 3;
      const tx = Math.max(0, target.x - pad);
      const ty = Math.max(0, target.y - pad);
      const tr = Math.min(640, target.x + target.w + pad);
      const tb = Math.min(360, target.y + target.h + pad);
      const dimAlpha = 0.54;
      if (ty > 0)
        this.guideLayer.add(this.add.rectangle(0, 0, 640, ty, COLORS.ink, dimAlpha).setOrigin(0));
      if (tb < 360)
        this.guideLayer.add(
          this.add.rectangle(0, tb, 640, 360 - tb, COLORS.ink, dimAlpha).setOrigin(0),
        );
      if (tx > 0 && tb > ty)
        this.guideLayer.add(
          this.add.rectangle(0, ty, tx, tb - ty, COLORS.ink, dimAlpha).setOrigin(0),
        );
      if (tr < 640 && tb > ty)
        this.guideLayer.add(
          this.add.rectangle(tr, ty, 640 - tr, tb - ty, COLORS.ink, dimAlpha).setOrigin(0),
        );

      // 2. Dual-layer pulsing highlight ring centered on the target.
      const cx = target.x + target.w / 2;
      const cy = target.y + target.h / 2;
      const outer = this.add
        .rectangle(cx, cy, target.w + 10, target.h + 10)
        .setStrokeStyle(3, COLORS.cream, 0.9);
      const inner = this.add
        .rectangle(cx, cy, target.w + 4, target.h + 4)
        .setStrokeStyle(2.5, COLORS.gold, 1);
      this.guideLayer.add([outer, inner]);
      if (!reduced) {
        if (isNewStep) {
          outer.setScale(1.14);
          inner.setScale(1.1);
          this.guideTweens.push(
            this.tweens.add({
              targets: [outer, inner],
              scale: 1,
              duration: 200,
              ease: 'Back.easeOut',
            }),
          );
        }
        this.guideTweens.push(
          this.tweens.add({
            targets: outer,
            scaleX: 1.06,
            scaleY: 1.06,
            alpha: 0.25,
            duration: 550,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          }),
          this.tweens.add({
            targets: inner,
            scaleX: 1.03,
            scaleY: 1.03,
            duration: 550,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          }),
        );
      }

      // 3. Bouncing directional pointer arrow pointing straight at the target.
      const arrow = this.makeGuideArrow(s.kind, target);
      this.guideLayer.add(arrow.obj);
      if (!reduced) {
        this.guideTweens.push(
          this.tweens.add({
            targets: arrow.obj,
            x: arrow.obj.x + arrow.dx,
            y: arrow.obj.y + arrow.dy,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          }),
        );
      }
    } else {
      this.guideLayer.add(this.add.rectangle(0, 0, 640, 360, COLORS.ink, 0.35).setOrigin(0));
    }

    // 4. Speech bubble (+ animated entrance on new step).
    const bubble = this.add.container(VIEW.mapRight / 2, B.y + B.h / 2);
    bubble.add(panel(this, 0, 0, VIEW.mapRight - 16, B.h));
    const leftEdge = -(VIEW.mapRight - 16) / 2 + 10;
    const canSkip = s.kind !== 'offPlan';
    const wrapWidth = ack ? (canSkip ? 316 : 400) : 388;
    bubble.add(
      this.add
        .text(
          leftEdge,
          0,
          this.guideText(s),
          textStyle(8, TEXT.ink, { wordWrap: { width: wrapWidth } }),
        )
        .setOrigin(0, 0.5),
    );
    if (canSkip) {
      const skipX = ack ? 128 : 200;
      bubble.add(
        new Button(
          this,
          skipX,
          0,
          t('pupLagoon.guide.skip'),
          () => {
            services().settings.setTutorialSeen('pup-lagoon', true);
            this.guide = null;
            this.updateGuide();
          },
          { width: 80, height: 20 },
        ),
      );
    }
    if (ack) {
      const nextBtn = new Button(
        this,
        (VIEW.mapRight - 16) / 2 - 40,
        0,
        t(s.kind === 'offPlan' ? 'pupLagoon.guide.ok' : 'pupLagoon.guide.next'),
        () => {
          if (s.kind === 'intro') g.ackIntro();
          else if (s.kind === 'sukli') g.ackSukli();
          else this.guide = null;
          this.updateGuide();
        },
        { width: 64, height: 22, fill: COLORS.yellow, textColor: TEXT.red },
      );
      bubble.add(nextBtn);
      if (!reduced) {
        this.guideTweens.push(
          this.tweens.add({
            targets: nextBtn,
            scaleX: 1.06,
            scaleY: 1.06,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          }),
        );
      }
    }
    this.guideLayer.add(bubble);
    if (!reduced && isNewStep) {
      bubble.setScale(0.95).setAlpha(0);
      this.guideTweens.push(
        this.tweens.add({
          targets: bubble,
          scale: 1,
          alpha: 1,
          duration: 180,
          ease: 'Back.easeOut',
        }),
      );
    }
  }

  /** Build an outlined gold pointer arrow oriented cleanly toward the active guide target. */
  private makeGuideArrow(
    kind: GuideStep['kind'],
    target: { x: number; y: number; w: number; h: number },
  ): { obj: Phaser.GameObjects.Graphics; dx: number; dy: number } {
    const cx = target.x + target.w / 2;
    const cy = target.y + target.h / 2;
    type Dir = 'down' | 'up' | 'left' | 'right';
    let dir: Dir = 'down';
    let x = cx;
    let y = target.y - 13;

    if (kind === 'intro' || kind === 'offPlan' || kind === 'sukli') {
      dir = 'right';
      x = target.x - 15;
      y = cy;
    } else if (kind === 'tab' || kind === 'place') {
      dir = 'up';
      x = cx;
      y = target.y + target.h + 14;
    } else if (kind === 'closeSauce') {
      dir = 'left';
      x = target.x + target.w + 14;
      y = cy;
    }

    const g = this.add.graphics({ x, y });
    g.lineStyle(2, COLORS.ink, 1);
    g.fillStyle(COLORS.gold, 1);
    // Arrow points downward (+Y) by default; rotate for other directions.
    g.beginPath();
    g.moveTo(-4, -9);
    g.lineTo(4, -9);
    g.lineTo(4, -1);
    g.lineTo(9, -1);
    g.lineTo(0, 9);
    g.lineTo(-9, -1);
    g.lineTo(-4, -1);
    g.closePath();
    g.fillPath();
    g.strokePath();

    const angle: Record<Dir, number> = { down: 0, up: 180, right: -90, left: 90 };
    const bounce: Record<Dir, [number, number]> = {
      down: [0, 5],
      up: [0, -5],
      right: [5, 0],
      left: [-5, 0],
    };
    g.setAngle(angle[dir]);
    const [dx, dy] = bounce[dir];
    return { obj: g, dx, dy };
  }

  private guideText(s: GuideStep): string {
    const food = (item: string): string => t(`pupLagoon.food.${item}`);
    const sauce = (x: Sawsawan): string => t(`pupLagoon.sauce.${x}`);
    switch (s.kind) {
      case 'tab':
        return t('pupLagoon.guide.tab', { stall: t(`pupLagoon.tab.${s.stall}`) });
      case 'card':
        return s.sauce
          ? t('pupLagoon.guide.cardSauce', { food: food(s.item), sauce: sauce(s.sauce) })
          : t('pupLagoon.guide.card', { food: food(s.item) });
      case 'sauce':
        return t('pupLagoon.guide.sauce', { sauce: sauce(s.sauce) });
      case 'place':
        return t('pupLagoon.guide.place', { total: s.total });
      case 'sukli':
        return t('pupLagoon.guide.sukli', { change: s.change });
      default:
        return t(`pupLagoon.guide.${s.kind}`);
    }
  }

  /** Where the next tap goes, in screen units (matches the layout in FRONT and VIEW). */
  private guideTarget(s: GuideStep): { x: number; y: number; w: number; h: number } | null {
    const mid = FRONT.trayY + FRONT.trayH / 2;
    const btn = (cx: number, cy: number, w: number, h: number) => ({
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
    });
    const sauces: Sawsawan[] = ['matamis', 'maanghang', 'suka'];
    const pickerY = FRONT.cards.y + 50;
    switch (s.kind) {
      case 'intro':
      case 'offPlan': {
        const L = VIEW.listahan;
        return { x: L.x, y: L.y, w: L.w, h: L.h };
      }
      case 'tab': {
        const w = VIEW.mapRight / this.order.length;
        return { x: this.order.indexOf(s.stall) * w + 1, y: FRONT.tabsY, w: w - 2, h: FRONT.tabsH };
      }
      case 'card': {
        const C = FRONT.cards;
        const i = MENU.filter((m) => m.stall === this.stall && m.orderable !== false).findIndex(
          (m) => m.key === s.item,
        );
        if (i < 0) return null;
        return {
          x: C.left + (i % C.cols) * (C.w + C.gapX),
          y: C.y + Math.floor(i / C.cols) * (C.h + C.gapY),
          w: C.w,
          h: C.h,
        };
      }
      case 'sauce':
        return btn(VIEW.mapRight / 2 - 96 + sauces.indexOf(s.sauce) * 96, pickerY + 26, 88, 18);
      case 'closeSauce':
        return btn(VIEW.mapRight / 2 + 136, pickerY - 36, 18, 16);
      case 'fix':
        return {
          x: 8 + s.index * (FRONT.slot + 4),
          y: mid - FRONT.slot / 2,
          w: FRONT.slot,
          h: FRONT.slot,
        };
      case 'bayad':
        return btn(324, mid, 100, 24);
      case 'place':
        return { x: 40, y: 184, w: 432, h: 48 };
      case 'heto':
        return btn(320, 296, 120, 22);
      case 'sukli': {
        const W = VIEW.wallet;
        return { x: W.x, y: W.y, w: W.w, h: W.h };
      }
      case 'eat':
        return btn(446, mid, 112, 24);
      default:
        return null;
    }
  }

  // ---- Keys and pause ----------------------------------------------------------------------------

  private bindKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    STALL_KEYS_ORDER.forEach((stall, i) =>
      kb.on(
        `keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO'][i]}`,
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
    this.events.once('shutdown', () => {
      kb.removeAllListeners();
      this.clearGuideTweens();
    });
  }

  private pause(): void {
    openOverlay(this, PAUSE);
  }
}
