/**
 * LagoonResultScene — how the vacant ended (owner rules, DECISIONS L-034)
 * Shows, on a notebook page over the dimmed PUP front: a win ("Busog at kumpleto!": what was spent of the
 * baon, the leftover going to the alkansya, the Kumpleto / Busog / Sulit stamps, the session's ipon and
 * how many vacants were cleared) or game over (why: over the baon, the listahan unfinished, or no money
 * left for what is still needed, with the missing lines). A win counts toward this session's progress and
 * offers the next vacant; game over resets the run to vacant 1 ("Start over"). Nothing is kept once the
 * website is closed (D-052).
 * Listens to: pointer; keyboard (Enter = next / start over, Esc = back to the campus map).
 */
import Phaser from 'phaser';
import { sceneConfig } from '../../../ui/view';
import { t } from '../../../core/i18n';
import { services } from '../../../core/services';
import { FADE_MS } from '../../../home/config';
import { Button } from '../../../ui/Button';
import { COLORS, SCENES, TEXT, textStyle } from '../../../ui/theme';
import { LAGOON_AMBIENCE, LAGOON_MUSIC, SFX } from '../config';
import { lineText, loadProgress, storeProgress } from '../lagoonSave';
import type { VacantResult } from '../logic/LagoonVacant';
import type { GeneratedVacant } from '../logic/ListahanGen';
import { applyOutcome, newProgress } from '../logic/Progress';
import type { Verdict } from '../logic/RunRules';
import { LAGOON_INTRO } from './LagoonIntroScene';
import { LAGOON_RESULT } from './LagoonStallsScene';

interface ResultData {
  verdict?: Verdict;
  result?: VacantResult | null;
  gen?: GeneratedVacant;
}

export class LagoonResultScene extends Phaser.Scene {
  private leaving = false;

  constructor() {
    super(sceneConfig(LAGOON_RESULT));
  }

  create(data: ResultData): void {
    this.leaving = false;
    if (!data.verdict || !data.gen) {
      this.scene.start(LAGOON_INTRO);
      return;
    }
    const { verdict, gen } = data;
    const save = services().save;
    const win = verdict.kind === 'win' && !!data.result;

    // Record the session's progress: a win moves on; game over starts the run again.
    let progress = loadProgress(save);
    if (win && data.result) progress = applyOutcome(progress, data.result).progress;
    else progress = newProgress((Date.now() ^ (gen.def.n * 2654435761)) >>> 0);
    storeProgress(save, progress);

    this.add.image(-260, 0, 'lagoon_intro').setOrigin(0);
    this.add.rectangle(320, 180, 640, 360, COLORS.ink, 0.55);
    const CX = 108;
    const CY = 26;
    this.add.image(CX, CY, 'note_card').setOrigin(0);
    const left = CX + 46;

    this.add
      .text(
        320,
        CY + 30,
        t(win ? 'pupLagoon.result.winTitle' : 'pupLagoon.result.loseTitle'),
        textStyle(32, win ? '#3A9A6A' : TEXT.red),
      )
      .setOrigin(0.5)
      .setStroke('#FFF4DC', 4);

    if (win && data.result) {
      const r = data.result;
      let y = CY + 66;
      this.add.text(320, y, t('pupLagoon.result.winText'), textStyle(8, TEXT.ink)).setOrigin(0.5);
      y += 22;
      this.add.text(
        left,
        y,
        t('pupLagoon.result.spent', { spent: r.spent, baon: gen.def.baon }),
        textStyle(16),
      );
      y += 22;
      this.add.text(
        left,
        y,
        t('pupLagoon.result.leftover', { leftover: r.leftover }),
        textStyle(8, TEXT.ink),
      );
      y += 16;
      this.add.text(
        left,
        y,
        t('pupLagoon.result.ipon', { ipon: progress.iponBalance }),
        textStyle(8, TEXT.ink),
      );
      y += 16;
      this.add.text(
        left,
        y,
        t('pupLagoon.result.streak', { n: progress.vacants }),
        textStyle(8, TEXT.grey),
      );
      // Rubber stamps.
      (['kumpleto', 'busog', 'sulit'] as const).forEach((k, i) => {
        const on = r.stamps[k];
        const sx = 340 + i * 62;
        const sy = CY + 150;
        const ring = this.add.circle(sx, sy, 24).setStrokeStyle(3, on ? COLORS.red : 0xc9c0aa);
        const label = this.add
          .text(sx, sy, t(`pupLagoon.result.stamp.${k}`), textStyle(8, on ? TEXT.red : TEXT.grey))
          .setOrigin(0.5);
        ring.setAngle(-12 + i * 9);
        label.setAngle(-12 + i * 9);
        if (on && !services().save.data.settings.reducedMotion) {
          for (const o of [ring, label]) {
            o.setScale(2).setAlpha(0);
            this.tweens.add({
              targets: o,
              scale: 1,
              alpha: 1,
              duration: 260,
              delay: 400 + i * 260,
              ease: 'Back.easeOut',
            });
          }
        }
      });
    } else {
      const v = verdict;
      let y = CY + 70;
      const reason =
        v.kind === 'overspent'
          ? t('pupLagoon.result.overspent', { short: v.short })
          : v.kind === 'broke'
            ? t('pupLagoon.result.broke')
            : t('pupLagoon.result.incomplete');
      const text = this.add.text(
        left,
        y,
        reason,
        textStyle(8, TEXT.ink, { wordWrap: { width: 320 } }),
      );
      y += text.height + 8;
      if (v.kind === 'incomplete' || v.kind === 'broke') {
        for (const id of v.missing) {
          const line = gen.lines.find((l) => l.id === id);
          if (!line) continue;
          this.add.image(left + 6, y + 5, 'ui_check', 0);
          this.add.text(left + 16, y, lineText(line), textStyle(8, TEXT.red));
          y += 14;
        }
      }
      y += 8;
      this.add.text(
        left,
        y,
        t('pupLagoon.result.streak', { n: Math.max(0, gen.def.n - 1) }),
        textStyle(8, TEXT.grey),
      );
    }

    const go = new Button(
      this,
      390,
      300,
      t(win ? 'pupLagoon.result.next' : 'pupLagoon.result.again'),
      () => this.leave(LAGOON_INTRO),
      {
        width: 130,
        height: 24,
        fill: COLORS.yellow,
        textColor: TEXT.red,
        fontSize: 16,
      },
    );
    new Button(this, 240, 300, t('pupLagoon.result.back'), () => this.leave(SCENES.campusMap), {
      width: 120,
      height: 24,
    });
    services().audio.playMusic(LAGOON_MUSIC, this);
    services().audio.setAmbience(LAGOON_AMBIENCE, this);
    services().audio.sfx(win ? SFX.win : SFX.lose);
    const kb = this.input.keyboard;
    kb?.on('keydown-ENTER', () => go.press());
    kb?.on('keydown-ESC', () => this.leave(SCENES.campusMap));
    this.events.once('shutdown', () => kb?.removeAllListeners());
    this.cameras.main.fadeIn(FADE_MS, 0x2b, 0x22, 0x33);
  }

  private leave(target: string): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(FADE_MS, 0x2b, 0x22, 0x33);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(target));
  }
}
