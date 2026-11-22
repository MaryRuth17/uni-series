import { describe, expect, it } from 'vitest';
import { defaultSave } from '../../../src/core/SaveManager';
import { summaryFor, totalIpon } from '../../../src/minigames/progressSummary';
import { ROSTER } from '../../../src/minigames/roster';

describe('roster (SPEC-homepage §5)', () => {
  it('has unique ids, stops 1–7, positions inside 640×360 and exactly one playable entry', () => {
    expect(new Set(ROSTER.map((r) => r.id)).size).toBe(7);
    expect(ROSTER.map((r) => r.stop).sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const r of ROSTER) {
      expect(r.x).toBeGreaterThan(0);
      expect(r.x).toBeLessThan(640);
      expect(r.y).toBeGreaterThan(0);
      expect(r.y).toBeLessThan(360);
    }
    const playable = ROSTER.filter((r) => r.status === 'playable');
    expect(playable.map((r) => r.id)).toEqual(['pup-lagoon']);
    expect(playable[0].introScene).toBe('LagoonIntroScene');
  });
});

describe('progress summaries (OC-12, H-006)', () => {
  it('shows PUP ipon, vacants and the sticker; never stars', () => {
    const save = defaultSave(new Date(), false);
    expect(summaryFor('pup-lagoon', save).pin).toEqual({ key: 'map.ipon', params: { ipon: 0 } });
    save.minigames['pup-lagoon'] = { iponBalance: 240, vacants: 12 };
    save.stickers = ['sticker-pup'];
    const s = summaryFor('pup-lagoon', save);
    expect(s.ipon).toBe(240);
    expect(s.lines).toEqual([
      { key: 'map.progress', params: { vacants: 12, ipon: 240 } },
      { key: 'map.sticker.yes' },
    ]);
    expect(summaryFor('ust-paskuhan', save)).toEqual({ pin: null, lines: [], ipon: 0 });
    expect(
      totalIpon(
        save,
        ROSTER.map((r) => r.id),
      ),
    ).toBe(240);
  });
});
