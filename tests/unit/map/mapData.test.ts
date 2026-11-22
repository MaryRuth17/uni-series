import { describe, expect, it } from 'vitest';
import { MAP_AMBIENT, MAP_LRT, MAP_ROADS, MAP_TINT } from '../../../src/home/config';

describe('campus map data (SPEC-homepage §4.1)', () => {
  it('draws the six named roads inside the map, labels included', () => {
    expect(MAP_ROADS.map((r) => r[0])).toEqual([
      'espana',
      'recto',
      'legarda',
      'mendiola',
      'morayta',
      'magsaysay',
    ]);
    for (const [, x1, y1, x2, y2, lx, ly] of MAP_ROADS) {
      for (const [x, y] of [
        [x1, y1],
        [x2, y2],
        [lx, ly],
      ]) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(640);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(360);
      }
    }
    for (const i of MAP_AMBIENT.jeepRoads) expect(MAP_ROADS[i]).toBeDefined();
  });

  it('runs the LRT-2 every 20–30 s past Recto, Legarda and Pureza', () => {
    expect(MAP_AMBIENT.trainEveryMs).toEqual([20000, 30000]);
    expect(Object.keys(MAP_LRT.stations)).toEqual(['recto', 'legarda', 'pureza']);
  });

  it('tints by time of day, darkest at night, none at noon', () => {
    expect(MAP_TINT.tanghali[1]).toBe(0);
    for (const [, alpha] of Object.values(MAP_TINT)) {
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThanOrEqual(MAP_TINT.gabi[1]);
    }
    expect(MAP_AMBIENT.unfoldFrom).toBe(0.92);
  });
});
