# Thumbnail Generator — To Do

## Inflatable Bezier Curve Element

A new path-based element with Fusion 360-style editing and inflated tube rendering.

### Build order

- [ ] Offset path math — compute parallel offset curves on both sides of a bezier
- [ ] End cap system — 6 styles (round, flat, pointed, forked/swallow-tail, flared, angled), independently pickable per end
- [ ] Editor interaction — anchor points + bezier handles, draggable in-canvas
- [ ] Color / gradient — flat fill + radial gradient across width for 3D puffy look
- [ ] Texture wiring — hook into existing texture system (grain/bump/paper/noise)
- [ ] JSON descriptor — `type: 'inflated-path'` schema for generator scripts

### Notes

- Uses `fabric.Path` (true offset fill, not thick stroke) so end caps can be custom geometry
- Each end cap independently styled
- Inflation = width of the tube, controlled by slider
- Gradient shading optional — highlight one side, shadow the other for depth
- Same texture fill support as existing shapes
