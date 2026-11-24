# Decisions

Choices made where the specs were silent or where a tool forced a change. Format: **ID — decision.** Why. *(Spec section.)*
Specs: [SPEC.md](SPEC.md) (§), [SPEC-homepage.md](SPEC-homepage.md) (H§), [SPEC-pup-lagoon.md](SPEC-pup-lagoon.md) (L§).

## Open questions for the owner

- **Q-002 — Master copy of the specs.** SPEC.md, SPEC-homepage.md and SPEC-pup-lagoon.md are Markdown transcriptions
  of the owner's PDFs. *Current default:* the repo copies are the master; changes made to the original documents should
  be copied here.
- **Q-003 — ID lace colours (deferred by the owner, 2026-11-22).** The homepage ID maker offers 6 free lace colours
  (H§3.3), the Lagoon Ipon Shop sells 6 at ₱40 each (L§5), and the Lagoon player also has a backpack colour (L§8).
  *Current default until decided:* H1 builds the ID maker as written; the Ipon Shop lace item waits. Decide before L5.
- **Q-004 — Are all minigames endless?** The owner made Lagoon Merienda endless. *Current default:* every future
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
  SPEC-pup-lagoon.md ("Lagoon Merienda") replaces §4 "Merienda sa Lagoon" and milestones M2–M5. The cooking-game
  rules (Q-001, G-001 to G-013) no longer apply and were removed in the cleanup (still in git history).
- **R-004 — Lagoon Merienda is endless (owner, 2026-11-22).** "No day unlocking, it must be an endless type of cozy
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

- **R-007 — The minigame is called "Lagoon Merienda" (owner, 2026-11-22).** Formerly "Lafang sa Lagoon". The owner
  first renamed the PDF to "Listahan sa Lagoon", then chose "Lagoon Merienda". The id `pup-lagoon`, the tagline and the i18n
  prefix `pupLagoon.` stay the same. It is a different game from the replaced cooking game "Merienda sa Lagoon". *(L§0 OC-13)*

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

## Shell, homepage and Lagoon (M1, H1–H5, L1–L7)

- **D-014 — Placeholder textures in Phaser 4.** `TextureManager.generate` was removed in v4. Placeholders are drawn with
  Graphics/Rectangle + Text objects, or rendered into a texture under the final asset key, so art swaps in by key. *(§6)*
- **D-015 — Asset keys come from H§8 and L§11.** Extra keys the specs don't list: `icon_peso`, `sticker_<campus>`, and
  for the Lagoon stamps `ui_stamp_kumpleto`, `ui_stamp_busog` and `ui_stamp_sulit` (OC-3). Shared UI kit: `panel`,
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

### L1 — Lagoon logic (builder, 2026-11-22)

- **L-001 — `npm run sim` runs through Vite's `runnerImport`.** `scripts/sim.mjs` loads `scripts/sim.ts` with the
  game's own TypeScript and import style, so no new dependency (no tsx or ts-node). *(L§14)*
- **L-002 — Rhythm numbers.** Slot = `['umaga','tanghali','hapon'][n % 3]`, so vacant 1 is tanghali. Normal baon ₱60 /
  ₱70 / ₱80 weighted 1 : 2 : 1. A special or event that would repeat the previous vacant's is dropped, not re-rolled.
  Paydays alternate Kinsenas, Katapusan. Measured over 40,000 vacants: events on 29% of tier-2 vacants (no hot days
  yet) and 37–40% from tier 3. *(OC-4, OC-5)*
- **L-003 — Friend lines are optional.** Kumpleto! needs only the player's lines. A finished pasabay gives +1 heart; a
  skipped one returns the friend's money (it never becomes ipon). A finished Pang-barkada gives +2 hearts to each of
  Migs, Bea and Jomar. Sulit Master! needs every line, friend lines included. *(OC-3, §8)*
- **L-004 — Suki 2 "Libre na 'yan, suki!" adds a free extra piece** of the cheapest item ≤ ₱15 in the order instead of
  a discount. A discount changes which coins the player holds, which could block a later payment the generator proved
  possible (the sim found 3 such cases in 800 vacants). *(§9.4)*
- **L-005 — "Ano ang pinakasulit?" shows `planComplete`** (the cheapest way to tick every line, the Sulit baseline).
  `planBusog` (also reaching the busog target) is available for a second line on Results. *(OC-3)*
- **L-006 — Solver details.** Up to 16 units supported (the generator caps lists at 8). The Tumbler refill is a
  once-per-vacant bit in the state. Candidates that tick exactly the same lines are pruned to the cheapest per busog
  value, which made it 6× faster with identical answers. *(§13)*
- **L-007 — Payability check.** Plans are grouped into stall visits (≤ 5 items) and every visit order is tried, paying
  each with Smart pay. Wallet mixes: one tier-weighted preset first, then the others, then a small-change mix.
  Fallback lists skip the "not too easy" and busog checks. The sim needed 0 fallbacks in 40,000 vacants. *(§13, OC-8)*
- **L-008 — Lagoon save fields beyond OC-11:** `recentFoods` (the last 5 vacants' foods, for the album's favourite
  food) and `rewards` (alkansya and friend-gift rewards). *(OC-7, OC-11)*
- **L-009 — Pila model.** Average length by usual pila (short 0.6, medium 1.4, long 2.4) × 1.7 at busy slots and on
  hot days for halo-halo and palamig, × 0.5 at quiet slots, × 2 for the long-line event. Arrival rate keeps that
  average with 3 s per person (M/M/1). Capped at 4 (8 with the event). *(§4.2, §9.1)*
- **L-010 — Purchases tick at payment.** Grilled items then hold the player at the counter for 5 s. Pa-extra po needs a
  purchase in that visit. Busog comes only from the player's own items and suki extras. *(§4.3)*
- **L-011 — Item names are i18n keys** (`pupLagoon.food.<key>`, `pupLagoon.stall.<key>`) but `en.json` entries are
  added with the screens in L2/L3, since M1 creates the i18n files. *(§12)*

### M1 + H1 — Core shell and homepage greybox (builder, 2026-11-22)

- **D-017 — Core services:** `GameEvents` (typed bus), `SaveManager`, `Settings`, `i18n` and `AudioManager`, created once
  in `main.ts` and read through `services()`. Everything except `AudioManager` is plain TypeScript with unit tests. *(§8)*
- **D-018 — Save version 1 shape:** `settings`, `profile` (null until the School ID is made), `home` (`lastStop`,
  `mapView`, `theme`), `stickers`, and `minigames` (each minigame owns its own object; Lagoon stores
  `LagoonProgress`). SPEC §9's old `wallet`, `unlockedDay`, `stars` and `upgrades` are gone with the cooking game.
  Missing fields load from defaults. "Reset progress" keeps the settings. *(§9, D-016)*
- **D-019 — i18n keys are flat strings** (`"map.ride": "Sakay na!"`), grouped by prefix. `fil.json` holds only
  translated keys and falls back to English per key until M6. *(§9)*
- **D-020 — Overlays pause the scene underneath** (so it ignores taps and keys) and resume it on close; they restart it
  instead when its text changed (language, theme, reduced motion, reset, profile). A `ToastScene` stays on top for
  messages, including the "Hindi ma-save" warning. *(SPEC-homepage §7)*
- **D-021 — Pixelify Sans is self-hosted** (`public/assets/fonts/PixelifySans.ttf`, OFL) and loaded with the FontFace
  API in the Preloader. It lacks ₱ and ★: ₱ falls back to the monospace font and reads like "P" at 8 px, so the art pass
  must add a pixel ₱ (H-005 confirmed). No stars are used anywhere (OC-3). *(§6)*
- **D-022 — Rotate overlay** is HTML/CSS in `index.html` (portrait + touch only), with text from i18n, and
  `game.pause()` while it shows. *(§9)*
- **D-023 — Route nodes** in `roster.ts` add road bends between stops so the jeepney follows streets, not straight
  lines; `pointAt` snaps to a vertex within 1e-9 px, so rides end exactly on the stop. Positions get tuned by eye in H3.
  *(SPEC-homepage §4.4)*
- **D-024 — H1 scope.** Built: every scene from SPEC-homepage §7 as greybox, the full flow, list view, HUD, keyboard
  (arrows, Enter, Esc, Tab), Skip, Reduced Motion (no ride, no bob, no bounce), Settings, Sticker Book, Album and Credits
  overlays. Left for H3: the camera zoom toward a stop (it needs a separate HUD camera), map ambient life, and the
  hover-grow of pins. Left for L2: the Pause overlay, since no gameplay scene exists yet. HUD positions follow the spec
  except the ID chip, moved from x 160 to x 180 so it does not overlap the toggle (H-001). *(§10 M1, SPEC-homepage §9)*
- **D-025 — Greybox icons are letters** (S = Sticker Book, * = Settings, i = Credits, A = Album) until the icon art
  (`icon_*`) arrives in H4. *(SPEC-homepage §8)*
- **D-026 — Test hook:** `window.__uniGame` exposes the Phaser game read-only, so the Playwright smoke test can check
  which scene is running while it clicks through the flow. *(§11)*

### H2 — Living landing (builder, 2026-11-22)

- **D-027 — Street split.** `StreetSpawner` (when walkers, jeepneys and the train appear; caps 6 / 2 / 1) and
  `Surprises` (5 s cooldowns) are pure and unit-tested. `StreetView` is the Phaser layer: it draws the greybox street,
  pools the movers and plays the reactions. Every number is in `home/config.ts` (`STREET`, `DEPTH`, `ROUTES`).
  *(SPEC-homepage §7)*
- **D-028 — Time of day.** Umaga: pale sky, taho cart, some students with coffee. Tanghali: about 60% of students carry
  umbrellas. Hapon: signs and windows switch on one by one, every 1.5 s. Gabi: stars, moon, every light on, a lit train,
  half as many students (cap 3, half as often), and the cat sleeps under the streetlight instead of on the jeepney roof.
  December adds parols in the gaps between the shop signs. *(§3.4, §2)*
- **D-029 — Reduced Motion on the landing** turns off cloud and city drift, banderitas sway, walker bob, barker wave,
  steam puffs (a still wisp instead) and the jeepney shake. Walkers and traffic still move, since they are the street
  itself, not idle drift. *(§6)*
- **D-030 — Hidden tab.** Phaser pauses the game loop on `visibilitychange`, so nothing spawns and audio mutes; no
  extra code needed. *(§6)*
- **D-031 — Layout tweaks.** The streetlight stands at x 504 (between two shops) so its pole never crosses a sign; the
  congratulations tarp is 96×30, not 96×32, so the fishball cart never hides its text; the route board is 92×12 to fit
  "STA. MESA – QUIAPO" at 8 px; the jeepney stop sign reads "SAKAYAN". Text is never scaled below 8 px. *(§3.1, §6)*
- **D-032 — Surprises** follow §3.5. The jeepney's horn also shows "Beep-beep!" while the barker shouts one of the two
  spec lines. The train reacts only while it is on screen. The cat's heart is drawn as a shape, because Pixelify Sans
  has no ♥. *(§3.5)*
- **D-033 — Testing note.** Playwright's `page.clock.setFixedTime` also freezes Phaser's tweens (the logo stays
  off-screen). To preview a time of day, shift only `new Date()` with an init script, as the H2 screenshots did.

### L2 — Lagoon greybox map and movement (builder, 2026-11-22)

- **L-012 — Walking graph.** 18 nodes (`data/waypoints.ts`): one per stall window or kiosk, four around the plaza,
  two by the Lagoon (north and east), three at the benches, one at the water station; 28 paths. A unit test checks that
  no path crosses the water or the plaza planter. `Walker` (pure) follows the shortest path at 80 px/s, or 56 px/s in
  the rain without the Payong. A new tap mid-walk finishes the current step, then reroutes. *(§10.1, §4.2)*
- **L-013 — Pila on the map.** Students line up away from the counter (down from the windows, right of the kiosks and
  the cart), 10 px apart, redrawn on every `pilaChanged`. Walking away (a tap elsewhere, Esc, or "Alis sa pila")
  leaves the line; the grill still holds the player at the counter. *(§4.2)*
- **L-014 — Vacant card in L2.** `LagoonIntroScene` (the roster's intro scene) already shows the real next vacant:
  number, slot, special, event, rule, baon pieces, pasabay money, busog target, listahan, and stalls that just opened.
  It is greybox; L4 finishes it. The save seed is created from the clock the first time the player enters the Lagoon
  and stored at once. *(OC-1, OC-11)*
- **L-015 — Unfinished vacants are not saved.** Leaving through Pause → "Balik sa mapa" drops the vacant; the next
  visit offers the same vacant again (it is seeded by vacant number). Saving progress arrives with Results in L4. *(OC-1)*
- **L-016 — Pause overlay** (shared, `src/scenes/PauseScene.ts`): Tuloy, Settings, Balik sa mapa. SPEC §3's
  "Restart Day" is dropped because Lagoon Merienda has no days. *(§3, OC-1)*
- **L-017 — Menu board** lists every orderable item with its price (promos applied), craving tags (the karinderya's
  free iced tea tags included), busog and sold-out state, plus the live pila count. Locked stalls show
  "Malapit nang magbukas!"; the water station explains it needs the Tumbler. *(§10.2)*
- **L-018 — Counter placeholder.** At the front of the line the player sees "Ikaw na!" and can leave; buying, paying and
  sukli arrive in L3. *(§14 L2/L3)*

### H3 — Living map (builder, 2026-11-22)

- **D-034 — Two cameras on the campus map.** The main camera draws the world and zooms 10% toward a tapped stop in
  300 ms (clamped to the map's bounds); a second fixed camera draws everything at depth ≥ 30 (HUD, list view, campus
  card, Skip), so the UI never zooms. This resolves the H1 deferral (D-024). Reduced Motion: no zoom. *(§4.3)*
- **D-035 — Map ambient life.** An LRT-2 train runs its line every 20–30 s; three small jeepneys drive back and forth on
  España, Recto and Magsaysay; two cloud shadows drift; a bird crosses every 8–14 s; the river shimmers. Reduced Motion
  keeps the train and jeepneys (traffic, as on the landing, D-029) and drops clouds, birds and shimmer. *(§4.1)*
- **D-036 — Time-of-day tint** over the map, matching the landing: umaga light blue 8%, tanghali none, hapon warm 12%,
  gabi navy 35% (`MAP_TINT`). *(§4.1)*
- **D-037 — Transitions.** Landing → map: the parked jeepney pulls away (H2), then the map unfolds from scale 0.92 while
  fading in (skipped with Reduced Motion). Map → minigame and map → landing fade both cameras. Minigame → map shows the
  minigame's toast (`CampusMapData.toast`, used from L4). *(§6)*
- **D-038 — Stops.** Hover grows the pin 10% and makes the campus block glow; a playable stop shows a gold star once its
  sticker is earned (drawn as a shape: Pixelify Sans has no ★). *(§4.2)*
- **D-039 — List view** scrolls by drag (touch), wheel and arrow keys; a drag snaps to the nearest card when released, and
  a drag never counts as a tap on a card. *(§4.5)*

### H4 (part 1) — Intro art, crisp text, girl/boy, language (builder, 2026-11-24)

- **D-040 — Render at 3×.** The logical grid stays 640×360, but the canvas is 1920×1080 (`RENDER_SCALE`, `src/ui/view.ts`)
  and every camera zooms 3× (scenes use `sceneConfig(key)`; extra cameras use `addViewCamera`). Text is drawn at
  `resolution: 3`, so it is sharp instead of an upscaled blur. Pixel art still snaps to the 640×360 grid
  (`pixelArt: true`). Pointer code uses `worldX/worldY`; drag deltas divide screen pixels by `RENDER_SCALE`.
- **D-041 — Girl or boy on the School ID.** `Profile.gender` (`'girl' | 'boy'`) picks the avatar set; each has its own body,
  hair (8) and outfit (4: casual, uniform polo with skirt or slacks, hoodie, org shirt) sheets; skins (6) and laces (6)
  are shared. Saves from before the choice load as `'girl'` (the H1 look). The avatar is layered in `src/ui/avatar.ts`
  and shown on the ID card, the landing and map chips and on the Lagoon map.
- **D-042 — English by default, Filipino as an option.** EN / FIL buttons on the landing (top right) and the existing
  Settings row switch the language; `en.json` holds the English menus ("LET'S PLAY!", "Tap to start"), `fil.json` the
  Filipino ones ("TARA, LARO!", "Pindutin para magsimula"). In-world Taglish (barker calls, signs, Lagoon words such as
  baon, listahan, Pumila, Tara!) stays the same in both, as part of the setting. Keys without a Filipino entry fall
  back to English.
- **D-043 — Art pipeline (R-006).** Art is drawn in code by Node scripts in `scripts/art/` (no new dependencies: our own
  PNG encoder and pixel canvas with bevels, dithering, outlines and two bitmap fonts) and baked into
  `public/assets/<set>/*.png` plus a Phaser `pack.json` and a `manifest.json` of sizes (read by
  `tests/unit/art/packs.test.ts`). Rebuild with `npm run art`; `node scripts/art/build.mjs --preview <dir>` writes composed
  landing previews. Shops have three frames (closed, lit, night); the night frame keeps signs and windows bright.
  The UI kit is nine-slice (`ui_panel`, `ui_button`, `ui_board`) with 16×16 icons; the logo is sign-painter lettering.
  Remaining H4 work: campus map art and the Lagoon set (L6).
- **D-021 update:** at 3× text resolution the fallback ₱ is legible, so no pixel ₱ glyph is needed in the font.
