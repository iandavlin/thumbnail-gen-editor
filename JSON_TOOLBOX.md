# JSON Toolbox — what you can build

Every tool the editor (`editor.html`) supports through pure Fabric.js JSON. Use this as a menu when generating layouts in `output/<ratio>/*.json` or patterns in `patterns/<Category>/*.json`.

The canvas object is a Fabric.js v5 canvas. JSON shape:

```json
{ "version": "5.x", "objects": [...], "background": "#000", "width": 1280, "height": 720 }
```

All editor-specific behavior is driven by `_`-prefixed metadata fields (preserved across save/load via the `_THUMB_JSON_KEYS` allow-list in `editor.html`). Stick to the names below — typos silently no-op.

---

## 1. Primitive Fabric objects

Stock Fabric, no custom flags needed:

| `type` | Common fields | Notes |
|---|---|---|
| `rect` | `left,top,width,height,fill,stroke,strokeWidth,rx,ry,opacity,angle` | `rx`/`ry` = corner radius. Use as canvas backplates, panels, frames. |
| `circle` | `left,top,radius,fill,stroke,strokeWidth,opacity,angle` | Position is top-left of bounding box. |
| `triangle` | `left,top,width,height,fill,stroke,strokeWidth` | Equilateral by default; rotate via `angle`. |
| `polygon` | `points: [{x,y}],fill,stroke,strokeWidth,strokeLineJoin` | Use for chevrons, diamonds, custom polys. Coords are local to the poly. |
| `path` | `path: "M0,0 L100,100 …"` (SVG path string), `fill,stroke,fillRule` | Use for arbitrary SVG-style geometry, including the SVG-shape library below. |
| `textbox` | `text,fontFamily,fontSize,fontWeight,fontStyle,fill,stroke,strokeWidth,paintFirst,textAlign,lineHeight,charSpacing,width,shadow,opacity` | Default brand font is **Jost**. `paintFirst:'stroke'` keeps text outlines behind the fill (no bleed). |
| `image` | `src,left,top,scaleX,scaleY,cropX,cropY,width,height,filters` | `src` is a `/assets/...` relative path. See **Image clipping** for masks. |
| `group` | `_objects: [...], left, top` | Plain Fabric grouping. The custom group types below piggyback on this. |

**Shadow** (any object): `shadow: { color, blur, offsetX, offsetY }` — usually attach to the *child polygon* of a banner, not the group wrapper, so it composites correctly.

**Filters** on images: any of Fabric's built-ins (`Brightness`, `Contrast`, `Saturation`, `HueRotation`, `Vibrance`, `Noise`, `Pixelate`, `Blur`) plus a custom **`Duotone`** filter (two-color mapping based on luminance). Stored as `filters: [{ type:"Brightness", brightness: 0.1 }, …]`.

---

## 2. Banner Group — `_isBannerGroup: true`

The headline element. A `group` containing one `polygon` + one `textbox`. The polygon's points get *rebuilt at load time* from the metadata — generators only emit a placeholder polygon.

| Field | Values | Meaning |
|---|---|---|
| `_isBannerGroup` | `true` | Marks the group. |
| `_bannerLeftEnd` / `_bannerRightEnd` | `'flat' \| 'arrow' \| 'chevron'` | End shape on each side. |
| `_bannerNotchL` / `_bannerNotchR` | number (px) | Inward notch depth on each end. 0 = no notch. |
| `_bannerFlareL` / `_bannerFlareR` | number (px) | Outward flare on each end. |
| `_padL`, `_padR`, `_padT`, `_padB` | number (px) | Insets — text auto-sizes to whatever space remains after padding. |
| `_padLinked` | bool | If true, sliders move all four pads together. |

The textbox child uses standard `textbox` fields. Font auto-shrinks if the line would wrap. Outline via `stroke` + `paintFirst:'stroke'`.

**Hierarchy rule for podcast thumbnails:** guest name = biggest banner, topic = secondary, date = tertiary. Each step ~60–80px narrower and indented right (staircase reveal).

---

## 3. Frame — `_isFrame: true`

A `rect` with extra fields that turn it into a frame/border with controllable thickness, corner radii, and per-side completeness. Lives at the canvas edge as a containment device.

| Field | Meaning |
|---|---|
| `_isFrame: true` | Marks the rect. |
| `_frameThickness` | Stroke-like thickness in px. |
| `_frameRadius` | Outer corner radius. |
| `_frameInnerRadius` | Inner corner radius (for inset look). |
| `_frameOffset` | Inset from the rect bounds (positive shrinks the visible frame). |
| `_framePadT/R/B/L` | Per-side inset overrides. |
| `_frameTop/_frameRight/_frameBottom/_frameLeft` | bool — whether each side renders. Lets you build C-shapes, brackets, ⌐. |
| `_frameTL/_frameTR/_frameBR/_frameBL` | bool — per-corner enable for stitched corners. |
| `_frameCompleteness` | 0–1 — fraction of each side drawn from its midpoint outward. Useful for animated-feel half-borders. |

---

## 4. Hitbox Group — `_isHitboxGroup: true`

A reusable shape primitive: one or more polygons + an optional centered text, grouped so they move/scale as one. Less rigid than a banner group (no padding-driven autosize); good for stamps, badges, multi-shape compositions you want to treat as a unit.

Children may have `_padT/R/B/L` for centered-text offset hints. Use the **Link** button in the layer panel to convert an existing polygon + textbox into one.

---

## 5. Panel Group — `_isPanelGroup: true`

A multi-line text panel with per-line alignment, offsets, and a configurable gap. Use for stacked metadata (date / topic / sub-line).

| Field | Meaning |
|---|---|
| `_panelGap` | Vertical gap between lines (px). |
| `_panelLineAlign` | `'left'\|'center'\|'right'` — default per-line alignment. |
| `_panelLineOffsetX` / `_panelLineOffsetY` | Per-line offset arrays (parallel to `_objects`). |
| `_panelAlignBlock` | bool — align the whole block as a unit. |
| `_selectedLineIdx` | Editor state, not load-bearing in JSON. |

Children are `textbox` objects. Set `fontSize`, `fill`, `fontWeight` per line.

---

## 6. SVG-Shape Library — `_isSVGShape: true`

Use stock decorative shapes via `path` objects. Drop in by emitting the path strings below (or call the editor's `addSVGShape(id)` to insert interactively). Add `_isSVGShape: true` so the layer panel labels them properly.

Categories and IDs:

- **Geometric:** `pentagon`, `hexagon`, `octagon`, `cross`, `ring`
- **Stars/bursts:** `star5`, `star6`, `star8`, `burst12`, `starburst`
- **Badges:** `shield`, `seal`, `label`, `ticket`
- **Decorative:** `speech` (speech bubble), `wave`, `arrow-r`, `arrow-l`, `swoosh`, `dbl-chev`

Paths are defined in `editor.html` near `const SVG_SHAPES`. ViewBox is `0 0 200 200` for most; check the source for non-square ones (`label`, `ticket`, `wave`, `arrows`, `swoosh`, `dbl-chev`).

---

## 7. Warp Shape — `_isWarpShape: true`

A path/rect rendered through SVG `feTurbulence` + `feDisplacementMap` for organic distorted edges and optional paper-look fill. One variant: `_warpVariant: 'shape'`.

`_warpParams` fields:

| Param | Range | Effect |
|---|---|---|
| `color` | hex | Fill color (or paper base if `paperTexture` on). |
| `borderColor` | hex or '' | Border color; '' disables. |
| `borderW` | 0.1–30 | Border width. Sub-1 values give hair-thin lines. |
| `distort` | 5–60 | Displacement amplitude. |
| `freq` | 1–15 | Displacement spatial frequency (lower = larger waves). |
| `seed` | int | Reproducible RNG seed. |
| `paperTexture` | bool | Adds lit fractal-noise paper grain to the fill. |
| `paperIntensity` | 0–2 | Paper lighting strength. |
| `grain` | 0–100 | Soft-light grain over the warped edge. |
| `collapseAmt` | 0–1 | Spatial alpha mask — fades border in/out along its length. |
| `collapseFreq` | ~0.01–0.2 | Spatial frequency of the collapse mask. |

`_warpW` / `_warpH` cache the source dimensions so the SVG can be rebuilt on load.

---

## 8. Torn Paper — `_isTornShape: true`

Procedural torn-paper edges. Emits a `path` with a seeded jagged edge.

| Field | Meaning |
|---|---|
| `_tornType` | `'strip'` (top + bottom torn) or `'circle'` (radial torn) |
| `_tornSeed` | int — reproducible RNG. |
| `_tornW`, `_tornH` | Source dimensions (path is rebuilt on load). |
| `_tornParams.amp` | 0–60 — tear amplitude. |
| `_tornParams.freq` | 0.1–1.5 — segments per length (higher = finer tears). |
| `_tornParams.chaos` | 0–1 — variance in segment length. |
| `_tornParams.smooth` | 0–1 — fraction of points using smooth (curve) joins vs. sharp. |

Defaults: `{ amp:22, freq:0.5, chaos:0.5, smooth:0 }`.

---

## 9. Texture Overlay — `_isTextureOverlay: true`

A rect overlaid via `globalCompositeOperation` (blend mode) to paint a texture across whatever's below. Set `_textureType` and `_textureParams`. The renderer paints the texture at the rect's bounds.

Available `_textureType` values (from `TEXTURE_TYPES` in editor.html):

| id | Default blend | Default opacity | Params |
|---|---|---|---|
| `grain` | overlay | 0.15 | `size` 0.1–8, `coarse` 0–100 |
| `bump` | multiply | 0.80 | `freq`, `azimuth`, `elevation`, `intensity` |
| `paper` | multiply | 0.30 | `freq`, `elevation` |
| `noise` | overlay | 0.20 | `freq`, `octaves` |
| `crosshatch` | multiply | 0.25 | `spacing`, `weight`, `angle` |
| `halftone` | multiply | 0.30 | `spacing`, `radius` |
| `linen` | multiply | 0.35 | `scale`, `contrast` |
| `vignette` | multiply | 0.75 | `spread` 20–90 |
| `aged` | multiply | 0.55 | `scratches` 0–20, `fade` 0–80 |
| `warp` | normal | 0.85 | `distort`, `freq` |

Override via `globalCompositeOperation: 'overlay'|'multiply'|'screen'|'soft-light'|'normal'|…` on the object itself.

---

## 10. Image Clipping — on regular `image` objects

Mask an image to a non-rect shape without re-encoding. Set:

| Field | Values |
|---|---|
| `_clipShape` | `'none'` \| `'circle'` \| `'roundedRect'` |
| `_clipRadius` | px (rounded-rect corner; or circle radius when shape='circle') |
| `_clipBorderEnabled` | bool — draw a stroke around the clipped silhouette |
| `_clipBorderColor` | hex |
| `_clipBorderWidth` | px |

Internally a sibling `circle`/`rect` ring is auto-created (`_isBorderRing: true`, `_borderRingId`) — you don't need to emit the ring yourself; the editor materializes it.

Standard image controls: `cropX`, `cropY` for shifting the visible window; `_innerShadow` (bool) on rects to fake a recess.

---

## 11. Custom rect features

For plain `rect`s:

| Field | Effect |
|---|---|
| `_cornerRadius` | Uniform corner radius (legacy — also use `rx`/`ry`). |
| `_corners` | `{tl,tr,br,bl}` — per-corner radii. |
| `_cornersLinked` | bool — UI flag. |
| `_innerShadow` | bool — paints an inner shadow inside the rect. |
| `_shadowSpread` | px — extra spread around a regular shadow (built via duplicated stroke). |

---

## 12. Universal lock/visibility flags

Honored by the editor on any object:

`selectable`, `evented`, `lockMovementX`, `lockMovementY`, `lockScalingX`, `lockScalingY`, `lockRotation`, `lockUniScaling`, `visible`, `opacity`.

`_customName` — display name in the layer panel. **Always set this on generated objects** so the layer list is readable.

---

## 13. Generators — patterns to mimic

Reach for these as scaffolds when emitting JSON:

- `generate_thorell.js` — full episode layout (image, banner stack, badge, logo).
- `generate_braxton_hyde.js`, `generate_hoa_misconceptions.js`, `generate_slj.js`, `generate_ted.js` — per-episode layouts; each shows a different compositional axis.
- `generate_border_deco_16x9.js`, `generate_border_bauhaus_16x9.js`, `generate_border_deco_ziggurat_16x9.js` — frame patterns into `patterns/Frames/`.
- `generate_banner_deco.js` — banner pattern into `patterns/Banners/`.
- `generate_1x1.js` — square ratio scaffold.

Output paths:
- Full layouts → `output/<ratio>/{show}_{guest}_<ratio>.json`
- Reusable patterns → `patterns/<Category>/<Name>_<ratio>.json` with shape `{ name, description, canvasRef:{w,h}, objects:[...] }`.

---

## 14. Loadability checklist

Before handing JSON to the editor, verify:

1. Every banner group has `_isBannerGroup:true` plus the four `_pad*` and the `_bannerLeftEnd/RightEnd` fields. Polygon points can be a placeholder `[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]` — `reattachBehaviors()` rebuilds them on load.
2. Every image `src` is a relative `/assets/...` path, not `localhost:8080/...` (won't survive a port change).
3. `_customName` is set on every object.
4. Custom-flag objects include all the metadata for that type (warp, torn, frame, etc.) — missing fields default but may render wrong.
5. The top-level JSON has `version`, `width`, `height`, `objects`, and (optionally) `background`.

Open with: `http://localhost:8080/editor.html?load=/output/16x9/your_layout.json`
