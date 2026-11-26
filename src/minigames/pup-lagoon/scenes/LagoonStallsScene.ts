/**
 * LagoonStallsScene — buying merienda at the Lagoon, one storefront at a time (owner changes, DECISIONS L-026, L-030)
 * Shows: tabs with every stall's name along the top (the current one raised); the current stall's front
 * (front_<stall> art) with its name, promo sign, live price tags and steam, and arrows to the next and
 * previous stall; the line of students in front of the counter (the player marked "You" once lined up);
 * the menu (food, name, price, busog, and a green Listahan badge on food that ticks a line still open);
 * a bar with what to do next and one main button (Pumila / Leave line / Refill); the top bar (vacant, slot,
 * event, pause) and the cork-board HUD (listahan, busog, wallet). People are drawn only at whole-number
 * scales so their pixels stay crisp. Buying at the counter arrives in L3.
 * Listens to: pointer; keyboard (1–8 stalls, ← / → previous / next, Enter = Pumila, Esc = leave the line,
 * P = pause); LagoonVacant events (pilaChanged, atCounter, ticked); the frame update (the pila, ≤ 100 ms).
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
import { FRONT, LAGOON_MUSIC, STALL_KEYS_ORDER, VIEW } from '../config';
import { MENU } from '../data/menu';
import storefronts from '../data/storefronts.json';
import { lineText, loadProgress } from '../lagoonSave';
import { purchaseEffect, type PurchaseEffect } from '../logic/Catalog';
import { LagoonVacant } from '../logic/LagoonVacant';
import type { GeneratedVacant } from '../logic/ListahanGen';
import { moneyTotal } from '../logic/Money';
import type { ListahanLine, StallKey } from '../logic/types';
import { bowlRow, walletGrid } from '../objects/lagoonUi';
import { LAGOON_INTRO, LAGOON_STALLS } from './LagoonIntroScene';

interface FrontLayout {
  style: 'kiosk' | 'row' | 'water';
  items: number[][];
  name: { x: number; y: number; color: string };
  sign?: { x: number; y: number; w: number; h: number };
  steam: number[][];
}
const LAYOUT = storefronts as unknown as Record<StallKey, FrontLayout>;

export class LagoonStallsScene extends Phaser.Scene {
  private vacant!: LagoonVacant;
  private stall: StallKey = 'karinderya';
  /** The stalls the player can visit: every food stall, and the water station once the Tumbler is owned. */
  private order: StallKey[] = [];
  private tabs!: Phaser.GameObjects.Container;
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
    const all: StallKey[] = [...STALL_KEYS_ORDER, 'water'];
    this.order = all.filter((s) => this.vacant.gen.open.includes(s));
    this.stall = this.order[0] ?? 'karinderya';

    this.add.rectangle(VIEW.mapRight / 2, 192, VIEW.mapRight, 336, 0xefe9dc);
    this.tabs = this.add.container(0, 0).setDepth(12);
    this.front = this.add.container(0, 0);
    this.line = this.add.container(0, 0).setDepth(10);
    this.bar = this.add.container(0, 0).setDepth(20);
    this.drawTopBar();
    this.hud = this.add.container(0, 0).setDepth(80);
    this.drawHud();
    this.showStall(this.stall);
    this.bindKeys();
    services().audio.playMusic(LAGOON_MUSIC, this);
    this.cameras.main.fadeIn(FADE_MS, 0x2b, 0x22, 0x33);
  }

  override update(_time: number, delta: number): void {
    if (!this.vacant) return;
    this.vacant.update(Math.min(delta, 100));
    for (const e of this.vacant.drainEvents()) {
      if (e.type === 'pilaChanged' || e.type === 'atCounter') {
        this.drawLine();
        this.drawBar();
        this.drawTabs();
      }
      if (e.type === 'ticked') {
        this.drawHud();
        this.showStall(this.stall);
      }
    }
  }

  private get busy(): boolean {
    return this.vacant.location !== null;
  }

  // ---- Tabs ----------------------------------------------------------------------------------------

  /** One tab per stall with its short name; the current stall's tab is raised and cream. */
  private drawTabs(): void {
    this.tabs.removeAll(true);
    const n = this.order.length;
    const w = VIEW.mapRight / n;
    const y = FRONT.tabsY;
    const here = this.vacant.location?.stall ?? null;
    this.order.forEach((stall, i) => {
      const on = stall === this.stall;
      const x = i * w;
      const bg = this.add
        .rectangle(x + w / 2, y + FRONT.tabsH / 2, w - 2, FRONT.tabsH, on ? 0xfff4dc : 0xcfc6b0)
        .setStrokeStyle(1, on ? COLORS.red : 0x8a8494);
      this.tabs.add(bg);
      if (on)
        this.tabs.add(this.add.rectangle(x + w / 2, y + FRONT.tabsH - 1, w - 4, 2, COLORS.red));
      this.tabs.add(
        this.add
          .text(
            x + w / 2,
            y + FRONT.tabsH / 2,
            t(`pupLagoon.tab.${stall}`),
            textStyle(8, on ? TEXT.red : busyColor(this.busy && !on)),
          )
          .setOrigin(0.5),
      );
      // A dot on the stall where the player is lined up.
      if (here === stall) this.tabs.add(this.add.circle(x + w - 7, y + 5, 3, 0x3a9a6a));
      if (!this.busy && !on) {
        bg.setInteractive({ useHandCursor: true }).on('pointerup', () => this.showStall(stall));
      }
    });
  }

  // ---- The storefront ----------------------------------------------------------------------------

  private showStall(stall: StallKey): void {
    this.stall = stall;
    this.front.removeAll(true);
    this.steam?.remove();
    this.steam = null;
    const F = FRONT;
    const L = LAYOUT[stall];
    const g = this.vacant.gen;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.front.add(o);
      return o;
    };
    add(this.add.image(F.x, F.y, `front_${stall}`).setOrigin(0));

    // The stall's name: on the red front (kiosks) or on the black board (stall row).
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

    // Price tags under the food on display (they follow promos and sell-outs).
    const items = MENU.filter((m) => m.stall === stall && m.orderable !== false);
    items.forEach((m, i) => {
      const [x, y] = L.items[i] ?? [0, 0];
      const e = purchaseEffect(m.key, undefined, g.promo);
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

    // Arrows to the previous and next stall, on the storefront's sides.
    if (this.order.length > 1) {
      for (const dir of [-1, 1] as const) {
        const arrow = new Button(
          this,
          dir < 0 ? 14 : VIEW.mapRight - 14,
          F.y + F.h / 2,
          dir < 0 ? '<' : '>',
          () => this.flip(dir),
          { width: 20, height: 32, fontSize: 16 },
        );
        arrow.setEnabled(!this.busy);
        add(arrow);
      }
    }

    // The menu: food, name, price; busog and a green Listahan badge when it ticks an open line.
    add(this.add.rectangle(VIEW.mapRight / 2, F.menuY - 2, VIEW.mapRight, 1, 0xc9c0aa));
    items.forEach((m, i) => {
      const e = purchaseEffect(m.key, undefined, g.promo);
      const sold = this.vacant.isSoldOut(m.key);
      const x = 6 + (i % 2) * 254;
      const y = F.menuY + Math.floor(i / 2) * F.menuRowH;
      const color = sold ? TEXT.grey : TEXT.ink;
      add(this.add.image(x + 12, y + 11, `food_${m.key}`).setAlpha(sold ? 0.4 : 1));
      add(this.add.text(x + 28, y + 1, t(m.nameKey), textStyle(8, color)));
      add(
        this.add
          .text(
            x + 246,
            y + 1,
            sold ? t('pupLagoon.board.soldOut') : `₱${e.price}`,
            textStyle(8, sold ? TEXT.grey : TEXT.red),
          )
          .setOrigin(1, 0),
      );
      add(
        this.add.text(
          x + 28,
          y + 12,
          t('pupLagoon.board.busog', { n: e.busog * e.copies }),
          textStyle(8, TEXT.grey),
        ),
      );
      const lines = sold ? [] : this.openLinesTicked(m.key, e);
      if (lines.length) {
        // Name the listahan lines this food ticks, e.g. "May kanin + Inumin".
        const badge = this.add
          .text(
            x + 104,
            y + 12,
            lines.map((l) => lineText(l)).join(' + '),
            textStyle(8, TEXT.cream),
          )
          .setOrigin(0, 0);
        add(
          this.add
            .rectangle(x + 90, y + 11, badge.width + 20, 11, 0x3a9a6a)
            .setOrigin(0, 0)
            .setStrokeStyle(1, 0x2b5a3a),
        );
        add(this.add.image(x + 97, y + 16, 'ui_check', 1));
        add(badge);
      }
    });

    // Steam and smoke rising from pots, woks and the grill.
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
    this.drawLine();
    this.drawBar();
  }

  /** The listahan lines, still open, that buying this item would tick. */
  private openLinesTicked(item: string, e: PurchaseEffect): ListahanLine[] {
    const tags = new Set([...e.tags, ...(e.free?.tags ?? [])]);
    return this.vacant.gen.lines.filter(
      (l) =>
        !this.vacant.listahan.isLineDone(l.id) &&
        ((l.kind === 'item' && l.item === item) ||
          (l.kind === 'tag' && !!l.tag && tags.has(l.tag))),
    );
  }

  /**
   * The line of students in front of the counter, on the right so it never covers the stall's name.
   * Students are drawn at 2× and the player at 1× (both 48 px tall): whole-number scales only.
   */
  private drawLine(): void {
    this.line.removeAll(true);
    const stall = this.stall;
    if (stall === 'water') return;
    const total = this.vacant.pilaLength(stall);
    const here = this.vacant.location?.stall === stall;
    const place = here ? this.vacant.playerPlace() : null;
    const atCounter = here && this.vacant.location?.at === 'counter';
    const feet = FRONT.y + FRONT.h + 2;
    const shown = Math.min(total, FRONT.lineMax);
    for (let i = 0; i < shown; i++) {
      const x = FRONT.lineX + i * FRONT.lineGap;
      const isPlayer = (place !== null && i === place) || (atCounter && i === 0);
      if (isPlayer) {
        const profile = services().save.data.profile;
        if (profile) this.line.add(avatarSprite(this, x, feet - 24, profile, 1));
        const you = this.add
          .text(x, feet - 52, t('pupLagoon.line.you'), textStyle(8, TEXT.cream))
          .setOrigin(0.5);
        this.line.add(this.add.rectangle(x, feet - 52, you.width + 8, 11, COLORS.red));
        this.line.add(you);
        continue;
      }
      const v = ((i + stall.length) % 6) + 1;
      this.line.add(
        this.add.sprite(x, feet, `walker_${v}`, 0).setOrigin(0.5, 1).setScale(2).setFlipX(true),
      );
    }
    if (total > shown)
      this.line.add(
        this.add
          .text(
            FRONT.lineX + shown * FRONT.lineGap - 6,
            feet - 20,
            `+${total - shown}`,
            textStyle(8, TEXT.ink, { backgroundColor: '#FFF4DC', padding: { x: 2, y: 1 } }),
          )
          .setOrigin(0.5),
      );
  }

  /** What to do next, in words, and the one main button. */
  private drawBar(): void {
    this.bar.removeAll(true);
    const y = FRONT.barY;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.bar.add(o);
      return o;
    };
    add(this.add.rectangle(VIEW.mapRight / 2, y, VIEW.mapRight, FRONT.barH, 0x3a3346));
    const loc = this.vacant.location;
    let hint: string;
    let button: { label: string; act: () => void; main: boolean } | null;
    if (loc?.at === 'pila') {
      hint = t('pupLagoon.front.waiting', { n: this.vacant.playerPlace() ?? 0 });
      button = { label: t('pupLagoon.pila.leave'), act: () => this.leaveLine(), main: false };
    } else if (loc?.at === 'counter') {
      hint = `${t('pupLagoon.counter.title')} ${t('pupLagoon.counter.soon')}`;
      button = { label: t('pupLagoon.pila.leave'), act: () => this.leaveLine(), main: false };
    } else if (this.stall === 'water') {
      hint = t('pupLagoon.front.refillHint');
      button = { label: t('pupLagoon.front.refill'), act: () => this.refill(), main: true };
    } else {
      hint = t('pupLagoon.front.hint', { n: this.vacant.pilaLength(this.stall) });
      button = { label: t('pupLagoon.ui.queue'), act: () => this.queue(), main: true };
    }
    add(
      this.add
        .text(10, y, hint, textStyle(8, TEXT.cream, { wordWrap: { width: 370 } }))
        .setOrigin(0, 0.5),
    );
    if (button) {
      add(
        new Button(this, VIEW.mapRight - 62, y, button.label, button.act, {
          width: 110,
          height: 18,
          ...(button.main ? { fill: COLORS.yellow, textColor: TEXT.red } : {}),
        }),
      );
    }
  }

  private flip(dir: 1 | -1): void {
    if (this.busy || this.order.length < 2) return;
    const i = this.order.indexOf(this.stall);
    this.showStall(this.order[(i + dir + this.order.length) % this.order.length]);
  }

  private queue(): void {
    if (this.vacant.joinPila(this.stall).ok) this.showStall(this.stall);
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
    this.showStall(this.stall);
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
          if (!this.busy && this.order.includes(stall)) this.showStall(stall);
        },
      ),
    );
    kb.on('keydown-LEFT', () => this.flip(-1));
    kb.on('keydown-RIGHT', () => this.flip(1));
    kb.on('keydown-ENTER', () => {
      if (this.busy) return;
      if (this.stall === 'water') this.refill();
      else this.queue();
    });
    kb.on('keydown-ESC', () => this.leaveLine());
    kb.on('keydown-P', () => this.pause());
    this.events.once('shutdown', () => kb.removeAllListeners());
  }

  private pause(): void {
    openOverlay(this, PAUSE);
  }
}

/** Tab text colour: dimmed while the player is busy in a line (tabs are locked then). */
function busyColor(dim: boolean): string {
  return dim ? TEXT.grey : TEXT.ink;
}
