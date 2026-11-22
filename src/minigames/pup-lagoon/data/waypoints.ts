/**
 * The Lagoon walking graph (SPEC-pup-lagoon §10.1): one node in front of each stall window or kiosk,
 * four around the plaza, two by the Lagoon (north and east, so paths never cross the water), three at the
 * benches, and one by the water station. Positions are on the 640×360 map.
 */
import type { StallKey } from '../logic/types';

export interface WaypointNode {
  id: string;
  x: number;
  y: number;
}

export const WAYPOINT_NODES: readonly WaypointNode[] = [
  // In front of the stall-row windows (zone D, windows centred at x 140 / 220 / 300 / 400).
  { id: 'palamig', x: 140, y: 108 },
  { id: 'merienda', x: 220, y: 108 },
  { id: 'lugawan', x: 300, y: 108 },
  { id: 'ihaw', x: 400, y: 108 },
  // Beside the red kiosks (zone E, x 8–88).
  { id: 'karinderya', x: 100, y: 135 },
  { id: 'silog', x: 100, y: 201 },
  { id: 'halohalo', x: 100, y: 267 },
  // The tusok cart by the Lagoon's upper edge, and the water station by the benches.
  { id: 'tusok', x: 455, y: 182 },
  { id: 'water', x: 462, y: 288 },
  // Around the plaza (centre 250, 190, radius 56).
  { id: 'plazaN', x: 250, y: 124 },
  { id: 'plazaE', x: 316, y: 190 },
  { id: 'plazaS', x: 250, y: 256 },
  { id: 'plazaW', x: 184, y: 190 },
  // Along the Lagoon (ellipse centre 410, 225, 124×80).
  { id: 'lagoonN', x: 395, y: 168 },
  { id: 'lagoonE', x: 492, y: 232 },
  // At the three benches (tambayan, y 296–352).
  { id: 'bench1', x: 170, y: 288 },
  { id: 'bench2', x: 290, y: 288 },
  { id: 'bench3', x: 410, y: 288 },
];

/** Walkable paths between nodes (both directions). None crosses the plaza planter or the water. */
export const WAYPOINT_EDGES: readonly (readonly [string, string])[] = [
  ['palamig', 'merienda'],
  ['merienda', 'lugawan'],
  ['lugawan', 'ihaw'],
  ['karinderya', 'palamig'],
  ['karinderya', 'silog'],
  ['silog', 'halohalo'],
  ['karinderya', 'plazaW'],
  ['silog', 'plazaW'],
  ['halohalo', 'plazaS'],
  ['halohalo', 'bench1'],
  ['plazaN', 'merienda'],
  ['plazaN', 'lugawan'],
  ['plazaN', 'plazaE'],
  ['plazaE', 'plazaS'],
  ['plazaS', 'plazaW'],
  ['plazaW', 'plazaN'],
  ['plazaE', 'lagoonN'],
  ['lagoonN', 'lugawan'],
  ['lagoonN', 'ihaw'],
  ['lagoonN', 'tusok'],
  ['tusok', 'lagoonE'],
  ['lagoonE', 'water'],
  ['lagoonE', 'bench3'],
  ['plazaS', 'bench1'],
  ['plazaS', 'bench2'],
  ['bench1', 'bench2'],
  ['bench2', 'bench3'],
  ['bench3', 'water'],
];

/** The node in front of each stall, where the player joins its pila. */
export const STALL_NODE: Readonly<Record<StallKey, string>> = {
  karinderya: 'karinderya',
  tusok: 'tusok',
  palamig: 'palamig',
  ihaw: 'ihaw',
  merienda: 'merienda',
  lugawan: 'lugawan',
  halohalo: 'halohalo',
  silog: 'silog',
  water: 'water',
};

/** Where the player stands when a vacant starts: by the middle bench, with the barkada. */
export const START_NODE = 'bench2';
