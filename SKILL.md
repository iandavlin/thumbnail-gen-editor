# Thumbnail Generator Skill

Generates show thumbnails as Fabric.js JSON layouts, rendered and exported as PNG from the HTML editor.

## Output

Each episode produces a **JSON layout** in `./output/<ratio>/`, loaded by the HTML editor and exported as PNG directly. JSON is the source of truth — diff-able, reproducible, reloadable.

```
output/
  16x9/{show}_{guest}_16x9.json       # canonical layout (plus any variants if fanned out)
  1x1/{show}_{guest}_1x1.json
```

When ready, open the JSON in the editor and hit Export PNG. That PNG is the final deliverable for YouTube / social / deck-embed.

## Workflow

One primary path: **HTML Editor (`editor.html`)** — interactive Fabric.js canvas editor. Design layouts in JSON, open with Load JSON, tweak in GUI, hit Export PNG.

Legacy: the `generate.js` / `generate_1x1.js` scripts emit `.pptx` via pptxgenjs — **deprecated**. Only reach for this path if the final asset genuinely needs to be editable in Google Slides. PNG-in-deck is almost always better (`slide.addImage`).

Layouts live on disk as JSON. Sample layouts: `output/16x9/*.json`. Reusable templates: `templates/*.json` (see `templates/README.md`).

### The generator/editor handoff

**My (Claude's) job is the skeleton. The user's editor session is the last-mile polish.** I produce a loadable JSON with assets + reasonable layout defaults; the user tweaks in the GUI. Don't do back-and-forth pixel-level iteration through me — it wastes cycles vs. dragging things 10px in the editor. Concretely:

- When starting a new thumbnail, **build it as JSON** (via a new or extended `generate_*.js`), write to `output/16x9/*.json`, and load it in the editor. Don't build layouts imperatively through live eval / `preview_eval` — editor state is volatile, JSON is source of truth.
- On editor load, `reattachBehaviors()` rebuilds banner polygon points from metadata (`_isBannerGroup`, `_bannerLeftEnd/RightEnd`, `_bannerNotchL/R`, padding, text fontSize). So the generator only needs to emit metadata + a minimal placeholder polygon — don't pre-compute points.
- Image `src` in JSON should be a relative path (e.g. `/assets/2026-06-25_thorell/foo.png`), not a `localhost` absolute URL — portable across sessions. Saving from the editor's Save JSON re-bakes absolute URLs; relativize them before checking files in.
- User edits in the editor, hits **Save JSON** — the new version overwrites or lives alongside the generator output. If the user commits to a mod, I port it back into the generator so `node generate_*.js` reproduces it.

## Folder Structure

```
Thumbnails/
  editor.html                   # HTML/Fabric.js visual editor (primary workflow)
  serve.js                      # Static file server for local dev (port 8080 via launch.json)
  assets/                       # Persistent assets (logos, branding, recurring graphics)
  assets/<YYYY-MM-DD>_<slug>/   # Per-episode assets — one folder per episode, ISO date prefixed
  templates/                    # Reusable JSON layouts (slot-based + remix-copy — see templates/README.md)
  templates/components/         # Reusable sub-elements (banner shapes, frames, logos)
  output/
    16x9/                       # Saved JSON layouts (16:9)
    1x1/                        # Saved JSON layouts (1:1)
  SKILL.md                      # This file
```

- `assets/` contents persist between runs.
- **Per-episode assets** live in `assets/<YYYY-MM-DD>_<slug>/` — ISO date prefix (zero-padded) so folders sort chronologically in any file listing. Slug is short and recognizable (`thorell`, `ted`, `slj`). Example: `assets/2026-06-25_thorell/`.
- Image drop flow: when a user hands me an image in chat, (a) find out the show + date, (b) have the user save from clipboard to `~/Downloads/`, (c) I move + rename it into `assets/<YYYY-MM-DD>_<slug>/` with a descriptive filename (e.g. `ryan_thorell_guitar.jpg`), (d) reference as `/assets/<YYYY-MM-DD>_<slug>/<filename>` in JSON.

## Deployment / Pushing changes

The app is deployed as a separate git repo at `dist/thumbnails-app/`. The working dir at repo root is where iteration happens; `dist/thumbnails-app/` is the snapshot that gets pushed to GitHub and pulled by the EC2 server.

- **Repo:** https://github.com/iandavlin/thumbnail-gen-editor (branch `main`)
- **Deploy target:** EC2 instance, pulls via the read-only deploy key already installed on that box
- **Deploy key info lives in:** memory + the README in `dist/thumbnails-app/`

### When to push

- **Only on explicit user request.** Don't push reflexively after edits — the user wants to batch changes and verify locally first.
- Good moments to remind the user a push is pending: after a meaningful editor improvement (new control, bug fix), after a brand/palette change, after a new template or pattern lands.

### What to sync from the working dir into `dist/thumbnails-app/`

Files that ship in the deploy package:
- `editor.html`
- `serve.js`
- `SKILL.md`
- `package.json`, `package-lock.json` (if dependencies changed)
- `templates/` (entire tree — including `components/` and `patterns/`)
- `generate*.js` (only if the user actually runs them on the deploy target — usually not)

Files that **do NOT** ship (stay local only):
- `output/` (per-episode work; episode JSON files belong to the user, not the app)
- `assets/<date>_<slug>/` (per-episode media; user-specific)
- `assets/episode/` (legacy episode folder)
- Loose root images, `.pptx` files, `node_modules/`

### Push procedure

When the user asks to push:

```bash
# From the working dir, copy curated files into the deploy snapshot
cp editor.html serve.js SKILL.md dist/thumbnails-app/
cp package.json package-lock.json dist/thumbnails-app/
cp -r templates/* dist/thumbnails-app/templates/

# Then commit + push from the deploy snapshot
cd dist/thumbnails-app
git add .
git status                # show the user what's about to be committed
# Get the user's go-ahead, then commit with a focused message
git commit -m "Brief subject — what changed and why"
git push origin main
```

After push, the EC2 box needs to pull and restart the service. If the user has the EC2 Claude session open, hand it: `cd ~/thumbnail-gen-editor && git pull && sudo systemctl restart thumbnails`. Otherwise the user does it manually.

### Commit message style

One-line subject (~60 chars), focused on the user-visible change:
- `Add center-snapping with orange guide lines on the canvas`
- `Fix banner text shadow toggle (was hidden by stale conditional)`
- `Refresh brand palette to 2026 Looth Group colors`

Don't pile multiple unrelated changes into one commit — squash where it makes sense, but a clean push usually maps to a single logical change.

## Workflow

### Phase 1: Discovery

User provides the basics:
- **Show name**
- **Guest name(s)**
- **Guest org / company**
- **Topic** — what's being discussed
- **Date line** — e.g., "APRIL 28 · 12 PM EASTERN"

### Phase 2: Research & Image Hunt

Before touching any code, **search the web** for the guest and their work:

1. **Search queries** — try combinations:
   - `"{guest name}" {company}` — headshots, press photos
   - `"{guest name}" {topic}` — contextual/action shots
   - `{company} {process/product}` — environment, equipment, workspace shots
   - `{company} logo` — for badge/branding element
2. **Present image options** to the user with descriptions:
   - What the image shows (headshot, action shot, equipment, product, etc.)
   - Whether it would need background removal or not
   - How it might work in the layout (left panel, full bleed, top banner, etc.)
3. **User picks** which images to use ("yoink") and whether to:
   - Use as-is
   - Remove background (for compositing on colored panels)
   - Crop to a specific region

**What sells the show?** Think about what the most compelling visual element is:
- **The person** — a recognizable face, a compelling portrait → tight-to-medium crop, prominent placement
- **The process** — the guest doing the thing → wide contextual shot, show the environment
- **The product** — what they make/build → product hero shot, possibly with guest secondary
- **The equipment/space** — the lab, the workshop, the studio → wide environmental shot
- **The concept** — for topic-driven shows (AI, crypto, metaverse, marketing trends) the HOOK is the idea, not the person. Generate a themed background (matrix rain, circuit trace, waveform, nodes). Consider one surreal transformation of the subject (android-ified, holographic, stylized) to embody the concept. For recurring shows where names/faces repeat, the novelty move IS the design — it breaks pattern fatigue across episodes.

This decision drives the entire layout. A thumbnail about sonic grading needs to show the science equipment. A thumbnail about a famous luthier might just need their face. A thumbnail about AI-assisted anything should LOOK like AI, not just have "AI" in the text.

### Phase 3: ASCII Layouts

Before generating, propose **ASCII layout sketches** for both 16:9 and 1:1. Show the user where each element goes and get approval before writing any code.

Example:
```
16:9 Option A — "Process hero"
┌──────────────────────────┬────────────┐
│                          │            │
│   PHOTO (wide, shows     │  [BADGE]   │
│   guest + equipment)     │  on green  │
│   ~65% width             │            │
│                          │            │
├──[LOGO]──────────────────┴────────────┤
│      Dr David Olson & Eric Warner     │
│        APRIL 28 · 12 PM EASTERN      │
└───────────────────────────────────────┘

16:9 Option B — "Person hero"
┌────────┬─────────────────────────────┐
│        │  GUEST NAME (huge)          │
│ PHOTO  │  Topic / tagline            │
│ (tight │                             │
│  crop) │         [BADGE]             │
│        │                             │
├────────┴─────────────────────────────┤
│        APRIL 28 · 12 PM EASTERN     │
└──────────────────────────────────────┘
```

The user picks a direction, then we generate.

### Phase 4: Generate

Once layout and images are approved:
1. Create the per-episode folder `assets/<YYYY-MM-DD>_<slug>/` and move images into it with descriptive filenames
2. Process photos (crop, background removal if needed)
3. Write the JSON layout to `output/<ratio>/{show}_{guest}_<ratio>.json` — either by hand-editing a template copy, or (for fanout) via a small `generate_*.js` that emits JSON
4. Load the JSON in the editor for last-mile tweaks; user exports PNG when satisfied
5. For a one-off, skip the generator `.js` entirely — edit JSON directly. Generator pattern only pays off when you need programmatic variants or reproducibility

Before starting from scratch, check `templates/*.json` for a successful layout worth reskinning (see `templates/README.md` → `toReskin` / `useWhen` notes on each).

### Phase 5: Iterate

User reviews and requests tweaks. Adjust and regenerate.

## Input Summary

At minimum, the user provides:
1. **Show name** — used in filenames
2. **Guest name(s)**
3. **Guest org / company**
4. **Topic**
5. **Date line**

Everything else (photos, layout, colors, badge) is discovered and decided during the workflow phases above.

## HTML Editor Reference (`editor.html`)

Launch with any static server: `npx http-server . -p 8080 -c-1` then open `http://localhost:8080/editor.html`.

### Canvas
- Default 1280×720 (16:9). Background + photo rect + right panel are usually pre-built.
- **Save/Load JSON** buttons persist the full layout including custom banner group metadata.
- **Export** produces a PNG/JPG at canvas resolution.

### Element types
Rects, circles, polygons, text (textbox), images, groups, and **banner groups** (special).

### Banner Groups — the primary text element
A "Banner" is a grouped `polygon + textbox` that auto-centers its text and auto-sizes the font to fill the available space after padding. Add one with the **Banner** button in the toolbar.

**Defaults on insert**: chevron-left end, arrow-right end, Jost Bold, gold text on dark fill, drop shadow.

**Banner group properties** (shown in the right panel when selected):
- **Text / Font / Size / TCol / Bold / Align** — text content & typography. Size auto-recalculates when padding changes, and auto-shrinks if the text would wrap to a second line.
- **BFil / Bdr** — banner polygon fill + optional border (BCol/BWid)
- **Otln** — text outline (OCol/OWid). Uses `paintFirst: 'stroke'` so the outline renders behind the glyph fill (no bleed).
- **Padding** — PL / PR / PT / PB control the inset on each edge. Text auto-sizes to whatever space remains. Use tight padding (1–8) for dense text, looser (20+) for breathing room.
- **Shape** — L End / R End (flat / arrow / chevron), NL / NR (notch depth on each end)
- **Shadow** — On/Off + SX / SY / Blur. Shadow lives on the polygon child, not the group.
- **Ungroup** — breaks the banner back into polygon + textbox (loses banner group behavior).

**Linking existing shapes into a banner group**: select a polygon + a textbox together and hit the **Link** button in the layer panel. Padding is inferred from current positions. The shape is rebuilt via the shared point builder so L/R end settings work immediately.

**Duplicating** a banner group (Ctrl+D or right-click → Duplicate) preserves `_isBannerGroup` and all banner metadata (padding, ends, notches) so the clone is still editable as a banner.

### Opacity (all elements)
Every selected object shows an **Opa** row with a range slider + numeric input + % label. Slider and number stay in sync. Undo is debounced 300ms so dragging doesn't flood history. Works on banners, groups, text, shapes, and images.

### Other editor features
- **Right-click context menu** — duplicate, delete, bring to front / send to back, lock, hide
- **Layer panel** — reorder, rename, lock, toggle visibility. Group children reorder via inline ▲/▼. Clicking a group child selects the parent group.
- **Aspect ratio lock** — 🔗 button next to W/H keeps proportions when resizing
- **Brand color picker** — click any color field to get the Looth palette swatches
- **Undo/redo** — Ctrl+Z / Ctrl+Y, debounced for sliders

### Banner hierarchy for podcast thumbnails
For The Looth Group thumbnails, the **guest name is always the biggest banner** (primary visual element). Topic is secondary, date is tertiary. Typical cascade:

```
┌─ Guest Name ─────────────────┐   (72px tall, widest, coral)
   └─ PALM BENDERS ─────────┐      (56px tall, indented, sage)
       └─ JUN 5 · 3 PM ET ──┘      (40px tall, most indented, sage)
```

Each subsequent banner is ~60–80px narrower and indented right, creating a staircase that draws the eye down.

## Reference Design — 16:9 (12.8" × 7.2")

The canonical 16:9 layout, established from user-approved output:

```
┌─────────────────────┬──────────────┐
│                     │              │
│                     │   [BADGE]    │
│      PHOTO          │   centered   │
│   ~65% width        │  on bg color │
│   full height       │   ~35% w     │
│                     │              │
│                     │              │
├─[LOGO]──────────────┴──────────────┤
│    Guest Name(s) — one line, gold  │
│    DATE LINE — offwhite, smaller   │
└────────────────────────────────────┘
```

**Key rules:**
- **Photo left ~65%** of slide width, full height, `cover` sizing, no gradient/overlay blending on its edge
- **Badge** (e.g., PRT Tonewoods) fills the right ~35%, vertically centered on the variant's background color — this is a major visual element, not a small corner logo
- **Bottom bar** spans full width, dark background, ~25% of slide height
- **Guest names** on a single line, large (32–42pt), gold/accent color, centered in bar
- **Date line** below names, slightly smaller (20–24pt), offwhite/light color, centered
- **Looth logo** bottom-left corner, overlapping photo/bar boundary
- **No topic title** — the names + org badge communicate the episode content
- **Clean edges** — no semi-transparent overlays between photo and background panel

## Reference Design — 1:1 (8" × 8")

The canonical 1:1 layout, established from user-approved output:

```
┌──────────────────────────────┐
│ ┌──────────────────────────┐ │
│ │                          │ │
│ │                          │ │
│ │         PHOTO            │ │
│ │     full width           │ │
│ │     ~70% height          │ │
│ │                          │ │
│ ├──────────────────────────┤ │
│ │[BADGE]  Guest Name 1     │ │
│ │ b-left  Guest Name 2     │ │
│ │         DATE LINE        │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

**Key rules:**
- **Thin border/frame** around the entire slide in sage/olive green — gives the square a finished, contained look
- **Photo fills full width** within the border, occupying ~70% of the height
- **Dark bottom bar** ~30% height, full width within the border
- **Badge** (e.g., PRT) bottom-left corner, overlapping the photo/bar boundary — sized prominently (~1.1–1.3")
- **Guest names stacked** (separate lines), gold/accent color, positioned in the bar to the right of the badge, large (28–32pt)
- **Date line** below names, offwhite/light, slightly smaller (20–24pt)
- **Looth logo** not shown separately (badge takes the corner position) — OR small in opposite corner if needed
- **No topic title** — same principle as 16:9

## 1:1 is NOT a crop of 16:9

It's a full reflow:
- Photo goes top (landscape orientation), not left
- Badge moves from right panel to bottom-left overlapping corner
- Names stack vertically instead of single line
- Frame/border added for contained feel

## Default Font

**Jost** — Bold weight for all elements unless the user specifies otherwise.

## Default Brand Palette (Looth Group)

Aged palette (2026). Grouped by role. Desaturated/warmed from the original brights for a more editorial, vintage feel.

**Core brand colors** — aged interpretation of the logo. The identity:

| Name | Hex | Role |
|---|---|---|
| Forest | #5C6B4F | Primary · backdrop |
| Looth Orange | #BF7237 | Primary accent |
| Ringed Gold | #C9A155 | Secondary accent |
| Deep Forest | #343D2E | Shadow · text |
| Sage | #A7B597 | Soft accent · text |
| Burnt Orange | #9E5131 | Orange shadow |

**Neutrals** — warm, slightly olive. Parchment through to coffee:

| Name | Hex |
|---|---|
| Parchment | #F5F0E4 |
| Linen | #E4DCC9 |
| Stone | #B0A894 |
| Ash | #645F50 |
| Graphite | #3A362C |
| Coffee | #1B1812 |

**Extended palette** — retuned to sit next to the aged core. Slate teal = info; rust red = error:

| Name | Hex |
|---|---|
| Rosewood | #6B3824 |
| Copper | #9E6238 |
| Wheat | #BBA472 |
| Meadow | #6E8459 |
| Pine | #27382A |
| Rust Red | #7A2E25 |
| Slate Teal | #4E6670 |
| Oxblood | #5A2220 |

**Contrast note:** Looth Orange on Forest is display-only. For small text on Forest, use Ringed Gold or Parchment.

## Variant Design

**Default: 3 layout variants per run.** Variants should explore different **spatial compositions**, not just palette swaps. Color-only variants feel like template noise — they don't help the user decide between real directions. Each variant should answer "what if this thumbnail was organized completely differently?"

Example variant axes (pick a few per run):
- Subject position: left-anchor, right-anchor, center-hero, bottom-anchor, layered-over-type
- Typography: banner-panels, outlined-only headlines, stacked multi-line masthead, wraparound
- Information hierarchy: name-first, topic-first, date-first (rare — usually tertiary)
- Bottom treatment: dark bar, themed-color bar, no bar (floating ribbons), full-bleed

Color palette still varies across variants, but it rides on top of structural difference — not the reason for the variant's existence.

**One-off episodes:** For single recurring-show episodes (not campaign launches or promotional series), one tight design beats three templated alternatives. If the user is iterating on one clear direction, don't force 3 variants — make one great, hand it off to the editor for last-mile tweaks.

## Photo Processing

### Crop philosophy

The crop should serve whatever was decided in Phase 2 — what sells the show:

- **Process/environment hero**: Crop conservatively. Keep the scene wide. The subject's surroundings ARE the message. Ask: "Does this crop still show what this person *does*?" If no, too tight.
- **Person hero**: Tighter crop is fine. Focus on the face and presence. Background is secondary.
- **Product hero**: Crop to feature the product/instrument prominently. Guest can be secondary or removed.

### Background removal

Sometimes a clean cutout of the guest composited on a colored panel looks better than a contextual photo. Offer this option when:
- The available photos have distracting/ugly backgrounds
- The layout calls for the guest on a branded color panel
- The "person hero" approach is chosen and a clean look is preferred

Use **sharp** or an external tool for background removal. Save transparent PNGs.

### Technical

Use **sharp** (Node.js) to:

1. Crop with appropriate bias (don't naive center-crop if subject is off-center)
2. Match crop tightness to the visual strategy decided in Phase 2
3. Save to temp files, clean up after generation

## Google Slides Compatibility (legacy pptxgenjs path only)

Only relevant if using the deprecated `generate.js` / `generate_1x1.js` pptxgenjs path. Slide dimensions must be set **before** adding slides:

- 16:9: `width: 12.8, height: 7.2` (inches) via `defineLayout()`
- 1:1: `width: 8, height: 8` (inches) via `defineLayout()`

pptxgenjs handles EMU conversion internally. Set `pres.layout` to the custom layout name after defining it.

## Design Guidelines (Starting Points, Not Rules)

These are established design principles to use as starting points when building or critiquing layouts. They're guides, not laws — break any of them if the result looks better.

### Composition

**Rule of Thirds** — divide the canvas into a 3x3 grid. Place focal elements near the intersections ("power points"), not dead center.
- 1280x720: gridlines at x=427, 853 / y=240, 480
- 1080x1080: gridlines at x=360, 720 / y=360, 720

**Golden Ratio (1:1.618)** — when splitting the canvas into two zones (photo/panel, image/text area), the larger zone to smaller zone is roughly 1.618:1.
- 1280x720: vertical split around 791px / 489px
- 1080x1080: split around 668px / 412px

**Subject placement** — bias the crop and layout so the subject (person, product, focal object) lands on or near a power point, not centered. The subject drives everything else.

**Spatial hierarchy** — size is only half of hierarchy; position carries the other half. In Western reading order, the eye lands top-left first, sweeps right, then down. Put the highest-priority element where the eye arrives first, not dead center "because it's the biggest." A huge name banner in the bottom-third can still lose to a smaller line anchored top-left. When sketching ASCII layouts, number the read order (1/2/3) explicitly and verify the visual weights match.

### Typography Hierarchy

**Size ratios** — use a consistent step-down between text tiers:
- Primary (guest name): baseline — the biggest thing on the canvas
- Secondary (topic): 50–60% of primary
- Tertiary (date): 33–40% of primary

**Thumbnail legibility** — YouTube thumbnails render as small as ~168x94px. Text that's too small disappears entirely. Headline text should be large enough to read at that reduction — err on the side of "too big." Limit to 3–5 words per text element.

**Minimum safe sizes** (on 1280x720): primary ≥ 60px effective, secondary ≥ 36px, tertiary ≥ 24px. These are floors, not targets.

### Contrast & Readability

**Text over photos** — always ensure separation using at least one of:
- Semi-transparent background bar (40–60% opacity)
- Text stroke/outline (2–4px in a contrasting color)
- Drop shadow (offset 2–4px, blur 4–8px)
- Combination of the above

**Headlines without panels** — a common default mistake is to put EVERY text element in a banner-with-panel. Don't. Large headline text (60px+) with a thick contrasting stroke stands on its own against a photo or themed background, and reads more confident / less templated. Reserve panels for:
- Text that sits directly on busy imagery (a face, detailed equipment) — needs background separation
- Chip/label compactness (date, category tag) — panel gives it "sticker" presence
- Ribbon/flag shapes where the polygon IS the design element
Otherwise prefer outlined typography. The Banner Group supports this cleanly: set the polygon fill to fully transparent (`opacity: 0` on the polygon child), and the text stroke does the work.

**Contrast ratios** — aim for at least 3:1 for large/bold text over its immediate background. Higher is better, but thumbnails are display pieces, not accessibility documents.

### Spacing

**Safe margins** — keep critical content away from edges. ~10% margin on each side is a starting point (128px horizontal, 72px vertical on 1280x720). YouTube overlays a timestamp in the bottom-right corner.

**Breathing room** — elements that feel cramped usually need 16–32px more padding than you think. When in doubt, add space.

### Color

**60-30-10 guideline** — 60% dominant color (background/photo), 30% secondary (panels, bars), 10% accent (text highlights, badges). Keeps the palette from feeling chaotic.

**Theme color > brand color for headlines** — when the thumbnail has a strong visual theme (matrix rain = green, circuit = cyan, fire = red/orange), the HEADLINE adopts the theme color, not the brand palette. Brand palette stays for logo, structural bars, and chrome — the elements that identify the show across episodes. Mixing them up (gold headline on a matrix-green backdrop) fights the theme. The brand anchors continuity; the theme owns the individual episode.

**Saturation** — thumbnails display small. Colors that look rich at full size can look muted at thumbnail scale. Slightly oversaturating (10–20%) can help, but check it doesn't look garish.

**Palette limit** — 3 colors plus black/white is usually enough. Each additional color dilutes focus.

### Working With Photo Colors

The brand palette is fixed, but each episode photo has different tones. Use the photo's colors to decide *which* brand colors to lean into.

**Warm vs. cool pairing** — if the photo is warm-toned (reds, oranges, browns, warm lighting), consider sage green or offwhite for overlays — cool against warm creates natural contrast. If the photo is cool-toned (blues, grays), gold or coral will pop. If mixed, default to offwhite text on dark brown overlay.

**Match or contrast, never in-between** — the overlay color should either clearly belong to the photo's color family (feels integrated) or clearly oppose it (feels intentional). A lukewarm mismatch looks like an accident.

**Banner opacity by photo tone:**
- Dark/shadowy photo → semi-transparent banner (40–60% opacity) can work, the darkness does the heavy lifting
- Bright/light photo → need higher opacity (85–95%) on the banner to create readable contrast
- Busy mid-tone photo → always use a near-opaque dark overlay behind text

**Text color decision starting points:**

| Photo Background | Lean Toward | Avoid |
|---|---|---|
| Dark/shadowy | Gold or offwhite text | Dark brown (no contrast) |
| Bright/light | Dark brown text | Gold or offwhite (washes out) |
| Red/coral-dominant | Offwhite or sage | Coral (invisible) |
| Green-dominant | Gold or offwhite | Sage green (invisible) |
| Busy any-tone | Offwhite on dark overlay | Any text directly on photo |

**Saturation matching** — match the overlay saturation to the photo's feel. Muted/vintage photo → desaturate the brand colors 20–30%. Vivid/punchy photo → use brand colors at full saturation. A fully saturated overlay on a muted photo looks pasted on.

**Safe default** — dark brown banner at 85% opacity + offwhite text works on virtually any photo. Deviate only when the photo's tones clearly invite a specific brand color.

**Don'ts:**
- Don't use a brand color that matches the photo's dominant color (gold text on a sunlit scene, sage on foliage)
- Don't use more than 2 brand colors in overlays per thumbnail (one for shape, one for text)
- Don't use a semi-transparent light overlay on a light photo — it reduces contrast instead of adding it

### Visual Weight

**Faces win** — human faces draw the eye more than anything else. If the thumbnail features a person, make them prominent (40–60% of frame). Don't bury them behind text or panels.

**Balance** — a large element near center can be balanced by a smaller element farther out. Don't feel obligated to fill every corner — negative space is a tool.

## Known Pitfalls

- **Date bar wrapping**: Keep date text short. If it wraps, widen the text box, not shrink the font.
- **Logo overlap**: Logo positioning between photo and bar is tight. Verify no overlap on every variant.
- **Transparent PNGs**: If a logo already has alpha, do NOT re-process or flatten it.
- **Photo crop bias**: Always check where the subject is in the original photo before cropping. Left-biased subjects need left-biased crops.
- **Badge sizing**: The org badge should be a major visual element, not a small stamp. Size it to fill the available space.
