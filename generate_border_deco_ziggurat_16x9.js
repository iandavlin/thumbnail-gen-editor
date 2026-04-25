// Deco variant — "Ziggurat & Reeds" — for 16:9 (1280x720).
// Stepped pyramid corners, parallel reed lines, sunburst fans at midpoints.
// Brand palette. Lean generator (Fabric defaults omitted).
// Output: templates/patterns/Frames/Deco_Ziggurat_16x9.json

const fs = require('fs');
const path = require('path');

const W = 1280, H = 720;

// Brand palette
const SAGE_DARK  = '#87986A';
const SAGE_MID   = '#A8BE8B';
const SAGE_PALE  = '#D4E0B8';
const GOLD       = '#ECB351';
const GOLD_LT    = '#F1DE83';
const CORAL      = '#FE6B4F';
const DARK       = '#2B2318';
const OFF        = '#FAF6EE';

const rect = o => ({ type: 'rect', ...o });
const poly = (points, o) => ({ type: 'polygon', points, ...o });

const objs = [];

// --- Off-white field (so frame reads on any bg once composited)
objs.push(rect({
  left: 0, top: 0, width: W, height: H, fill: OFF, _customName: 'BG',
}));

// --- Outer sage frame
objs.push(rect({
  left: 22, top: 22, width: W - 44, height: H - 44,
  fill: null, stroke: SAGE_DARK, strokeWidth: 5,
  _customName: 'Outer Frame',
}));

// --- Inner gold hairline frame
objs.push(rect({
  left: 34, top: 34, width: W - 68, height: H - 68,
  fill: null, stroke: GOLD, strokeWidth: 1.5,
  _customName: 'Inner Hairline',
}));

// --- ZIGGURAT CORNERS: 3-step pyramids at each corner, shrinking inward.
// Each corner = 3 rects stepping toward the interior.
function ziggurat(cx, cy, dx, dy, tag) {
  // cx,cy = outer frame corner; dx,dy = direction inward (+/-1 each)
  const steps = [
    { w: 120, h: 30, col: DARK },
    { w: 80,  h: 22, col: SAGE_DARK },
    { w: 44,  h: 14, col: GOLD },
  ];
  // Horizontal arm (stepping up/down away from the edge)
  let cursorY = cy;
  steps.forEach((s, i) => {
    const left = dx > 0 ? cx : cx - s.w;
    const top  = dy > 0 ? cursorY : cursorY - s.h;
    objs.push(rect({
      left, top, width: s.w, height: s.h, fill: s.col,
      _customName: `${tag} H${i}`,
    }));
    cursorY += dy * s.h;
  });
  // Vertical arm (mirror)
  let cursorX = cx;
  steps.forEach((s, i) => {
    const left = dx > 0 ? cursorX : cursorX - s.h;
    const top  = dy > 0 ? cy : cy - s.w;
    objs.push(rect({
      left, top, width: s.h, height: s.w, fill: s.col,
      _customName: `${tag} V${i}`,
    }));
    cursorX += dx * s.h;
  });
}
const CX0 = 22, CY0 = 22, CX1 = W - 22, CY1 = H - 22;
ziggurat(CX0, CY0, +1, +1, 'TL');
ziggurat(CX1, CY0, -1, +1, 'TR');
ziggurat(CX0, CY1, +1, -1, 'BL');
ziggurat(CX1, CY1, -1, -1, 'BR');

// --- REED LINES: five parallel thin horizontals at top & bottom (classic deco reeding)
function reeds(yCenter, tag) {
  const count = 5;
  const spacing = 5;
  const total = (count - 1) * spacing;
  const startY = yCenter - total / 2;
  const lineW = 340;
  const lineX = W / 2 - lineW / 2;
  for (let i = 0; i < count; i++) {
    objs.push(rect({
      left: lineX, top: startY + i * spacing, width: lineW, height: 1.5,
      fill: SAGE_DARK, _customName: `${tag} ${i}`,
    }));
  }
}
reeds(56, 'Top Reed');
reeds(H - 56, 'Bot Reed');

// --- SUNBURST FAN at left and right midpoints (5 narrow triangles radiating inward)
function fan(cx, cy, inward, tag) {
  // inward = +1 (radiate right) or -1 (radiate left). cx,cy = base point on frame.
  const rays = 5;
  const spread = 70;  // total angle spread in degrees
  const length = 60;
  const base = 4;
  for (let i = 0; i < rays; i++) {
    const angleDeg = -spread / 2 + (spread / (rays - 1)) * i;
    const rad = angleDeg * Math.PI / 180;
    // Triangle pointing in the `inward` direction.
    // Define as polygon in local coords: base centered at origin, apex at (inward*length, 0),
    // rotated by angleDeg.
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const rot = (x, y) => ({
      x: cx + cos * x - sin * y,
      y: cy + sin * x + cos * y,
    });
    const p1 = rot(0, -base);
    const p2 = rot(inward * length, 0);
    const p3 = rot(0, base);
    // Find bbox so Fabric positions correctly
    const minX = Math.min(p1.x, p2.x, p3.x);
    const minY = Math.min(p1.y, p2.y, p3.y);
    const maxX = Math.max(p1.x, p2.x, p3.x);
    const maxY = Math.max(p1.y, p2.y, p3.y);
    const pts = [p1, p2, p3].map(p => ({ x: p.x - minX, y: p.y - minY }));
    objs.push(poly(pts, {
      left: minX, top: minY, width: maxX - minX, height: maxY - minY,
      fill: i % 2 === 0 ? GOLD : SAGE_MID, _customName: `${tag} ray${i}`,
    }));
  }
}
fan(26, H / 2, +1, 'L Fan');
fan(W - 26, H / 2, -1, 'R Fan');

// --- KEYSTONE accents at top and bottom centers (small trapezoid pointing inward)
function keystone(cx, cy, pointingDown, tag) {
  const baseW = 46, topW = 22, hgt = 16;
  const pts = pointingDown
    ? [ {x:0,y:0}, {x:baseW,y:0}, {x:baseW - (baseW - topW)/2, y:hgt}, {x:(baseW - topW)/2, y:hgt} ]
    : [ {x:(baseW - topW)/2, y:0}, {x:baseW - (baseW - topW)/2, y:0}, {x:baseW, y:hgt}, {x:0, y:hgt} ];
  objs.push(poly(pts, {
    left: cx - baseW / 2, top: cy,
    width: baseW, height: hgt,
    fill: CORAL, _customName: tag,
  }));
}
keystone(W / 2, 66, true,  'Top Keystone');
keystone(W / 2, H - 82, false, 'Bot Keystone');

// --- SIDE PILASTER dots — three stacked gold dots inside each side, near the fans
function sidePilasterDots(cx, tag) {
  const ys = [H/2 - 56, H/2, H/2 + 56];
  ys.forEach((y, i) => objs.push({
    type: 'circle', left: cx - 3, top: y - 3, radius: 3, fill: GOLD_LT,
    _customName: `${tag} dot ${i}`,
  }));
}
sidePilasterDots(70, 'L Pilaster');
sidePilasterDots(W - 70, 'R Pilaster');

// --- Assemble
const doc = {
  name: 'Deco Ziggurat 16x9',
  description: 'Art-deco variant in brand palette: stepped ziggurat corners (dark→sage→gold), reed lines at top and bottom, sunburst fans at side midpoints, coral keystones, gold pilaster dots.',
  canvasRef: { w: W, h: H },
  objects: objs,
};

const outDir = path.join(__dirname, 'templates', 'patterns', 'Frames');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'Deco_Ziggurat_16x9.json');
fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
console.log('Wrote', outPath, '— ' + objs.length + ' objects');
