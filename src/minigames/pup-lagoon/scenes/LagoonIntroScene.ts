/**
 * LagoonIntroScene — the Vacant card (SPEC-pup-lagoon OC-1, §10.2 "Day card") — L2 greybox, finished in L4
 * Shows: the next vacant: number and time slot, any special (tutorial, petsa de peligro, payday), event
 * and rule, the baon as coins and bills (+ pasabay money), the busog target, the listahan, and stalls that
 * just opened. Tara! goes to the stalls (LagoonStallsScene); Balik sa mapa returns to the campus map.
 * Listens to: pointer; Enter = Tara!, Esc = back.
 */
import Phaser from 'phaser';
import { sceneConfig } from '../../../ui/view';
import { t } from '../../../core/i18n';
import { services } from '../../../core/services';
import { FADE_MS } from '../../../home/config';
import { Button } from '../../../ui/Button';
import { panel } from '../../../ui/Panel';
import { COLORS, SCENES, TEXT, textStyle } from '../../../ui/theme';
import { TIER_STARTS } from '../config';
import { lineText, loadProgress } from '../lagoonSave';
import { openStalls, tierFor } from '../logic/Catalog';
import { generateVacant, type GeneratedVacant } from '../logic/ListahanGen';
import { Rhythm } from '../logic/Rhythm';

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

    this.add.rectangle(320, 180, 640, 360, 0x5e8c61);
    panel(this, 320, 180, 400, 320);
    this.add.rectangle(320, 34, 400, 20, COLORS.ink);
    this.add
      .text(
        320,
        34,
        t('pupLagoon.card.title', { n, slot: t(`pupLagoon.slot.${def.slot}`) }),
        textStyle(8, TEXT.cream),
      )
      .setOrigin(0.5);

    const notes: string[] = [];
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
    let y = 52;
    for (const note of notes) {
      const text = this.add.text(
        320,
        y,
        note,
        textStyle(8, TEXT.red, { align: 'center', wordWrap: { width: 370 } }),
      );
      text.setOrigin(0.5, 0);
      y += text.height + 2;
    }

    const pasabay = g.lines.reduce((s, l) => s + (l.money ?? 0), 0);
    y += 6;
    this.add.text(140, y, t('pupLagoon.card.baon', { baon: def.baon }), textStyle(16));
    this.add.text(140, y + 20, g.baonPieces.map((p) => `₱${p}`).join(' · '), textStyle(8));
    if (pasabay)
      this.add.text(
        140,
        y + 32,
        t('pupLagoon.card.pasabayMoney', { money: pasabay }),
        textStyle(8, TEXT.grey),
      );
    this.add
      .text(500, y + 4, t('pupLagoon.card.busog', { n: g.busogTarget }), textStyle(8))
      .setOrigin(1, 0);

    y += 52;
    this.add.text(140, y, t('pupLagoon.card.listahan'), textStyle(8, TEXT.grey));
    y += 12;
    for (const line of g.lines) {
      this.add.text(150, y, `[ ] ${lineText(line)}`, textStyle(8));
      y += 12;
    }

    const go = new Button(this, 380, 316, t('pupLagoon.ui.start'), () => this.start(), {
      width: 100,
      height: 24,
      fill: COLORS.yellow,
      textColor: TEXT.red,
      fontSize: 16,
    });
    new Button(this, 240, 316, t('pupLagoon.card.back'), () => this.back(), {
      width: 110,
      height: 24,
    });
    this.input.keyboard?.on('keydown-ENTER', () => go.press());
    this.input.keyboard?.on('keydown-ESC', () => this.back());
    this.events.once('shutdown', () => this.input.keyboard?.removeAllListeners());
    this.cameras.main.fadeIn(FADE_MS, 0x2b, 0x22, 0x33);
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
