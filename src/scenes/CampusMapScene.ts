/**
 * CampusMapScene ("Mapa ng U-Belt", SPEC-homepage §4) — H1 greybox
 * Shows: the U-Belt map as shapes and labels (roads, LRT-2 with Recto / Legarda / Pureza, Pasig River),
 * the 7 campus stops (PUP playable, the rest "SOON"), the jeepney, the HUD (Home, Mapa/Listahan,
 * ID chip, ipon total, sticker count, Settings, Sticker Book, Album, map credit), the campus card,
 * the list view, and the jeepney ride along the route into the minigame (or ComingSoonScene).
 * Listens to: pointer, mouse wheel (list), keyboard (arrows move between stops, Enter opens / rides,
 * Esc closes the card, Tab switches Mapa/Listahan).
 */
import Phaser from 'phaser';
import { gameEvents } from '../core/GameEvents';
import { t } from '../core/i18n';
import type { MapView } from '../core/SaveManager';
import { services } from '../core/services';
import { FADE_MS, MAP, PALETTE, RIDE } from '../home/config';
import { pointAt, polylineLength, RoutePath, rideDurationMs } from '../map/RoutePath';
import { summaryFor, totalIpon } from '../minigames/progressSummary';
import { entryAtStop, ROSTER, type RosterEntry, ROUTE_NODES } from '../minigames/roster';
import { Button } from '../ui/Button';
import { openOverlay } from '../ui/overlay';
import { panel } from '../ui/Panel';
import { COLORS, SCENES, TEXT, textStyle } from '../ui/theme';
import { avatarPreview } from './IdCardScene';

export interface CampusMapData {
  /** A message to show on arrival, e.g. "+₱25 sa alkansya!" after a vacant. */
  toast?: string;
}

const ROUTE = new RoutePath(ROUTE_NODES);
const CARD_OPEN_Y = 360 - MAP.card.h / 2 - 6;
const CARD_HIDDEN_Y = 360 + MAP.card.h;
/** The jeepney parks beside the pin, not on it. */
const JEEP_OFFSET = { x: -44, y: 6 };

export class CampusMapScene extends Phaser.Scene {
  private view: MapView = 'map';
  private selected = 7;
  private jeep!: Phaser.GameObjects.Container;
  private jeepSign!: Phaser.GameObjects.Text;
  private card!: Phaser.GameObjects.Container;
  private cardEntry: RosterEntry | null = null;
  private list!: Phaser.GameObjects.Container;
  private listCards: Phaser.GameObjects.Container[] = [];
  private listScroll = 0;
  private toggle!: Button;
  private highlight!: Phaser.GameObjects.Arc;
  private riding = false;

  constructor() {
    super(SCENES.campusMap);
  }

  create(data: CampusMapData = {}): void {
    const save = services().save.data;
    this.view = save.home.mapView;
    this.selected = save.home.lastStop;
    this.riding = false;
    this.cardEntry = null;
    this.listScroll = 0;

    this.drawBase();
    this.drawStops();
    this.drawJeep(save.home.lastStop);
    this.buildList();
    this.drawHud();
    this.card = this.add.container(320, CARD_HIDDEN_Y).setDepth(50);
    this.setView(this.view, false);
    this.bindKeys();

    this.cameras.main.fadeIn(FADE_MS, 0x2b, 0x22, 0x33);
    if (data.toast) gameEvents.emit('toast', { text: data.toast });
  }

  // ---- Drawing ---------------------------------------------------------------------------------

  private drawBase(): void {
    this.add.rectangle(320, 180, 640, 360, 0xf3e6c8);
    this.add.rectangle(320, 180, 624, 344).setStrokeStyle(2, 0xd8c39a);

    const river = this.add.graphics();
    river.fillStyle(0x7fb0d0, 1);
    river.fillPoints(
      [
        { x: 0, y: 300 },
        { x: 120, y: 312 },
        { x: 260, y: 296 },
        { x: 400, y: 318 },
        { x: 520, y: 290 },
        { x: 640, y: 300 },
        { x: 640, y: 340 },
        { x: 0, y: 340 },
      ].map((p) => new Phaser.Math.Vector2(p.x, p.y)),
      true,
    );
    river.lineStyle(6, 0x7fb0d0, 1);
    river.lineBetween(430, 300, 470, 140);
    river.lineBetween(330, 305, 300, 120);
    this.add.text(320, 326, t('map.river'), textStyle(8, '#3E5E78')).setOrigin(0.5);

    // Road: label key, line from (x1, y1) to (x2, y2), label position clear of the campus pins.
    const roads: [string, number, number, number, number, number, number][] = [
      ['espana', 80, 20, 360, 130, 312, 100],
      ['recto', 20, 205, 300, 205, 196, 214],
      ['legarda', 300, 205, 420, 190, 398, 180],
      ['mendiola', 330, 250, 340, 200, 348, 268],
      ['morayta', 110, 120, 120, 230, 120, 246],
      ['magsaysay', 420, 190, 620, 230, 498, 222],
    ];
    const g = this.add.graphics();
    g.lineStyle(4, 0xffffff, 1);
    for (const [key, x1, y1, x2, y2, lx, ly] of roads) {
      g.lineBetween(x1, y1, x2, y2);
      this.add
        .text(lx, ly, t(`map.road.${key}`), textStyle(8, '#7A6A55'))
        .setOrigin(0.5)
        .setAlpha(0.8);
    }

    const lrt = this.add.graphics();
    lrt.lineStyle(2, PALETTE.lrt, 1);
    for (let x = 10; x < 630; x += 12)
      lrt.lineBetween(x, 196 + x * 0.02, x + 7, 196 + (x + 7) * 0.02);
    for (const [key, x] of [
      ['recto', 70],
      ['legarda', 330],
      ['pureza', 470],
    ] as const) {
      this.add.circle(x, 196 + x * 0.02, 3, PALETTE.lrt).setStrokeStyle(1, COLORS.cream);
      this.add
        .text(x, 186 + x * 0.02, t(`map.station.${key}`), textStyle(8, '#5B3C8A'))
        .setOrigin(0.5);
    }
    this.add.text(600, 196, t('map.lrt'), textStyle(8, '#5B3C8A')).setOrigin(0.5, 1);

    const route = this.add.graphics();
    route.lineStyle(1, COLORS.ink, 0.25);
    route.strokePoints(ROUTE_NODES.map((n) => new Phaser.Math.Vector2(n.x, n.y)));
  }

  private drawStops(): void {
    const save = services().save.data;
    this.highlight = this.add.circle(0, 0, 15).setStrokeStyle(2, COLORS.red).setDepth(5);
    for (const entry of ROSTER) {
      const playable = entry.status === 'playable';
      this.add
        .rectangle(
          entry.x,
          entry.y,
          44,
          30,
          playable ? PALETTE.gold : 0xb8b0a0,
          playable ? 0.35 : 0.25,
        )
        .setStrokeStyle(1, COLORS.ink, 0.3);
      const pin = this.add
        .circle(entry.x, entry.y - 4, MAP.pin / 2, playable ? PALETTE.jeepRed : COLORS.grey)
        .setStrokeStyle(1, COLORS.ink)
        .setDepth(6);
      pin.setInteractive(
        new Phaser.Geom.Circle(MAP.pin / 2, MAP.pin / 2, 16),
        Phaser.Geom.Circle.Contains,
      );
      pin.on('pointerup', () => this.select(entry.stop, true));
      if (playable && !save.settings.reducedMotion) {
        this.tweens.add({
          targets: pin,
          y: entry.y - 7,
          duration: 200,
          yoyo: true,
          repeat: -1,
          repeatDelay: MAP.bounceMs - 400,
          ease: 'Sine.easeOut',
        });
      }
      this.add
        .rectangle(entry.x, entry.y + 16, 46, 11, COLORS.cream)
        .setStrokeStyle(1, COLORS.ink)
        .setDepth(6);
      this.add
        .text(entry.x, entry.y + 16, entry.campus, textStyle(8))
        .setOrigin(0.5)
        .setDepth(6);
      if (playable) {
        const s = summaryFor(entry.id, save);
        if (s.pin) {
          this.add
            .text(entry.x, entry.y + 28, t(s.pin.key, s.pin.params), textStyle(8, TEXT.ink))
            .setOrigin(0.5)
            .setDepth(6);
        }
      } else {
        this.add.rectangle(entry.x + 16, entry.y - 14, 28, 10, COLORS.yellow).setDepth(7);
        this.add
          .text(entry.x + 16, entry.y - 14, t('map.soon'), textStyle(8, TEXT.red))
          .setOrigin(0.5)
          .setDepth(7);
      }
    }
    this.moveHighlight();
  }

  private drawJeep(stop: number): void {
    const p = ROUTE.stopPoint(stop);
    const body = this.add.rectangle(0, 0, 24, 16, PALETTE.jeepBlue).setStrokeStyle(1, COLORS.ink);
    const board = this.add
      .rectangle(0, -12, 44, 9, PALETTE.jeepYellow)
      .setStrokeStyle(1, COLORS.ink);
    this.jeepSign = this.add
      .text(0, -12, entryAtStop(stop).area.toUpperCase(), textStyle(8, TEXT.red))
      .setOrigin(0.5);
    this.jeep = this.add
      .container(p.x + JEEP_OFFSET.x, p.y + JEEP_OFFSET.y, [body, board, this.jeepSign])
      .setDepth(8);
  }

  private drawHud(): void {
    const save = services().save.data;
    const hud = (o: Phaser.GameObjects.GameObject & { setDepth(d: number): unknown }): void => {
      o.setDepth(40);
    };
    hud(
      new Button(this, MAP.home.x, MAP.home.y, t('map.home'), () => this.goHome(), {
        width: 30,
        height: 22,
      }),
    );
    this.toggle = new Button(
      this,
      78,
      MAP.toggle.y,
      '',
      () => this.setView(this.view === 'map' ? 'list' : 'map', true),
      {
        width: 74,
        height: 22,
      },
    );
    hud(this.toggle);
    if (save.profile) {
      const chip = new Button(this, 180, MAP.idChip.y, '', () => openOverlay(this, SCENES.idCard), {
        width: MAP.idChip.w,
        height: 22,
      });
      chip.add(avatarPreview(this, -48, 0, save.profile, 0.35));
      chip.label.setText(save.profile.name).setX(8);
      hud(chip);
    }
    const ipon = totalIpon(
      save,
      ROSTER.map((r) => r.id),
    );
    hud(panel(this, MAP.ipon.x, MAP.ipon.y, 64, 18));
    hud(
      this.add
        .rectangle(MAP.ipon.x - 24, MAP.ipon.y, 8, 12, 0xa0784a)
        .setStrokeStyle(1, COLORS.ink),
    );
    hud(
      this.add
        .text(MAP.ipon.x + 4, MAP.ipon.y, t('map.ipon', { ipon }), textStyle(8))
        .setOrigin(0.5),
    );
    hud(panel(this, MAP.stickers.x, MAP.stickers.y, 40, 18));
    hud(
      this.add
        .text(
          MAP.stickers.x,
          MAP.stickers.y,
          t('map.stickers', { count: save.stickers.length }),
          textStyle(8),
        )
        .setOrigin(0.5),
    );
    hud(
      new Button(
        this,
        MAP.settings.x,
        MAP.settings.y,
        '*',
        () => openOverlay(this, SCENES.settings),
        { width: 22, height: 22, fontSize: 16 },
      ),
    );
    hud(
      new Button(
        this,
        MAP.stickerBook.x,
        MAP.stickerBook.y,
        'S',
        () => openOverlay(this, SCENES.stickerBook),
        { width: 24, height: 24, fontSize: 16 },
      ),
    );
    hud(
      new Button(this, MAP.album.x, MAP.album.y, 'A', () => openOverlay(this, SCENES.album), {
        width: 24,
        height: 24,
        fontSize: 16,
      }),
    );
    hud(this.add.text(320, 352, t('map.credit'), textStyle(8, '#7A6A55')).setOrigin(0.5));
  }

  // ---- List view (§4.5) ------------------------------------------------------------------------

  private buildList(): void {
    const L = MAP.list;
    this.list = this.add.container(0, 0).setDepth(30);
    this.list.add(this.add.rectangle(320, 180, 640, 360, 0xf3e6c8).setInteractive());
    this.list.add(
      this.add.text(320, 30, t('map.listTitle'), textStyle(8, TEXT.ink)).setOrigin(0.5),
    );
    const save = services().save.data;
    this.listCards = ROSTER.map((entry) => {
      const playable = entry.status === 'playable';
      const bg = this.add
        .rectangle(0, 0, L.w, L.h, playable ? COLORS.yellow : 0xe6dcc6)
        .setStrokeStyle(1, COLORS.ink);
      bg.setInteractive({ useHandCursor: true }).on('pointerup', () => this.openCard(entry));
      const s = summaryFor(entry.id, save);
      const items: Phaser.GameObjects.GameObject[] = [
        bg,
        this.add.text(-L.w / 2 + 10, -14, `${entry.campus} · ${entry.area}`, textStyle(8)),
        this.add.text(
          -L.w / 2 + 10,
          2,
          t(`roster.${entry.id}.title`),
          textStyle(16, playable ? TEXT.red : TEXT.ink),
        ),
        this.add.rectangle(L.w / 2 - 50, 0, 64, 16, playable ? PALETTE.jeepGreen : COLORS.grey),
        this.add
          .text(L.w / 2 - 50, 0, t(playable ? 'map.playNow' : 'map.soon'), textStyle(8, TEXT.cream))
          .setOrigin(0.5),
      ];
      if (s.pin)
        items.push(
          this.add.text(L.w / 2 - 120, 0, t(s.pin.key, s.pin.params), textStyle(8)).setOrigin(0.5),
        );
      const card = this.add.container(320, 0, items);
      this.list.add(card);
      return card;
    });
    this.layoutList();
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (this.view === 'list' && !this.cardEntry) this.scrollList(dy > 0 ? 1 : -1);
    });
  }

  private layoutList(): void {
    const L = MAP.list;
    const step = L.h + L.gap;
    const maxScroll = Math.max(0, ROSTER.length * step - (L.bottom - L.top));
    this.listScroll = Math.min(Math.max(0, this.listScroll), maxScroll);
    this.listCards.forEach((card, i) => {
      const y = L.top + L.h / 2 + i * step - this.listScroll;
      card.setY(y);
      card.setVisible(y - L.h / 2 >= L.top - 1 && y + L.h / 2 <= L.bottom + 1);
    });
  }

  private scrollList(dir: 1 | -1): void {
    this.listScroll += dir * (MAP.list.h + MAP.list.gap);
    this.layoutList();
  }

  private setView(view: MapView, remember: boolean): void {
    this.view = view;
    this.list.setVisible(view === 'list');
    this.toggle.setText(`${t('map.viewMap')} | ${t('map.viewList')}`);
    this.toggle.label.setColor(TEXT.ink);
    this.toggle.label.setText(
      view === 'map'
        ? `[${t('map.viewMap')}] ${t('map.viewList')}`
        : `${t('map.viewMap')} [${t('map.viewList')}]`,
    );
    if (remember) services().save.update((d) => (d.home.mapView = view));
  }

  // ---- Selection and campus card (§4.3) --------------------------------------------------------

  private select(stop: number, open: boolean): void {
    if (this.riding) return;
    this.selected = stop;
    this.moveHighlight();
    if (open) this.openCard(entryAtStop(stop));
  }

  private moveHighlight(): void {
    const e = entryAtStop(this.selected);
    this.highlight.setPosition(e.x, e.y - 4);
  }

  private openCard(entry: RosterEntry): void {
    if (this.riding) return;
    this.cardEntry = entry;
    this.selected = entry.stop;
    this.moveHighlight();
    const C = MAP.card;
    this.card.removeAll(true);
    const playable = entry.status === 'playable';
    const left = -C.w / 2;
    const items: Phaser.GameObjects.GameObject[] = [
      panel(this, 0, 0, C.w, C.h).setInteractive(),
      this.add
        .rectangle(left + 8 + C.thumb / 2, 0, C.thumb, C.thumb, playable ? 0x5e8c61 : 0xb8b0a0)
        .setStrokeStyle(1, COLORS.ink),
      this.add
        .text(left + 8 + C.thumb / 2, 0, entry.campus, textStyle(8, TEXT.cream))
        .setOrigin(0.5),
      this.add.text(left + 116, -66, `${entry.campus} ${entry.area}`, textStyle(8)),
      this.add.text(left + 116, -54, t(`roster.${entry.id}.title`), textStyle(16, TEXT.red)),
      this.add.text(
        left + 116,
        -34,
        t(`roster.${entry.id}.tagline`),
        textStyle(8, TEXT.ink, { wordWrap: { width: 230 } }),
      ),
    ];
    if (playable) {
      const s = summaryFor(entry.id, services().save.data);
      s.lines.forEach((line, i) =>
        items.push(this.add.text(left + 116, -10 + i * 12, t(line.key, line.params), textStyle(8))),
      );
      items.push(
        new Button(this, 40, 52, t('map.ride'), () => this.ride(entry), {
          width: 96,
          height: 24,
          fill: COLORS.yellow,
          textColor: TEXT.red,
          fontSize: 8,
        }),
      );
    } else {
      items.push(this.add.text(left + 116, -10, t('map.soonTitle'), textStyle(8, TEXT.red)));
      items.push(
        this.add.text(
          left + 116,
          2,
          t(`roster.${entry.id}.teaser`),
          textStyle(8, TEXT.ink, { wordWrap: { width: 230 } }),
        ),
      );
      items.push(
        new Button(this, 40, 52, t('map.soonButton'), () => undefined, {
          width: 96,
          height: 24,
        }).setEnabled(false),
      );
    }
    items.push(
      new Button(this, 130, 52, t('ui.close'), () => this.closeCard(), { width: 64, height: 24 }),
    );
    this.card.add(items);
    this.tweens.killTweensOf(this.card);
    this.tweens.add({
      targets: this.card,
      y: CARD_OPEN_Y,
      duration: MAP.card.slideMs,
      ease: 'Back.easeOut',
    });
  }

  private closeCard(): void {
    if (!this.cardEntry) return;
    this.cardEntry = null;
    this.tweens.killTweensOf(this.card);
    this.tweens.add({
      targets: this.card,
      y: CARD_HIDDEN_Y,
      duration: MAP.card.slideMs,
      ease: 'Sine.easeIn',
    });
  }

  // ---- Jeepney ride (§4.4) ---------------------------------------------------------------------

  private ride(entry: RosterEntry): void {
    if (this.riding) return;
    this.riding = true;
    this.closeCard();
    this.setView('map', false);
    const from = services().save.data.home.lastStop;
    services().save.update((d) => (d.home.lastStop = entry.stop));
    this.jeepSign.setText(entry.area.toUpperCase());

    if (services().save.data.settings.reducedMotion) {
      this.arrive(entry, false);
      return;
    }
    const path = ROUTE.pathBetween(from, entry.stop).map((p) => ({
      x: p.x + JEEP_OFFSET.x,
      y: p.y + JEEP_OFFSET.y,
    }));
    const length = polylineLength(path);
    const progress = { d: 0 };
    let skip: Button | null = null;
    const tween = this.tweens.add({
      targets: progress,
      d: length,
      duration: rideDurationMs(length, RIDE.speed, RIDE.minMs, RIDE.maxMs),
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const p = pointAt(path, progress.d);
        this.jeep.setPosition(p.x, p.y);
      },
      onComplete: () => {
        skip?.destroy();
        this.arrive(entry, true);
      },
    });
    this.time.delayedCall(RIDE.skipAfterMs, () => {
      if (!tween.isPlaying()) return;
      skip = new Button(this, 600, 300, t('map.skip'), () => tween.complete(), {
        width: 48,
        height: 20,
      });
      skip.setDepth(60);
    });
  }

  private arrive(entry: RosterEntry, animate: boolean): void {
    const end = ROUTE.stopPoint(entry.stop);
    this.jeep.setPosition(end.x + JEEP_OFFSET.x, end.y + JEEP_OFFSET.y);
    const go = (): void => {
      this.cameras.main.fadeOut(FADE_MS, 0x2b, 0x22, 0x33);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        const target =
          entry.introScene && this.sceneExists(entry.introScene)
            ? entry.introScene
            : SCENES.comingSoon;
        this.scene.start(target, { id: entry.id });
      });
    };
    if (!animate) {
      go();
      return;
    }
    const bubble = this.add
      .text(
        this.jeep.x,
        this.jeep.y - 24,
        t('map.para'),
        textStyle(8, TEXT.ink, { backgroundColor: '#FFF4DC', padding: { x: 3, y: 2 } }),
      )
      .setOrigin(0.5)
      .setDepth(9);
    this.tweens.add({ targets: this.jeep, y: this.jeep.y - 2, duration: 90, yoyo: true });
    this.time.delayedCall(RIDE.arriveMs, () => {
      bubble.destroy();
      go();
    });
  }

  private sceneExists(key: string): boolean {
    return key in (this.game.scene as unknown as { keys: Record<string, unknown> }).keys;
  }

  // ---- Navigation ------------------------------------------------------------------------------

  private goHome(): void {
    if (this.riding) return;
    this.cameras.main.fadeOut(FADE_MS, 0x2b, 0x22, 0x33);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENES.landing));
  }

  private bindKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.addCapture('TAB');
    const step = (dir: 1 | -1): void => {
      if (this.riding || this.cardEntry) return;
      if (this.view === 'list') {
        this.selected = Phaser.Math.Clamp(this.selected + dir, 1, ROSTER.length);
        this.listScroll = (this.selected - 1) * (MAP.list.h + MAP.list.gap) - MAP.list.h;
        this.layoutList();
        this.listCards.forEach((c, i) => c.setScale(i + 1 === this.selected ? 1.02 : 1));
      } else {
        this.select(((this.selected - 1 + dir + ROSTER.length) % ROSTER.length) + 1, false);
      }
    };
    kb.on('keydown-RIGHT', () => step(1));
    kb.on('keydown-DOWN', () => step(1));
    kb.on('keydown-LEFT', () => step(-1));
    kb.on('keydown-UP', () => step(-1));
    kb.on('keydown-ENTER', () => {
      if (this.riding) return;
      if (this.cardEntry?.status === 'playable') this.ride(this.cardEntry);
      else if (!this.cardEntry) this.openCard(entryAtStop(this.selected));
    });
    kb.on('keydown-ESC', () => this.closeCard());
    kb.on('keydown-TAB', () => {
      if (!this.riding && !this.cardEntry) this.setView(this.view === 'map' ? 'list' : 'map', true);
    });
    this.events.once('shutdown', () => {
      kb.removeAllListeners();
      kb.removeCapture('TAB');
      this.input.off('wheel');
    });
  }
}
