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
    x: 190,
    y: 75,
    status: 'soon',
    stickerId: 'sticker-ust',
  },
  {
    id: 'feu-deco',
    campus: 'FEU',
    area: 'Morayta',
    stop: 2,
    x: 135,
    y: 167,
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
    x: 245,
    y: 218,
    status: 'soon',
    stickerId: 'sticker-ue',
  },
  {
    id: 'sanbeda-shoot',
    campus: 'San Beda',
    area: 'Mendiola',
    stop: 5,
    x: 300,
    y: 236,
    status: 'soon',
    stickerId: 'sticker-sanbeda',
  },
  {
    id: 'ceu-lab',
    campus: 'CEU',
    area: 'Mendiola',
    stop: 6,
    x: 380,
    y: 232,
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
    introScene: 'LagoonIntroScene',
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
 * The jeepney route: the stops in order, with road bends so the jeepney follows streets
 * (Recto under the LRT-2, then along Legarda and Magsaysay toward Sta. Mesa). Adjust by eye in H3.
 */
export const ROUTE_NODES: readonly RouteNode[] = [
  { x: 190, y: 75, stop: 1 },
  { x: 160, y: 120 },
  { x: 135, y: 167, stop: 2 },
  { x: 205, y: 165 },
  { x: 272, y: 159, stop: 3 },
  { x: 262, y: 195 },
  { x: 245, y: 218, stop: 4 },
  { x: 300, y: 236, stop: 5 },
  { x: 380, y: 232, stop: 6 },
  { x: 470, y: 226 },
  { x: 555, y: 248, stop: 7 },
];
