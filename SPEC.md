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
**PUP Lagoon: Merienda sa Lagoon**. Give it to an AI coding assistant as `SPEC.md` in the project root, then paste the
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

The image is in the original PDF; save a copy as `docs/reference/ubelt-map.png`. It shows España (top), UST as a large
diamond top-left, FEU and Recto on the left, NU in the middle, UE / San Beda · CEU along the dashed purple LRT-2 line,
the Pasig River across the bottom, and PUP on the right, east of the creeks. Credit: "Map data © OpenStreetMap contributors".

---

## 4. Minigame #1 — PUP Lagoon: "Merienda sa Lagoon"

> **Replaced (2026-11-22)** by [SPEC-pup-lagoon.md](SPEC-pup-lagoon.md), "Lagoon Merienda". This section is kept for
> reference only. Do not build it.

The player runs a small merienda stall beside the PUP Lagoon and serves street food to students between classes. Fry,
add sauce, and serve orders before customers lose patience, and earn enough ₱ to reach the Day's goal.
Minigame id: `pup-lagoon`.

### 4.1 Setting and mood

- **Real place.** The Lagoon sits at the heart of PUP's Mabini Campus in Sta. Mesa, Manila (PUP campuses). It is a landscaped rainwater-catchment pond with walkways, greenery and renovated stalls (campus facilities).
- **Real food.** Stalls around it sell cheap favourites such as fish balls, burgers and the famous FEWA (Footlong Egg Wrapped Around) (PUP facilities guide). The game uses these and similar Filipino street food.
- **Mood.** Late-afternoon tambay. Warm sunlight, trees reflected in green water, string lights that switch on near the end of the Day, students strolling past with bags and folders.
- **Gentle humour.** The lagoon's green water is a known campus joke. Keep it affectionate (for example a sign: "Bawal mag-swimming"). No gross-out jokes.
- **Background details** (decoration only): walkway, benches, trees, neighbouring stall roofs, a distant obelisk-like silhouette (generic shape, not a copy of any official mark), birds, water ripples, a cat napping on a bench.

### 4.2 Core loop (one order)

1. A customer walks up to one of 3 queue spots. A speech bubble shows the order as icons: item(s) + sauce.
2. The player taps an ingredient bin. One serving drops into a free wok slot and starts frying.
3. A ring around the slot fills: Raw (grey) → Cooked (green) → Burnt (black).
4. The player taps a cooked serving. It moves to the plating tray as a cup.
5. With a tray cup selected, the player taps a sauce jar. The sauce is applied.
6. The player serves: drag the cup onto the customer, or tap the cup and then the customer.
7. **Correct:** the customer pays, "+₱" floats up, and they leave happy once every line of their order is served. **Wrong item or sauce:** the customer says "Hala, mali!", the cup is wasted, and their patience drops 20%. Nothing else is lost.

Rules that keep it simple:

- One tap on a bin = one serving. The wok has 6 slots (3×2 grid). If all are full, the bin wiggles and nothing happens.
- The tray holds up to 3 cups. If it is full, cooked food waits in the wok (and can still burn).
- Burnt food must be tapped (or dragged) to the trash to free the slot. It costs nothing but time.
- An order has 1–3 lines; each line is one item + one sauce (or "no sauce", shown as a crossed-out drop). Delivering a correct cup ticks its line.
- Gulaman (a drink) skips the wok: tap the dispenser and a cup appears on the tray. It never takes sauce.

### 4.3 Menu

| Item | Key | Unlocks | Cook time (s) | Burns after cooked (s) | Price (₱) | Notes |
|---|---|---|---|---|---|---|
| Fishball | `fishball` | Day 1 | 3 | 4 | 15 | The basic order |
| Kikiam | `kikiam` | Day 1 | 4 | 4 | 15 | |
| Kwek-kwek | `kwekkwek` | Day 2 | 5 | 3.5 | 20 | Orange-battered quail eggs |
| Sago't gulaman | `gulaman` | Day 2 | — | — | 20 | Drink; instant; no sauce |
| Squidball | `squidball` | Day 3 | 4 | 3.5 | 20 | |
| FEWA | `fewa` | Day 4 | 7 | 3 | 35 | Takes 2 side-by-side wok slots |

Sauces: Sweet (`sweet`, brown), Spicy (`spicy`, red with chilli), Suka (`suka`, vinegar with onions). "No sauce" orders start on Day 3.

### 4.4 Customers

All characters are original, with generic clothes. No real people, no real school uniforms or insignia.

| Type | Key | From | Patience (s) | Order lines | Tip rate | Look |
|---|---|---|---|---|---|---|
| Freshie | `freshie` | Day 1 | 30 | 1 | 0.10 | Big backpack, new ID lace, campus map in hand |
| Engineering student | `engg` | Day 1 | 25 | 1–2 | 0.20 | Drafting tube, hard-hat keychain |
| Accountancy student | `acctg` | Day 2 | 22 | 1–2 | 0.30 only if perfect, else 0 | Calculator, thick reviewer |
| Org officer | `org` | Day 3 | 25 | 2–3 | 0.35 | Org shirt, clipboard, lanyard |
| Professor | `prof` | Day 4, 10% chance | 35 | 1 | 0.50 | Polo, folder, umbrella |
| Guard | `guard` | Day 5, once | 40 | 3 (all gulaman) | 0.50 | Generic security uniform |

Payment rules:

- Base pay = sum of the order's item prices.
- Tip = round(base pay × tip rate × patience left as a fraction 0–1).
- Combo: each consecutive perfect order (no mistakes, served with more than 50% patience) adds +₱1 per step, capped at +₱5. A mistake or a customer leaving resets it.
- If patience reaches 0, the customer sighs ("Sige, next time na lang.") and leaves. No money; combo resets.
- **Chill Mode:** patience never runs out and tips use a fixed 0.5 patience fraction.

### 4.5 Day structure and difficulty

A Day lasts 180 real seconds, shown as a clock from 3:00 PM to 6:00 PM (1 second = 1 game minute).

| Phase | Clock | Base spawn interval (s) | What changes |
|---|---|---|---|
| Vacant | 3:00–4:00 PM | 9 | Calm start |
| Merienda rush | 4:00–5:00 PM | 5 | Busiest hour; music layer adds percussion |
| Uwian | 5:00–6:00 PM | 6 | String lights switch on at 5:30 |

No new customers spawn after 5:55 PM. The Day ends at 6:00 PM once the queue is empty, or after a 15-second grace
period. The spawn interval is the phase value × the Day's multiplier, with ±20% random jitter. A new customer never
spawns if all queue spots are full; they wait off-screen instead.

| Day | New this Day | Max queue | Spawn multiplier | Goals ★ / ★★ / ★★★ (₱) |
|---|---|---|---|---|
| 1 | Tutorial; fishball, kikiam, 3 sauces; freshie, engg | 2 | 1.30 | 180 / 300 / 390 |
| 2 | Kwek-kwek, gulaman, acctg | 3 | 1.15 | 300 / 490 / 650 |
| 3 | Squidball, "no sauce" orders, org officer | 3 | 1.00 | 410 / 660 / 870 |
| 4 | FEWA, professor | 3 | 0.95 | 500 / 800 / 1050 |
| 5 | Ambon (sudden rain) event, guard | 3 | 0.90 | 560 / 910 / 1190 |

**These goals are first-pass estimates.** The AI must build `npm run sim`: a headless bot that plays each Day perfectly
using the pure logic classes. Then set goals to 40% / 65% / 85% of the bot's average over 50 runs, rounded to the nearest ₱10.

**Ambon event (Day 5):** at 4:30 PM, rain falls for 40 seconds. Customers spawn 30% faster, arrive with umbrellas, and
order only hot food (no gulaman). Add rain particles, a cozy rain loop, and darker lighting. It ends with a small rainbow.

### 4.6 Controls

| Action | Mouse or touch | Keyboard |
|---|---|---|
| Fry an item | Tap its bin | 1–5 |
| Make gulaman | Tap the dispenser | G |
| Pick up a cooked serving | Tap it in the wok | Space (oldest cooked first) |
| Select a tray cup | Tap it | Tab (cycles) |
| Add sauce to the selected cup | Tap a sauce jar | Q sweet, W spicy, E suka |
| Serve the selected cup | Drag to customer, or tap cup then customer | A / S / D (queue spot 1 / 2 / 3) |
| Throw away | Drag to trash, or select then tap trash | X |
| Pause | Pause button | Esc or P |

### 4.7 Screen layout (640×360 base)

The top 200 px is the lagoon scene and customer queue; the bottom 160 px is the stall counter with every station on it.
The wok is the centre of play; ingredients feed it from the left and sauces finish cups on the right. Exact positions
are in the table below.

```
+------------------------------------------------------------------------------+
| 3:00 PM                    ₱120 / goal ₱390                            Pause |  HUD 0..24
| Lagoon scene: sky, trees, water, walkway     toasts: Combo x3!               |
|                     [order]        [order]        [order]                    |
|                     [Spot 1]       [Spot 2]       [Spot 3]                   |  feet at y=196
+------------------------------------------------------------------------------+  y=200
| [fish][kikiam][kwek][squid][FEWA]   [ wok 3x2 slots ]   [sweet][spicy][suka] |
| [gulaman] [ tray: 3 cups      ]     [               ]              [trash]   |
+------------------------------------------------------------------------------+  y=360
```

| Element | Top-left x, y | Size (w×h) | Notes |
|---|---|---|---|
| HUD bar | 0, 0 | 640×24 | Clock (left), ₱ total and goal bar (centre), pause (right) |
| Lagoon background | 0, 0 | 640×200 | Layers: sky, far trees, water (ripple loop), walkway, string lights |
| Queue spots (3) | centres x = 200, 320, 440; feet at y = 196 | 48×72 sprites | Bubble above the head; patience bar under the bubble |
| Counter | 0, 200 | 640×160 | Wooden stall front |
| Ingredient bins (5) | 16, 216 | 52×44 each, 8 px gaps | fishball, kikiam, kwekkwek, squidball, fewa; locked bins show a padlock |
| Gulaman dispenser | 16, 276 | 52×64 | |
| Plating tray (3 cups) | 84, 284 | 216×56 | 3 slots of 64×48 |
| Wok (6 slots) | 324, 216 | 168×104 | 3×2 slots of 48×40 |
| Sauce jars (3) | 508, 216 | 36×52 each, 8 px gaps | sweet, spicy, suka |
| Trash | 572, 292 | 48×48 | |
| Combo and toasts | centred at 320, 44 | — | "Combo x3!", phase banners |

All touch targets must be at least 44×44 px after scaling on a phone. If a station is smaller at 640×360, enlarge its invisible hit area.

### 4.8 Feedback and "juice"

- Item drops into the wok with a small bounce, a soft "tsss" sizzle and oil-bubble particles.
- Cooking ring around each slot. At Cooked: soft ding and a green glow. 1 second before burning: the ring blinks orange. Each state also has its own icon, so colour is never the only signal.
- Correct serve: soft coin sound, "+₱20" floats up from the customer, heart emote, "Salamat po!", customer walks away.
- Wrong serve: soft "bonk", "?" emote, cup poofs.
- Customer gives up: sigh emote, slow walk away. Never a loud buzzer.
- Phase change: banner slides in ("Merienda rush!"), music adds or drops a layer.
- End of Day: lights glow on, the results card slides up.

Flavour lines (store in i18n files, pick at random): "Pabili po!", "Isa nga pong kwek-kwek.", "Ate, spicy ha!",
"Salamat po!", "Sarap!", "Hala, mali!", "Sige, next time na lang.", "May quiz pa ako, bilis!"

### 4.9 Upgrades

Bought on the Results screen with ₱ earned in this minigame. They are saved permanently.

| Upgrade | Key | Cost Lv1 / Lv2 / Lv3 (₱) | Effect Lv1 / Lv2 / Lv3 |
|---|---|---|---|
| Mainit na Kawali (hotter wok) | `wok` | 200 / 450 / 800 | Cook time −10% / −20% / −30% |
| Slow-burn oil | `oil` | 150 / 350 / 700 | Burn window +1 / +2 / +3 s |
| Stall radio | `radio` | 250 / 500 / 900 | Patience +10% / +20% / +30%; each level unlocks a music track |
| Painted stall sign | `sign` | 200 / 450 / 800 | Tips +5% / +10% / +15% |

### 4.10 Tutorial (Day 1, first play only)

A hand pointer guides one scripted order. The clock and patience are frozen until the tutorial ends.

1. A freshie arrives: "Pabili po!" The bubble shows fishball + sweet. Point at the fishball bin.
2. Point at the frying slot: "Wait until it turns green."
3. Point at the cooked fishball: "Tap to put it in a cup."
4. Point at the sweet sauce jar.
5. Point at the customer: "Serve!"
6. "Ayan! Ready ka na." The clock starts.

The tutorial has a Skip button and can be replayed from Settings.

### 4.11 Asset list

Placeholders first (coloured rectangles with text labels), using exactly these keys.

| Key | Type | Size (px) | Frames or notes |
|---|---|---|---|
| `lagoon_sky`, `lagoon_trees`, `lagoon_walkway` | image | 640×200 | Parallax layers |
| `lagoon_water` | spritesheet | 640×80 | 4-frame ripple loop |
| `lagoon_lights` | spritesheet | 640×40 | 2 frames: off, on |
| `stall_counter` | image | 640×160 | |
| `bin_<item>` | image | 52×44 | One per fried item |
| `food_<item>` | spritesheet | 32×24 (FEWA 64×24) | 3 frames: raw, cooked, burnt |
| `cup_<item>` | image | 32×32 | Plated serving; sauce shown as an overlay `sauce_drip_<sauce>` |
| `jar_<sauce>` | image | 36×52 | |
| `dispenser_gulaman`, `trash`, `wok` | image | per layout | |
| `customer_<type>` | spritesheet | 48×72 | walk 4, idle 2, happy 2, sad 2 frames |
| `bubble` | nine-slice image | 24×24 source | |
| `icons` | spritesheet | 16×16 | Item, sauce and no-sauce icons, emotes |
| `fx_oil`, `fx_coin`, `fx_rain` | particle textures | 4–8 px | |
| `sfx_sizzle`, `sfx_ding`, `sfx_coin`, `sfx_bonk`, `sfx_drop`, `sfx_click`, `sfx_rain_loop` | audio | short | `.ogg` + `.m4a` |
| `music_lagoon_base`, `music_lagoon_rush` | audio loop | 60–120 s each | Two layers that play in sync |

In Milestone 4, pack the images into one texture atlas: `pup-lagoon.png` + `pup-lagoon.json`.

### 4.12 Acceptance criteria

PUP Lagoon is done when all of these are true:

- [ ] All 5 Days can be played start to finish on desktop Chrome, Firefox and Safari, and on a mid-range Android phone in landscape.
- [ ] An order can be completed with mouse only, with touch only, and with keyboard only.
- [ ] Cooking states change at the configured times (within 0.1 s) and are readable without relying on colour.
- [ ] Wrong orders and customers leaving never end a Day early.
- [ ] Chill Mode removes patience timers; the Day still ends at 6:00 PM.
- [ ] Results show stars, ₱ earned and best score; progress survives a page reload.
- [ ] Upgrades apply their effects and persist.
- [ ] Runs at 60 fps on desktop and at least 50 fps on a mid-range phone with 3 customers and 6 items frying.
- [ ] `npm run sim` reports each Day's 3-star goal at 80–90% of the bot's average.

---

## 5. Minigame template and future roster

Every minigame plugs into the hub the same way, so adding a campus later means writing one folder and one design page,
not touching the core. Build only PUP Lagoon now; the code must already support the other six as "Soon" stops.

**Minigame manifest** (each minigame exports one; the hub reads the list from `src/minigames/index.ts`)

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
| 7 | PUP, Sta. Mesa | The Lagoon and its food stalls | **Merienda sa Lagoon** (this spec) | Cook-and-serve |

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
│     ├─ index.ts            registry of all 7 manifests
│     ├─ soon/               manifests for the 6 "Soon" campuses
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
source of truth for the game "Uni Series" and its first minigame, "PUP Lagoon:
Merienda sa Lagoon".

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
