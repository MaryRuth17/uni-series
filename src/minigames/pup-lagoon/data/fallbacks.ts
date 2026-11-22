/**
 * Hand-made listahan used when the generator fails 200 times (OC-8; replaces calendar.ts).
 * Short, cheap tag lists that fit the smallest baon of each tier. Tests prove each tier has one that works.
 */
import type { Tag, Tier } from '../logic/types';

export const FALLBACKS: Readonly<Record<Tier, readonly (readonly Tag[])[]>> = {
  1: [
    ['tusok', 'inumin', 'ihaw'],
    ['tusok', 'inumin'],
  ],
  2: [
    ['merienda', 'malamig', 'tusok'],
    ['merienda', 'inumin'],
  ],
  3: [
    ['malamig', 'merienda', 'tusok'],
    ['merienda', 'matamis'],
  ],
  4: [
    ['malamig', 'merienda', 'tusok', 'ihaw'],
    ['merienda', 'matamis'],
  ],
};
