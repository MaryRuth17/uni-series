/**
 * CampusMapScene ("Mapa ng U-Belt", SPEC-homepage §4) — H4 illustrated map
 * Shows: the baked U-Belt map (map_ubelt: rooftops, avenues, the LRT-2 viaduct, the Pasig River, Quiapo,
 * street signs), the time-of-day tint with night lights (map_lights), ambient life (an LRT-2 train every
 * 20–30 s, jeepneys, tricycles and cars on the avenues, a river ferry, drifting water hyacinth, sparkles on
 * the water, cloud shadows, birds), the 7 campus buildings with pins (PUP playable with its progress and
 * sticker mark and a pulsing gold ring, the rest a "SOON" tag on their signboard), the player's jeepney, the HUD, the campus card, the list view
 * and the jeepney ride into the minigame (opening a card pops, sfx_pin; riding honks, sfx_jeep_horn). Tapping a stop zooms the world camera 10% toward it; a second,
 * fixed camera draws the UI so the HUD never zooms. Arriving from the landing, the map unfolds (0.92 → 1).
 * Listens to: pointer (taps, hover glow, list drag), mouse wheel (list), keyboard (arrows move between
 * stops, Enter opens / rides, Esc closes the card, Tab switches Map/List), the frame update (movers, clouds).
 */
import Phaser from 'phaser';
import { addViewCamera, RENDER_SCALE, sceneConfig } from '../ui/view';
import { gameEvents } from '../core/GameEvents';
import { t } from '../core/i18n';
import type { MapView } from '../core/SaveManager';
import { services } from '../core/services';
import {
  FADE_MS,
  HOME_SFX,
  MAP,
  MAP_AMBIENT,
  MAP_LIGHTS,
  MAP_TINT,
  MAP_UI_DEPTH,
  PALETTE,
  RIDE,
} from '../home/config';
import { phaseAt, type Phase } from '../home/TimeOfDay';
import { MAP_CAMPUSES, MAP_LRT, MAP_RIVER, road, type CampusPlot } from '../map/geometry';
import { type Point, pointAt, polylineLength, RoutePath, rideDurationMs } from '../map/RoutePath';
import { summaryFor, totalIpon } from '../minigames/progressSummary';
import { entryAtStop, ROSTER, type RosterEntry, ROUTE_NODES } from '../minigames/roster';
import { Button } from '../ui/Button';
import { openOverlay } from '../ui/overlay';
import { panel } from '../ui/Panel';
import { COLORS, SCENES, TEXT, textStyle } from '../ui/theme';
import { avatarHead } from '../ui/avatar';

export interface CampusMapData {
  /** A message to show on arrival, e.g. "+₱25 sa alkansya!" after a vacant. */
  toast?: string;
  /** 'landing' plays the paper-unfold transition (§6). */
  from?: 'landing';
}

/** World depths: under the tint (map, traffic, clouds) and above it (stops, jeep, bubbles). */
const DEPTH = {
  traffic: 3,
  clouds: 4,
  tint: 20,
  lights: 21,
  glow: 22,
  building: 23,
  stopUi: 24,
  jeep: 25,
  bubble: 26,
  birds: 27,
};

const ROUTE = new RoutePath(ROUTE_NODES);
const CARD_OPEN_Y = 360 - MAP.card.h / 2 - 6;
const CARD_HIDDEN_Y = 360 + MAP.card.h;
/** A building's footprint sits this far below the stop point. */
const BASE_DY = 12;
/** Lane offsets from the road's centre line (traffic keeps right). */
const LANE = { boulevard: 2.5, avenue: 1.8, street: 0.8 } as const;

interface Mover {
  obj: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
  path: Point[];
  len: number;
  d: number;
  dir: 1 | -1;
  speed: number;
  lane: number;
  /** bounce: turn around at the ends; wrap: start over at the far end. */
  mode: 'bounce' | 'wrap';
  rotate: boolean;
}

interface StopView {
  entry: RosterEntry;
  plot: CampusPlot;
  building: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Ellipse;
}

export class CampusMapScene extends Phaser.Scene {
  private view: MapView = 'map';
  private selected = 7;
  private phase: Phase = 'tanghali';
  private jeep!: Phaser.GameObjects.Container;
  private jeepSprite!: Phaser.GameObjects.Image;
  private jeepBoard!: Phaser.GameObjects.Container;
  private jeepSign!: Phaser.GameObjects.Text;
  private card!: Phaser.GameObjects.Container;
  private cardEntry: RosterEntry | null = null;
  private list!: Phaser.GameObjects.Container;
  private listCards: Phaser.GameObjects.Container[] = [];
  private listScroll = 0;
  private drag: { y: number; scroll: number; moved: boolean } | null = null;
  private toggle!: Button;
  private highlight!: Phaser.GameObjects.Ellipse;
  private stops = new Map<number, StopView>();
  private riding = false;
  private reduced = false;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private clouds: Phaser.GameObjects.Ellipse[] = [];
  private movers: Mover[] = [];

  constructor() {
    super(sceneConfig(SCENES.campusMap));
  }

  create(data: CampusMapData = {}): void {
    const save = services().save.data;
    this.view = save.home.mapView;
    this.selected = save.home.lastStop;
    this.riding = false;
    this.cardEntry = null;
    this.listScroll = 0;
    this.drag = null;
    this.clouds = [];
    this.movers = [];
    this.stops = new Map();
    this.reduced = save.settings.reducedMotion;
    this.phase = phaseAt(new Date(), save.home.theme);

    this.createAnims();
    this.add.image(0, 0, 'map_ubelt').setOrigin(0);
    this.drawAmbient();
    this.drawTint();
    this.drawStops();
    this.drawJeep(save.home.lastStop);
    this.buildList();
    this.drawHud();
    this.card = this.add.container(320, CARD_HIDDEN_Y).setDepth(50);
    this.setView(this.view, false);
    this.bindKeys();

    const main = this.cameras.main;
    main.setBounds(0, 0, 640, 360);
    this.uiCam = addViewCamera(this);
    this.syncCameras();

    this.fadeIn();
    services().audio.playMusic('music_home', this);
    services().audio.setAmbience(null, this);
    if (data.from === 'landing' && !this.reduced) {
      main.setZoom(RENDER_SCALE * MAP_AMBIENT.unfoldFrom);
      main.zoomTo(RENDER_SCALE, FADE_MS, 'Sine.easeOut');
    }
    if (data.toast) gameEvents.emit('toast', { text: data.toast });
  }

  override update(_time: number, delta: number): void {
    const dt = Math.min(delta, 100) / 1000;
    for (const m of this.movers) this.stepMover(m, dt);
    if (this.reduced) return;
    for (const c of this.clouds) {
      c.x -= MAP_AMBIENT.cloudSpeed * dt;
      if (c.x < -80) c.x = 720;
    }
  }

  // ---- Cameras -----------------------------------------------------------------------------------

  /** World objects go to the zooming main camera, UI (depth ≥ MAP_UI_DEPTH) to the fixed UI camera. */
  private syncCameras(): void {
    const main = this.cameras.main;
    for (const obj of this.children.list) {
      const depth = (obj as unknown as { depth: number }).depth;
      if (depth >= MAP_UI_DEPTH) main.ignore(obj);
      else this.uiCam.ignore(obj);
    }
  }

  private fadeIn(): void {
    for (const cam of [this.cameras.main, this.uiCam]) cam.fadeIn(FADE_MS, 0x2b, 0x22, 0x33);
  }

  private fadeOut(then: () => void): void {
    for (const cam of [this.cameras.main, this.uiCam]) cam.fadeOut(FADE_MS, 0x2b, 0x22, 0x33);
    this.cameras.main.once('camerafadeoutcomplete', then);
  }

  private zoomToward(x: number, y: number): void {
    if (this.reduced || this.view !== 'map') return;
    const main = this.cameras.main;
    main.pan(x, y, MAP.zoomMs, 'Sine.easeInOut', true);
    main.zoomTo(RENDER_SCALE * MAP.zoom, MAP.zoomMs, 'Sine.easeInOut', true);
  }

  private zoomReset(): void {
    if (this.reduced) return;
    const main = this.cameras.main;
    main.pan(320, 180, MAP.zoomMs, 'Sine.easeInOut', true);
    main.zoomTo(RENDER_SCALE, MAP.zoomMs, 'Sine.easeInOut', true);
  }

  // ---- Ambient life (§4.1) -----------------------------------------------------------------------

  private createAnims(): void {
    const anims: [string, string, number][] = [
      ['map_bird_flap', 'map_bird', 6],
      ['map_hyacinth_bob', 'map_hyacinth', 1],
    ];
    for (const [key, texture, frameRate] of anims) {
      if (this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(texture, { start: 0, end: 1 }),
        frameRate,
        repeat: -1,
      });
    }
  }

  private addMover(m: Omit<Mover, 'len'>): Mover {
    const mover = { ...m, len: polylineLength(m.path) };
    this.movers.push(mover);
    this.placeMover(mover);
    return mover;
  }

  private stepMover(m: Mover, dt: number): void {
    m.d += m.dir * m.speed * dt;
    if (m.mode === 'wrap') {
      if (m.d < 0) m.d += m.len;
      if (m.d > m.len) m.d -= m.len;
    } else if (m.d > m.len) {
      m.d = m.len;
      m.dir = -1;
    } else if (m.d < 0) {
      m.d = 0;
      m.dir = 1;
    }
    this.placeMover(m);
  }

  private placeMover(m: Mover): void {
    const p = pointAt(m.path, m.d);
    const a = pointAt(m.path, Math.max(0, m.d - 1));
    const b = pointAt(m.path, Math.min(m.len, m.d + 1));
    let angle = Math.atan2(b.y - a.y, b.x - a.x);
    if (m.dir < 0) angle += Math.PI;
    // Keep right: offset to the right-hand side of the direction of travel.
    m.obj.setPosition(p.x - Math.sin(angle) * m.lane, p.y + Math.cos(angle) * m.lane);
    if (m.rotate) m.obj.setRotation(angle);
  }

  /** LRT-2 train, traffic, the river, cloud shadows and birds. */
  private drawAmbient(): void {
    // The LRT-2 train runs its viaduct every 20–30 s, alternating direction.
    const train = this.add
      .image(-40, 0, 'map_train')
      .setDepth(DEPTH.traffic + 0.5)
      .setVisible(false);
    const lrtLen = polylineLength(MAP_LRT.points);
    let east = true;
    const runTrain = (): void => {
      const progress = { d: east ? 0 : lrtLen };
      const place = (): void => {
        const p = pointAt(MAP_LRT.points, progress.d);
        const q = pointAt(MAP_LRT.points, progress.d + (east ? 1 : -1));
        train.setPosition(p.x, p.y).setRotation(Math.atan2(q.y - p.y, q.x - p.x));
      };
      train.setVisible(true);
      place();
      this.tweens.add({
        targets: progress,
        d: east ? lrtLen : 0,
        duration: MAP_AMBIENT.trainMs,
        onUpdate: place,
        onComplete: () => train.setVisible(false),
      });
      east = !east;
      this.time.delayedCall(Phaser.Math.Between(...MAP_AMBIENT.trainEveryMs), runTrain);
    };
    this.time.delayedCall(Phaser.Math.Between(2000, 5000), runTrain);

    // Jeepneys, tricycles and cars on the avenues (traffic stays with Reduced Motion, D-035).
    for (const [roadId, frame] of MAP_AMBIENT.traffic) {
      const r = road(roadId);
      const len = polylineLength(r.points);
      this.addMover({
        obj: this.add.image(0, 0, 'map_mini', frame).setDepth(DEPTH.traffic),
        path: r.points,
        d: Phaser.Math.FloatBetween(0, len),
        dir: Phaser.Math.Between(0, 1) ? 1 : -1,
        speed: Phaser.Math.Between(...MAP_AMBIENT.trafficSpeed),
        lane: LANE[r.kind],
        mode: 'bounce',
        rotate: true,
      });
    }
    // A Pasig River ferry.
    this.addMover({
      obj: this.add.image(0, 0, 'map_boat').setDepth(DEPTH.traffic),
      path: MAP_RIVER.points,
      d: 120,
      dir: 1,
      speed: MAP_AMBIENT.boatSpeed,
      lane: 3,
      mode: 'bounce',
      rotate: true,
    });

    if (this.reduced) return;
    // Water hyacinth drifts downstream (west, toward Manila Bay); sparkles on the water.
    const riverLen = polylineLength(MAP_RIVER.points);
    for (let i = 0; i < MAP_AMBIENT.hyacinths; i++) {
      this.addMover({
        obj: this.add
          .sprite(0, 0, 'map_hyacinth')
          .setDepth(DEPTH.traffic - 0.5)
          .play({ key: 'map_hyacinth_bob', startFrame: i % 2 }),
        path: MAP_RIVER.points,
        d: (riverLen * i) / MAP_AMBIENT.hyacinths,
        dir: -1,
        speed: MAP_AMBIENT.hyacinthSpeed * Phaser.Math.FloatBetween(0.7, 1.3),
        lane: Phaser.Math.FloatBetween(-MAP_RIVER.width / 2 + 3, MAP_RIVER.width / 2 - 3),
        mode: 'wrap',
        rotate: false,
      });
    }
    for (let i = 0; i < MAP_AMBIENT.sparkles; i++) {
      const s = this.add.rectangle(0, 0, 3, 1, 0xffffff, 1).setDepth(DEPTH.traffic - 0.5);
      const move = (): void => {
        const p = pointAt(MAP_RIVER.points, Phaser.Math.FloatBetween(0, riverLen));
        s.setPosition(Math.round(p.x), Math.round(p.y + Phaser.Math.Between(-5, 5)));
      };
      move();
      s.setAlpha(0);
      this.tweens.add({
        targets: s,
        alpha: 0.8,
        duration: 700,
        yoyo: true,
        repeat: -1,
        delay: i * 450,
        repeatDelay: 1200,
        onRepeat: move,
      });
    }

    // Cloud shadows drift; birds cross now and then.
    this.clouds = [
      this.add.ellipse(160, 120, 140, 60, COLORS.ink, 0.07).setDepth(DEPTH.clouds),
      this.add.ellipse(520, 260, 120, 50, COLORS.ink, 0.07).setDepth(DEPTH.clouds),
    ];
    const bird = (): void => {
      const y = Phaser.Math.Between(40, 160);
      const b = this.add.sprite(-10, y, 'map_bird').setDepth(DEPTH.birds).play('map_bird_flap');
      this.uiCam.ignore(b);
      this.tweens.add({
        targets: b,
        x: 650,
        y: y - 20,
        duration: MAP_AMBIENT.birdMs,
        onComplete: () => b.destroy(),
      });
      this.time.delayedCall(Phaser.Math.Between(...MAP_AMBIENT.birdEveryMs), bird);
    };
    this.time.delayedCall(Phaser.Math.Between(...MAP_AMBIENT.birdEveryMs), bird);
  }

  private drawTint(): void {
    const [color, alpha] = MAP_TINT[this.phase];
    if (alpha > 0) this.add.rectangle(320, 180, 640, 360, color, alpha).setDepth(DEPTH.tint);
    const lights = MAP_LIGHTS[this.phase];
    if (lights > 0) {
      this.add
        .image(0, 0, 'map_lights')
        .setOrigin(0)
        .setDepth(DEPTH.lights)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(lights);
    }
  }

  // ---- Campus stops (§4.2) -----------------------------------------------------------------------

  private drawStops(): void {
    const save = services().save.data;
    const night = this.phase === 'gabi';
    this.highlight = this.add
      .ellipse(0, 0, 40, 12)
      .setStrokeStyle(2, COLORS.red)
      .setDepth(DEPTH.glow + 0.5);
    if (!this.reduced) {
      this.tweens.add({
        targets: this.highlight,
        alpha: 0.4,
        duration: 600,
        yoyo: true,
        repeat: -1,
      });
    }
    for (const entry of ROSTER) {
      const plot = MAP_CAMPUSES[entry.id];
      const playable = entry.status === 'playable';
      const baseY = entry.y + BASE_DY;
      const glow = this.add
        .ellipse(entry.x, baseY - 2, 10, 10, PALETTE.glow, 0)
        .setDepth(DEPTH.glow);
      const building = this.add
        .image(entry.x, baseY, `map_campus_${plot.art}`, night ? 1 : 0)
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.building);
      if (this.phase === 'hapon') building.setTint(0xffe6cf);
      glow.setSize(building.width + 12, 16);
      const top = baseY - building.height;
      this.stops.set(entry.stop, { entry, plot, building, glow });

      const pin = this.add
        .image(entry.x, top + 2, 'map_pin', playable ? 0 : 1)
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.stopUi);
      if (playable && !this.reduced) {
        this.tweens.add({
          targets: pin,
          y: top - 2,
          duration: 200,
          yoyo: true,
          repeat: -1,
          repeatDelay: MAP.bounceMs - 400,
          ease: 'Sine.easeOut',
        });
      }

      // Tap target: the building and its pin. Hover grows the pin and lights the ground (§4.2).
      const zoneH = building.height + 34;
      const zone = this.add
        .zone(entry.x, baseY - zoneH / 2 + 2, Math.max(36, building.width), zoneH)
        .setDepth(DEPTH.stopUi)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this.select(entry.stop, true));
      zone.on('pointerover', () => {
        pin.setScale(1.1);
        glow.setFillStyle(PALETTE.glow, 0.6);
      });
      zone.on('pointerout', () => {
        pin.setScale(1);
        glow.setFillStyle(PALETTE.glow, 0);
      });

      // One signboard per stop (owner, H4): the playable campus on a yellow board in red,
      // the rest on a cream board with a red "SOON" tag.
      const label = this.add
        .text(entry.x, baseY + 10, entry.campus, textStyle(8, playable ? TEXT.red : TEXT.ink))
        .setOrigin(0.5)
        .setDepth(DEPTH.stopUi + 0.1);
      let signW = label.width + 12;
      if (!playable) {
        const soon = this.add
          .text(0, baseY + 10, t('map.soon'), textStyle(8, TEXT.cream))
          .setOrigin(0.5)
          .setDepth(DEPTH.stopUi + 0.2);
        const tagW = soon.width + 6;
        signW = label.width + tagW + 14;
        const left = entry.x - signW / 2;
        label.setX(left + 6 + label.width / 2);
        const tagX = left + signW - 4 - tagW / 2;
        soon.setX(tagX);
        this.add
          .rectangle(tagX, baseY + 10, tagW, 9, 0x5a6478)
          .setStrokeStyle(1, COLORS.ink)
          .setDepth(DEPTH.stopUi + 0.15);
      }
      this.add
        .nineslice(
          entry.x,
          baseY + 10,
          playable ? 'ui_board' : 'ui_panel',
          undefined,
          signW,
          15,
          6,
          6,
          6,
          6,
        )
        .setDepth(DEPTH.stopUi);

      if (playable) {
        // A gold ring pulses around the playable campus so it is found at a glance.
        if (!this.reduced) {
          const ring = this.add
            .ellipse(entry.x, baseY - 2, building.width + 16, 20)
            .setStrokeStyle(2, PALETTE.gold)
            .setDepth(DEPTH.glow);
          this.tweens.add({
            targets: ring,
            scale: 1.25,
            alpha: 0,
            duration: 1400,
            repeat: -1,
            ease: 'Sine.easeOut',
          });
        }
        const s = summaryFor(entry.id, save);
        if (s.pin) {
          this.add
            .text(
              entry.x,
              baseY + 23,
              t(s.pin.key, s.pin.params),
              textStyle(8, TEXT.ink, { backgroundColor: '#FFF4DC', padding: { x: 2, y: 0 } }),
            )
            .setOrigin(0.5)
            .setDepth(DEPTH.stopUi);
        }
        if (save.stickers.includes(entry.stickerId)) {
          this.add
            .star(entry.x + 11, top - 22, 5, 3, 6, PALETTE.gold)
            .setStrokeStyle(1, COLORS.ink)
            .setDepth(DEPTH.stopUi + 0.2);
        }
      }
    }
    this.moveHighlight();
  }

  /** The player's jeepney, parked on the road at the jeepney stop beside its campus (H4). */
  private drawJeep(stop: number): void {
    const p = ROUTE.stopPoint(stop);
    this.jeepSprite = this.add.image(0, 0, 'map_jeep').setRotation(this.parkedHeading(stop));
    // The route board shows the destination only while riding (§4.4).
    this.jeepSign = this.add
      .text(0, -14, entryAtStop(stop).area.toUpperCase(), textStyle(8, TEXT.red))
      .setOrigin(0.5);
    const board = this.add.nineslice(0, -14, 'ui_board', undefined, 40, 13, 6, 6, 6, 6);
    this.jeepBoard = this.add.container(0, 0, [board, this.jeepSign]).setVisible(false);
    this.jeep = this.add
      .container(p.x, p.y, [this.jeepSprite, this.jeepBoard])
      .setDepth(DEPTH.jeep);
    if (this.phase === 'hapon') this.jeepSprite.setTint(0xffe6cf);
  }

  /** Which way the parked jeepney faces: along the road it stands on. */
  private parkedHeading(stop: number): number {
    const i = ROUTE.indexOfStop(stop);
    const nodes = ROUTE.nodes;
    const [a, b] = i > 0 ? [nodes[i - 1], nodes[i]] : [nodes[i], nodes[i + 1]];
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  private setJeepSign(text: string): void {
    this.jeepSign.setText(text);
    (this.jeepBoard.list[0] as Phaser.GameObjects.NineSlice).setSize(this.jeepSign.width + 10, 13);
  }

  private drawHud(): void {
    const save = services().save.data;
    const hud = (o: Phaser.GameObjects.GameObject & { setDepth(d: number): unknown }): void => {
      o.setDepth(40);
    };
    hud(
      new Button(this, MAP.home.x, MAP.home.y, '', () => this.goHome(), {
        width: 26,
        height: 22,
        icon: 'icon_home',
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
      // The School ID chip only shows who is playing; the character is made on the landing (H4).
      const chip = this.add.container(180, MAP.idChip.y, [
        panel(this, 0, 0, MAP.idChip.w, 22),
        avatarHead(this, -48, 0, save.profile),
        this.add.text(8, -1, save.profile.name, textStyle(8)).setOrigin(0.5),
      ]);
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
        '',
        () => openOverlay(this, SCENES.settings),
        { width: 24, height: 22, icon: 'icon_settings' },
      ),
    );
    hud(
      new Button(
        this,
        MAP.stickerBook.x,
        MAP.stickerBook.y,
        '',
        () => openOverlay(this, SCENES.stickerBook),
        { width: 24, height: 24, icon: 'icon_stickers' },
      ),
    );
    hud(
      new Button(this, MAP.album.x, MAP.album.y, '', () => openOverlay(this, SCENES.album), {
        width: 24,
        height: 24,
        icon: 'icon_album',
      }),
    );
  }

  // ---- List view (§4.5) --------------------------------------------------------------------------

  private buildList(): void {
    const L = MAP.list;
    this.list = this.add.container(0, 0).setDepth(MAP_UI_DEPTH);
    const bg = this.add.rectangle(320, 180, 640, 360, 0xf3e6c8).setInteractive();
    this.list.add(bg);
    this.list.add(
      this.add.text(320, 30, t('map.listTitle'), textStyle(8, TEXT.ink)).setOrigin(0.5),
    );
    const save = services().save.data;
    this.listCards = ROSTER.map((entry) => {
      const playable = entry.status === 'playable';
      const cardBg = this.add
        .rectangle(0, 0, L.w, L.h, playable ? COLORS.yellow : 0xe6dcc6)
        .setStrokeStyle(1, COLORS.ink);
      cardBg.setInteractive({ useHandCursor: true });
      cardBg.on('pointerdown', (p: Phaser.Input.Pointer) => this.dragStart(p));
      cardBg.on('pointerup', () => {
        if (!this.drag?.moved) this.openCard(entry);
        this.drag = null;
      });
      const items: Phaser.GameObjects.GameObject[] = [
        cardBg,
        this.add
          .image(-L.w / 2 + 34, L.h / 2 - 6, `map_campus_${MAP_CAMPUSES[entry.id].art}`)
          .setOrigin(0.5, 1)
          .setScale(playable ? 1 : 0.9)
          .setAlpha(playable ? 1 : 0.75),
        this.add.text(-L.w / 2 + 72, -14, `${entry.campus} · ${entry.area}`, textStyle(8)),
      ];
      if (playable) {
        // Only the playable game shows its title; the rest just say "Coming soon" (owner, H4).
        const s = summaryFor(entry.id, save);
        items.push(
          this.add.text(-L.w / 2 + 72, 2, t(`roster.${entry.id}.title`), textStyle(16, TEXT.red)),
          this.add.rectangle(L.w / 2 - 50, 0, 64, 16, PALETTE.jeepGreen),
          this.add.text(L.w / 2 - 50, 0, t('map.playNow'), textStyle(8, TEXT.cream)).setOrigin(0.5),
        );
        if (s.pin)
          items.push(
            this.add
              .text(L.w / 2 - 120, 0, t(s.pin.key, s.pin.params), textStyle(8))
              .setOrigin(0.5),
          );
      } else {
        items.push(this.add.text(-L.w / 2 + 72, 2, t('map.soonTitle'), textStyle(16, '#7A6A55')));
      }
      const card = this.add.container(320, 0, items);
      this.list.add(card);
      return card;
    });
    this.layoutList();
    // Touch: drag to scroll. Mouse: wheel. Keyboard: arrows (bindKeys).
    bg.on('pointerdown', (p: Phaser.Input.Pointer) => this.dragStart(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.drag || !p.isDown || this.view !== 'list') return;
      const dy = p.y / RENDER_SCALE - this.drag.y;
      if (Math.abs(dy) > 6) this.drag.moved = true;
      this.listScroll = this.drag.scroll - dy;
      this.layoutList();
    });
    this.input.on('pointerup', () => {
      if (this.drag && !this.drag.moved) return; // let the card's pointerup handle a tap
      if (this.drag?.moved) {
        // Snap to the nearest card so no row is left half-hidden.
        const step = MAP.list.h + MAP.list.gap;
        this.listScroll = Math.round(this.listScroll / step) * step;
        this.layoutList();
      }
      this.drag = null;
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (this.view === 'list' && !this.cardEntry) this.scrollList(dy > 0 ? 1 : -1);
    });
  }

  private dragStart(p: Phaser.Input.Pointer): void {
    if (this.view !== 'list' || this.cardEntry) return;
    this.drag = { y: p.y / RENDER_SCALE, scroll: this.listScroll, moved: false };
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
    this.toggle.label.setColor(TEXT.ink);
    this.toggle.label.setText(
      view === 'map'
        ? `[${t('map.viewMap')}] ${t('map.viewList')}`
        : `${t('map.viewMap')} [${t('map.viewList')}]`,
    );
    if (view === 'list') this.zoomReset();
    if (remember) services().save.update((d) => (d.home.mapView = view));
  }

  // ---- Selection and campus card (§4.3) ----------------------------------------------------------

  private select(stop: number, open: boolean): void {
    if (this.riding) return;
    this.selected = stop;
    this.moveHighlight();
    if (open) this.openCard(entryAtStop(stop));
  }

  private moveHighlight(): void {
    const s = this.stops.get(this.selected);
    if (!s) return;
    this.highlight
      .setPosition(s.entry.x, s.entry.y + BASE_DY - 1)
      .setSize(s.building.width + 8, 12);
  }

  private openCard(entry: RosterEntry): void {
    if (this.riding) return;
    // Every way of opening a card (stop, list card, keyboard) makes the same soft pop (L-037).
    services().audio.sfx(HOME_SFX.pin);
    this.cardEntry = entry;
    this.selected = entry.stop;
    this.moveHighlight();
    this.zoomToward(entry.x, entry.y);
    const C = MAP.card;
    this.card.removeAll(true);
    const playable = entry.status === 'playable';
    const left = -C.w / 2;
    const thumbX = left + 8 + C.thumb / 2;
    const building = this.add
      .image(thumbX, C.thumb / 2 - 10, `map_campus_${MAP_CAMPUSES[entry.id].art}`)
      .setOrigin(0.5, 1);
    building.setScale(Math.min((C.thumb - 12) / building.width, (C.thumb - 26) / building.height));
    const items: Phaser.GameObjects.GameObject[] = [
      panel(this, 0, 0, C.w, C.h).setInteractive(),
      this.add
        .rectangle(thumbX, -12, C.thumb, C.thumb - 24, 0xbfe0ff)
        .setStrokeStyle(1, COLORS.ink),
      this.add
        .rectangle(thumbX, C.thumb / 2 - 12, C.thumb, 24, 0x8bc163)
        .setStrokeStyle(1, COLORS.ink),
      building,
      this.add.text(left + 116, -66, `${entry.campus} ${entry.area}`, textStyle(8)),
    ];
    if (playable) {
      items.push(
        this.add.text(left + 116, -54, t(`roster.${entry.id}.title`), textStyle(16, TEXT.red)),
        this.add.text(
          left + 116,
          -34,
          t(`roster.${entry.id}.tagline`),
          textStyle(8, TEXT.ink, { wordWrap: { width: 230 } }),
        ),
      );
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
          sound: null, // ride() honks the jeepney horn instead
        }),
      );
    } else {
      // Other campuses: just "Coming soon", no game title yet (owner, H4).
      items.push(this.add.text(left + 116, -40, t('map.soonTitle'), textStyle(16, '#7A6A55')));
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
    this.zoomReset();
    this.tweens.killTweensOf(this.card);
    this.tweens.add({
      targets: this.card,
      y: CARD_HIDDEN_Y,
      duration: MAP.card.slideMs,
      ease: 'Sine.easeIn',
    });
  }

  // ---- Jeepney ride (§4.4) -----------------------------------------------------------------------

  private ride(entry: RosterEntry): void {
    if (this.riding) return;
    this.riding = true;
    services().audio.sfx(HOME_SFX.jeepHorn);
    this.closeCard();
    this.setView('map', false);
    const from = services().save.data.home.lastStop;
    services().save.update((d) => (d.home.lastStop = entry.stop));
    this.setJeepSign(entry.area.toUpperCase());
    this.jeepBoard.setVisible(true);

    if (this.reduced) {
      this.arrive(entry, false);
      return;
    }
    const path = ROUTE.pathBetween(from, entry.stop);
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
        const ahead = pointAt(path, progress.d + 1);
        // Turn along the road (the sprite faces right).
        if (Math.hypot(ahead.x - p.x, ahead.y - p.y) > 0.1)
          this.jeepSprite.setRotation(Math.atan2(ahead.y - p.y, ahead.x - p.x));
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
      this.cameras.main.ignore(skip);
    });
  }

  private arrive(entry: RosterEntry, animate: boolean): void {
    const end = ROUTE.stopPoint(entry.stop);
    this.jeep.setPosition(end.x, end.y);
    const go = (): void =>
      this.fadeOut(() => {
        const target =
          entry.introScene && this.sceneExists(entry.introScene)
            ? entry.introScene
            : SCENES.comingSoon;
        this.scene.start(target, { id: entry.id });
      });
    if (!animate) {
      go();
      return;
    }
    const bubble = this.add
      .text(
        this.jeep.x,
        this.jeep.y - 30,
        t('map.para'),
        textStyle(8, TEXT.ink, { backgroundColor: '#FFF4DC', padding: { x: 3, y: 2 } }),
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.bubble);
    this.uiCam.ignore(bubble);
    this.tweens.add({ targets: this.jeep, y: this.jeep.y - 2, duration: 90, yoyo: true });
    this.time.delayedCall(RIDE.arriveMs, () => {
      bubble.destroy();
      go();
    });
  }

  private sceneExists(key: string): boolean {
    return key in (this.game.scene as unknown as { keys: Record<string, unknown> }).keys;
  }

  // ---- Navigation --------------------------------------------------------------------------------

  private goHome(): void {
    if (this.riding) return;
    this.fadeOut(() => this.scene.start(SCENES.landing));
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
      this.input.off('pointermove');
      this.input.off('pointerup');
    });
  }
}
