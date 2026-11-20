# Decisions

Choices made where SPEC.md was silent or where a tool forced a change. Format: **ID — decision.** Why. *(Spec section.)*

## Open questions for the owner

- **Q-001 — Stall radio music tracks.** §4.9 says each radio level "unlocks a music track", but §4.11 lists only the two
  lagoon layers. *Current default:* 3 extra keys `music_radio_1..3`, added in M4; or drop the track unlock and keep only the patience effect.
- **Q-002 — Master copy of the spec.** SPEC.md is a Markdown transcription of the owner's PDF. *Current default:* SPEC.md
  in the repo is the master; changes made to the original document should be copied here.

## Resolved

- **R-001 — Engine choice (2026-11-20).** Godot 4.7 was tried first and dropped. Its web runtime alone is ~9.7 MB
  compressed (measured from the official 4.7.2 web template). The whole Phaser build is ~358 KB gzipped (M0 build), so
  only Phaser meets §11's "first load under 5 MB / 4 s on PH 4G". The owner chose Phaser 4, as the spec says.
- **R-002 — Public repo for GitHub Pages (2026-11-20).** The owner made `uni-series` public. Remaining one-time step:
  Settings → Pages → Build and deployment → Source: **GitHub Actions**.

## Setup and tooling (M0)

- **D-001 — Stack exactly as §7:** Phaser 4.2.1, Vite 8, Vitest 5, Playwright 1.65, ESLint 10 + typescript-eslint 8,
  Prettier 3, Node ≥ 24 (`engines`; local Node 26, CI `lts/*`). No other dependencies. *(§7)*
- **D-002 — TypeScript 6.0.x, not 7.x.** typescript-eslint 8.73 supports TypeScript `<6.1.0`; §7 says to fall back to 6.0
  if a tool breaks. Revisit when typescript-eslint supports 7. *(§7)*
- **D-003 — Scaffolded by hand, not with `npm create @phaserjs/game@latest`.** The creator asks interactive questions an
  agent cannot answer, and the official templates have shipped a `log.js` that sends anonymous usage pings when you run
  dev/build. The hand-made setup matches the template's Vite + TypeScript shape, reshaped to the §8 folders. *(§10 M0)*
- **D-004 — ESLint enforces spec rules:** no `setTimeout`/`setInterval` in `src/` (§8); no Phaser import and no
  `Math.random` in `src/minigames/*/logic/` and `src/core/Random.ts` (§1, §8); `no-explicit-any` is an error, so an
  `any` needs an `eslint-disable-next-line ... -- reason` comment (§1). No `eslint-config-prettier` needed: the
  recommended configs contain no formatting rules. *(§1, §8)*
- **D-005 — `vitest.config.ts` is separate** (Node environment, `tests/unit/**/*.test.ts`), so `vite.config.ts` stays
  as the spec shows. Config files are left out of `tsconfig.json` so `tsc` doesn't need `@types/node`. *(§8)*
- **D-006 — Workflow split into two jobs.** `build` runs on every push and PR (lint, test, build, size summary); `deploy`
  runs only for `main`. PRs from Orca worktrees get CI without deploying. `configure-pages` is dropped (Vite doesn't use
  its outputs). Action versions checked 2026-11-20: checkout v7, setup-node v7, upload-pages-artifact v5, deploy-pages v5. *(§12)*
- **D-007 — Build version comes from `package.json`** through Vite `define` (`__APP_VERSION__`). The release routine
  bumps `package.json`; the Title screen will show it. *(§12)*
- **D-008 — Prettier:** single quotes, print width 100. Markdown is excluded so the owner's documents keep their formatting. *(§8)*
- **D-009 — `Random` uses mulberry32** (fast, 32-bit seed). `pick([])` throws instead of returning `undefined`. *(§8)*
- **D-010 — M0 hello screen uses the browser monospace font and literal text.** Placeholder only; M1 replaces it with
  Boot → Preloader → Title, Pixelify Sans and i18n. *(§6, §9)*
- **D-011 — AI workflow runs in Orca.** `AGENTS.md` is the shared brief (Codex reads it), `CLAUDE.md` imports it for
  Claude Code. Parallel agents follow AGENTS.md "Working in parallel". *(§1, §14)*
- **D-012 — Phaser 4 reference for agents is `node_modules/phaser/skills/`** (ships with the package: v3→v4 migration,
  scenes, input, tweens, loading, scale, and more). *(§7)*
- **D-013 — Playwright runs Chromium, Firefox and WebKit against `vite preview`.** Only Chromium is installed locally so
  far (`npx playwright install` adds the others). E2E joins CI in M7, as §10 says. *(§11)*

## Gameplay rules: gaps found in the spec review (proposed defaults, confirm before M2/M3)

- **G-001 — Guard vs Ambon.** The Day 5 guard orders 3 gulaman, but during the Ambon rain customers order no gulaman.
  *Proposed:* the guard never spawns during the rain; it takes the first spawn after the rain ends (≈4:31 PM onward).
- **G-002 — Combo and acctg "perfect" in Chill Mode.** Chill Mode fixes the patience fraction at 0.5, but a perfect order
  needs *more than* 50%, so combos and accountancy tips could never happen. *Proposed:* in Chill Mode, every
  mistake-free order counts as perfect.
- **G-003 — "Perfect order" definition.** *Proposed:* no wrong serve to that customer, and patience above 50% when the
  last line is served. Used by combo and the acctg tip.
- **G-004 — Wrong-serve penalty.** *Proposed:* "patience drops 20%" = 20% of that customer's maximum patience (not of what is left), clamped at 0.
- **G-005 — FEWA "side-by-side" slots.** Wok slots are numbered row-major `0 1 2 / 3 4 5`. *Proposed:* FEWA takes the first
  free horizontal pair in the order (0,1), (1,2), (3,4), (4,5); if none is free, the bin wiggles.
- **G-006 — Day 1 has max queue 2 but the layout has 3 spots.** *Proposed:* Day 1 uses spots 1 and 2 (keys A / S).
- **G-007 — Dispenser with a full tray.** *Proposed:* same as a full wok: the dispenser wiggles and nothing happens.
- **G-008 — Customers waiting off-screen.** *Proposed:* at most one customer waits off-screen; the spawn timer pauses
  while one waits; nobody enters after 5:55 PM, so a waiting customer is dropped at 5:55 (no penalty).
- **G-009 — Customer type mix.** Not specified. *Proposed:* uniform choice among the unlocked regular types
  (freshie, engg, acctg, org); from Day 4 each spawn has a 10% chance to be a professor instead; the guard once on Day 5 (G-001).
- **G-010 — "Spawn 30% faster" during Ambon.** *Proposed:* spawn interval × 0.7.
- **G-011 — Duplicate lines.** *Proposed:* an order may contain the same item + sauce twice.
- **G-012 — Tip rounding.** *Proposed:* `Math.round()` (halves round up).
- **G-013 — Missing asset keys.** §4.11 covers only the lagoon. *Proposed:* M1 defines and records keys for the hub
  (`hub_map`, `hub_jeepney`, `hub_train`, `hub_stop_sign`), UI kit (`ui_panel`, `ui_button`), `icon_peso` and stickers (`sticker_<campus>`).
- **G-014 — Placeholder textures in Phaser 4.** `TextureManager.generate` was removed in v4. *Proposed:* draw placeholders
  with Graphics/Rectangle + Text objects (or render them into a texture under the final asset key) so M4 art swaps in by key.
