/**
 * The jeepney route through the campus stops (SPEC-homepage §4.2, §4.4). Pure: no Phaser.
 * Nodes are in route order; nodes with `stop` are campus stops, the rest are road bends.
 * A ride from stop A to stop B follows the polyline between them, backwards if B comes first.
 */
export interface Point {
  x: number;
  y: number;
}

export interface RouteNode extends Point {
  stop?: number;
}

export function polylineLength(points: readonly Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return len;
}

/** The point `distance` along the polyline (clamped to its ends). */
export function pointAt(points: readonly Point[], distance: number): Point {
  if (points.length === 0) throw new Error('pointAt: empty path');
  let left = Math.max(0, distance);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    // Snap to the vertex when float error leaves us a hair short, so rides end exactly on the stop.
    if (Math.abs(seg - left) < 1e-9) return { x: b.x, y: b.y };
    if (left <= seg) {
      const f = seg === 0 ? 1 : left / seg;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
    left -= seg;
  }
  const last = points[points.length - 1];
  return { x: last.x, y: last.y };
}

/** Ride time at `speed` px/s, clamped to [minMs, maxMs] (§4.4: 120 px/s, 1.2–3 s). */
export function rideDurationMs(length: number, speed = 120, minMs = 1200, maxMs = 3000): number {
  return Math.min(maxMs, Math.max(minMs, (length / speed) * 1000));
}

export class RoutePath {
  readonly nodes: readonly RouteNode[];

  constructor(nodes: readonly RouteNode[]) {
    this.nodes = nodes;
  }

  get length(): number {
    return polylineLength(this.nodes);
  }

  indexOfStop(stop: number): number {
    const i = this.nodes.findIndex((n) => n.stop === stop);
    if (i < 0) throw new Error(`RoutePath: no stop ${stop}`);
    return i;
  }

  stopPoint(stop: number): Point {
    const n = this.nodes[this.indexOfStop(stop)];
    return { x: n.x, y: n.y };
  }

  /** The road from one stop to another, ending exactly on the destination stop. */
  pathBetween(from: number, to: number): Point[] {
    const a = this.indexOfStop(from);
    const b = this.indexOfStop(to);
    const slice = this.nodes
      .slice(Math.min(a, b), Math.max(a, b) + 1)
      .map((n) => ({ x: n.x, y: n.y }));
    return a <= b ? slice : slice.reverse();
  }
}
