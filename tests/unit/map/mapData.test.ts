import { describe, expect, it } from 'vitest';
import { MAP_AMBIENT, MAP_LIGHTS, MAP_TINT } from '../../../src/home/config';
import { MAP_CAMPUSES, MAP_LRT, MAP_RIVER, MAP_ROADS, road } from '../../../src/map/geometry';
import { pointAt } from '../../../src/map/RoutePath';
import { ROSTER } from '../../../src/minigames/roster';

/** Distance from a point to a polyline. */
function distance(p: { x: number; y: number }, pts: readonly { x: number; y: number }[]): number {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
  }
  return best;
}

describe('campus map data (SPEC-homepage §4.1, H4 geometry)', () => {
  it('has the roads the spec names, all reaching into the map', () => {
    const ids = MAP_ROADS.map((r) => r.id);
    for (const id of ['espana', 'recto', 'legarda', 'mendiola', 'morayta', 'magsaysay'])
      expect(ids).toContain(id);
    for (const r of MAP_ROADS) {
      expect(r.points.length).toBeGreaterThanOrEqual(2);
      expect(
        r.points.some((p) => p.x >= 0 && p.x <= 640 && p.y >= 0 && p.y <= 360),
        r.id,
      ).toBe(true);
    }
    for (const [id] of MAP_AMBIENT.traffic) expect(road(id).id).toBe(id);
  });

  it('puts every campus stop on its plot, clear of the avenues and the river', () => {
    for (const r of ROSTER) {
      const plot = MAP_CAMPUSES[r.id];
      expect(plot, r.id).toBeDefined();
      expect([plot.x, plot.y]).toEqual([r.x, r.y]);
      for (const rd of MAP_ROADS.filter((x) => x.kind !== 'street'))
        expect(distance(r, rd.points), `${r.id} vs ${rd.id}`).toBeGreaterThan(12);
      expect(distance(r, MAP_RIVER.points), r.id).toBeGreaterThan(MAP_RIVER.width / 2 + 12);
    }
  });

  it('runs the LRT-2 every 20–30 s past Recto, Legarda and Pureza, across the whole map', () => {
    expect(MAP_AMBIENT.trainEveryMs).toEqual([20000, 30000]);
    expect(Object.keys(MAP_LRT.stations)).toEqual(['recto', 'legarda', 'pureza']);
    expect(pointAt(MAP_LRT.points, 0).x).toBeLessThan(0);
    expect(MAP_LRT.points[MAP_LRT.points.length - 1].x).toBeGreaterThan(640);
  });

  it('tints by time of day, darkest at night, none at noon; lights only after dark', () => {
    expect(MAP_TINT.tanghali[1]).toBe(0);
    for (const [, alpha] of Object.values(MAP_TINT)) {
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThanOrEqual(MAP_TINT.gabi[1]);
    }
    expect(MAP_LIGHTS.umaga).toBe(0);
    expect(MAP_LIGHTS.tanghali).toBe(0);
    expect(MAP_LIGHTS.gabi).toBe(1);
    expect(MAP_AMBIENT.unfoldFrom).toBe(0.92);
  });
});
