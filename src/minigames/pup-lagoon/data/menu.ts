/**
 * The Lagoon menu: 46 items (SPEC-pup-lagoon §7). Prices are game prices; tune them here.
 * Names are i18n keys: pupLagoon.food.<key>.
 */
import type { MenuItem, StallKey, Tag } from '../logic/types';

const FREE_DRINK = 'free_iced_tea';
const GRILL_SECONDS = 5;

function item(
  key: string,
  stall: StallKey,
  price: number,
  tags: Tag[],
  busog: number,
  extra: Partial<MenuItem> = {},
): MenuItem {
  return { key, nameKey: `pupLagoon.food.${key}`, stall, price, tags, busog, ...extra };
}

const meal = { freeItem: FREE_DRINK };
const tusok = { needsSawsawan: true };
const grill = { grillSeconds: GRILL_SECONDS };

export const MENU: readonly MenuItem[] = [
  // Kusina ni Aling Bebang: every rice meal is ₱70 with a free iced tea.
  item('adobo_meal', 'karinderya', 70, ['kanin'], 5, meal),
  item('curry_meal', 'karinderya', 70, ['kanin', 'maanghang'], 5, meal),
  item('teriyaki_meal', 'karinderya', 70, ['kanin'], 5, meal),
  item('chopsuey_meal', 'karinderya', 70, ['kanin', 'gulay'], 5, meal),
  item('liempo_meal', 'karinderya', 70, ['kanin', 'ihaw'], 6, meal),
  item('tonkatsu_meal', 'karinderya', 70, ['kanin'], 6, meal),
  item(FREE_DRINK, 'karinderya', 0, ['inumin', 'malamig'], 0, { orderable: false }),
  // Tusok ni Mang Caloy
  item('fishball', 'tusok', 10, ['tusok'], 1, tusok),
  item('kikiam', 'tusok', 10, ['tusok'], 1, tusok),
  item('squidball', 'tusok', 15, ['tusok'], 1, tusok),
  item('tokneneng', 'tusok', 18, ['tusok'], 2, tusok),
  item('kwekkwek', 'tusok', 20, ['tusok'], 2, tusok),
  item('fewa', 'tusok', 30, ['tusok'], 3, tusok),
  // Palamig ni Ate Joy
  item('gulaman', 'palamig', 20, ['inumin', 'malamig', 'matamis'], 1),
  item('melon', 'palamig', 20, ['inumin', 'malamig', 'matamis'], 1),
  item('buko', 'palamig', 25, ['inumin', 'malamig'], 1),
  item('softdrinks', 'palamig', 25, ['inumin', 'malamig', 'matamis'], 0),
  item('water_bottle', 'palamig', 15, ['inumin'], 0),
  item('iced_coffee', 'palamig', 35, ['inumin', 'malamig'], 0),
  // Ihawan ni Kuya Jun
  item('betamax', 'ihaw', 10, ['ihaw'], 1, grill),
  item('isaw', 'ihaw', 15, ['ihaw'], 1, grill),
  item('hotdog_stick', 'ihaw', 20, ['ihaw'], 2, grill),
  item('bbq', 'ihaw', 25, ['ihaw'], 2, grill),
  item('mais', 'ihaw', 25, ['ihaw', 'gulay'], 2, grill),
  item('bbq_rice', 'ihaw', 45, ['kanin', 'ihaw'], 4, grill),
  // Merienda ni Lola Pacing
  item('pandesal', 'merienda', 10, ['merienda'], 2),
  item('turon', 'merienda', 15, ['merienda', 'matamis'], 2),
  item('kamotecue', 'merienda', 15, ['merienda', 'matamis'], 2),
  item('puto', 'merienda', 15, ['merienda', 'matamis'], 1),
  item('bananacue', 'merienda', 20, ['merienda', 'matamis'], 2),
  item('siopao', 'merienda', 35, ['merienda'], 3),
  // Lugawan sa Lagoon
  item('lugaw', 'lugawan', 25, ['sabaw'], 3),
  item('tokwa', 'lugawan', 30, ['maanghang'], 2),
  item('lugaw_egg', 'lugawan', 35, ['sabaw'], 4),
  item('goto', 'lugawan', 45, ['sabaw'], 4),
  item('mami', 'lugawan', 45, ['sabaw'], 4),
  // Halo-Halo Corner
  item('icecandy', 'halohalo', 10, ['malamig', 'matamis'], 0),
  item('iskrambol', 'halohalo', 20, ['malamig', 'matamis'], 1),
  item('lecheflan', 'halohalo', 30, ['matamis'], 1),
  item('maiscon', 'halohalo', 35, ['malamig', 'matamis'], 2),
  item('halohalo', 'halohalo', 50, ['malamig', 'matamis'], 2),
  // Silog Express
  item('hotsilog', 'silog', 55, ['kanin'], 5),
  item('longsilog', 'silog', 65, ['kanin'], 6),
  item('tapsilog', 'silog', 75, ['kanin'], 6),
  item('sisig_rice', 'silog', 80, ['kanin', 'maanghang'], 6),
  // Water station (needs the Tumbler; once per vacant)
  item('tumbler_water', 'water', 0, ['inumin'], 0, { requires: 'tumbler' }),
];

const BY_KEY = new Map(MENU.map((m) => [m.key, m]));

export function menuItem(key: string): MenuItem {
  const found = BY_KEY.get(key);
  if (!found) throw new Error(`Unknown menu item: ${key}`);
  return found;
}
