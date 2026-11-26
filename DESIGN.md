---
version: alpha
name: Uni Series
description: >-
  Cozy pixel-art browser game about Manila college life (landscape only, 640x360 logical grid drawn at 3x).
  Warm golden-hour light, cream panels with a dark ink outline, Pixelify Sans text, jeepney-yellow action boards.
  Every value below comes from the code or the baked assets; the Source column says which file.
colors:
  # Core UI (src/ui/theme.ts COLORS / TEXT)
  ink: "#2B2233"
  cream: "#FFF4DC"
  gold: "#F2B33D"
  red: "#D94B3D"
  yellow: "#F2C14E"
  grey: "#8A8494"
  dim: "#000000" # backdrop behind overlays, drawn at 0.6 alpha (src/ui/Panel.ts backdrop)
  white: "#FFFFFF"
  # World palette (src/home/config.ts PALETTE)
  jeep-blue: "#3B6FB6"
  jeep-green: "#3A9A6A"
  chrome: "#C9D1D9"
  lrt-purple: "#7B4BB3"
  window-glow: "#FFE08A"
  city-silhouette: "#5B4A7A"
  wall-sand: "#E8D3B0"
  wall-clay: "#C9A27E"
  wall-sky: "#9DB4C0"
  # Art-script edge colours (scripts/art/ui.mjs)
  cream-edge: "#C9B99A"
  yellow-edge: "#C9932A"
  chrome-edge: "#8A929C"
  # One-off UI colours found in scenes (see the Colors section for where)
  success-edge: "#2B5A3A"
  tab-off: "#CFC6B0"
  divider: "#C9C0AA"
  soon-card: "#E6DCC6"
  soon-text: "#7A6A55"
  paper: "#FFFCF2"
  paper-line: "#CFE0F2"
typography:
  body:
    fontFamily: Pixelify Sans, monospace
    fontSize: 8px
    fontWeight: 400
  heading:
    fontFamily: Pixelify Sans, monospace
    fontSize: 16px
    fontWeight: 400
  display:
    fontFamily: Pixelify Sans, monospace
    fontSize: 32px
    fontWeight: 400
  input:
    fontFamily: Pixelify Sans, monospace
    fontSize: 10px
    fontWeight: 400
rounded:
  none: 0px
  notch: 2px # panel/button corner: 3 transparent pixels per corner (scripts/art/ui.mjs)
  input: 2px # HTML name field (src/scenes/IdCardScene.ts)
spacing:
  slice: 6px # nine-slice border (src/ui/Button.ts SLICE, src/ui/Panel.ts)
  hud-margin: 20px # first HUD centre from the top/left edge (src/home/config.ts MAP.home, LANDING.icons.y)
  list-gap: 8px # src/home/config.ts MAP.list.gap
  text-gap: 8px # between stacked paragraphs (src/scenes/CreditsScene.ts)
  panel-text-inset: 20px # panel width minus wordWrap width, halved (CreditsScene 400/360, ComingSoonScene 320/280)
  settings-row-pitch: 22px # src/scenes/SettingsScene.ts
  menu-button-pitch: 28px # src/scenes/PauseScene.ts
  toast-pad-x: 8px # src/scenes/ToastScene.ts (box width = text + 16)
  tap-target-min: 44px # SPEC-homepage section 6. NOT met by the current HUD (see TODOs)
components:
  panel:
    backgroundColor: "{colors.cream}"
    rounded: "{rounded.notch}"
  backdrop:
    backgroundColor: "{colors.dim}"
  button:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.notch}"
    width: 140px
    height: 22px
  button-board:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.red}"
    typography: "{typography.heading}"
    rounded: "{rounded.notch}"
    width: 176px
    height: 36px
  button-selected:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
  button-danger:
    backgroundColor: "{colors.red}"
    textColor: "{colors.cream}"
    width: 88px
    height: 20px
  button-disabled:
    backgroundColor: "{colors.grey}"
    textColor: "{colors.ink}"
  icon-button:
    backgroundColor: "{colors.cream}"
    size: 28px
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    height: 18px
  name-input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.input}"
    rounded: "{rounded.input}"
    width: 110px
    height: 16px
---

# Uni Series design system

This file records what the game looks like **today**, taken from the code and the baked art, so designers and
agents (including the `frontend-design`, `ui-ux-pro-max` and `design-review` skills) can work from one place.

- **Source of truth.** If this file and the code disagree, the code and `public/assets/` are right: fix this file in
  the same change. Where an older spec line disagrees with the code, see _Spec vs code differences_ at the end.
- **Not defined yet.** Anything the code does not define is marked `TODO: not defined yet`. Do not invent a value;
  ask the owner or add a decision to `DECISIONS.md` first.
- **Units.** Every size is in logical pixels of the 640x360 grid unless it says "screen px".

## Overview

**Direction.** Cozy pixel art in warm late-afternoon light. Nothing flashes, shakes hard or blares
(`SPEC.md` section 6). The landing is a side-view street at golden hour in the U-Belt: jeepneys, the LRT-2, print
shops, food carts. The campus map is a top-down illustrated map. The Lagoon minigame is a 3/4 top-down view of
storefronts and a notebook-style HUD. Mood: cozy, nostalgic and funny, never gritty (`SPEC-homepage.md` section 2).

**How it is made.** Art is drawn in code by `scripts/art/*.mjs` (R-006, D-043) with a tiny pixel canvas
(`scripts/art/pix.mjs`: bevels, 4x4 Bayer dithering, 1 px ink outlines) and baked to PNG by `npm run art` into
`public/assets/{common,home,map,lagoon}/`. Each set has `pack.json` (Phaser loader) and `manifest.json` (sizes).
Edit the script, never the PNG. The baked art uses about 2,500 distinct opaque colours (measured over the 146 PNGs):
there is no fixed palette limit, only shared ink and cream plus `shade()` lighten/darken steps.

**Layout and scaling rules**

| Rule                       | Value                                                                                                                    | Source                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Orientation                | Landscape only. Portrait on a touch device shows a "rotate your phone" screen and pauses the game.                       | `src/main.ts`, `index.html` `#rotate`                        |
| Logical grid               | 640 x 360 (`VIEW_W`, `VIEW_H`). Lay everything out on this grid.                                                         | `src/ui/view.ts`                                             |
| Render scale               | `RENDER_SCALE` = 3, so the canvas is 1920 x 1080. Every camera zooms 3x. Text is drawn at `resolution: 3`.               | `src/ui/view.ts`, `src/game/config.ts`, D-040                |
| Scene setup                | Every scene is created with `sceneConfig(key)`; extra cameras use `addViewCamera`.                                       | `src/ui/view.ts`                                             |
| Pixel snapping             | `pixelArt: true` (nearest-neighbour textures) and `roundPixels: true`. Canvas CSS is `image-rendering: pixelated`.       | `src/game/config.ts`, `index.html`                           |
| Smoothing                  | No smoothing on art. Do not scale sprites by fractions. Only whole-number scales (the avatar is shown at 1x or 2x).      | `src/game/config.ts`, `src/ui/avatar.ts`, D-041              |
| Fit                        | `Phaser.Scale.FIT`, centred both ways. Bars around the canvas are ink (`#2B2233`), so letterboxing looks intentional.    | `src/game/config.ts`, `index.html` (body, `theme-color`)     |
| Pointer maths              | Use `worldX/worldY`; divide drag deltas in screen px by `RENDER_SCALE`.                                                  | D-040                                                        |
| Transparency               | Art is hard-edged. Only soft layers use partial alpha: night lights, notebook pages, the LRT track, campus sprites.       | `public/assets/` scan: 29 of 146 PNGs have partial alpha     |

## Colors

Colours are `0xRRGGBB` numbers for shapes and `'#RRGGBB'` strings for text. Import them; never retype a hex that
already has a name.

### Core UI (use these first)

| Token    | Hex       | Used for                                                                                                        | Source                                         |
| -------- | --------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `ink`    | `#2B2233` | Outlines, default text, letterbox, fade colour, toast and footer background, darkest colour of the game         | `src/ui/theme.ts`, `index.html`, `config.ts`   |
| `cream`  | `#FFF4DC` | Panels, default button face, text on dark backgrounds, label chips on the map                                   | `src/ui/theme.ts`, `scripts/art/ui.mjs`        |
| `yellow` | `#F2C14E` | Main-action "route board" buttons, selected toggle, jeepney yellow                                              | `Button.ts`, `PALETTE.jeepYellow`              |
| `red`    | `#D94B3D` | Titles, headlines and warnings (`TEXT.red`), label on yellow boards, danger button fill, active tab/ring stroke | `src/ui/theme.ts`, `Settings`, Lagoon scenes   |
| `gold`   | `#F2B33D` | Earned stickers, map stop highlight stroke, Lagoon note highlight text (`TEXT.gold`)                            | `StickerBookScene.ts`, `CampusMapScene.ts`     |
| `grey`   | `#8A8494` | Secondary text (`TEXT.grey`, labels), disabled button tint, inactive tab stroke                                 | `Button.ts`, Lagoon intro/result scenes        |
| `dim`    | `#000000` | Full-screen backdrop behind overlays: alpha 0.6 (default), 0.5 (confirm box), 0.7 (tap-to-start)                | `Panel.ts`, `SettingsScene.ts`, `LandingScene` |
| `white`  | `#FFFFFF` | Highlights, name field background, steam puffs                                                              | `IdCardScene.ts`, `StreetView.ts`              |

Text colours exposed by `TEXT`: `ink`, `cream`, `gold`, `red`, `grey` (same hex values as above).

### World palette (src/home/config.ts `PALETTE`)

| Token                                          | Hex                             | Used for                                                  |
| ---------------------------------------------- | ------------------------------- | --------------------------------------------------------- |
| `jeep-blue` / `jeep-green`                     | `#3B6FB6` / `#3A9A6A`           | Jeepney bodies, walker clothes. `#3A9A6A` is also the "win/ok" green (see below). |
| `chrome`                                       | `#C9D1D9`                       | Jeepney trim, settings gear, a strip on the Lagoon stalls screen |
| `lrt-purple`                                   | `#7B4BB3`                       | LRT-2 train stripe and map line                           |
| `window-glow`                                  | `#FFE08A`                       | Lit windows and signs at hapon/gabi                       |
| `city-silhouette`                              | `#5B4A7A`                       | Distant skyline                                           |
| `wall-sand`, `wall-clay`, `wall-sky`           | `#E8D3B0`, `#C9A27E`, `#9DB4C0` | Shop walls                                                |

### Time of day

Four phases (`umaga` morning, `tanghali` noon, `hapon` golden hour, `gabi` night). `hapon` is the default look.
The Theme setting is `auto` (device clock) or `golden` (always `hapon`).

| Phase      | Sky top / bottom (greybox, `SKY`) | Map tint (`MAP_TINT`, colour @ alpha) | Street tint (`StreetView.ts`) | Map lights (`MAP_LIGHTS`) |
| ---------- | --------------------------------- | ------------------------------------- | ----------------------------- | ------------------------- |
| `umaga`    | `#9CC8E8` / `#E6F0F5`             | `#BFE0FF` @ 0.08                      | `#FFFFFF`                     | 0                         |
| `tanghali` | `#6FB3E8` / `#CFE8F7`             | `#FFFFFF` @ 0                         | `#FFFFFF`                     | 0                         |
| `hapon`    | `#7A5BA6` / `#FFB36B`             | `#FF9A5A` @ 0.12                      | `#FFE6CF`                     | 0.45                      |
| `gabi`     | `#1D2348` / `#3A3566`             | `#1D2348` @ 0.35                      | `#7F88BB`                     | 1                         |

The shipped skies are the baked `sky_umaga/tanghali/hapon/gabi.png`; `SKY` is the greybox fallback.

### State and one-off colours found in scenes

| Hex                       | Meaning                                                                                          | Source                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `#3A9A6A` (+ edge `#2B5A3A`) | Success: Lagoon "win" headline, "ticks a listahan line" badge, a green button fill, a 16 px message chip | `LagoonResultScene.ts`, `LagoonStallsScene.ts` |
| `#CFC6B0` / `#FFF4DC`     | Stall tab inactive / active face                                                                 | `LagoonStallsScene.ts`                         |
| `#C9C0AA`                 | Hairline divider, empty stamp-ring outline                                                        | `LagoonStallsScene.ts`, `LagoonResultScene.ts` |
| `#E6DCC6` + text `#7A6A55` | "Coming soon" campus card                                                                        | `CampusMapScene.ts`                            |
| `#5E8C61`                 | Coming-soon screen background (lagoon green)                                                     | `ComingSoonScene.ts`                           |
| `#FFFCF2` / `#CFE0F2`     | Notebook paper / ruled line (Vacant card, HUD)                                                   | `scripts/art/lagoon-ui.mjs`                    |
| `#C9B99A`, `#C9932A`      | Bottom-edge band of the cream button / the yellow board                                          | `scripts/art/ui.mjs`                           |
| `#8A929C` (+ `#C9D1D9`)   | Gear icon and board-bolt metal                                                                   | `scripts/art/ui.mjs`                           |

Other scene-local literals (cork board `#B8925A` / `#6B4F36`, shelf and wood browns, map thumbnails) are used once
each in `LagoonStallsScene.ts`, `CampusMapScene.ts` and `IdCardScene.ts`. `TODO: not defined yet`: a named token
for them. Until then, copy the nearest existing literal from the same scene, never a new one.

### Contrast (computed from the values above, WCAG ratio)

| Pair                                       | Ratio  | Note                                          |
| ------------------------------------------ | ------ | --------------------------------------------- |
| `ink` on `cream` (and the reverse)         | 13.9:1 | Default for all body text                     |
| `ink` on `yellow`                          | 9.1:1  | Selected toggle                               |
| `red` on `cream` (and `cream` on `red`)    | 3.8:1  | Titles at 16 px, danger button                |
| `grey` on `cream`                          | 3.3:1  | Secondary labels at 8 px are below 4.5:1      |
| `jeep-green` `#3A9A6A` on `cream`          | 3.2:1  | Headline at 32 px, badge at 8 px              |
| `red` on `yellow`                          | 2.5:1  | **Low.** Landing play button label (16 px)    |

`TODO: not defined yet`: a contrast target. SPEC only says text must sit on solid boards or panels, never directly
on the busy scene.

## Typography

**Font.** Pixelify Sans, self-hosted (`public/assets/fonts/PixelifySans.ttf`, OFL; `D-021`). It is a variable font
with a weight axis of 400 to 700, but the code never sets a weight, so everything renders at 400. The CSS stack is
`"Pixelify Sans", monospace` (`FONT` in `src/ui/theme.ts`). The Preloader loads the font with `FontFace` and
`document.fonts.load()` before any scene draws text; if it fails, the monospace fallback shows.

**Glyph gaps (measured on the TTF).** Missing, so they fall back to monospace: `₱` (U+20B1), `→` (U+2192), `★`
(U+2605), `♥` (U+2665). Present: `Ñ ñ × … – — ’ © · •`. At 3x text resolution the fallback `₱` is legible, so no pixel
peso is needed in live text (D-021 update). `₱` and `→` are both used in `pupLagoon.result.leftover`. Draw a star or
heart as a shape (the campus map draws a Phaser star), not as text. The baked bitmap fonts (`scripts/art/font.mjs`,
`5x7` and `3x5`, 1 px letter spacing) do include `Ñ` and `₱`; they are only for baked sign lettering and the logo.

**Type scale (actual use in `src/`)**

| Style     | Size  | Where                                                                                | Source                                       |
| --------- | ----- | ------------------------------------------------------------------------------------ | -------------------------------------------- |
| `body`    | 8 px  | Everything small: labels, buttons, paragraphs, toasts, footer (82 uses). **Minimum.** | `textStyle(8, ...)`, SPEC section 6 minimum  |
| `heading` | 16 px | Overlay and screen titles, big button label, tap-to-start (27 uses)                  | `textStyle(16, ...)`                         |
| `display` | 32 px | Lagoon result headline only (2 uses)                                                 | `LagoonOpeningScene.ts`, `LagoonResultScene.ts` |
| `input`   | 10 px | The HTML name field only                                                             | `IdCardScene.ts`                             |

**`textStyle(size, color = TEXT.ink, extra = {})`** returns `{ fontFamily: FONT, fontSize: '<size>px', color,
resolution: RENDER_SCALE, ...extra }`. Always use it; do not call `add.text` with a hand-written style. Common
extras seen in the code: `align: 'center'`, `wordWrap: { width }`, `stroke: '#2B2233'` with `strokeThickness: 2` for
cream text on the busy scene (landing subtitle), and `backgroundColor: '#FFF4DC'` with a 2 to 3 px `padding` for
label chips on the map.

`TODO: not defined yet`: line height, paragraph spacing, letter spacing (Phaser defaults are used), text-size or
high-contrast settings (Settings has music, SFX, language, Reduced Motion, theme, Chill mode, fullscreen only).

### Fitting English and Filipino

`t(key)` returns the Filipino string if it exists, otherwise the English one, otherwise the key itself
(`src/core/i18n.ts`). Measured over the two files:

| Fact                                     | Value                                                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Keys                                     | EN 324, FIL 124. **200 keys have no Filipino text yet** (all 21 `roster.*`, 143 of 207 `pupLagoon.*`).          |
| FIL length vs EN (124 shared keys)       | Mean 1.11x, median 1.06x. Short labels grow most: `Tap to start` 12 to 23 chars (1.9x), `Where to?` 9 to 17.   |
| Average width at 8 px (Pillow on TTF)    | About 3.7 px per character in both languages. At 16 px about 8.6 px per character.                             |

Rules that follow from the data:

1. Size every label for the Filipino string, not the English one. A short English label can double in Filipino.
2. Usable text width in a button is the button width minus 12 px (the two 6 px slices). Check
   `width - 12 >= text width` for both languages. Budget about 3.7 px per character at 8 px.
3. Tightest buttons measured today (text width in Pillow; verify in game, canvas measurement can differ by 1 px):
   `map.skip` FIL "Laktawan" is 37 px in a 48 px button (over the 12 px border budget by 1 px, still inside the
   button) and `pupLagoon.intro.skip` is 37 px in 56 px. Every other measured button label has 23 px or more to spare.
4. Paragraphs: set `wordWrap` to the panel width minus 40 (20 px each side), as Credits (360 in 400) and Coming soon
   (280 in 320) do, and let the height follow the text.
5. Strings with `{name}` or other parameters are filled at runtime. Test them with a long value
   (the ID name allows 12 characters, `NAME_MAX` in `IdCardScene.ts`).
6. Add Filipino keys in `fil.json` with the same key as `en.json`, inside your area's prefix only.

## Layout

**Grid and safe space.** Design on 640 x 360. `Phaser.Scale.FIT` letterboxes any other aspect ratio with ink bars,
so nothing is cropped. `index.html` sets `viewport-fit=cover`, but no code reads safe-area insets
(`TODO: not defined yet`: notch or rounded-corner margins). Keep HUD controls at least 20 px from the screen edge, as
the existing ones are (below).

**Where things sit (centres, from `src/home/config.ts` and the scenes)**

| Area                         | Position                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Landing top row              | y 20: ID name tag x 70, y 21 (120x36), EN / FIL toggle x 462 and 508 (44x22 each), icons x 548, 580, 612 (28x28 each) |
| Landing title block          | Logo at (320, 63) (`logo_uniseries`, 281x59); subtitle (320, 112); play board (320, 146), 176x36                      |
| Landing footer strip         | y 348 to 360, 640x12, `ink` at 0.75 alpha; version text left (x 4), disclaimer centred; both 8 px `cream`            |
| Landing street layers (y)    | sky 0-186, far city 120-186, LRT-2 track 170-186, shop row 186-300, sidewalk 300-318, street 318-348 (footer to 360)  |
| Campus map HUD               | Top row y 20: home x 20, Mapa/Listahan toggle x 64 (56x24), ID name tag x 180, y 21 (120x36), ipon x 480, stickers x 560, settings x 612. Bottom row y 334: sticker book x 28, album x 612 |
| Campus card / list           | Card 360x150 (thumb 96); list rows 560x64, gap 8, from y 44 to 326                                                    |
| Overlays                     | Centred at (320, 180): Pause 200x150, Settings 300x260, Credits 400x260, Coming soon 320x140 (centre y 170), reset confirm 220x90, School ID card 328x214 |
| Lagoon stalls screen         | Top bar 24 high; stall tabs y 24, 16 high; storefront 512x200 at (0, 40); menu from y 244, rows 24; tray bar y 316, 44 high; right column x 514 to 638: listahan 124x176, busog 120x38, wallet 120x102 |
| Toast                        | Centre x 320, y 330 (30 px above the bottom), box height 18, width = text + 16                                        |

**Spacing observed (no scale is defined; `TODO: not defined yet`)**: nine-slice border 6; HUD margin 20; list gap 8;
paragraph gap 8; settings row pitch 22; menu button pitch 28 (Pause: y 160, 188, 216); toast padding 8 each side;
button label sits 1 px above centre (`y = -1`).

**How screens are arranged**

- One scene per screen, 640x360, with the music and fade handled by the scene (`FADE_MS` 400 ms, fading from `ink`).
- **Landing**: interactive UI sits in the open sky so the busy street never hides a button; the street stays alive below.
- **Overlays** (Settings, Sticker Book, Album, Credits, School ID, Pause) open on top, pause the scene underneath,
  dim it with `backdrop()` and close with Esc (Pause: Esc or P). Use `openOverlay` / `closeOverlay` (`src/ui/overlay.ts`).
- **ToastScene** runs always on top and shows one message at a time at the bottom.
- Every control is a solid button or panel, so text never sits directly on a busy background (SPEC-homepage section 6).
  When text must sit on the scene, give it an `ink` stroke or a `cream` chip.
- **Touch targets.** SPEC says at least 44x44 px on phones. Today the landing icons are 28x28 and the smallest button is
  18x16 (the Settings volume minus). H-001 schedules the fix in H5. Do not shrink existing targets; new
  controls should meet 44x44.
- **Keyboard.** Buttons are tap/click only. Scenes add shortcuts (Enter, Esc, P, 1 to 8 in Lagoon). `TODO: not defined yet`:
  a keyboard focus indicator (none exists in `src/ui`).

## Elevation & Depth

There are no CSS or Phaser drop shadows on UI. Depth is drawn into the art or made with layers:

- **Bevel.** Light top and left edge, dark bottom and right edge, 1 px `ink` outline (`Pix.bevel`, `ui.mjs`). The cream
  panel has a white top/left highlight and darker bottom/right edges (`#E0D7C2`, `#C7BEAC` at the bottom).
- **Baked shadows.** Logo drop shadow `#1A1424`; notebook pages have a `#00000030` offset shadow; trees and sprites carry
  their own shading.
- **Dim backdrop** behind every overlay (see `dim`).
- **Draw order.** Landing layers use `DEPTH`: sky 0, city 10, track 20, shops 30, sidewalk 40, street 50, ui 100;
  the tap-to-start dim sits at ui + 10 and the language toggle at ui + 11. On the campus map, objects at depth 30 and
  above (`MAP_UI_DEPTH`) are drawn by the fixed UI camera. Overlay scenes and ToastScene call `bringToTop`.

## Shapes

- **Outline.** 1 px `ink` (`#2B2233`) around panels, buttons, icons, coins and sprites (`Pix.outline`). Scene shapes
  use `setStrokeStyle(1, COLORS.ink)` (16 uses); emphasis strokes are 2 px (`gold`, `red`) or 3 px (result rings).
- **Corners.** Square-ish with a 2 px notch (the three corner pixels are transparent). `SPEC.md` calls this "4 px rounded
  corners"; the art is the truth. The HTML name field uses `border-radius: 2px`. Toast and tab rectangles are square.
- **Nine-slice.** `ui_panel`, `ui_button`, `ui_board`: 24x24 source, 6 px border on every side. Minimum size is 12x12
  (panel) and 12 high (button).
- **Icons.** 16x16 with an `ink` outline: settings, credits, stickers, album, home, map, list, close (`icon_*`, `ui.mjs`).
  `icon_close` is a red tile with a white X, for card headers on the `ink` bar; its hit area is 28x28.
- **Logo.** `logo_uniseries` (281x59) is an image, never live text: "UNI SERIES" in 5x7 pixel letters scaled 5x, arched,
  red face with a chrome highlight band, yellow then `ink` outline, drop shadow (`ui.mjs logo()`).
- **Characters.** Avatar frames are 48x48, layered: body (skin), outfit, ID lace, hair (`avatar_*`). Street walkers are
  16x24 (6 variants). `avatarPortrait` shows a 1x 34x32 crop (frame x 8-41, y 0-31, which holds every hair pixel of
  all 16 styles) in a School ID photo frame (`#BFD8E8`, `#8FB3C9` band, 1 px `ink` frame, 36x34 outside) at the left of
  the name tags, never a shrunken sprite.
- **Sizes of common art** (manifests): coins 12x12 (1) to 18x18 (20), bills 36x18, food e.g. 24x24, map pin 22x30 frames,
  parked jeepney 80x40 frames, LRT train 220x24 frames, storefront 512x220, Lagoon intro panorama 960x360.

## Motion & Micro-interaction

- **Fades.** Screen changes fade from `ink` over `FADE_MS` = 400 ms (`src/home/config.ts`). Map unfolds from scale 0.92.
- **Easing in use** (counts in `src/`): `Back.easeOut` 5 (pop-ins), `Sine.easeInOut` 4 (idle loops), `Sine.easeOut` 2,
  `Sine.easeIn` 2, `Bounce.easeOut` 1 (landing logo drop, 600 ms). `SPEC.md` asks for 150 to 300 ms on UI tweens.
- **Idle.** Logo bob 2 px over a 3 s cycle; clouds drift 4 px/s; city drifts 2 px.
- **Toast.** Holds 2000 ms (3000 ms for warnings), fades out in 200 ms, queued one at a time.
- **Reduced Motion.** A setting, defaulting to the device's `prefers-reduced-motion`. Per `SPEC-homepage.md` section 6 it turns off
  idle drift, the logo bob and the camera zoom, and the jeepney ride becomes a fade; the landing and the Lagoon scenes read it.
- **Audio feedback.** Every enabled button plays `sfx_click` on release. Defaults: music 0.6, SFX 0.8.

## Voice & Content Strategy

Short, warm Taglish, like a friend texting after class ("Tara, laro!", "Sakay na!", "Balik sa mapa"). English is the
default language; Filipino is a switch on the landing and in Settings (D-042). Every string is an i18n key.
Route boards and signs use real place names only; no brands, logos or real people.

## Components

### Button (`src/ui/Button.ts`)

`new Button(scene, x, y, text, onClick, { width, height, fill?, textColor?, fontSize?, icon? })`. A nine-slice
container with a centred label and an optional 16x16 icon.

| Variant       | Look                                                                                       | How to ask for it                              |
| ------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Cream (default) | `ui_button`: cream face, light top edge, darker bottom band (`#C9B99A`), `ink` outline     | no `fill`                                      |
| Route board   | `ui_board`: yellow `#F2C14E` face, bottom band `#C9932A`, four corner bolts, `ink` outline  | `fill: COLORS.yellow` (main actions)           |
| Tinted        | Cream button tinted with the fill colour (e.g. red for the reset confirm, `textColor: TEXT.cream`) | `fill: <colour>`                          |
| Icon only     | 16x16 icon centred; with a label the icon sits 11 px from the left edge and the label shifts right 6 px | `icon: 'icon_key'`                |

| State    | What changes                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------- |
| Normal   | Base tint (white for cream and yellow), label at y -1                                                  |
| Hover    | Tint multiplied by 0.9 (only when enabled); hand cursor                                                |
| Pressed  | Label moves down 1 px (y 0). The button art does not move. Fires on pointer **up**                     |
| Disabled | Tint `grey` (`#8A8494`), label alpha 0.6, no click handler, no sound                                   |
| Selected | Tint `#F2C14E` (toggles: EN / FIL, Girl / Boy). Use `setSelected(true)`                                |

Label: `textStyle(fontSize ?? 8, textColor ?? ink, { align: 'center' })`, origin centre. Height is at least 12.
Sizes in use: Pause menu 140x22; Close 80x20 (Settings, Credits, Sticker Book, Album), 64x24 (map card), 64x20 (Lagoon),
60x22 (School ID); Back 96x24; Skip 48x20 (map) and 56 wide (Lagoon intro); reset confirm 88x20; landing play board 176x36 and
Lagoon "Heto po!" board 120x22, both with a 16 px `red` label; icon buttons 28x28; EN/FIL toggle 44x22; ID name tags 120x36
(landing and map; portrait at the left, name centred in the rest); Settings volume "-" 18x16. Observed heights run from 16 to 24 (36 for the landing board). `TODO: not defined yet`: a rule for max
label length per width beyond the 12 px border budget above.

### Panel and backdrop (`src/ui/Panel.ts`)

- `panel(scene, x, y, w, h, tint = cream)`: `ui_panel` nine-slice, 6 px border, origin centre, minimum height 12.
  Passing another tint recolours it (ID photo frame `#BFD8E8`).
- `backdrop(scene, alpha = 0.6)`: full-screen black rectangle at that alpha, interactive so it swallows taps.
- Panel look: cream face, 1 px `ink` outline, 2 px corner notch, white top/left highlight, darker bottom/right.
- `TODO: not defined yet`: panel hover/pressed/disabled states (panels are static) and a standard inner padding
  other than the 20 px text inset above.

### Overlays (`src/ui/overlay.ts`)

Backdrop (0.6) + centred panel + `heading` title at the top + content + a Close or Back button at the bottom.
`openOverlay(scene, key, data)` pauses the current scene, launches the overlay with `{ from }` and brings it to the
top. `closeOverlay(overlay, from, restartFrom)` resumes the scene underneath, or restarts it when text or progress
changed (language, reset, profile). Esc closes. The School ID card also has a red X (`icon_close`) at the right
of its header bar; X and Esc close it without saving, the first-time card too. A confirm box inside an overlay uses a second dim at 0.5 and a
220x90 panel.

### Toast (`src/scenes/ToastScene.ts`)

`gameEvents.emit('toast', { text, ms? })`. Box: `ink` at 0.92 alpha with a 1 px `cream` stroke, 18 high, text 8 px
`cream`, centred at (320, 330). One at a time; 2000 ms default, then a 200 ms fade.

### Food card (Lagoon stalls, L-038)

A `panel()` card, 156×88, three per row (`FRONT.cards`): the food picture at 2× on the left; name (8 px `ink`, wrapped),
a `ui_tag` price tag (`red`), busog (`grey`) on the right; a full-width `success` strip at the bottom names the listahan
line it ticks. Hover tints the card to 0.9; sold out fades it to 0.45 and it cannot be tapped. Tap anywhere to add.

### Guide ring and bubble (L-039)

The next tap gets a 2 px `gold` outline that pulses (alpha 1 to 0.3, 500 ms, off with Reduced Motion). The speech
bubble is a `panel()` the width of the stall area, over the banner (or over the tray bar while paying), with 8 px
`ink` text and a yellow Next button when it needs one.

### Button sounds

`Button` plays `sfx_click` on release. Pass `sound: 'sfx_…'` for a themed sound, or `sound: null` when the handler
plays its own, so one tap never makes two sounds (L-037).

### Other pieces

- **School ID name field**: the only HTML element in the game: 110x16, 10 px Pixelify Sans, `#FFFFFF` fill, 1 px `#2B2233`
  border, 2 px radius, 12 characters max (`IdCardScene.ts`, H-002).
- **Money and bowls** (`src/minigames/pup-lagoon/objects/lagoonUi.ts`): coins and bills as pictures with `x n` counts
  (two-column wallet, 22 px row pitch); the busog meter is rice bowls, 13 px apart, at most 8.
- **Notebook HUD** (`note_card`, `note_hud`, `note_how`): lined paper `#FFFCF2`, blue lines `#CFE0F2`, red margin, spiral rings.
- **Preloader**: a road (320 px wide) with a tiny red jeepney whose yellow signboard shows the percent.

## Do's and Don'ts

**Do**

- Put every player-facing string behind `t('key')`, with the key in `src/i18n/en.json` (and `fil.json`), inside your area's
  prefix (`ui.`, `map.`, `pupLagoon.`). (`AGENTS.md`)
- Put every tuning number (positions, sizes, timings) in `config.ts` of that area, like `LANDING`, `MAP`, `FRONT`. (`AGENTS.md`)
- Build text with `textStyle()`, colours from `COLORS` / `TEXT`, buttons with `Button`, panels with `panel()` and `backdrop()`.
- Create every scene with `sceneConfig(key)` so the 3x camera and sharp text apply.
- Lay out on 640x360, use whole-pixel positions and whole-number scales, and keep 8 px as the smallest text.
- Draw new art in `scripts/art/*.mjs` with the shared `Pix` canvas, `ink` outline and `shade()` steps, then run `npm run art`.
  Keep asset keys snake_case and paths relative (`assets/...`, no leading slash). (`AGENTS.md`)
- Check both languages: size labels for the Filipino string and test long parameter values.
- Honour Reduced Motion for every idle or looping tween.
- Keep the art original: generic jeepneys, shops and people; place names only as signboard text.

**Don't**

- Don't use official university logos, seals, mascots, team marks or real people (`SPEC.md` section 13, `AGENTS.md`).
  School colours may appear as accents (for example maroon and gold for PUP), never marks.
- Don't hard-code strings, magic numbers or new hex values in a scene. Don't add a second web font.
- Don't use `★`, `♥` or `→` as text (the font lacks them); draw a shape. Don't rely on `₱` rendering in the pixel font:
  it falls back to monospace.
- Don't use CSS styling, gradients, blur or fractional scaling on art. Don't turn `pixelArt` or `roundPixels` off.
- Don't write progress to `localStorage`; the save is in memory only (D-052).
- Don't put text directly on the busy scene without a panel, stroke or chip.
- Don't use `setTimeout` or `setInterval` for UI timing; use `scene.time` or tweens, and remove listeners on `shutdown`.
- Don't edit the baked PNGs by hand, and don't ship or trace the reference photos (`docs/reference/` is gitignored).
- Don't add dependencies for UI without the owner's OK. Phaser is v4 (`^4.2.1`): read
  `node_modules/phaser/skills/` before using an API you are unsure about.

### Spec vs code differences (the code wins)

| Topic                | Spec says                                              | Code and assets do                                                                    |
| -------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Panel corners        | "4 px rounded corners" (`SPEC.md` section 6)            | 2 px notch, 6 px nine-slice border (`ui.mjs`, `Panel.ts`)                             |
| Pressed button       | "moves down 1 px"                                       | Only the label moves 1 px (`Button.ts`)                                               |
| Character size       | Characters 48x72, food 32x24 (`SPEC.md` section 6)      | Avatar frames 48x48; walkers 16x24; e.g. `food_halohalo` 24x24 (manifests)            |
| Logo size            | About 300x70                                            | 281x59 (`manifest.json`); the layout box in `LANDING.logo` is still 300x70             |
| Peso sign            | Draw an `icon_peso` if the font lacks it                | Falls back to monospace and is legible at 3x; no `icon_peso` (D-021 update)           |
| Palette              | Sky `#F4C27A`, foliage `#4F7F3A`, success `#6CC36A`, warning `#F08A3E`, burnt `#3A2E2E`, others are "starting points" | Most of these appear nowhere in `src/`; success is `#3A9A6A`. Only the values in this file are in use |
| Touch targets        | At least 44x44 px on phones                             | Not yet met: 28x28 icons, 18x16 smallest button (H-001, planned for H5)               |

### TODO: not defined yet

1. **Spacing scale.** Only observed values exist (above). Decide a scale, then move it into `src/ui/theme.ts`.
2. **Safe-area insets.** `viewport-fit=cover` is set, but nothing reads `env(safe-area-inset-*)`.
3. **44x44 touch targets** for the HUD and small buttons (H-001, H5).
4. **Master palette.** Colours are split across `theme.ts`, `home/config.ts` `PALETTE`, scene-local literals and the art
   scripts; there is no single named list, and the SPEC palette is mostly unused.
5. **Semantic colours.** Success green `#3A9A6A` is now `COLORS.success` (edge `COLORS.successEdge`) in `theme.ts`; a warning colour is not defined
   (SPEC lists `#F08A3E`, unused). The `grey` secondary text and the `red` on `yellow` play label are below 4.5:1.
6. **Typography details.** Line height, paragraph spacing and letter spacing are Phaser defaults; no text-size or
   high-contrast option.
7. **Keyboard focus indicator** for buttons.
8. **Panel states** (hover, pressed, disabled) and a standard inner padding.
9. **Max label length per button width** beyond the 12 px rule; `map.skip` in Filipino is over budget by 1 px.
10. **Filipino coverage.** 200 of 324 keys fall back to English, so fit cannot be checked for them (all `roster.*`).
11. **Glyphs.** `₱`, `→`, `★` and `♥` are missing from Pixelify Sans; live text uses the monospace fallback for `₱` and `→`.
12. **Named tokens** for the one-off scene colours (cork board, wood, map thumbnails).
13. **Icon rules** beyond "16x16 with an `ink` outline" (stroke weight, padding, a full icon list for future screens).
