# Decisions

Choices made where the specs were silent or where a tool forced a change. Format: **ID — decision.** Why. *(Spec section.)*
Specs: [SPEC.md](SPEC.md) (§), [SPEC-homepage.md](SPEC-homepage.md) (H§), [SPEC-pup-lagoon.md](SPEC-pup-lagoon.md) (L§).

## Open questions for the owner

- **Q-002 — Master copy of the specs.** SPEC.md, SPEC-homepage.md and SPEC-pup-lagoon.md are Markdown transcriptions
  of the owner's PDFs. *Current default:* the repo copies are the master; changes made to the original documents should
  be copied here.
- **Q-003 — ID lace colours (deferred by the owner, 2026-11-22).** The homepage ID maker offers 6 free lace colours
  (H§3.3), the Lafang Ipon Shop sells 6 at ₱40 each (L§5), and the Lafang player also has a backpack colour (L§8).
  *Current default until decided:* H1 builds the ID maker as written; the Ipon Shop lace item waits. Decide before L5.
- **Q-004 — Are all minigames endless?** The owner made Lafang sa Lagoon endless. *Current default:* every future
  minigame is endless too, and SPEC.md §3's Days/stars/unlock rules apply to none of them. The map shows each
  minigame's own progress summary (H-006).
- **Q-005 — Reference photos in the public repo.** *Current default:* the images in `docs/reference/` stay local only
  (gitignored), because the repo is public and their rights are unclear. If the owner took them or they have a licence
  that allows it, commit them.

## Resolved

- **R-001 — Engine choice (2026-11-20).** Godot 4.7 was tried first and dropped. Its web runtime alone is ~9.7 MB
  compressed (measured from the official 4.7.2 web template). The whole Phaser build is ~358 KB gzipped (M0 build), so
  only Phaser meets §11's "first load under 5 MB / 4 s on PH 4G". The owner chose Phaser 4, as the spec says.
- **R-002 — Public repo + GitHub Pages (2026-11-20).** The owner made `uni-series` public; Pages source is GitHub
  Actions. Live at https://maryruth17.github.io/uni-series/ since the M0 merge.
- **R-003 — New owner specs (2026-11-20, confirmed 2026-11-22).** SPEC-homepage.md replaces the Title and Hub screens;
  SPEC-pup-lagoon.md ("Lafang sa Lagoon") replaces §4 "Merienda sa Lagoon" and milestones M2–M5. The cooking-game
  rules (Q-001, G-001 to G-013) are archived below.
- **R-004 — Lafang sa Lagoon is endless (owner, 2026-11-22).** "No day unlocking, it must be an endless type of cozy
  game. No days." The builder's rules for this are **L§0 OC-1 to OC-12**: endless vacants, no clock, stamps instead of
  stars, tiers by vacant count, per-vacant baon and events, and ipon as a balance plus a lifetime total. They also settle
  three review questions: event frequency is about 40% of vacants from tier 2 (OC-5); alkansya breaks count lifetime
  ipon while the Shop spends the balance (OC-7); and Sulit Master! compares against the cheapest way to complete the
  listahan (OC-3).
- **R-005 — Worked example 3 corrected to ₱30 (owner asked the builder to choose, 2026-11-22).** Gulaman ₱20 + pandesal
  ₱10 ticks all four lines and beats the PDF's ₱35. Changing the example keeps every menu price as written. Making ₱35
  correct instead would need pandesal at ₱16 or more, or gulaman losing a tag, which ripples into other examples and the
  feel of the prices. *(L§6, OC-9)*
- **R-006 — Claude makes the art and music (owner, 2026-11-22).** Method, so the outputs stay real files under the
  spec's keys and a human artist can replace any of them later:
  - **Pixel art** is authored as palette-indexed pixel grids in source files and baked to PNG plus atlas JSON by Node
    scripts that use only Node built-ins (`zlib` for PNG). The PNGs are committed under `public/assets/`.
  - **Music and SFX** are composed as note and pattern data and rendered to WAV by a Node synth script. ffmpeg then
    encodes each one to `.ogg` + `.m4a`. ffmpeg is a local tool on the owner's PC (9.0.1), not an npm dependency, and
    the encoded files are committed, so CI never needs it.
  - **Expectation:** chiptune-leaning lo-fi. Guitar and ukulele parts are approximated with plucked-string synthesis.
    The owner reviews at H4/L6. Credits say the art and music were made with Claude.
  - The `art` and `audio` npm scripts need a `package.json` change (shared file), so they're proposed in the PR that
    adds the first assets.

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
  bumps `package.json`; the Landing footer shows it. *(§12, H§3.2)*
- **D-008 — Prettier:** single quotes, print width 100. Markdown is excluded so the owner's documents keep their formatting. *(§8)*
- **D-009 — `Random` uses mulberry32** (fast, 32-bit seed). `pick([])` throws instead of returning `undefined`. *(§8)*
- **D-010 — M0 hello screen uses the browser monospace font and literal text.** Placeholder only; M1/H1 replace it with
  Boot → Preloader → Landing, Pixelify Sans and i18n. *(§6, §9)*
- **D-011 — AI workflow runs in Orca.** `AGENTS.md` is the shared brief (Codex reads it), `CLAUDE.md` imports it for
  Claude Code. Parallel agents follow AGENTS.md "Working in parallel". *(§1, §14)*
- **D-012 — Phaser 4 reference for agents is `node_modules/phaser/skills/`** (ships with the package: v3→v4 migration,
  scenes, input, tweens, loading, scale, and more). *(§7)*
- **D-013 — Playwright runs Chromium, Firefox and WebKit against `vite preview`.** Only Chromium is installed locally so
  far (`npx playwright install` adds the others). E2E joins CI in M7, as §10 says. *(§11)*

## Shell, homepage and Lafang (M1, H1–H5, L1–L7)

- **D-014 — Placeholder textures in Phaser 4.** `TextureManager.generate` was removed in v4. Placeholders are drawn with
  Graphics/Rectangle + Text objects, or rendered into a texture under the final asset key, so art swaps in by key. *(§6)*
- **D-015 — Asset keys come from H§8 and L§11.** Extra keys the specs don't list: `icon_peso`, `sticker_<campus>`, and
  for Lafang's stamps `ui_stamp_kumpleto`, `ui_stamp_busog` and `ui_stamp_sulit` (OC-3). Shared UI kit: `panel`,
  `button`, `daycard_bg` (L§11). *(H§8, L§11)*
- **D-016 — Save stays at version 1, with every section from the start.** No player has a save yet, so instead of the
  v1→v2 migration H§7 asks for, version 1 includes `settings`, `profile`, `home`, `stickers` and `minigames['pup-lagoon']`
  with the OC-11 lagoon fields. `migrate()` and its tests start with the first real change after release. *(§9, H§7, L§0)*
- **H-001 — Touch targets re-spaced.** Landing top-right icons (x 548/580/612) are 32 px apart, and the map's Home, toggle
  and ID chip overlap. Both get 44 px hit areas laid out left to right in H5; greybox steps use the spec positions. *(H§3.2, H§4.6)*
- **H-002 — Name field uses an HTML `<input>`.** Phaser text can't open a phone keyboard. The ID maker places a DOM
  input over the canvas (Phaser DOM elements need `dom.createContainer: true` in the game config, a shared file) with
  a 12-character limit and validation in `IdCard.ts`. *(H§3.3)*
- **H-003 — Night music filter uses Web Audio.** A `BiquadFilterNode` low-pass on Phaser's WebAudio context, with no
  dependency. With HTML5 audio fallback, night plays unfiltered. *(H§6)*
- **H-004 — Signboard lettering is pixel art, not a second web font.** Route boards, stop signs and price signs use a
  condensed all-caps bitmap font drawn with the rest of the art (R-006). *(H§2)*
- **H-005 — ₱ glyph.** M1 checks whether Pixelify Sans has "₱". If not, `t()` text uses a tiny `icon_peso` image or a
  bitmap glyph for prices. *(§6)*
- **H-006 — Each minigame supplies its own progress summary** for the map pin, campus card, list view and return toast
  (for PUP: ipon total, vacants played, sticker, "+₱25 sa alkansya!"). The map never reads stars. *(H§4, L§0 OC-12)*

## Archived: Merienda sa Lagoon (replaced 2026-11-22, R-003)

Kept for history; none of these apply any more.

- **Q-001 — Stall radio music tracks** (§4.9 vs §4.11).
- **G-001 to G-012 —** cooking-game rule gaps: guard vs Ambon, Chill Mode perfect orders, perfect-order definition,
  wrong-serve penalty, FEWA wok slots, Day 1 queue spots, dispenser with full tray, off-screen customers, customer type
  mix, Ambon spawn rate, duplicate order lines, tip rounding.
- **G-013 — Hub asset keys** (`hub_map`, `hub_jeepney`, …): replaced by the keys in H§8 (D-015).
- **G-014 —** became D-014.
