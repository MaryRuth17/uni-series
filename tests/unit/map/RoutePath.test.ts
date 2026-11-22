import { describe, expect, it } from 'vitest';
import { pointAt, polylineLength, RoutePath, rideDurationMs } from '../../../src/map/RoutePath';
import { ROSTER, ROUTE_NODES } from '../../../src/minigames/roster';

describe('RoutePath (SPEC-homepage §4.4)', () => {
  const route = new RoutePath(ROUTE_NODES);

  it('measures polylines and finds points along them', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 3, y: 10 },
    ];
    expect(polylineLength(path)).toBe(11);
    expect(pointAt(path, 5)).toEqual({ x: 3, y: 4 });
    expect(pointAt(path, 8)).toEqual({ x: 3, y: 7 });
    expect(pointAt(path, 99)).toEqual({ x: 3, y: 10 });
  });

  it('every roster stop is on the route at its own position', () => {
    for (const r of ROSTER) expect(route.stopPoint(r.stop)).toEqual({ x: r.x, y: r.y });
  });

  it('a ride from stop 7 to stop 1 and back follows the same road and ends exactly on the stop', () => {
    const there = route.pathBetween(7, 1);
    const back = route.pathBetween(1, 7);
    expect(there).toEqual([...back].reverse());
    expect(there[0]).toEqual(route.stopPoint(7));
    expect(pointAt(there, polylineLength(there))).toEqual(route.stopPoint(1));
    expect(polylineLength(there)).toBeCloseTo(route.length, 6);
  });

  it('ride time is 120 px/s, clamped to 1.2–3 s', () => {
    expect(rideDurationMs(0)).toBe(1200);
    expect(rideDurationMs(240)).toBe(2000);
    expect(rideDurationMs(10_000)).toBe(3000);
    expect(rideDurationMs(route.length)).toBe(3000);
    expect(rideDurationMs(polylineLength(route.pathBetween(6, 7)))).toBeGreaterThan(1200);
  });
});
