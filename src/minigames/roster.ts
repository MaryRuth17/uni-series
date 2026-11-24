/**
 * The minigame roster (SPEC-homepage §5): the map, the list view and the campus cards all read this.
 * Titles, taglines and teasers are i18n keys: roster.<id>.title / .tagline / .teaser.
 * Progress never lives here; it comes from the save (see progressSummary.ts).
 */
import type { RouteNode } from '../map/RoutePath';

export interface RosterEntry {
  id: string;
  campus: string;
  area: string;
  stop: number;
  x: number;
  y: number;
  status: 'playable' | 'soon';
  /** Scene key of the minigame's intro; ComingSoonScene is used until it exists. */
  introScene?: string;
  /** Sticker for the Sticker Book. */
  stickerId: string;
}

export const ROSTER: readonly RosterEntry[] = [
  {
    id: 'ust-paskuhan',
    campus: 'UST',
    area: 'España',
    stop: 1,
    x: 177,
    y: 98,
    status: 'soon',
    stickerId: 'sticker-ust',
  },
  {
    id: 'feu-deco',
    campus: 'FEU',
    area: 'Morayta',
    stop: 2,
    x: 100,
    y: 170,
    status: 'soon',
    stickerId: 'sticker-feu',
  },
  {
    id: 'nu-peprally',
    campus: 'NU',
    area: 'Sampaloc',
    stop: 3,
    x: 272,
    y: 159,
    status: 'soon',
    stickerId: 'sticker-nu',
  },
  {
    id: 'ue-bookhunt',
    campus: 'UE',
    area: 'Recto',
    stop: 4,
    x: 212,
    y: 170,
    status: 'soon',
    stickerId: 'sticker-ue',
  },
  {
    id: 'sanbeda-shoot',
    campus: 'San Beda',
    area: 'Mendiola',
    stop: 5,
    x: 302,
    y: 240,
    status: 'soon',
    stickerId: 'sticker-sanbeda',
  },
  {
    id: 'ceu-lab',
    campus: 'CEU',
    area: 'Mendiola',
    stop: 6,
    x: 376,
    y: 238,
    status: 'soon',
    stickerId: 'sticker-ceu',
  },
  {
    id: 'pup-lagoon',
    campus: 'PUP',
    area: 'Sta. Mesa',
    stop: 7,
    x: 555,
    y: 248,
    status: 'playable',
    introScene: 'LagoonOpening',
    stickerId: 'sticker-pup',
  },
];

export function rosterEntry(id: string): RosterEntry {
  const e = ROSTER.find((r) => r.id === id);
  if (!e) throw new Error(`Unknown minigame: ${id}`);
  return e;
}

export function entryAtStop(stop: number): RosterEntry {
  const e = ROSTER.find((r) => r.stop === stop);
  if (!e) throw new Error(`No campus at stop ${stop}`);
  return e;
}

/**
 * The jeepney route, on the roads of the baked map (src/map/mapGeometry.json): each stop is the jeepney
 * stop on the street beside its campus, and the jeepney drives España, Recto, Legarda, Mendiola,
 * Magsaysay and Pureza between them (H4). Side trips (to NU, to the Mendiola stops) go up a street and
 * come back down it, as a jeepney would.
 */
export const ROUTE_NODES: readonly RouteNode[] = [
  { x: 204, y: 132, stop: 1 }, // UST, on España
  { x: 130, y: 192 },
  { x: 100, y: 190, stop: 2 }, // FEU, on Recto
  { x: 130, y: 192 },
  { x: 245, y: 206 },
  { x: 296, y: 208 },
  { x: 296, y: 168, stop: 3 }, // NU, up Jhocson
  { x: 296, y: 208 },
  { x: 245, y: 206 },
  { x: 212, y: 202, stop: 4 }, // UE, on Recto
  { x: 245, y: 206 },
  { x: 300, y: 208 },
  { x: 340, y: 205 },
  { x: 340, y: 232, stop: 5 }, // San Beda, on Mendiola
  { x: 340, y: 248, stop: 6 }, // CEU, on Mendiola
  { x: 340, y: 205 },
  { x: 398, y: 200 },
  { x: 500, y: 194 },
  { x: 540, y: 191 },
  { x: 540, y: 224, stop: 7 }, // PUP, on Pureza
];
