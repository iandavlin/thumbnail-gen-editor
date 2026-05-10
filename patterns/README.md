# Thumbnail Templates

Reusable Fabric.js canvas layouts. Each template is a JSON file with placeholder slots for episode-specific content.

## Template Format

```json
{
  "templateName": "full-bleed-overlay",
  "description": "...",
  "aspectRatio": "16x9",
  "canvasSize": { "w": 1280, "h": 720 },
  "slots": {
    "guestPhoto": { "objectIndex": 0, "fields": ["src", "cropX", "cropY"] },
    "guestName": { "objectIndex": 1, "textChild": 1, "fields": ["text"] },
    ...
  },
  "canvas": { /* standard Fabric.js canvas JSON */ }
}
```

### Slots

The `slots` object maps semantic names to object locations in the canvas. Each slot has:
- `objectIndex` — index in `canvas.objects[]`
- `textChild` — (banner groups only) index of the textbox child within the group
- `fields` — which properties to replace when filling the template

Placeholder values in the canvas use `{{SLOT_NAME}}` syntax.

## Templates

| File | Name | Ratio | Description |
|------|------|-------|-------------|
| `full-bleed-overlay_16x9.json` | full-bleed-overlay | 16:9 | Full-bleed photo, chevron banner overlays (name top-right, topic below, date bottom-left), logo bottom-right, rounded frame |
| `full-bleed-overlay_1x1.json` | full-bleed-overlay | 1:1 | Square sibling of above |
| `cutout-over-themed-bg_16x9.json` | cutout-over-themed-bg | 16:9 | Transparent-PNG subject cutout over a full-bleed themed background (matrix, circuit, etc.). Banner staircase with varied treatments (outlined → transparent-panel → solid-panel). Reach for this when the episode's HOOK is the concept, not a location. |

## Two template styles

Two conventions coexist in this folder — both are valid, they serve different purposes:

1. **Slot-based** (e.g. `full-bleed-overlay_*.json`) — the canvas contains `{{SLOT_NAME}}` placeholders and a top-level `slots` map identifies which objects/fields get filled. Best for programmatic filling from episode metadata.
2. **Remix-copy** (e.g. `cutout-over-themed-bg_16x9.json`) — the canvas contains a real working layout from a successful episode, with top-level `useWhen` / `toReskin` / `notes` describing what to change when reskinning. Best for hand-remixing a good layout into a new episode.
