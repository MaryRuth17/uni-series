/**
 * Balance bot for Lagoon Merienda (SPEC-pup-lagoon §14 L1, OC-10). Run with `npm run sim [seeds] [vacants]`.
 * For every seed it plays vacants 1..N in order through LagoonVacant (the same logic the scene uses):
 * queue, order the proven plan, Smart pay, ask for extra, then eat. Progress carries over, and the bot
 * buys the Tumbler, Payong and Notebook when it can, so later vacants include the water station.
 * Fails (exit code 1) if any vacant cannot be generated, paid or completed, or money is not conserved.
 */
import { buyFromShop, newProgress, applyOutcome } from '../src/minigames/pup-lagoon/logic/Progress';
import { playRoute } from '../src/minigames/pup-lagoon/logic/Bot';
import { LagoonVacant } from '../src/minigames/pup-lagoon/logic/LagoonVacant';
import {
  generateVacant,
  type GeneratedVacant,
} from '../src/minigames/pup-lagoon/logic/ListahanGen';
import { Rhythm } from '../src/minigames/pup-lagoon/logic/Rhythm';
import type { Tier } from '../src/minigames/pup-lagoon/logic/types';

interface Stat {
  min: number;
  max: number;
  sum: number;
  n: number;
}
const stat = (): Stat => ({ min: Infinity, max: -Infinity, sum: 0, n: 0 });
const add = (s: Stat, v: number): void => {
  s.min = Math.min(s.min, v);
  s.max = Math.max(s.max, v);
  s.sum += v;
  s.n += 1;
};
const fmt = (s: Stat): string =>
  s.n ? `${s.min}/${Math.round(s.sum / s.n)}/${s.max}`.padStart(11) : '—'.padStart(11);
const pct = (k: number, n: number): string => `${n ? Math.round((100 * k) / n) : 0}%`.padStart(5);

interface TierStats {
  vacants: number;
  fallback: number;
  tries: Stat;
  baon: Stat;
  minCost: Stat;
  minCostBusog: Stat;
  leftover: Stat;
  kumpleto: number;
  busog: number;
  sulit: number;
  events: number;
  pdp: number;
  payday: number;
  pasabay: number;
}

const newTier = (): TierStats => ({
  vacants: 0,
  fallback: 0,
  tries: stat(),
  baon: stat(),
  minCost: stat(),
  minCostBusog: stat(),
  leftover: stat(),
  kumpleto: 0,
  busog: 0,
  sulit: 0,
  events: 0,
  pdp: 0,
  payday: 0,
  pasabay: 0,
});

export function runSim(args: readonly string[]): number {
  const seeds = Number(args[0] ?? 1000);
  const vacants = Number(args[1] ?? 40);
  const tiers: Record<Tier, TierStats> = { 1: newTier(), 2: newTier(), 3: newTier(), 4: newTier() };
  const failures: string[] = [];
  const started = Date.now();

  for (let seed = 1; seed <= seeds; seed++) {
    let progress = newProgress(seed);
    const rhythm = new Rhythm(seed);
    for (let n = 1; n <= vacants; n++) {
      const def = rhythm.vacant(n);
      const t = tiers[def.tier];
      let gen: GeneratedVacant;
      try {
        gen = generateVacant(def, { saveSeed: seed, owned: progress.owned });
      } catch (e) {
        failures.push(`seed ${seed} vacant ${n}: ${(e as Error).message}`);
        continue;
      }
      const vacant = new LagoonVacant(gen, {
        suki: progress.suki,
        owned: progress.owned,
        saveSeed: seed,
      });
      const error = playRoute(gen, vacant);
      if (error) {
        failures.push(`seed ${seed} vacant ${n}: ${error}`);
        continue;
      }
      let result;
      try {
        result = vacant.finish();
      } catch (e) {
        failures.push(`seed ${seed} vacant ${n}: ${(e as Error).message}`);
        continue;
      }
      if (!result.stamps.kumpleto || !result.allComplete) {
        failures.push(`seed ${seed} vacant ${n}: route did not complete the listahan`);
      }

      t.vacants += 1;
      if (gen.usedFallback) t.fallback += 1;
      add(t.tries, gen.tries);
      add(t.baon, def.baon);
      add(t.minCost, gen.baseline.minCost ?? 0);
      if (gen.baseline.minCostBusog !== null) add(t.minCostBusog, gen.baseline.minCostBusog);
      add(t.leftover, result.leftover);
      if (result.stamps.kumpleto) t.kumpleto += 1;
      if (result.stamps.busog) t.busog += 1;
      if (result.stamps.sulit) t.sulit += 1;
      if (gen.event) t.events += 1;
      if (def.special === 'pdp') t.pdp += 1;
      if (def.special === 'kinsenas' || def.special === 'katapusan') t.payday += 1;
      if (gen.lines.some((l) => l.forFriends && l.owner !== 'barkada')) t.pasabay += 1;

      progress = applyOutcome(progress, result).progress;
      for (const key of ['tumbler', 'payong', 'notebook']) {
        const bought = buyFromShop(progress, key);
        if (bought.ok) progress = bought.progress;
      }
    }
  }

  const lines = [
    `Lagoon Merienda sim: ${seeds} seeds × ${vacants} vacants in ${((Date.now() - started) / 1000).toFixed(1)} s`,
    'min/avg/max per tier. minCost = cheapest way to complete the listahan; busog = also reach the busog target.',
    '',
    'tier  vacants  fallback  tries       baon      minCost   minCostBusog   leftover  kumpleto busog sulit events  pdp payday pasabay',
  ];
  for (const tier of [1, 2, 3, 4] as Tier[]) {
    const t = tiers[tier];
    lines.push(
      [
        String(tier).padEnd(4),
        String(t.vacants).padStart(8),
        pct(t.fallback, t.vacants).padStart(9),
        fmt(t.tries),
        fmt(t.baon),
        fmt(t.minCost),
        fmt(t.minCostBusog).padStart(14),
        fmt(t.leftover),
        pct(t.kumpleto, t.vacants).padStart(9),
        pct(t.busog, t.vacants),
        pct(t.sulit, t.vacants),
        pct(t.events, t.vacants).padStart(6),
        pct(t.pdp, t.vacants),
        pct(t.payday, t.vacants).padStart(6),
        pct(t.pasabay, t.vacants).padStart(7),
      ].join(' '),
    );
  }
  lines.push('', `Failures: ${failures.length}`);
  failures.slice(0, 20).forEach((f) => lines.push(`  ${f}`));
  console.log(lines.join('\n'));
  return failures.length ? 1 : 0;
}
