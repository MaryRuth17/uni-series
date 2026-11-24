/**
 * U-Belt map geometry (SPEC-homepage §4.1), shared with the art script (scripts/art/map.mjs) so the
 * baked map and the moving things on it (LRT-2 train, traffic, boats) line up.
 */
import geo from './mapGeometry.json';
import type { Point } from './RoutePath';

export type RoadKind = 'boulevard' | 'avenue' | 'street';

export interface MapRoad {
  id: string;
  kind: RoadKind;
  points: Point[];
}

export interface CampusPlot {
  /** Building texture: map_campus_<art>. */
  art: string;
  x: number;
  y: number;
  shape: 'rect' | 'diamond';
  w: number;
  h: number;
}

const toPoints = (pts: number[][]): Point[] => pts.map(([x, y]) => ({ x, y }));

export const MAP_ROADS: readonly MapRoad[] = geo.roads.map((r) => ({
  id: r.id,
  kind: r.kind as RoadKind,
  points: toPoints(r.points),
}));

export const MAP_LRT = {
  points: toPoints(geo.lrt.points),
  stations: geo.lrt.stations as Record<'recto' | 'legarda' | 'pureza', number>,
};

export const MAP_RIVER = { width: geo.river.width, points: toPoints(geo.river.points) };

export const MAP_CAMPUSES = geo.campuses as Record<string, CampusPlot>;

export function road(id: string): MapRoad {
  const r = MAP_ROADS.find((x) => x.id === id);
  if (!r) throw new Error(`Unknown road: ${id}`);
  return r;
}
