// Runs scripts/sim.ts through Vite's module runner, so the sim uses the game's own TypeScript and
// import style with no extra dependency. Usage: npm run sim -- [seeds=1000] [vacants=40]
import { runnerImport } from 'vite';

const { module } = await runnerImport('./scripts/sim.ts');
process.exitCode = module.runSim(process.argv.slice(2));
