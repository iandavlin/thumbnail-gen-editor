// Bauhaus-style geometric border for 16:9 (1280x720).
// Primary colors + black, asymmetric primitives. Cheap-factory generator.
// Output: templates/patterns/Frames/Bauhaus_Border_16x9.json

const fs = require('fs');
const path = require('path');

const W = 1280, H = 720;

// Brand palette (Looth Group) — Bauhaus primaries mapped to brand
const CORAL  = '#FE6B4F';   // stands in for red
const GOLD   = '#ECB351';   // stands in for yellow
const SAGE   = '#87986A';   // GREEN_DARK — stands in for blue
const SAGE_LT = '#A8BE8B';  // GREEN_MID — supporting
const DARK   = '#2B2318';   // stands in for black
const OFF    = '#FAF6EE';   // OFFWHITE

// Cheap factories — only emit the fields that differ from Fabric defaults.
const rect = o => ({ type: 'rect', ...o });
const poly = (points, o) => ({ type: 'polygon', points, ...o });
const circ = o => ({ type: 'circle', ...o });
const tri  = o => ({ type: 'triangle', ...o });

const objs = [];

// --- Full-bleed off-white background
objs.push(rect({
  left: 0, top: 0, width: W, height: H, fill: OFF, _customName: 'BG',
}));

// --- Thick dark outer frame (stroke only). Keep inset thin so shapes hug edges.
objs.push(rect({
  left: 18, top: 18, width: W - 36, height: H - 36,
  fill: null, stroke: DARK, strokeWidth: 10,
  _customName: 'Outer Frame',
}));

// --- TOP-LEFT: gold quarter-circle hugging the corner (shrunk to free center)
objs.push(circ({
  left: -80, top: -80, radius: 140, fill: GOLD,
  _customName: 'TL Gold Circle',
}));

// --- TOP-RIGHT: coral diamond, smaller and tighter to corner
objs.push(rect({
  left: W - 110, top: 12, width: 90, height: 90,
  fill: CORAL, angle: 45,
  _customName: 'TR Coral Diamond',
}));

// --- LEFT: sage vertical bar, thinner and pulled against the frame
objs.push(rect({
  left: 42, top: 150, width: 18, height: H - 300,
  fill: SAGE, _customName: 'L Sage Bar',
}));

// --- BOTTOM-RIGHT: dark triangle, smaller, pulled into the corner
objs.push(tri({
  left: W - 160, top: H - 130, width: 115, height: 95,
  fill: DARK, _customName: 'BR Dark Triangle',
}));

// --- Top: coral hairline, shorter — just spanning the left portion
objs.push(rect({
  left: 190, top: 56, width: 260, height: 4,
  fill: CORAL, _customName: 'Top Coral Line',
}));

// --- Bottom: gold bar, narrower (30% of width, left-offset)
objs.push(rect({
  left: 70, top: H - 62, width: W * 0.30, height: 16,
  fill: GOLD, _customName: 'Bot Gold Bar',
}));

// --- Bottom: sage hairline under gold bar
objs.push(rect({
  left: 70, top: H - 38, width: W * 0.42, height: 3,
  fill: SAGE, _customName: 'Bot Sage Line',
}));

// --- Right: three small stacked squares, snug to right frame
const stackX = W - 60;
[
  { y: 170, fill: SAGE },
  { y: 212, fill: GOLD },
  { y: 254, fill: CORAL },
].forEach((s, i) => objs.push(rect({
  left: stackX - 15, top: s.y, width: 30, height: 30, fill: s.fill,
  _customName: `Stack ${i}`,
})));

// --- Dark dot clusters, kept close to corners
[
  { x: 150, y: 140, r: 6 },
  { x: 188, y: 178, r: 4 },
  { x: 222, y: 212, r: 3 },
].forEach((d, i) => objs.push(circ({
  left: d.x - d.r, top: d.y - d.r, radius: d.r, fill: DARK,
  _customName: `TL Dot ${i}`,
})));
[
  { x: W - 230, y: H - 210, r: 7 },
  { x: W - 195, y: H - 175, r: 4 },
].forEach((d, i) => objs.push(circ({
  left: d.x - d.r, top: d.y - d.r, radius: d.r, fill: DARK,
  _customName: `BR Dot ${i}`,
})));

// --- Small gold triangle accent tucked near top-right edge (not encroaching)
objs.push(tri({
  left: W - 260, top: 90, width: 32, height: 32,
  fill: GOLD, angle: -18,
  _customName: 'TR Gold Tri Accent',
}));

// --- Coral vertical hairline, top-right column — pulled to side
objs.push(rect({
  left: W - 85, top: 70, width: 3, height: 140,
  fill: CORAL, _customName: 'R Coral Hairline',
}));

// --- Extra: sage mid-left hairline (bottom half), balances composition
objs.push(rect({
  left: 80, top: H - 230, width: 3, height: 130,
  fill: SAGE_LT, _customName: 'L Sage Hairline',
}));

// --- Assemble
const doc = {
  name: 'Bauhaus Border 16x9',
  description: 'Bauhaus-style border: off-white field, thick black frame, primary-color primitives (circle, diamond, bars, triangle, stacked squares, dot clusters).',
  canvasRef: { w: W, h: H },
  objects: objs,
};

const outDir = path.join(__dirname, 'templates', 'patterns', 'Frames');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'Bauhaus_Border_16x9.json');
fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
console.log('Wrote', outPath, '— ' + objs.length + ' objects');
