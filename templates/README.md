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
