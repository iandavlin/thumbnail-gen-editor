// Deco banner/plaque — standalone decorative title plate, brand palette.
// Drawn at a canonical size/position; drag/reposition in the editor after Insert.
// Output: templates/patterns/Banners/Banner_Deco.json

const fs = require('fs');
const path = require('path');

const W = 1280, H = 720;           // canonical canvas ref (16:9)
const CX = W / 2;
const CY = 180;                    // upper-third by default; user can move
const PLATE_W = 640;
const PLATE_H = 110;

// Brand palette
const DARK     = '#2B2318';
const SAGE_DK  = '#87986A';
const GOLD     = '#ECB351';
const GOLD_LT  = '#F1DE83';
const CORAL    = '#FE6B4F';
const OFF      = '#FAF6EE';

const rect = o => ({ type: 'rect', ...o });
const poly = (points, o) => ({ type: 'polygon', points, ...o });
const circ = o => ({ type: 'circle', ...o });

const objs = [];

// --- Main plate (dark fill, gold hairline border)
const plateX = CX - PLATE_W / 2;
const plateY = CY - PLATE_H / 2;
objs.push(rect({
  left: plateX, top: plateY, width: PLATE_W, height: PLATE_H,
  fill: DARK, stroke: GOLD, strokeWidth: 1.5,
  _customName: 'Plate',
}));

// --- Stepped ziggurat ends (3 stacked rects flanking each side, shrinking outward)
function ziggurat(xEdge, dir, tag) {
  // xEdge = x at the inner edge of the plate end; dir = +1 (right side) or -1 (left)
  // Steps grow outward: first block is slightly shorter than plate, next shorter, last shortest.
  const steps = [
    { w: 26, h: PLATE_H - 14, col: SAGE_DK },
    { w: 18, h: PLATE_H - 36, col: GOLD },
    { w: 10, h: PLATE_H - 60, col: DARK },
  ];
  let cursor = xEdge;
  steps.forEach((s, i) => {
    const left = dir > 0 ? cursor : cursor - s.w;
    const top  = CY - s.h / 2;
    objs.push(rect({
      left, top, width: s.w, height: s.h, fill: s.col,
      stroke: i === 2 ? GOLD : null, strokeWidth: i === 2 ? 1 : 0,
      _customName: `${tag} step${i}`,
    }));
    cursor += dir * s.w;
  });
}
ziggurat(plateX + PLATE_W, +1, 'R');
ziggurat(plateX,           -1, 'L');

// --- Reed lines inside the plate (3 gold hairlines near top, 3 near bottom)
function reeds(y0, tag) {
  const count = 3;
  const spacing = 4;
  const lineW = PLATE_W - 80;
  const lineX = CX - lineW / 2;
  for (let i = 0; i < count; i++) {
    objs.push(rect({
      left: lineX, top: y0 + i * spacing, width: lineW, height: 1,
      fill: GOLD_LT, _customName: `${tag} ${i}`,
    }));
  }
}
reeds(plateY + 10, 'Top Reed');
reeds(plateY + PLATE_H - 18, 'Bot Reed');

// --- Corner diamond accents (small, gold) — inside the plate corners
function diamond(cx, cy, size, fill, tag) {
  objs.push(poly(
    [ {x:size/2,y:0}, {x:size,y:size/2}, {x:size/2,y:size}, {x:0,y:size/2} ],
    {
      left: cx - size / 2, top: cy - size / 2,
      width: size, height: size, fill,
      _customName: tag,
    }
  ));
}
const diaSize = 8;
const diaInset = 16;
diamond(plateX + diaInset,             plateY + diaInset,             diaSize, GOLD, 'TL dia');
diamond(plateX + PLATE_W - diaInset,   plateY + diaInset,             diaSize, GOLD, 'TR dia');
diamond(plateX + diaInset,             plateY + PLATE_H - diaInset,   diaSize, GOLD, 'BL dia');
diamond(plateX + PLATE_W - diaInset,   plateY + PLATE_H - diaInset,   diaSize, GOLD, 'BR dia');

// --- Keystone hanging below center (small trapezoid, coral)
const keyW = 58, keyTopW = 34, keyH = 16;
objs.push(poly(
  [ {x:(keyW - keyTopW)/2, y:0}, {x:keyW - (keyW - keyTopW)/2, y:0},
    {x:keyW, y:keyH}, {x:0, y:keyH} ],
  {
    left: CX - keyW / 2, top: plateY + PLATE_H,
    width: keyW, height: keyH, fill: CORAL,
    stroke: GOLD, strokeWidth: 1,
    _customName: 'Keystone',
  }
));

// --- Flanking small sunburst dots above the keystone
[-30, 30].forEach((dx, i) => objs.push(circ({
  left: CX + dx - 2.5, top: plateY + PLATE_H - 8, radius: 2.5,
  fill: GOLD_LT, _customName: `Keystone Dot ${i}`,
})));

// --- Placeholder title text (user will override)
objs.push({
  type: 'textbox',
  left: CX - (PLATE_W - 120) / 2,
  top:  CY - 22,
  width: PLATE_W - 120,
  text: 'TITLE',
  fontSize: 40,
  fontFamily: 'Georgia, serif',
  fontWeight: 'bold',
  fill: GOLD,
  textAlign: 'center',
  charSpacing: 400,
  styles: {},
  _customName: 'Title',
});

// --- Assemble
const doc = {
  name: 'Deco Banner',
  description: 'Art-deco title plaque: dark plate with gold hairline, stepped ziggurat ends (sage/gold/dark), reed lines top and bottom, gold corner diamonds, coral keystone hang with gold dots, centered title.',
  canvasRef: { w: W, h: H },
  objects: objs,
};

const outDir = path.join(__dirname, 'templates', 'patterns', 'Banners');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'Banner_Deco.json');
fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
console.log('Wrote', outPath, '— ' + objs.length + ' objects');
