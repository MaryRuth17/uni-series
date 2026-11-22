import { describe, expect, it } from 'vitest';
import {
  STALL_NODE,
  START_NODE,
  WAYPOINT_EDGES,
  WAYPOINT_NODES,
} from '../../../src/minigames/pup-lagoon/data/waypoints';
import { Walker, WaypointGraph } from '../../../src/minigames/pup-lagoon/logic/Walker';

const graph = new WaypointGraph(WAYPOINT_NODES, WAYPOINT_EDGES);

/** Distance from point to segment. */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax;
  const vy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

describe('Lagoon waypoint graph (SPEC-pup-lagoon §10.1)', () => {
  it('reaches every stall and bench from the start', () => {
    for (const id of graph.ids) expect(graph.path(START_NODE, id).at(-1)).toBe(id);
    for (const node of Object.values(STALL_NODE)) expect(graph.ids).toContain(node);
  });

  it('no path crosses the Lagoon water or the plaza planter', () => {
    for (const [a, b] of WAYPOINT_EDGES) {
      const na = graph.node(a);
      const nb = graph.node(b);
      for (let i = 0; i <= 50; i++) {
        const x = na.x + ((nb.x - na.x) * i) / 50;
        const y = na.y + ((nb.y - na.y) * i) / 50;
        const inWater = ((x - 410) / 62) ** 2 + ((y - 225) / 40) ** 2 < 1;
        expect(inWater, `${a}–${b} crosses the Lagoon at ${x.toFixed(0)},${y.toFixed(0)}`).toBe(
          false,
        );
      }
      // The planter and sign stand in the middle of the plaza (radius ~20).
      expect(
        segDist(250, 190, na.x, na.y, nb.x, nb.y),
        `${a}–${b} crosses the planter`,
      ).toBeGreaterThan(20);
    }
  });

  it('finds the shortest path and the nearest node', () => {
    expect(graph.path('palamig', 'ihaw')).toEqual(['palamig', 'merienda', 'lugawan', 'ihaw']);
    expect(graph.path('ihaw', 'ihaw')).toEqual(['ihaw']);
    expect(graph.nearest(452, 186)).toBe('tusok');
    expect(graph.nearest(10, 10)).toBe('karinderya');
    expect(() => graph.path('palamig', 'nowhere')).toThrow();
  });
});

describe('Walker', () => {
  it('walks the route at the given speed and arrives exactly on the node', () => {
    const w = new Walker(graph, 'palamig');
    w.goTo('merienda');
    expect(w.moving).toBe(true);
    expect(w.update(500, 80)).toBe(false); // 40 px of 80
    expect(w.pos.x).toBeCloseTo(180, 5);
    expect(w.update(500, 80)).toBe(true);
    expect(w.pos).toEqual({ x: 220, y: 108 });
    expect(w.at).toBe('merienda');
    expect(w.moving).toBe(false);
  });

  it('carries leftover distance across corners', () => {
    const w = new Walker(graph, 'palamig');
    w.goTo('lugawan');
    // palamig → merienda → lugawan is 160 px; 1.5 s at 80 px/s is 120 px: past the corner, not there yet.
    expect(w.update(1500, 80)).toBe(false);
    expect(w.at).toBe('merienda');
    expect(w.pos.x).toBeCloseTo(260, 5);
    expect(w.update(500, 80)).toBe(true);
    expect(w.at).toBe('lugawan');
  });

  it('changing course mid-walk finishes the current step, then reroutes', () => {
    const w = new Walker(graph, 'palamig');
    w.goTo('ihaw');
    w.update(250, 80); // 20 px toward merienda
    w.goTo('karinderya');
    expect(w.destination).toBe('karinderya');
    for (let i = 0; i < 100 && w.moving; i++) w.update(100, 80);
    expect(w.at).toBe('karinderya');
  });

  it('stays put when already there, and stop() halts', () => {
    const w = new Walker(graph, START_NODE);
    w.goTo(START_NODE);
    expect(w.moving).toBe(false);
    w.goTo('plazaS');
    w.stop();
    expect(w.moving).toBe(false);
    expect(w.update(1000, 80)).toBe(false);
  });
});
