/**
 * Walking on the Lagoon's waypoint graph (SPEC-pup-lagoon §4.2, §10.1): tap a stall, bench or spot and
 * the player walks there along fixed paths, always the shortest way, at WALK_SPEED px/s (slower in the
 * rain without the Payong). Pure: no Phaser; time only through update(dtMs).
 */
import type { WaypointNode } from '../data/waypoints';

export interface Point {
  x: number;
  y: number;
}

export class WaypointGraph {
  private readonly nodes = new Map<string, WaypointNode>();
  private readonly adj = new Map<string, { to: string; d: number }[]>();

  constructor(nodes: readonly WaypointNode[], edges: readonly (readonly [string, string])[]) {
    for (const n of nodes) {
      this.nodes.set(n.id, n);
      this.adj.set(n.id, []);
    }
    for (const [a, b] of edges) {
      const na = this.node(a);
      const nb = this.node(b);
      const d = Math.hypot(na.x - nb.x, na.y - nb.y);
      this.adj.get(a)?.push({ to: b, d });
      this.adj.get(b)?.push({ to: a, d });
    }
  }

  node(id: string): WaypointNode {
    const n = this.nodes.get(id);
    if (!n) throw new Error(`Unknown waypoint: ${id}`);
    return n;
  }

  get ids(): string[] {
    return [...this.nodes.keys()];
  }

  /** Node ids from `from` to `to` (inclusive) along the shortest path (Dijkstra). */
  path(from: string, to: string): string[] {
    const dist = new Map<string, number>([[from, 0]]);
    const prev = new Map<string, string>();
    const open = new Set<string>([from]);
    while (open.size) {
      let cur = '';
      let best = Infinity;
      for (const id of open) {
        const d = dist.get(id) ?? Infinity;
        if (d < best) {
          best = d;
          cur = id;
        }
      }
      open.delete(cur);
      if (cur === to) break;
      for (const { to: next, d } of this.adj.get(cur) ?? []) {
        const nd = best + d;
        if (nd < (dist.get(next) ?? Infinity)) {
          dist.set(next, nd);
          prev.set(next, cur);
          open.add(next);
        }
      }
    }
    if (!dist.has(to)) throw new Error(`No path from ${from} to ${to}`);
    const out = [to];
    while (out[0] !== from) out.unshift(prev.get(out[0]) as string);
    return out;
  }

  /** The node closest to a tapped point. */
  nearest(x: number, y: number): string {
    let best = '';
    let bestD = Infinity;
    for (const n of this.nodes.values()) {
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < bestD) {
        bestD = d;
        best = n.id;
      }
    }
    return best;
  }
}

export class Walker {
  private readonly graph: WaypointGraph;
  /** Where the player is now. */
  readonly pos: Point;
  /** The last node reached. */
  at: string;
  private route: string[] = [];

  constructor(graph: WaypointGraph, start: string) {
    this.graph = graph;
    const n = graph.node(start);
    this.pos = { x: n.x, y: n.y };
    this.at = start;
  }

  get moving(): boolean {
    return this.route.length > 0;
  }

  /** Final node of the current walk, or null when standing still. */
  get destination(): string | null {
    return this.route.length ? this.route[this.route.length - 1] : null;
  }

  /**
   * Walk to a node. Mid-walk, the player first finishes the step toward the next node, then follows the
   * new shortest path from there.
   */
  goTo(target: string): void {
    this.graph.node(target);
    const from = this.route.length ? this.route[0] : this.at;
    const path = this.graph.path(from, target);
    this.route = this.route.length ? path : path.slice(1);
    if (
      !this.route.length &&
      (this.pos.x !== this.graph.node(target).x || this.pos.y !== this.graph.node(target).y)
    ) {
      this.route = [target];
    }
  }

  /** Stop where you are (the next tap starts from the last node reached). */
  stop(): void {
    this.route = [];
  }

  /** Advance by speed px/s. Returns true on the frame the walk arrives. */
  update(dtMs: number, speed: number): boolean {
    if (!this.route.length) return false;
    let budget = (speed * dtMs) / 1000;
    while (budget > 0 && this.route.length) {
      const n = this.graph.node(this.route[0]);
      const dx = n.x - this.pos.x;
      const dy = n.y - this.pos.y;
      const d = Math.hypot(dx, dy);
      if (d <= budget) {
        this.pos.x = n.x;
        this.pos.y = n.y;
        this.at = n.id;
        this.route.shift();
        budget -= d;
      } else {
        this.pos.x += (dx / d) * budget;
        this.pos.y += (dy / d) * budget;
        budget = 0;
      }
    }
    return this.route.length === 0;
  }
}
