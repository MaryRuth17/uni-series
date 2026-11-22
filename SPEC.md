# Uni Series — AI Build Spec (Minigame #1: PUP Lagoon)

> **Status: DRAFT — not final.** Transcribed from the owner's PDF *"Uni Series — AI Build Spec (Minigame #1: PUP Lagoon)"*
> (Nov 20, 2026, @zeke). Engine: Phaser 4 + TypeScript + Vite, as written (Godot was evaluated and set aside; see
> [DECISIONS.md](DECISIONS.md) D-001). Choices the spec does not cover are in DECISIONS.md; how agents work in this repo is in [AGENTS.md](AGENTS.md).
>
> **Two newer owner docs override parts of this one (2026-11-22):**
> - [SPEC-homepage.md](SPEC-homepage.md) replaces the Title and Hub screens (section 3) with the Landing screen and the
>   Campus Map, build steps H1–H5.
> - [SPEC-pup-lagoon.md](SPEC-pup-lagoon.md) replaces section 4 ("Merienda sa Lagoon") with **Lagoon Merienda** (a new game, not the old one despite the similar name), an
>   endless cozy budgeting game, build steps L1–L7. These replace milestones M2–M5 (section 10).
>
> Everything else here still applies: stack, architecture, save, settings, testing, deployment, legal, M0, M1, M6, M7.

---

## 1. How to use this document

This spec is the single source of truth for building **Uni Series** (working title) and its first minigame,
**PUP — Lagoon Merienda** (specified in SPEC-pup-lagoon.md). Give it to an AI coding assistant as `SPEC.md` in the project root, then paste the
master prompt from section 14.

**Steps for you (the human)**

1. Export this doc as Markdown and save it as `SPEC.md` in an empty project folder.
2. Install the tools in section 7 (Node.js, Git, VS Code, an AI coding assistant).
3. Open the folder in your editor and start the AI with the master prompt (section 14).
4. Let the AI build one milestone at a time (section 10). Test each one in your browser before you say "next".
5. Deploy after Milestone 0, and again after every milestone (section 12). Deploying early catches hosting problems while the game is still small.

**Rules for the AI builder** (these override anything vague elsewhere)

- Build exactly what this spec says. If something is missing, pick the simplest option and record it in `DECISIONS.md`.
- Work one milestone at a time. At the end of each, stop, list what was built, and give manual test steps.
- Use TypeScript in strict mode. No `any` unless a comment explains why.
- Use only the libraries listed in section 7. Ask before adding any other dependency.
- Start with placeholder art (coloured shapes and text labels). Real art must drop in later with no code changes, because asset keys stay the same.
- Put every tuning number (timers, prices, speeds, goals) in the minigame's `config.ts`. Never hard-code them in scenes.
- Keep game logic (orders, cooking, scoring, clock) in plain TypeScript classes with no Phaser imports, so it can be unit-tested.
- Use relative asset paths (`assets/...`, no leading slash) so the build works on any host or subfolder.
- Never use official university logos, seals, mascots or trademarks. See section 13.
- Keep the game playable at every commit: `npm run dev` and `npm run build` must both pass.

**Glossary**

| Term | Meaning |
|---|---|
| Minigame | One self-contained game inspired by one Philippine university |
| Hub | The jeepney route map where the player picks a minigame |
| Day | One 3-minute round of a minigame |
| Sticker | A collectible earned by getting 3 stars in a minigame; shown in the hub's sticker book |
| Chill Mode | A setting that removes timers and patience meters for a pressure-free game |
| Placeholder | A temporary coloured shape standing in for final art |

---

## 2. Game overview

Uni Series is a cozy 2D browser game made of short minigames. Each one is set at a real Philippine university landmark
and built around what students actually do there. The first minigame puts the player behind a merienda stall at the
PUP Lagoon in Sta. Mesa, Manila.

| Item | Decision |
|---|---|
| Working title | Uni Series (final name to be decided) |
| Genre | Cozy minigame collection, 2D, casual |
| Platform | Web browser, desktop and mobile, landscape orientation |
| Session length | About 3 minutes per round (one "Day") |
| Audience | Filipino college students, alumni, and anyone who likes cozy games; ages 13+ |
| Language | English UI with Filipino/Taglish flavour text; full Filipino toggle in Milestone 6 |
| Business model | Free, no ads, no accounts, no data collection (v1) |
| Art style | Pixel art, 640×360 base resolution scaled up, warm afternoon palette |
| Engine and stack | Phaser 4 + TypeScript + Vite (section 7) |

**Design pillars** (every feature must support at least one)

1. **Chill first.** No game-over screens, no harsh buzzers, no punishing failure. Mistakes cost a little, never everything.
2. **Familiar places.** Each minigame should make a student or alumnus say "uy, ganyan talaga doon!" The setting, food, people and small details come from real campus life.
3. **One-thumb simple.** Every minigame is learnable in 10 seconds and playable with taps or clicks only.
4. **Bite-sized.** A round fits in a vacant period: about 3 minutes.
5. **Respectful fun.** Affectionate humour about campus life, never mocking a school, its students or its staff.

**Out of scope for v1:** accounts, online leaderboards, multiplayer, payments, ads, and app-store builds. Add these only after the web version proves popular.

---

## 3. Game structure

> **Superseded in part:** the Title and Hub screens are now the Landing screen and Campus Map in
> [SPEC-homepage.md](SPEC-homepage.md). The Days, stars and unlock rules under "Progression and rewards" do not apply to
> Lagoon Merienda, which is endless ([SPEC-pup-lagoon.md](SPEC-pup-lagoon.md) section 0). Sticker, Sticker Book, Pause
> and the visibility rule still apply.

The player repeats one loop: Title → Hub (U-Belt map) → pick a campus → play a Day → results and rewards → back to the Hub.

**Screens**

| Screen | Purpose | Key elements |
|---|---|---|
| Boot | Load the few files the loading bar needs | Nothing visible |
| Preloader | Load shared assets | Progress bar, text "Sumasakay na…" |
| Title | Start the game | "Uni Series" title text, Play button, Settings gear, Credits |
| Hub — U-Belt Map | Choose a minigame | Stylised map, campus stops, jeepney, LRT-2 line, coin counter, Sticker Book button |
| Minigame Intro | Teach the goal in one picture | Campus name, one-line goal, Day selector, "Tap to start" |
| Minigame Play | The game itself | Different per minigame |
| Results | Show how the Day went | 1–3 stars, ₱ earned, best score, Upgrades, Retry, Back to Map |
| Sticker Book | Show collected stickers | Grid of 7 slots; locked slots are greyed silhouettes |
| Settings (overlay) | Change options | Music and SFX volume, language, Chill Mode, reduced motion, replay tutorial |

**The Hub: U-Belt Map**

The hub is a stylised, hand-drawn map of Manila's University Belt and Sta. Mesa, based on the reference map at the end
of this section. It is not geographically exact; it only needs to feel right to someone who knows the area.

- Landmarks to draw: España Boulevard (top), Recto Avenue (left), the LRT-2 line (dashed purple, left to right), the Pasig River and its creeks (bottom), city blocks as a soft grid.
- Each campus is a "stop": a highlighted block with a name sign. v1 has 7 stops; only PUP is playable. The others show a "Soon" sign.
- Tap a stop: the jeepney drives along the route to it in about 1.5 seconds, then the Minigame Intro opens.
- The jeepney signboard shows the destination, like a real jeepney (for example "STA. MESA").
- Ambient life: an LRT-2 train glides along the purple line every 20–30 seconds, with stations at Recto, Legarda and Pureza. Clouds drift, the river shimmers.
- Top bar: total coins (₱), sticker count (for example 1/7), Settings gear.

Stop positions on the 640×360 hub (approximate centres, adjust by eye against the reference map):

| Stop | Campus | x, y | Playable in v1 |
|---|---|---|---|
| 1 | UST (España) | 190, 75 | No |
| 2 | FEU (Morayta, near Recto) | 135, 167 | No |
| 3 | NU (Sampaloc) | 272, 159 | No |
| 4 | UE (Recto) | 245, 218 | No |
| 5 | San Beda (Mendiola) | 300, 236 | No |
| 6 | CEU (Mendiola) | 380, 232 | No |
| 7 | PUP (Sta. Mesa) | 555, 248 | Yes |

The jeepney follows one route polyline through the stops in the order above (like a real jeepney route). Moving from
stop A to stop B tweens along the polyline segments between them.

**Progression and rewards**

- Each minigame has Days 1–5 of rising difficulty, then an endless Chill Mode.
- A Day ends with 0–3 stars based on ₱ earned against that Day's goals.
- Day N+1 unlocks after at least 1 star on Day N.
- Coins (₱) earned in a minigame buy that minigame's upgrades (section 4.9).
- 3 stars on Day 5 awards the campus Sticker. Stickers are cosmetic and fill the Sticker Book.
- Every shipped campus is open from the start, so the player is never blocked.

**Pause**

Every minigame has a pause button (top-right). Pause shows Resume, Restart Day, Settings and Back to Map. The game also
pauses automatically when the browser tab is hidden (`document.visibilitychange`).

**Reference map** (provided by the game owner; it uses OpenStreetMap data, so keep the credit line if you trace it — see section 13)

The image is in the original PDF; a copy is saved locally as `docs/reference/ubelt-map.webp`. It shows España (top), UST as a large
diamond top-left, FEU and Recto on the left, NU in the middle, UE / San Beda · CEU along the dashed purple LRT-2 line,
the Pasig River across the bottom, and PUP on the right, east of the creeks. Credit: "Map data © OpenStreetMap contributors".

---

## 4. Minigame #1 — PUP Lagoon

> **Replaced (2026-11-22).** The first draft's cooking game ("Merienda sa Lagoon") was replaced by **Lagoon Merienda**,
> specified in [SPEC-pup-lagoon.md](SPEC-pup-lagoon.md). The old section was removed to avoid confusion; its full text is
> in git history (commit `e8dddf0`, SPEC.md §4).

---

## 5. Minigame template and future roster

Every minigame plugs into the hub the same way, so adding a campus later means writing one folder and one design page,
not touching the core. Build only PUP Lagoon now; the code must already support the other six as "Soon" stops.

**Minigame manifest** (each minigame exports one; the campus map reads the list from `src/minigames/roster.ts`, DECISIONS D-017)

```ts
export interface MinigameManifest {
  id: string;            // 'pup-lagoon'
  title: string;         // i18n key, e.g. 'pupLagoon.title'
  campus: string;        // 'PUP Sta. Mesa'
  hubStop: number;       // 1-7, matches the hub stop table
  status: 'playable' | 'soon';
  introScene: string;    // Phaser scene key
  scenes: Array<typeof Phaser.Scene>;
  assetPack: string;     // 'assets/pup-lagoon/pack.json'
  stickerId: string;     // 'sticker-pup'
  days: number;          // 5
}
```

Rules for every minigame:

- Lives in `src/minigames/<id>/` with its own `config.ts`, `logic/`, `scenes/` and `objects/` folders, and assets in `public/assets/<id>/`.
- Loads its own assets when entered and frees them when leaving, so the hub stays light.
- Reports results to the core through one call: `GameEvents.emit('minigame:finished', { id, day, earned, stars })`. The core saves progress, coins and stickers.
- Uses the shared UI kit (buttons, panels, results card) and the shared Settings, Pause and Chill Mode.
- Follows the section 2 pillars: tap-only, about 3 minutes, no harsh failure.

**Design page template** (copy this for each new minigame and fill it in before any code)

1. Name, id, campus, hub stop.
2. Real place and why students know it (with sources).
3. Core loop in 5–8 numbered steps.
4. Items or objects table with tuning numbers.
5. Characters table.
6. Day table: what is new each Day, multipliers, star goals.
7. Controls table: touch, mouse, keyboard.
8. Screen layout table at 640×360.
9. Feedback and sounds.
10. Upgrades.
11. Asset list with keys.
12. Acceptance criteria checklist.

**Future roster** (concept seeds only; check each with current students of that school before building)

| Hub stop | Campus | Real-life hook | Minigame seed | Core mechanic |
|---|---|---|---|---|
| 1 | UST, España | Freshmen walk through the Arch of the Centuries to begin campus life; December brings the Paskuhan festival with lights and fireworks | **Paskuhan Lights**: light up the campus for the Christmas festival | Connect-the-lights puzzle: rotate wire tiles so every parol glows before the fireworks |
| 2 | FEU, Morayta | The campus holds Manila's largest surviving ensemble of Art Deco buildings, honoured by UNESCO in 2005 | **Deco Restore**: restore a faded Art Deco façade | Sliding-tile and colour-match puzzle, relaxed and untimed |
| 3 | NU, Sampaloc | The Bulldogs and their famous pep squad | **Pep Rally**: keep the crowd's energy up | Gentle rhythm game: tap with the drumbeat to build a cheer meter |
| 4 | UE, Recto | The campus faces Recto Avenue, an area known for bookstores, budget eateries and transport hubs | **Recto Book Hunt**: find every book on a classmate's list | Hidden-object search in stacked bookstall shelves |
| 5 | San Beda, Mendiola | A Benedictine school founded in 1901, famous for its Red Lions basketball team | **Shootaround sa Mendiola**: chill free-throw practice after class | Timing meter: release at the sweet spot; streaks unlock trick shots |
| 6 | CEU, Mendiola | Its first degree programme was Pharmacy, opened in 1921 | **Compounding Lab**: prepare orders in the pharmacy lab | Sort-and-measure: drag ingredients into the right jar in the right amounts |
| 7 | PUP, Sta. Mesa | The Lagoon and its food stalls | **Lagoon Merienda** ([SPEC-pup-lagoon.md](SPEC-pup-lagoon.md)) | Endless budgeting and shopping |

Keep every concept affectionate and generic: original characters, no real school logos, seals, mascots or team marks (section 13).

---

## 6. Art, UI and audio direction

The look is cozy pixel art in a warm late-afternoon light; the sound is soft lo-fi with gentle effects. Nothing flashes,
shakes hard or blares.

**Rendering rules**

- Base resolution 640×360. Phaser `pixelArt: true`, `roundPixels: true`, scale mode `FIT`, centred both ways. Add CSS `image-rendering: pixelated` on the canvas.
- Sprites are drawn at 1× for the 640×360 canvas. Characters are 48×72, food 32×24, icons 16×16.
- Letterbox colour: the darkest palette colour, so bars look intentional.

**Palette** (starting points; the artist may adjust)

| Use | Hex |
|---|---|
| Sky, warm to pale | `#F4C27A` → `#F7E3B5` |
| Lagoon water | `#5E8C61`, shadow `#3E6B4E` |
| Foliage | `#4F7F3A`, light `#7FAE5B` |
| Stall wood | `#8B5A3C`, light `#B07A4F` |
| UI panel cream | `#FFF4DC` |
| Outline and text | `#2B2233` |
| Coins and highlights | `#F2B33D` |
| Success / warning / burnt | `#6CC36A` / `#F08A3E` / `#3A2E2E` |

School colours may appear as accents on a campus's hub sign (for example maroon and gold for PUP). Logos and seals may not (section 13).

**Typography**

- UI font: Pixelify Sans (free, SIL Open Font License), self-hosted in `public/assets/fonts/`.
- Load the font before the Title scene renders text (`document.fonts.load()` in the Preloader), or Phaser will draw a fallback font.
- Check the peso sign ₱ (U+20B1). Many pixel fonts lack it. If missing, draw it as a 16×16 icon (`icon_peso`) and place it next to numbers.
- Minimum text size: 8 px at base resolution (16 px on a 720p screen).

**UI style**

- Cream panels with a 1 px dark outline and 4 px rounded corners (nine-slice).
- Buttons: 3 states (normal, hover, pressed); pressed moves down 1 px. Every button plays `sfx_click`.
- Microcopy is short and friendly Taglish: "Tara!", "Ulitin", "Balik sa mapa".
- Tweens: `Sine.easeInOut` for movement, `Back.easeOut` for pop-ins, 150–300 ms. The Reduced Motion setting turns off parallax drift, screen shake and bouncing.

**Audio**

- Music: chill lo-fi with acoustic guitar, soft keys and light percussion. OPM-inspired mood, but **original or properly licensed** — never a real song.
- PUP Lagoon uses two synced loops: `base` always plays; `rush` fades in during the Merienda rush.
- SFX: short, soft and round. No harsh buzzers. Wrong actions use a gentle "bonk".
- Default volumes: music 0.6, SFX 0.8. Both are adjustable and saved.
- Ship every sound as `.ogg` plus `.m4a` (Safari support). Phaser picks the first format the browser can play.
- Ambient bed: birds, distant chatter and water lapping under the music, very quiet.

**Placeholder policy**

Until final art exists, use coloured rectangles with labels, or CC0 packs from Kenney. Final art must keep the same asset
keys and frame sizes so no code changes.

---

## 7. Tech stack and tools

The game is a static website: Phaser 4 + TypeScript, bundled by Vite, saved in the browser's localStorage, and hosted
free on GitHub Pages. There is no server and no database in v1.

**Code stack** (versions checked November 2026; always install the latest release of the same major version)

| Layer | Choice | Version | Why |
|---|---|---|---|
| Game engine | Phaser | 4.x (4.2.1 is the newest listed release) | Mature, free 2D web engine with scenes, input, tweens, particles, audio and scaling built in |
| Language | TypeScript | 7.x (fall back to 6.0 if a tool breaks) | Types catch bugs early and help AI tools write correct code |
| Build tool and dev server | Vite | 8.x | Instant reload while coding; one command makes the production build |
| Project scaffold | `npm create @phaserjs/game@latest` | latest | Official starter; choose Web Bundler → Vite → TypeScript |
| Tooling runtime | Node.js | 24 LTS or 26 LTS | Runs Vite, tests and scripts (players never need it) |
| Package manager | npm | comes with Node | Simplest choice |
| Unit tests | Vitest | latest | Tests the pure logic classes and powers `npm run sim` |
| Smoke tests | Playwright | latest | Opens the built game in real browsers and checks it boots without errors |
| Lint and format | ESLint + typescript-eslint, Prettier | latest | Consistent, readable code |
| Saving | Browser `localStorage` | built in | No accounts or backend needed |
| Offline install (optional, Milestone 6) | vite-plugin-pwa | latest | Lets players "install" the game and play offline |
| Version control | Git + GitHub | — | History, backup, and the source for deployment |
| CI/CD | GitHub Actions | — | Builds, tests and deploys on every push to `main` |
| Hosting | GitHub Pages (main), itch.io (mirror) | — | Free; see section 12 |

Do not add React, Vue, a state library, a physics engine or a backend. Phaser's built-in tools cover everything this game needs.

**Phaser 4 warning for AI tools:** most AI models learned Phaser from Phaser 3 code. Phaser 4 keeps most of the API but
changed parts of rendering and effects. When something does not compile or looks wrong, check the official v3 → v4
migration guide and changelog before guessing. Phaser's release notes also point AI coding agents to a `skills/` folder
with Phaser 4 knowledge (installed at `node_modules/phaser/skills/`).

**Tools for you**

| Need | Tool | Cost | Notes |
|---|---|---|---|
| Code editor | VS Code | Free | Add the ESLint and Prettier extensions |
| AI coding assistant | Claude Code, Cursor, GitHub Copilot or similar (this project: Orca running Claude Code / Codex) | Varies | Must be able to read project files and run terminal commands |
| Pixel art and animation | Aseprite, or LibreSprite / Piskel | Aseprite paid; others free | Export sprite sheets as PNG + JSON |
| Texture atlas | Free Texture Packer, or TexturePacker | Free / paid | Export in Phaser "JSON Hash" format |
| Hub map tracing (optional) | Tiled, or any drawing app | Free | Trace roads from the reference map |
| Sound effects | jsfxr or ChipTone | Free, in browser | Export WAV, then convert |
| Music | BeepBox, or licensed CC0 tracks | Free | Keep the license file for every track |
| Audio convert and trim | Audacity, ffmpeg | Free | `ffmpeg -i in.wav -c:a libvorbis -q:a 4 out.ogg` and `ffmpeg -i in.wav -c:a aac -b:a 128k out.m4a` |
| Image optimisation | Squoosh or oxipng | Free | Shrink PNGs before shipping |
| Phone testing | Your phone on the same Wi-Fi | Free | Run `npm run dev -- --host` and open the shown network URL |

---

## 8. Project structure and architecture

The code separates **logic** (plain TypeScript that knows the rules) from **views** (Phaser scenes and sprites that draw
them). Scenes send player commands to the logic and animate the events it sends back. This keeps the game testable and
lets `npm run sim` play thousands of Days without a browser.

```
Scenes (Phaser views):  Title -> Hub map -> Lagoon intro -> Game + HUD -> Results -> (back to map)
                                                            |  commands: fry, serve
                                                            v  events: cooked, served
Minigame logic (no Phaser imports):   LagoonSim
    DayClock · OrderGenerator · Wok · Tray · CustomerQueue · Scoring
    ^ also driven by: balance bot (npm run sim) and unit tests (Vitest, seeded RNG)
Core services (shared by every minigame):
    SaveManager · AudioManager · GameEvents · Settings · i18n
```

The Game scene sends commands down to LagoonSim and animates the events it sends back; the balance bot and unit tests
drive the same logic without a browser. When a Day ends, Results emits `minigame:finished` on GameEvents and SaveManager stores it.

**Folder structure**

```
uni-series/
├─ SPEC.md                   this document
├─ DECISIONS.md              choices the AI made that the spec did not cover
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ .github/workflows/deploy.yml
├─ public/assets/
│  ├─ fonts/
│  ├─ common/                UI kit, icons, shared sounds
│  ├─ hub/                   map, jeepney, train, stop signs
│  └─ pup-lagoon/            pack.json, atlas, audio
├─ scripts/sim.ts            headless balance simulator
├─ src/
│  ├─ main.ts                creates Phaser.Game
│  ├─ game/config.ts         640x360, FIT, pixelArt, scene list
│  ├─ core/
│  │  ├─ SaveManager.ts      load, save, migrate localStorage
│  │  ├─ Settings.ts
│  │  ├─ AudioManager.ts     music layers, volumes, mute when tab hidden
│  │  ├─ GameEvents.ts       typed event bus
│  │  ├─ i18n.ts             t('key') lookup
│  │  └─ Random.ts           seeded RNG for sim and tests
│  ├─ scenes/                Boot, Preloader, Title, Hub, StickerBook, Pause, Settings
│  ├─ ui/                    Button, Panel, ResultsCard, Toast, HandPointer
│  ├─ i18n/                  en.json, fil.json
│  └─ minigames/
│     ├─ roster.ts           all 7 campuses, playable and "Soon" (SPEC-homepage §5)
│     └─ pup-lagoon/
│        ├─ manifest.ts
│        ├─ config.ts        every tuning number from section 4
│        ├─ logic/           NO Phaser imports allowed here
│        │  ├─ DayClock.ts
│        │  ├─ OrderGenerator.ts
│        │  ├─ Wok.ts
│        │  ├─ Tray.ts
│        │  ├─ CustomerQueue.ts
│        │  ├─ Scoring.ts
│        │  └─ LagoonSim.ts  combines all logic; used by the scene AND the sim
│        ├─ scenes/          LagoonIntro, LagoonGame, LagoonHud (parallel), LagoonResults
│        └─ objects/         CustomerSprite, WokSlotView, BinView, JarView, TrayView
└─ tests/
   ├─ unit/                  Vitest
   └─ e2e/                   Playwright smoke tests
```

**How the logic talks to the scene**

- `LagoonSim.update(dtMs)` advances time. The scene calls it from `update()` with Phaser's delta, clamped to 100 ms. Paused = not called.
- Commands from input: `fry(item)`, `pickUp(slotIndex)`, `selectCup(cupId)`, `applySauce(cupId, sauce)`, `serve(cupId, queueSpot)`, `trash(target)`, `makeGulaman()`. Each returns `{ ok: boolean, reason?: string }`.
- Events out (typed): `customerArrived`, `customerLeft`, `itemAdded`, `itemCooked`, `itemBurning`, `itemBurnt`, `cupReady`, `orderLineServed`, `orderCompleted`, `wrongServe`, `comboChanged`, `phaseChanged`, `dayEnded`.
- All randomness goes through `Random.ts` with a seed, so a Day can be replayed exactly in tests.

**Key config files**

```ts
// vite.config.ts
import { defineConfig } from 'vite';
export default defineConfig({
  base: './',            // relative paths: works on GitHub Pages subfolders and itch.io
  build: { assetsInlineLimit: 0, chunkSizeWarningLimit: 2000 },
  server: { host: true }
});
```

```ts
// src/game/config.ts (shape)
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 640,
  height: 360,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#2B2233',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [/* Boot, Preloader, Title, Hub, ... */]
};
```

**npm scripts**

| Script | Does |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Type-check, then build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally to test the real build |
| `npm test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright smoke tests on the built game |
| `npm run sim` | Run the balance bot and print earnings per Day |
| `npm run lint` / `npm run format` | ESLint / Prettier |

**Code conventions**

- Classes and their files in PascalCase; asset keys in snake_case; i18n keys like `pupLagoon.order.thanks`.
- No magic numbers in scenes: read from `config.ts`.
- No `setTimeout` or `setInterval` in game code. Use logic time or `scene.time` so pausing works.
- Pool frequently created objects (customers, floating text, particles).
- Remove event listeners in each scene's `shutdown` handler to avoid leaks between Days.
- Every scene file starts with a comment block saying what it shows and which events it listens to.
- Commit after each working step with messages like `M2: wok cooking states`.

---

## 9. Save data, settings, accessibility and language

Progress and settings are saved as one JSON object in `localStorage`, versioned so future updates never wipe a player's progress.

**Save format** (key: `uni-series-save`)

```ts
interface SaveData {
  version: 1;
  createdAt: string;                 // ISO date
  settings: {
    musicVolume: number;             // 0..1, default 0.6
    sfxVolume: number;               // 0..1, default 0.8
    language: 'en' | 'fil';          // default 'en'
    chillMode: boolean;              // default false
    reducedMotion: boolean;          // default: matches prefers-reduced-motion
    tutorialSeen: Record<string, boolean>;
  };
  wallet: Record<string, number>;    // coins per minigame, e.g. { 'pup-lagoon': 420 }
  stickers: string[];                // e.g. ['sticker-pup']
  minigames: Record<string, {
    unlockedDay: number;             // 1..5
    stars: number[];                 // best stars per Day, index 0 = Day 1
    bestEarned: number[];            // best ₱ per Day
    upgrades: Record<string, number>;// e.g. { wok: 1, oil: 0, radio: 2, sign: 0 }
  }>;
}
```

Saving rules:

- Save when a Day ends, when an upgrade is bought, and when a setting changes. Never every frame.
- Wrap every `localStorage` read and write in `try/catch`. Some browsers (private mode, iframes on itch.io) block or wipe storage; the game must keep running with in-memory defaults and show a small toast "Hindi ma-save ang progress".
- If the stored JSON fails to parse or has an unknown version, back it up to `uni-series-save-backup` and start fresh.
- `SaveManager.migrate()` upgrades old versions step by step (v1 → v2 → …). Add a unit test for each migration.
- Settings has "Reset progress", confirmed through an in-game panel (never the browser's `confirm()` popup).

**Settings screen**

| Setting | Control | Effect |
|---|---|---|
| Music volume | Slider | Music bus volume |
| SFX volume | Slider | Sound effects volume |
| Language | English / Filipino toggle | Reloads UI text from i18n |
| Chill Mode | Toggle | No patience timers in any minigame |
| Reduced motion | Toggle | Turns off parallax drift, shakes and bounces |
| Replay tutorial | Button | Sets `tutorialSeen` to false for the current minigame |
| Fullscreen | Button | `scale.startFullscreen()`; hidden where the browser does not support it (for example iPhone Safari) |
| Reset progress | Button + confirm panel | Clears the save |
| Credits | Button | Shows credits and asset licenses |

**Accessibility**

- Never use colour alone: cooking states have ring + icon; sauces have distinct jar shapes and labels.
- All actions work with tap-tap (no dragging required), and with the keyboard (section 4.6). Menus work with arrow keys + Enter.
- Touch targets at least 44×44 CSS px on phones.
- Every important sound has a visual cue, so the game is fully playable muted.
- Chill Mode and Reduced Motion are available from the first screen.
- Text has a dark outline or sits on a solid panel for contrast.

**Mobile and browser behaviour**

- Landscape only. In portrait, show a full-screen "Paki-rotate ang phone mo" overlay with a rotate icon, and pause.
- Browsers block sound until the first tap. The Title screen's "Tap to start" unlocks audio.
- Pause and mute when the tab is hidden; resume music when it returns.
- Prevent page scroll, pinch-zoom and long-press menus on the canvas (CSS `touch-action: none`, `user-select: none`, viewport meta with `user-scalable=no`).
- Use `100dvh` for the page height so mobile address bars do not crop the game.

**Language**

- All UI text lives in `src/i18n/en.json` and `src/i18n/fil.json` and is read through `t('key')`. No hard-coded strings in scenes.
- English is the default. Customer flavour lines stay in natural Taglish in both languages, as students really speak.
- Filipino UI translation is done in Milestone 6; until then `fil.json` may fall back to English keys.

---

## 10. Build milestones

> **Updated order (2026-11-22):** M0 (done) → M1 core shell together with H1 ([SPEC-homepage.md](SPEC-homepage.md)) →
> L1–L5 ([SPEC-pup-lagoon.md](SPEC-pup-lagoon.md)) alongside H2–H3 → H4 + L6 (art and audio) → H5 + L7 + M6 → M7.
> M2–M5 below are replaced by L1–L7. In M1, "Title" and "Hub" mean the Landing and Campus Map greybox from H1.

Build in 8 milestones, each ending in something you can open in a browser. The AI stops after each one, reports what
changed, and waits for your "next".

1. **M0 — Setup and first deploy**
   - Scaffold with `npm create @phaserjs/game@latest` (Web Bundler → Vite → TypeScript), then reshape to the folder structure in section 8.
   - Add ESLint, Prettier, Vitest, Playwright, `DECISIONS.md`, and the GitHub Actions deploy workflow (section 12).
   - Done when: a "Uni Series — hello" screen runs locally and at the public GitHub Pages URL.
2. **M1 — Core shell**
   - Boot, Preloader (progress bar + font loading), Title, Hub with 7 placeholder stops, Sticker Book, Pause and Settings overlays.
   - `SaveManager`, `Settings`, `AudioManager`, `GameEvents`, `i18n` with English keys, rotate-phone overlay.
   - Done when: you can go Title → Hub → tap PUP → jeepney drives → placeholder intro → back; settings persist after reload.
3. **M2 — PUP Lagoon logic and greybox**
   - All `logic/` classes with unit tests: clock, order generation, wok states, tray, queue, scoring, combo.
   - `LagoonGameScene` drawn with rectangles and labels at the section 4.7 positions; mouse, touch and keyboard input.
   - Done when: Day 1 is fully playable start to finish in greybox, and `npm test` passes.
4. **M3 — Full rules, Days 1–5**
   - Phases, all customer types, all menu items, FEWA's 2 slots, no-sauce orders, ambon event, Results screen with stars, Chill Mode, tutorial.
   - `npm run sim` bot; recalibrate star goals and record the numbers in `DECISIONS.md`.
   - Done when: all 5 Days are playable in greybox and goals are calibrated.
5. **M4 — Art and audio pass**
   - Swap placeholders for final or near-final art via the same keys; texture atlas; character animations; lagoon parallax and lights; hub map art based on the reference map.
   - Music layers, SFX, ambient bed, volume settings wired.
   - Done when: the game looks and sounds like the target mood on desktop and phone.
6. **M5 — Progression and rewards**
   - Day unlocking, coins per minigame, upgrade shop on Results, sticker award and Sticker Book, hub counters.
   - Done when: a fresh save can progress from Day 1 to the sticker, and everything survives reload.
7. **M6 — Polish, accessibility and language**
   - Juice from section 4.8, reduced motion, keyboard menu navigation, Filipino UI translation, credits screen with licenses, optional PWA.
   - Performance pass: object pools, atlas only, compressed audio; check the fps targets.
   - Done when: the section 11 checklist passes on all target devices.
8. **M7 — Release**
   - Final QA, e2e smoke tests in CI, production deploy, itch.io page, social preview image and page metadata.
   - Done when: the public URL works for a friend on their own phone with no help from you.

If the AI gets stuck on one problem for more than three attempts, it must stop, explain the problem in plain words, and propose two options.

---

## 11. Testing and QA

Three layers of checks: automatic unit tests on the logic, an automatic smoke test on the built site, and a short manual
checklist on real devices before each deploy to players.

**Unit tests** (Vitest, run on every push)

- `Wok`: an item becomes Cooked and Burnt at the configured times; FEWA takes 2 slots; a full wok rejects new items.
- `OrderGenerator`: only unlocked items and sauces appear; order sizes match the customer type; same seed gives the same orders.
- `Scoring`: base pay, tip formula, combo steps and cap, Chill Mode tip rule.
- `DayClock`: phase changes at 4:00 and 5:00 PM, spawning stops at 5:55 PM, the Day ends correctly with the grace period.
- `SaveManager`: defaults, round-trip save/load, corrupted JSON recovery, each migration.
- `LagoonSim`: a scripted perfect run of Day 1 earns the expected ₱ for a fixed seed.

**Smoke tests** (Playwright, run in CI on the production build)

- The page loads in Chromium, Firefox and WebKit with zero console errors.
- A canvas appears, the Title screen renders, and a tap reaches the Hub.
- Tapping the PUP stop opens the Lagoon intro.

**Manual device matrix** (before every public release)

| Device | Browser | Check |
|---|---|---|
| Windows or Mac laptop | Chrome, Firefox, Safari (Mac) | Full Day with mouse; full Day with keyboard |
| Android phone (mid-range) | Chrome | Full Day with touch; rotate overlay; sound after first tap |
| iPhone | Safari | Full Day with touch; no fullscreen button shown; audio works |
| Any | Embedded on itch.io | Loads inside the iframe; saving works or shows the warning toast |

**Release checklist**

- [ ] `npm run lint`, `npm test`, `npm run build` and `npm run test:e2e` all pass.
- [ ] No console errors or warnings during a full Day.
- [ ] 60 fps on desktop; at least 50 fps on a mid-range phone (Chrome DevTools performance panel or Phaser's fps counter in debug mode).
- [ ] First load under 5 MB total and under 4 seconds on a typical Philippine 4G connection (check DevTools Network with throttling).
- [ ] All text fits its panels in both English and Filipino.
- [ ] Every asset has a credit and license in the Credits screen and in `CREDITS.md`.
- [ ] No official logos, seals, mascots or real people anywhere (section 13).
- [ ] Save survives reload; Reset progress works.
- [ ] The debug overlay and cheat keys are disabled in production builds (`import.meta.env.PROD`).

Debug tools (development builds only): `F1` toggles an overlay with fps, the Day's earnings and the sim's expected max;
`F2` skips to the end of the Day; `F3` adds ₱500.

---

## 12. Deployment to a website

Deploy to **GitHub Pages** with a GitHub Actions workflow: every push to `main` builds the game and publishes it free at
`https://<your-username>.github.io/uni-series/`. Mirror it on **itch.io** to reach players who browse indie games.

**Hosting options**

| Host | Cost | Setup | Best for | Watch out for |
|---|---|---|---|---|
| GitHub Pages (**recommended**) | Free | Actions workflow below | Code and site in one place | Free plan needs a public repo |
| Cloudflare Workers (static assets) | Free tier; static asset requests are not billed | `wrangler deploy` or Git import | Fast global CDN, easy custom domain | Cloudflare now steers new projects to Workers rather than Pages |
| Netlify | Free tier (monthly credits) | Import the Git repo | Preview links for every change | Credit limits |
| Vercel | Hobby plan free | Import the Git repo; detects Vite | Easiest setup | Hobby is for personal, non-commercial use |
| itch.io (mirror) | Free | Upload a ZIP | Indie game audience, comments, devlogs | Plays inside an iframe; file limits below |

**One-time setup (you)**

1. Create a free GitHub account and a **public** repository named `uni-series`.
2. Push the project (the AI can run `git init`, `git remote add origin …`, `git push -u origin main`).
3. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Push any commit. Watch the **Actions** tab; when the job is green, open the URL it prints.

**Workflow file** `.github/workflows/deploy.yml` (based on Vite's official guide; the AI should copy the current action
versions from that page). The original draft's single job:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with:
          path: ./dist
      - id: deployment
        uses: actions/deploy-pages@v5
```

The repo's version splits this into a build job (runs on every push and PR) and a deploy job (main only); see DECISIONS.md D-006.

**Paths:** this spec uses `base: './'` in `vite.config.ts`, so the same build works at `/uni-series/`, at a custom domain
root, and on itch.io. The game has no page routing, so relative paths are safe. Load assets as `assets/...` with no leading slash.

**itch.io mirror**

1. Run `npm run build`, then zip the **contents** of `dist/` so `index.html` sits at the top of the ZIP (not inside a folder).
2. On itch.io: Create new project → Kind: HTML → upload the ZIP → tick "This file will be played in the browser".
3. Embed options: viewport 1280×720, enable the fullscreen button, tick "Mobile friendly" with landscape orientation.
4. Limits: the ZIP may hold at most 1,000 files, 500 MB in total and 200 MB per file, and file names are case-sensitive (itch.io HTML5 docs). The texture atlas keeps this game far below them.

**Custom domain (optional)**

- Buy a domain (for example `unigame.ph` or `.com`) from any registrar.
- GitHub: Settings → Pages → Custom domain → enter it, then add the DNS records GitHub shows. Tick **Enforce HTTPS** once it is available.

**Page polish (Milestone 7)**

- `index.html`: title "Uni Series — cozy campus minigames", description meta tag, favicon, theme colour, and Open Graph tags (`og:title`, `og:description`, `og:image` 1200×630) so links look good on Facebook and Messenger.
- A short `<noscript>` message and a friendly error panel if the game fails to start (for example, an old browser without WebGL).
- After deploying, hard-refresh (Ctrl+Shift+R) to bypass cached files when checking the update.

**Release routine (every update)**

1. Tick the release checklist in section 11.
2. Bump the version in `package.json` and show it small on the Title screen.
3. Push to `main` → GitHub Pages updates automatically.
4. Rebuild and re-upload the ZIP to itch.io; post a short devlog.

---

## 13. Legal and respectful-use notes

Uni Series is an unofficial fan project, so it may name the universities and draw places "inspired by" them, but it must
never look like an official product of any school. These are practical guidelines, not legal advice; talk to a lawyer
before you monetise the game or partner with a school.

**University names, logos and teams**

- Use school names only to say where a minigame is set ("inspired by the PUP Lagoon").
- Never use official logos, seals, crests, mascots, or team logos. In the Philippines these are protected under the Intellectual Property Code (RA 8293).
- Team nicknames (Red Lions, Bulldogs, Tamaraws and others) are also brand names. Before public release, rename any minigame title that uses one to a generic title (for example "Shootaround sa Mendiola" instead of "Red Lions Shootaround").
- School colours as small accents are fine. Do not combine colours, names and symbols in a way that imitates official branding.
- Show this disclaimer on the Title screen footer, in Credits and on the itch.io page: *"Uni Series is an unofficial fan project. It is not affiliated with, endorsed by, or sponsored by any of the universities it references."*
- If the game grows popular, consider contacting each school's student council or public affairs office. A blessing, or even a partnership, beats a takedown request.

**Places and maps**

- Draw landmarks in your own stylised way, from your own photos or memory. Do not trace other people's photos.
- The reference hub map uses OpenStreetMap data. If you trace roads from it, add **"Map data © OpenStreetMap contributors"** to Credits (OSM copyright).

**People and tone**

- No real people: no named professors, guards, vendors or students. All characters are original types.
- Keep humour affectionate. Inside jokes (green lagoon water, España floods) are fine; insults, rivalries that demean another school, and political topics are not.
- Avoid real-world tragedies or protests as game content.

**Assets and licenses**

- Keep a `CREDITS.md` listing every asset, its author, source URL and license. Show the same list in the in-game Credits.
- Prefer CC0 assets. CC-BY assets are fine with credit. Never use "free download" assets with an unclear license.
- Never use real songs, even short clips. Music must be original or licensed for games.
- Pixelify Sans uses the SIL Open Font License: include the license text with the font files.
- If you use AI image or music generators, check that tool's terms for commercial and redistribution rights, and do not prompt for a specific living artist's style.

**Privacy**

- v1 collects no personal data and uses no cookies; saving is local to the player's browser.
- If you later add analytics or accounts, use a privacy-friendly tool, publish a short privacy notice, and follow the Philippine Data Privacy Act (RA 10173).

---

## 14. Master prompt for your AI coding tool

Paste this as your first message to the AI after `SPEC.md` is in the project folder. Use the short follow-up prompts
after it as you go. (In this repo, agents also read `AGENTS.md` automatically.)

```text
You are a senior game developer building a browser game with me.

Read SPEC.md in this folder completely before writing any code. It is the single
source of truth for the game "Uni Series". Its first minigame, "Lagoon Merienda",
is specified in SPEC-pup-lagoon.md.

How we work:
1. Follow the milestones in section 10 in order. Do ONLY the current milestone.
2. Before coding a milestone, write a short plan (files to create or change, and
   how I will test it). Then build it.
3. Use exactly the stack in section 7: Phaser 4 + TypeScript (strict) + Vite,
   Vitest, Playwright, ESLint, Prettier. Ask me before adding any other dependency.
   Most Phaser examples online are Phaser 3; if an API fails, check the Phaser 4
   migration guide instead of guessing.
4. Follow the architecture in section 8: game rules live in src/minigames/<id>/logic
   with NO Phaser imports, and every tuning number lives in config.ts.
5. Use placeholder shapes with labels until Milestone 4, using the exact asset
   keys in section 4.11.
6. Use relative asset paths (assets/...) and base './' in vite.config.ts.
7. Never add official university logos, seals, mascots or real people (section 13).
8. After each milestone: run lint, tests and build; fix all errors; commit with a
   message like "M2: wok cooking states"; then STOP and give me:
   - what you built,
   - step-by-step manual test instructions,
   - anything you decided that the spec did not cover (also add it to DECISIONS.md),
   - any problems or risks.
9. If something in the spec is unclear, choose the simplest option that fits the
   design pillars in section 2, and note it in DECISIONS.md.
10. If you are stuck on the same error after 3 attempts, stop and explain the
    problem in plain words with two options.

Start now with Milestone 0.
```

**Useful follow-up prompts**

- "Next milestone."
- "Something is wrong: [describe what you see, what you expected, and paste any red error text from the browser console (F12)]. Fix it without changing unrelated code."
- "Run `npm run sim` and show me the earnings per Day. Recalibrate the star goals as section 4.5 says."
- "Explain how [file or feature] works in simple words, then add comments to the code."
- "Deploy: commit, push to main, and tell me when the GitHub Actions job is green and the URL works."
- "Start the design page for the next campus using the template in section 5. Ask me 5 questions about real student life there first."
