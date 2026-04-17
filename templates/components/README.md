# Reusable Components

Pre-built Fabric.js objects ready to drop into any template. Each file contains:

```json
{
  "name": "banner-chevron",
  "description": "...",
  "tweakable": { "objects[1].text": "Display text", ... },
  "fabricObject": { /* Fabric.js object JSON, no position/scale */ }
}
```

**Position and scale are NOT included** — those are set per-template. Only the object structure, styling, shadows, and shape are baked in.

## Components

| File | What It Is | Typical Tweaks |
|------|-----------|----------------|
| `banner-chevron.json` | Chevron-left banner (name/topic style). Gold text, dark semi-transparent fill, brown border, drop shadow. | text, text color, fill opacity |
| `banner-flat.json` | Flat-ended banner (date/info style). White text, dark fill, sage shadow. | text, text color, shadow color |
| `frame.json` | Full-canvas border ring. Rusty brown, 6px thick, 12px radius. | fill color, thickness, radius |
| `logo-looth.json` | Looth Group logo (high-res base64 PNG). | just position/scale |

## Usage

To assemble a template, read each component's `fabricObject`, set `left`, `top`, `scaleX`, `scaleY`, swap the tweakable values, and push into the canvas objects array.
