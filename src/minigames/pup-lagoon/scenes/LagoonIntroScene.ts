/**
 * LagoonIntroScene — the Vacant card (SPEC-pup-lagoon OC-1, §10.2 "Day card") — L6 notebook page
 * Shows, on a spiral notebook page over a dimmed view of the PUP front: the next vacant: number and time slot, any special (tutorial, petsa de peligro, payday), event
 * and rule, the baon as coins and bills (+ pasabay money), the busog target as rice bowls, the listahan
 * with pencil check boxes, and stalls that
 * just opened. Tara! goes to the stalls (LagoonStallsScene); Balik sa mapa returns to the campus map.
 * Listens to: pointer; Enter = Tara!, Esc = back.
 */
import Phaser from 'phaser';
import { sceneConfig } from '../../../ui/view';
import { t } from '../../../core/i18n';
import { services } from '../../../core/services';
import { FADE_MS } from '../../../home/config';
import { Button } from '../../../ui/Button';
import { COLORS, SCENES, TEXT, textStyle } from '../../../ui/theme';
import { LAGOON_AMBIENCE, LAGOON_MUSIC, TIER_STARTS } from '../config';
import { lineText, loadProgress } from '../lagoonSave';
import { openStalls, tierFor } from '../logic/Catalog';
import { generateVacant, type GeneratedVacant } from '../logic/ListahanGen';
import { Rhythm } from '../logic/Rhythm';
import { bowlRow, moneyRow } from '../objects/lagoonUi';

/** Frames of the ui_slot icon. */
const SLOT_FRAME: Readonly<Record<string, number>> = { umaga: 0, tanghali: 1, hapon: 2 };

export const LAGOON_INTRO = 'LagoonIntroScene';
export const LAGOON_STALLS = 'LagoonStalls';

export class LagoonIntroScene extends Phaser.Scene {
  private leaving = false;
  private gen!: GeneratedVacant;

  constructor() {
    super(sceneConfig(LAGOON_INTRO));
  }

  create(): void {
    this.leaving = false;
    const progress = loadProgress(services().save);
    const n = progress.vacants + 1;
    const def = new Rhythm(progress.saveSeed).vacant(n);
    this.gen = generateVacant(def, { saveSeed: progress.saveSeed, owned: progress.owned });
    const g = this.gen;

    // A spiral notebook page over a dimmed view of the PUP front (L6 polish).
    this.add.image(-260, 0, 'lagoon_intro').setOrigin(0);
    this.add.rectangle(320, 180, 640, 360, COLORS.ink, 0.55);
    const CX = 108;
    const CY = 26;
    this.add.image(CX, CY, 'note_card').setOrigin(0);
    /** Writing sits on the page's ruled lines: the text top for line k. */
    const line = (k: number): number => CY + 44 + k * 14 - 11;
    const left = CX + 42;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => o;

    this.add.image(left + 8, CY + 24, 'ui_slot', SLOT_FRAME[def.slot] ?? 1);
    this.add
      .text(
        left + 22,
        CY + 24,
        t('pupLagoon.card.title', { n, slot: t(`pupLagoon.slot.${def.slot}`) }),
        textStyle(16, TEXT.ink),
      )
      .setOrigin(0, 0.5);

    // The owner's rule first (L-034): stay within the baon, buy the whole listahan.
    const notes: string[] = [t('pupLagoon.card.rule', { baon: def.baon })];
    if (def.special === 'tutorial') notes.push(t('pupLagoon.ui.tutorial'));
    if (def.special === 'pdp') notes.push(t('pupLagoon.ui.petsa'));
    if (def.special === 'kinsenas' || def.special === 'katapusan')
      notes.push(t(`pupLagoon.ui.${def.special}`));
    if (g.event === 'promo' && g.promo) {
      notes.push(t('pupLagoon.event.promo', { promo: t(`pupLagoon.promo.${g.promo.key}`) }));
    } else if (g.event === 'longLine' && g.longLineStall) {
      notes.push(t('pupLagoon.event.longLine', { stall: t(`pupLagoon.stall.${g.longLineStall}`) }));
    } else if (g.event) {
      notes.push(t(`pupLagoon.event.${g.event}`));
    }
    if (g.noSpicy) notes.push(t('pupLagoon.rule.noSpicy'));
    const opened = this.newlyOpened(n, progress.owned);
    if (opened.length) {
      notes.push(
        t('pupLagoon.card.newStalls', {
          stalls: opened.map((s) => t(`pupLagoon.stall.${s}`)).join(', '),
        }),
      );
    }
    let k = 1;
    for (const note of notes) {
      const text = this.add.text(
        left,
        line(k),
        note,
        textStyle(8, TEXT.red, { wordWrap: { width: 350 } }),
      );
      k += Math.max(1, Math.round(text.height / 12));
    }
    const top = k + (notes.length ? 1 : 0);

    // Left: the listahan, with pencil check boxes.
    this.add.text(left, line(top), t('pupLagoon.card.listahan'), textStyle(8, TEXT.grey));
    g.lines.forEach((l, i) => {
      this.add.image(left + 6, line(top + 1 + i) + 5, 'ui_check', 0);
      this.add.text(left + 16, line(top + 1 + i), lineText(l), textStyle(8, TEXT.ink));
    });

    // Right: the baon as coins and bills, pasabay money, the busog target as bowls.
    const rx = CX + 236;
    const pasabay = g.lines.reduce((s, l) => s + (l.money ?? 0), 0);
    this.add.text(rx, line(top) - 6, t('pupLagoon.card.baon', { baon: def.baon }), textStyle(16));
    moneyRow(this, add, rx, line(top + 2) + 2, g.baonPieces);
    if (pasabay)
      this.add.text(
        rx,
        line(top + 3),
        t('pupLagoon.card.pasabayMoney', { money: pasabay }),
        textStyle(8, TEXT.grey),
      );
    this.add.text(rx, line(top + 4), t('pupLagoon.card.busog', { n: g.busogTarget }), textStyle(8));
    bowlRow(this, add, rx, line(top + 5) + 5, 0, g.busogTarget);

    const go = new Button(this, 380, 300, t('pupLagoon.ui.start'), () => this.start(), {
      width: 100,
      height: 24,
      fill: COLORS.yellow,
      textColor: TEXT.red,
      fontSize: 16,
    });
    new Button(this, 240, 300, t('pupLagoon.card.back'), () => this.back(), {
      width: 110,
      height: 24,
    });
    this.input.keyboard?.on('keydown-ENTER', () => go.press());
    this.input.keyboard?.on('keydown-ESC', () => this.back());
    this.events.once('shutdown', () => this.input.keyboard?.removeAllListeners());
    this.cameras.main.fadeIn(FADE_MS, 0x2b, 0x22, 0x33);
    services().audio.playMusic(LAGOON_MUSIC, this);
    services().audio.setAmbience(LAGOON_AMBIENCE, this);
  }

  /** Stalls that open on this vacant (the first vacant of a tier). */
  private newlyOpened(n: number, owned: readonly string[]): string[] {
    if (n === 1 || !TIER_STARTS.some((s) => s.from === n)) return [];
    const before = new Set(openStalls(tierFor(n - 1), owned));
    return openStalls(tierFor(n), owned).filter((s) => !before.has(s));
  }

  private start(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(FADE_MS, 0x2b, 0x22, 0x33);
    this.cameras.main.once('camerafadeoutcomplete', () =>
      this.scene.start(LAGOON_STALLS, { gen: this.gen }),
    );
  }

  private back(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(FADE_MS, 0x2b, 0x22, 0x33);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENES.campusMap));
  }
}
