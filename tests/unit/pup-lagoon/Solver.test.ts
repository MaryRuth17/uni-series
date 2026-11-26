import { describe, expect, it } from 'vitest';
import { PROMOS } from '../../../src/minigames/pup-lagoon/data/events';
import { openStalls } from '../../../src/minigames/pup-lagoon/logic/Catalog';
import { buildCandidates, solve } from '../../../src/minigames/pup-lagoon/logic/Solver';
import { candidatesFor, pangBarkada, pasabay, tag } from './helpers';

// SPEC-pup-lagoon §6 worked examples (example 3 corrected by OC-9). Costs must match.
describe('Solver: worked examples', () => {
  it('1. Tutorial: kanin · inumin · tusok-tusok = ₱70 (BBQ rice + tusok + mineral water)', () => {
    const r = solve(
      [tag('L1', 'kanin'), tag('L2', 'inumin'), tag('L3', 'tusok')],
      candidatesFor(1),
      0,
    );
    expect(r.minCost).toBe(70);
    const items = r.planComplete?.map((s) => s.item) ?? [];
    expect(items).toContain('bbq_rice');
    expect(items).toContain('water_bottle');
    expect(items.some((i) => i === 'fishball' || i === 'kikiam')).toBe(true);
  });

  it('2. PdP with pasabay: sabaw · maanghang · Migs’s gulaman = ₱55', () => {
    const lines = [
      tag('L1', 'sabaw'),
      tag('L2', 'maanghang'),
      pasabay('L3', 'migs', 'gulaman', 20),
    ];
    const r = solve(lines, candidatesFor(2), 0);
    expect(r.minCost).toBe(55);
    const plan = r.planComplete ?? [];
    expect(plan.find((s) => s.item === 'gulaman')?.forLine).toBe('L3');
    expect(plan.some((s) => s.stall === 'tusok' && s.sauce === 'maanghang')).toBe(true);
  });

  it('3. malamig · matamis · merienda · inumin = ₱30 (gulaman + pandesal, OC-9)', () => {
    const lines = [
      tag('L1', 'malamig'),
      tag('L2', 'matamis'),
      tag('L3', 'merienda'),
      tag('L4', 'inumin'),
    ];
    const r = solve(lines, candidatesFor(3), 0);
    expect(r.minCost).toBe(30);
    expect(r.planComplete?.map((s) => s.item).sort()).toEqual(expect.arrayContaining(['pandesal']));
  });

  it('4. Payday: kanin · ihaw · pang-barkada ×3 malamig = ₱75 (BBQ rice + 3 ice candy)', () => {
    const lines = [tag('L1', 'kanin'), tag('L2', 'ihaw'), pangBarkada('L3', 'malamig')];
    const r = solve(lines, candidatesFor(4), 0);
    expect(r.minCost).toBe(75);
    const plan = r.planComplete ?? [];
    expect(plan.filter((s) => s.item === 'icecandy' && s.forLine === 'L3')).toHaveLength(3);
  });
});

describe('Solver: rules', () => {
  it('finds the cheapest way that also reaches the busog target', () => {
    const lines = [tag('L1', 'kanin'), tag('L2', 'inumin'), tag('L3', 'tusok')];
    const r = solve(lines, candidatesFor(1), 5);
    expect(r.minCost).toBe(70);
    expect(r.minCostBusog).toBeGreaterThanOrEqual(70);
    expect(r.planBusog).not.toBeNull();
  });

  it('returns null when nothing can complete the list within maxCost', () => {
    // The cheapest sabaw (lugaw) costs ₱25.
    const r = solve([tag('L1', 'sabaw')], candidatesFor(1), 0, 20);
    expect(r.minCost).toBeNull();
    const capped = solve([tag('L1', 'kanin')], candidatesFor(1), 0, 40);
    expect(capped.minCost).toBeNull();
  });

  it('Bawal maanghang leaves out spicy purchases', () => {
    const r = solve([tag('L1', 'tusok')], candidatesFor(1, [], true), 0);
    expect(r.planComplete?.every((s) => s.sauce !== 'maanghang')).toBe(true);
  });

  it('uses the Tumbler refill at most once', () => {
    const lines = [tag('L1', 'inumin', 2)];
    const r = solve(lines, candidatesFor(1, ['tumbler']), 0);
    expect(r.minCost).toBe(15);
    expect(r.planComplete?.filter((s) => s.item === 'tumbler_water')).toHaveLength(1);
  });

  it('Buy 1 Take 1 counts both pieces', () => {
    const promo = PROMOS.find((p) => p.key === 'turonB1T1') ?? null;
    const candidates = buildCandidates({ open: new Set(openStalls(2, [])), owned: [], promo });
    const r = solve([tag('L1', 'merienda', 2), tag('L2', 'matamis')], candidates, 0);
    expect(r.minCost).toBe(15);
  });
});
