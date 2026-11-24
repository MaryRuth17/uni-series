# AGENTS.md — Uni Series

Brief for every AI agent (Claude Code, Codex, others) working in this repo, usually through Orca in its own git worktree.

## Read first

1. `SPEC.md`: the whole game (a **draft** spec; Phaser 4 + TypeScript + Vite): stack, architecture, save, settings, tests, deploy, legal.
2. `SPEC-homepage.md`: Landing screen + Campus Map (build steps H1–H5). Wins over SPEC.md for those screens (it replaces Title and Hub).
3. `SPEC-pup-lagoon.md`: the PUP minigame **Lagoon Merienda** (L1–L7). Wins over SPEC.md §4. **Its section 0 (owner
   changes: endless, no days, no clock, stamps instead of stars) wins over the rest of that file.**
4. `DECISIONS.md`: choices already made and open questions (`Q-…`). Add every new decision there.
5. The milestone or task you were given (build order: the note at the top of SPEC §10). Do only that.

## Status

| Milestone | State |
|---|---|
| M0 — Setup and first deploy | Done (PR #1, live on GitHub Pages) |
| M1 — Core shell + H1 — Homepage greybox flow | Done: Landing → School ID → map → jeepney ride → placeholder; 27 new unit tests (111 total) + Chromium smoke test |
| L1 — Lagoon data and logic (+ `npm run sim`) | Done: 84 unit tests; `npm run sim` plays 40,000 vacants with 0 failures |
| H2 — Living landing | Done: street spawner, LRT-2 train, surprises, time of day, December parols (greybox shapes) |
| L2 — Lagoon greybox map and movement | Done: Vacant card, walkable map, menu boards, live pila, Pause |
| H3 — Living map | Done: zoom toward stops, ambient life, time-of-day tint, unfold transition, list drag |
| L3 — Buying and paying | Next |
| L4–L5 | Not started |
| H4 + L6 — Art and audio (made by Claude, DECISIONS R-006) | H4 done (D-040–D-051). L6 part 1 done: PUP intro (Anonas St front) + How to play, storefront play screen (no map), food art (L-019–L-028). HUD art and audio not started |
| H5 + L7 + M6 — Polish; M7 — Release | Not started |
| M2–M5 | Replaced by L1–L7 |

## Commands

| Task | Command |
|---|---|
| Install (every new worktree) | `npm ci` |
| Dev server with hot reload (also on LAN for phones) | `npm run dev` |
| Type-check + production build to `dist/` | `npm run build` |
| Serve the built game | `npm run preview` |
| Unit tests (Vitest) | `npm test` (watch: `npm run test:watch`) |
| Smoke tests (Playwright, builds first) | `npm run test:e2e` (first time: `npx playwright install`; one browser: `-- --project=chromium`) |
| Lint / format | `npm run lint` / `npm run format` |
| Balance bot | `npm run sim` (added in L1) |

## Phaser 4, not Phaser 3

Most Phaser code online (and in model training data) is Phaser 3. Before using an API you are unsure about, read the
matching guide in `node_modules/phaser/skills/<topic>/SKILL.md`, starting with `v3-to-v4-migration` and `v4-new-features`.
Known traps: `roundPixels` defaults to false (we set `pixelArt: true`, which turns it on); `TextureManager.generate` is gone;
`Geom.Point` → `Math.Vector2`; `Math.TAU` is now 2π; FX and masks are now filters; `setTintFill()` is gone
(`setTint().setTintMode(Phaser.TintModes.FILL)`); `DynamicTexture`/`RenderTexture` need `render()`.

## Hard rules

- TypeScript strict. No `any` unless an `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason` comment explains why.
- Game rules live in `src/minigames/<id>/logic/` as plain classes: no Phaser imports, no `Math.random`, no timers (ESLint enforces this). Time advances only via `update(dtMs)`; randomness only via `Random` (`src/core/Random.ts`) with a seed.
- Every tuning number goes in that minigame's `config.ts`. Every player-facing string is an i18n key in `src/i18n/en.json` (and `fil.json`), read with `t('key')`.
- Asset keys and sizes come from SPEC-homepage §8 and SPEC-pup-lagoon §11. Placeholders (coloured shapes + labels) until H4/L6. Asset paths are relative: `assets/...`, never a leading slash.
- No `setTimeout`/`setInterval` in game code; use logic time or `scene.time`. Remove event listeners in each scene's `shutdown` handler.
- No official university logos, seals, mascots, team marks or real people (SPEC §13).
- No new dependencies without the owner's OK (SPEC §7 list only).
- Classes and their files PascalCase; asset keys snake_case; i18n keys like `pupLagoon.order.thanks`. Every scene file starts with a comment block: what it shows, which events it listens to.
- Every logic class gets tests in `tests/unit/<area>/<ClassName>.test.ts`. Seed every `Random` in tests.

**Definition of done for a task:** `npm run lint`, `npm test` and `npm run build` pass (run `npm run format` first);
`npm run test:e2e -- --project=chromium` passes if you touched boot, scenes or `index.html`; `DECISIONS.md` is updated;
commit message like `M2: wok cooking states`. Then stop and report: what you built, manual test steps, decisions made, risks.

## Working in parallel (Orca worktrees)

- One task per worktree and branch, named `m<milestone>/<task>` (e.g. `m2/wok`). Run `npm ci` in a new worktree. Merge to `main` through a PR with green CI. Keep `main` playable.
- **One owner at a time** for these shared files, because parallel edits conflict:
  `package.json` / `package-lock.json`, `src/main.ts`, `src/game/config.ts` (scene list), `src/core/*` services,
  `src/minigames/roster.ts` (registry), `index.html`, and the tool configs (`vite`, `vitest`, `tsconfig`, `eslint`,
  `playwright`, `.github/workflows`). If your task needs one of them, say so in your plan; otherwise list the change you need in your report.
- `src/i18n/*.json`: add keys only inside your area's prefix (`ui.`, `hub.`, `pupLagoon.`…), never reorder or reformat other keys.
- Good parallel splits:
  - **M1 + H1:** `SaveManager` + tests ∥ `Settings` + `GameEvents` + `i18n` ∥ `AudioManager` ∥ UI kit (`src/ui/`) ∥ `TimeOfDay` + `RoutePath` + `roster.ts` (+ tests) ∥ Landing / IdCard / CampusMap / ComingSoon greybox scenes ∥ Boot/Preloader. One integrator wires scenes into `src/game/config.ts` at the end.
  - **L1:** land `pup-lagoon/config.ts` and `data/*` (menu, stalls, walletMixes, events, fallbacks) first. Then `Listahan`, `Solver`, `Wallet`, `CashBox`, `Pila`, `Rhythm` and `Scoring` (each with tests) in parallel. Then `ListahanGen` (needs `Solver`), then `LagoonVacant` integrates them, then `npm run sim`.
  - **Art and audio (DECISIONS R-006)** can start any time on its own branch (`art/<set>`, e.g. `art/food`): it only adds files under `public/assets/` and `scripts/`, using the spec keys.

## Gotchas for this project

- `localStorage` can throw (private mode, itch.io iframe): wrap every read/write in `try/catch`, fall back to in-memory defaults, show the "Hindi ma-save ang progress" toast.
- Audio is locked until the first tap; the Landing "Pindutin para magsimula" (tap to start) unlocks it.
- Pause when `document.visibilitychange` reports hidden; pausing = not calling the minigame logic's `update`. Lagoon has
  no clock (SPEC-pup-lagoon OC-2), but the pila and walking still advance through `update(dtMs)`.
- Reference photos live only in the owner's main checkout `docs/reference/` (gitignored; see its README). Never ship or trace them.
- Clamp the frame delta for logic: `sim.update(Math.min(delta, 100))`.
- Load Pixelify Sans with `document.fonts.load()` in the Preloader before any scene draws text.
