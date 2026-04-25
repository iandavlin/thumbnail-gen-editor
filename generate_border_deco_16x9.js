// Generates an art-deco geometric border for 16:9 (1280x720).
// Concentric frames, stepped corner brackets, midpoint chevron+diamond accents.
// Output: templates/patterns/Frames/Deco_Border_16x9.json

const fs = require('fs');
const path = require('path');

const W = 1280, H = 720;

// Palette (sage / gold / dark from existing show palette)
const C_OUTER  = '#87986A'; // sage green
const C_INNER  = '#ECB351'; // gold
const C_ACCENT = '#2B2318'; // dark
const C_MID    = '#A8BE8B'; // lighter sage

const STROKE_OUTER = 6;
const STROKE_INNER = 2;

const INSET_OUTER = 22;                       // outer frame distance from canvas edge
const INSET_INNER = INSET_OUTER + 14;         // inner frame distance
const BRACKET_LEN = 140;                      // arm length of each corner bracket
const BRACKET_THICK = 10;                     // arm thickness

const objs = [];

function rect(opts) {
  return {
    type: 'rect', version: '5.3.0',
    originX: 'left', originY: 'top',
    left: opts.left, top: opts.top,
    width: opts.width, height: opts.height,
    fill: opts.fill ?? null,
    stroke: opts.stroke ?? null,
    strokeWidth: opts.strokeWidth ?? 0,
    strokeDashArray: null, strokeLineCap: 'butt',
    strokeDashOffset: 0, strokeLineJoin: 'miter',
    strokeUniform: true, strokeMiterLimit: 4,
    scaleX: 1, scaleY: 1, angle: opts.angle ?? 0,
    flipX: false, flipY: false, opacity: 1,
    shadow: null, visible: true, backgroundColor: '',
    fillRule: 'nonzero', paintFirst: 'fill',
    globalCompositeOperation: 'source-over',
    skewX: 0, skewY: 0, rx: opts.rx ?? 0, ry: opts.ry ?? 0,
    _customName: opts.name || 'rect',
    lockMovementX: false, lockMovementY: false,
    lockScalingX: false, lockScalingY: false, lockRotation: false,
  };
}

function poly(points, opts) {
  return {
    type: 'polygon', version: '5.3.0',
    originX: 'left', originY: 'top',
    left: opts.left ?? 0, top: opts.top ?? 0,
    width: opts.width ?? 0, height: opts.height ?? 0,
    fill: opts.fill ?? null,
    stroke: opts.stroke ?? null,
    strokeWidth: opts.strokeWidth ?? 0,
    strokeDashArray: null, strokeLineCap: 'butt',
    strokeDashOffset: 0, strokeLineJoin: 'miter',
    strokeUniform: true, strokeMiterLimit: 4,
    scaleX: 1, scaleY: 1, angle: 0,
    flipX: false, flipY: false, opacity: 1,
    shadow: null, visible: true, backgroundColor: '',
    fillRule: 'nonzero', paintFirst: 'fill',
    globalCompositeOperation: 'source-over',
    skewX: 0, skewY: 0,
    points,
    _customName: opts.name || 'poly',
    lockMovementX: false, lockMovementY: false,
    lockScalingX: false, lockScalingY: false, lockRotation: false,
  };
}

// --- Outer thin frame (stroke only)
objs.push(rect({
  name: 'Outer Frame',
  left: INSET_OUTER + STROKE_OUTER / 2,
  top:  INSET_OUTER + STROKE_OUTER / 2,
  width:  W - 2 * INSET_OUTER - STROKE_OUTER,
  height: H - 2 * INSET_OUTER - STROKE_OUTER,
  fill: null,
  stroke: C_OUTER,
  strokeWidth: STROKE_OUTER,
}));

// --- Inner thin frame (stroke only)
objs.push(rect({
  name: 'Inner Frame',
  left: INSET_INNER + STROKE_INNER / 2,
  top:  INSET_INNER + STROKE_INNER / 2,
  width:  W - 2 * INSET_INNER - STROKE_INNER,
  height: H - 2 * INSET_INNER - STROKE_INNER,
  fill: null,
  stroke: C_INNER,
  strokeWidth: STROKE_INNER,
}));

// --- Stepped corner brackets (L-shape) — one at each corner
// Brackets sit ON the outer frame edge, creating a sharp deco accent.
function cornerBracket(cornerX, cornerY, dx, dy, label) {
  // cornerX/Y = the corner point of the outer frame; dx/dy = direction inward (+1/-1)
  // Horizontal arm
  objs.push(rect({
    name: label + ' H',
    left: dx > 0 ? cornerX : cornerX - BRACKET_LEN,
    top:  dy > 0 ? cornerY : cornerY - BRACKET_THICK,
    width: BRACKET_LEN,
    height: BRACKET_THICK,
    fill: C_ACCENT,
  }));
  // Vertical arm
  objs.push(rect({
    name: label + ' V',
    left: dx > 0 ? cornerX : cornerX - BRACKET_THICK,
    top:  dy > 0 ? cornerY : cornerY - BRACKET_LEN,
    width: BRACKET_THICK,
    height: BRACKET_LEN,
    fill: C_ACCENT,
  }));
  // Gold accent stripe on each arm
  objs.push(rect({
    name: label + ' H gold',
    left: dx > 0 ? cornerX + 14 : cornerX - BRACKET_LEN + 14,
    top:  dy > 0 ? cornerY + 3 : cornerY - BRACKET_THICK + 3,
    width: BRACKET_LEN - 28,
    height: 3,
    fill: C_INNER,
  }));
  objs.push(rect({
    name: label + ' V gold',
    left: dx > 0 ? cornerX + 3 : cornerX - BRACKET_THICK + 3,
    top:  dy > 0 ? cornerY + 14 : cornerY - BRACKET_LEN + 14,
    width: 3,
    height: BRACKET_LEN - 28,
    fill: C_INNER,
  }));
}

// Corner anchor points are ON the outer frame outline
const CX0 = INSET_OUTER;
const CY0 = INSET_OUTER;
const CX1 = W - INSET_OUTER;
const CY1 = H - INSET_OUTER;

cornerBracket(CX0, CY0, +1, +1, 'Corner TL');
cornerBracket(CX1, CY0, -1, +1, 'Corner TR');
cornerBracket(CX0, CY1, +1, -1, 'Corner BL');
cornerBracket(CX1, CY1, -1, -1, 'Corner BR');

// --- Midpoint chevrons (triangle pointing inward) on each side
function pushTri(cx, cy, orientation, label) {
  const size = 22;
  let points;
  if (orientation === 'down') points = [ {x:0,y:0}, {x:size,y:0}, {x:size/2,y:size} ];
  else if (orientation === 'up') points = [ {x:0,y:size}, {x:size,y:size}, {x:size/2,y:0} ];
  else if (orientation === 'right') points = [ {x:0,y:0}, {x:0,y:size}, {x:size,y:size/2} ];
  else /* left */ points = [ {x:size,y:0}, {x:size,y:size}, {x:0,y:size/2} ];
  objs.push(poly(points, {
    name: label,
    left: cx - size / 2,
    top:  cy - size / 2,
    width: size, height: size,
    fill: C_MID,
  }));
}

pushTri(W / 2, INSET_OUTER + STROKE_OUTER / 2, 'down', 'Mid Top');
pushTri(W / 2, H - INSET_OUTER - STROKE_OUTER / 2, 'up', 'Mid Bot');
pushTri(INSET_OUTER + STROKE_OUTER / 2, H / 2, 'right', 'Mid Left');
pushTri(W - INSET_OUTER - STROKE_OUTER / 2, H / 2, 'left', 'Mid Right');

// --- Tiny diamonds stacked diagonally inside each corner (between bracket and inner frame)
function diamond(cx, cy, size, fill, label) {
  objs.push(poly(
    [ {x:size/2,y:0}, {x:size,y:size/2}, {x:size/2,y:size}, {x:0,y:size/2} ],
    {
      name: label,
      left: cx - size / 2,
      top:  cy - size / 2,
      width: size, height: size,
      fill,
    }
  ));
}

const DIAG_STEP = 18;
const DIAG_OFF  = 66; // distance from corner along each axis to the first diamond
function cornerDiamonds(cx, cy, dx, dy, tag) {
  for (let i = 0; i < 3; i++) {
    const d = DIAG_OFF + i * DIAG_STEP;
    diamond(cx + dx * d, cy + dy * d, 8 - i * 1.5, i === 0 ? C_INNER : C_OUTER, `${tag} dia ${i}`);
  }
}
cornerDiamonds(CX0, CY0, +1, +1, 'TL');
cornerDiamonds(CX1, CY0, -1, +1, 'TR');
cornerDiamonds(CX0, CY1, +1, -1, 'BL');
cornerDiamonds(CX1, CY1, -1, -1, 'BR');

// --- Double-stroke center accents on top and bottom edge
// Short parallel lines flanking each midpoint chevron
function sideDash(cx, cy, w, vertical) {
  objs.push(rect({
    name: 'dash',
    left: cx - (vertical ? 2 : w) / 2,
    top:  cy - (vertical ? w : 2) / 2,
    width: vertical ? 2 : w,
    height: vertical ? w : 2,
    fill: C_INNER,
  }));
}
// Top & bottom dashes
[-80, 80].forEach(off => {
  sideDash(W / 2 + off, INSET_OUTER + STROKE_OUTER / 2, 40, false);
  sideDash(W / 2 + off, H - INSET_OUTER - STROKE_OUTER / 2, 40, false);
});
// Left & right dashes
[-50, 50].forEach(off => {
  sideDash(INSET_OUTER + STROKE_OUTER / 2, H / 2 + off, 40, true);
  sideDash(W - INSET_OUTER - STROKE_OUTER / 2, H / 2 + off, 40, true);
});

// --- Assemble JSON (Fabric-compatible, loadable via "Load JSON(s)")
const doc = {
  name: 'Deco Border 16x9',
  description: 'Art-deco geometric border: double frame, stepped corner brackets with gold inlays, midpoint chevrons, diamond clusters, side dashes.',
  canvasRef: { w: W, h: H },
  objects: objs,
};

const outDir = path.join(__dirname, 'templates', 'patterns', 'Frames');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'Deco_Border_16x9.json');
fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
console.log('Wrote', outPath, '— ' + objs.length + ' objects');
