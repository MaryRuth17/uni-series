// ESLint flat config. Beyond the recommended sets, these rules enforce SPEC rules for every agent:
// no timers in game code (§8) and no Phaser or Math.random in pure logic (§1, §8).
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const timerMessage = 'Use logic time or scene.time so pausing works (SPEC §8).';
const noTimerGlobals = [
  { name: 'setTimeout', message: timerMessage },
  { name: 'setInterval', message: timerMessage },
];
const noTimerProperties = [
  { object: 'window', property: 'setTimeout', message: timerMessage },
  { object: 'window', property: 'setInterval', message: timerMessage },
];

export default defineConfig(
  { ignores: ['dist/', 'node_modules/', 'test-results/', 'playwright-report/', 'blob-report/'] },
  tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...noTimerGlobals],
      'no-restricted-properties': ['error', ...noTimerProperties],
    },
  },
  {
    // Pure logic: unit-testable and simulated headless, so no Phaser and only seeded randomness.
    files: ['src/minigames/*/logic/**/*.ts', 'src/core/Random.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['phaser', 'phaser/*'],
              message: 'Logic code must not import Phaser (SPEC §1, §8).',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        ...noTimerProperties,
        {
          object: 'Math',
          property: 'random',
          message: 'Use the seeded Random from src/core/Random.ts.',
        },
      ],
    },
  },
);
