const fs = require('fs');

const W = 1920, H = 1080;

// Palette 2 - Dark Riddler
const BG       = '#12101E';
const QMARK    = '#00CBCB';
const HEADLINE = '#BF7237';
const ACCENT   = '#A7B597';
const BODY     = '#F5F0E4';

// Generate scattered question marks across the canvas
// Different angles, sizes, opacities, positions
function makeQMarks() {
  const marks = [];
  const rng = (min, max) => min + Math.random() * (max - min);
  const seed = [ // hand-placed variety for good distribution
    // [x, y, size, angle, opacity]
    [60,  40,  110, -35, 0.18],
    [200, 150,  60,  20, 0.12],
    [380,  80,  85,  55, 0.22],
    [520, 200,  45, -70, 0.10],
    [680,  30, 100,  90, 0.15],
    [800, 180,  55, -20, 0.13],
    [950,  90,  75,  40, 0.20],
    [1100, 160,  50, 130, 0.11],
    [1250,  50,  90, -45, 0.17],
    [1400, 190,  65,  15, 0.14],
    [1550,  80, 105, -60, 0.21],
    [1700, 170,  48,  75, 0.12],
    [1850,  60,  80, -10, 0.16],
    [1920, 180,  60,  50, 0.13],

    [30,  300,  70, 110, 0.14],
    [170, 380,  95, -25, 0.19],
    [320, 280,  50,  65, 0.11],
    [460, 420,  80, -80, 0.16],
    [620, 310,  55,  35, 0.13],
    [760, 450,  90,  -5, 0.20],
    [920, 350,  45, 100, 0.10],
    [1060,430,  70, -50, 0.17],
    [1200,320,  58,  25, 0.14],
    [1340,460,  85, -30, 0.18],
    [1480,370, 100,  70, 0.22],
    [1620,440,  52, -15, 0.12],
    [1760,350,  75,  45, 0.15],
    [1900,430,  65, -85, 0.13],

    [80,  540,  88, -40, 0.17],
    [230, 620, 105,  15, 0.21],
    [400, 560,  48,  80, 0.11],
    [540, 680,  72, -55, 0.15],
    [700, 590,  95,  30, 0.19],
    [850, 700,  55, -20, 0.13],
    [990, 610,  80, 110, 0.16],
    [1130,720,  60,  -5, 0.12],
    [1280,590, 100,  50, 0.20],
    [1430,680,  45, -70, 0.10],
    [1580,620,  85,  25, 0.18],
    [1720,700,  65, -35, 0.14],
    [1870,580,  50,  60, 0.12],

    [50,  800,  65, 100, 0.13],
    [190, 880,  90, -30, 0.18],
    [350, 820,  55,  45, 0.12],
    [500, 940,  78, -65, 0.16],
    [660, 850, 100,  20, 0.20],
    [820, 960,  48,  -5, 0.11],
    [970, 880,  72,  85, 0.15],
    [1110,970,  60, -40, 0.13],
    [1260,840,  88,  30, 0.17],
    [1400,960,  52, -55, 0.12],
    [1550,870,  95,  70, 0.19],
    [1700,980,  65, -20, 0.14],
    [1850,860,  80,  40, 0.16],
  ];

  return marks.map(([x, y, size, angle, opacity]) => ({
    type: 'textbox',
    version: '5.3.0',
    originX: 'center', originY: 'center',
    left: x, top: y,
    width: size * 1.2,
    fill: QMARK,
    stroke: null, strokeWidth: 0,
    scaleX: 1, scaleY: 1,
    angle,
    opacity,
    visible: true,
    paintFirst: 'fill',
    globalCompositeOperation: 'source-over',
    skewX: 0, skewY: 0,
    fontFamily: 'Jost',
    fontWeight: 'bold',
    fontSize: size,
    text: '?',
    textAlign: 'center',
    fontStyle: 'normal',
    lineHeight: 1,
    charSpacing: 0,
    textBackgroundColor: '',
    styles: [],
    direction: 'ltr',
    minWidth: 20,
    splitByGrapheme: false,
    lockMovementX: false, lockMovementY: false,
    lockScalingX: false, lockScalingY: false,
    lockRotation: false,
  }));
}

const qmarks = makeQMarks();

const objects = [
  // Background
  {
    type: 'rect', version: '5.3.0',
    originX: 'left', originY: 'top',
    left: 0, top: 0, width: W, height: H,
    fill: BG, stroke: null, strokeWidth: 0,
    scaleX: 1, scaleY: 1, angle: 0, opacity: 1,
    visible: true, paintFirst: 'fill',
    globalCompositeOperation: 'source-over',
    skewX: 0, skewY: 0, rx: 0, ry: 0,
    _customName: 'Background',
  },

  // Riddler ? marks
  ...qmarks,

  // Subtle dark vignette overlay so left text area reads clean
  {
    type: 'rect', version: '5.3.0',
    originX: 'left', originY: 'top',
    left: 0, top: 0, width: 900, height: H,
    fill: { type: 'linear', coords: { x1: 0, y1: 0, x2: 900, y2: 0 },
      colorStops: [{ offset: 0, color: 'rgba(18,16,30,0.92)' }, { offset: 1, color: 'rgba(18,16,30,0)' }],
      offsetX: 0, offsetY: 0, gradientUnits: 'pixels', gradientTransform: null },
    stroke: null, strokeWidth: 0,
    scaleX: 1, scaleY: 1, angle: 0, opacity: 1,
    visible: true, paintFirst: 'fill',
    globalCompositeOperation: 'source-over',
    skewX: 0, skewY: 0, rx: 0, ry: 0,
    _customName: 'Text Fade',
  },

  // Show name — small label
  {
    type: 'textbox', version: '5.3.0',
    originX: 'left', originY: 'top',
    left: 72, top: 90,
    width: 700, height: 44,
    fill: ACCENT,
    stroke: null, strokeWidth: 0,
    scaleX: 1, scaleY: 1, angle: 0, opacity: 1,
    visible: true, paintFirst: 'fill',
    globalCompositeOperation: 'source-over',
    skewX: 0, skewY: 0,
    fontFamily: 'Jost', fontWeight: 'normal', fontSize: 28,
    text: 'MISCONCEPTIONS IN LUTHERIE',
    textAlign: 'left', fontStyle: 'normal',
    lineHeight: 1.16, charSpacing: 200,
    underline: false, overline: false, linethrough: false,
    textBackgroundColor: '', styles: [],
    direction: 'ltr', minWidth: 20, splitByGrapheme: false,
    _customName: 'Show Name',
  },

  // Hub of Acoustics — big headline
  {
    type: 'textbox', version: '5.3.0',
    originX: 'left', originY: 'top',
    left: 68, top: 148,
    width: 820, height: 260,
    fill: BODY,
    stroke: HEADLINE, strokeWidth: 8,
    strokeLineJoin: 'round', strokeLineCap: 'round',
    scaleX: 1, scaleY: 1, angle: 0, opacity: 1,
    visible: true, paintFirst: 'stroke',
    globalCompositeOperation: 'source-over',
    skewX: 0, skewY: 0,
    fontFamily: 'Jost', fontWeight: 'bold', fontSize: 118,
    text: 'HUB OF\nACOUSTICS',
    textAlign: 'left', fontStyle: 'italic',
    lineHeight: 0.95, charSpacing: -20,
    underline: false, overline: false, linethrough: false,
    textBackgroundColor: '', styles: [],
    direction: 'ltr', minWidth: 20, splitByGrapheme: false,
    _customName: 'Guest Name',
  },

  // Divider line
  {
    type: 'rect', version: '5.3.0',
    originX: 'left', originY: 'top',
    left: 72, top: 430,
    width: 420, height: 4,
    fill: HEADLINE,
    stroke: null, strokeWidth: 0,
    scaleX: 1, scaleY: 1, angle: 0, opacity: 0.8,
    visible: true, paintFirst: 'fill',
    globalCompositeOperation: 'source-over',
    skewX: 0, skewY: 0, rx: 2, ry: 2,
    _customName: 'Divider',
  },

  // Topic subhead
  {
    type: 'textbox', version: '5.3.0',
    originX: 'left', originY: 'top',
    left: 72, top: 455,
    width: 740, height: 200,
    fill: QMARK,
    stroke: null, strokeWidth: 0,
    scaleX: 1, scaleY: 1, angle: 0, opacity: 1,
    visible: true, paintFirst: 'fill',
    globalCompositeOperation: 'source-over',
    skewX: 0, skewY: 0,
    fontFamily: 'Jost', fontWeight: 'bold', fontSize: 68,
    text: 'Misconceptions\nIn Lutherie',
    textAlign: 'left', fontStyle: 'italic',
    lineHeight: 1.05, charSpacing: -10,
    underline: false, overline: false, linethrough: false,
    textBackgroundColor: '', styles: [],
    direction: 'ltr', minWidth: 20, splitByGrapheme: false,
    _customName: 'Topic',
  },

  // Date / time
  {
    type: 'textbox', version: '5.3.0',
    originX: 'left', originY: 'top',
    left: 72, top: 940,
    width: 600, height: 60,
    fill: BODY,
    stroke: null, strokeWidth: 0,
    scaleX: 1, scaleY: 1, angle: 0, opacity: 0.9,
    visible: true, paintFirst: 'fill',
    globalCompositeOperation: 'source-over',
    skewX: 0, skewY: 0,
    fontFamily: 'Jost', fontWeight: 'bold', fontSize: 36,
    text: 'Monday, April 22nd  ·  3pm Eastern',
    textAlign: 'left', fontStyle: 'normal',
    lineHeight: 1.16, charSpacing: 0,
    underline: false, overline: false, linethrough: false,
    textBackgroundColor: '', styles: [],
    direction: 'ltr', minWidth: 20, splitByGrapheme: false,
    _customName: 'Date Time',
  },

  // HoA logo — right side
  {
    type: 'image', version: '5.3.0',
    originX: 'center', originY: 'center',
    left: 1460, top: 480,
    width: 350, height: 100,
    fill: 'rgb(0,0,0)', stroke: null, strokeWidth: 0,
    scaleX: 2.8, scaleY: 2.8,
    angle: 0, flipX: false, flipY: false,
    opacity: 0.92, visible: true,
    backgroundColor: '', fillRule: 'nonzero',
    paintFirst: 'fill', globalCompositeOperation: 'source-over',
    skewX: 0, skewY: 0, cropX: 0, cropY: 0,
    lockUniScaling: true,
    src: '/assets/2026-04-22_hoa/hoa_logo_white.svg',
    crossOrigin: 'anonymous', filters: [],
    _customName: 'HoA Logo',
  },

  // Looth Group logo — bottom right, small
  {
    type: 'image', version: '5.3.0',
    originX: 'left', originY: 'top',
    left: 1750, top: 900,
    width: 3200, height: 3200,
    fill: 'rgb(0,0,0)', stroke: null, strokeWidth: 0,
    scaleX: 0.05, scaleY: 0.05,
    angle: 0, flipX: false, flipY: false,
    opacity: 0.85, visible: true,
    backgroundColor: '', fillRule: 'nonzero',
    paintFirst: 'fill', globalCompositeOperation: 'source-over',
    skewX: 0, skewY: 0, cropX: 0, cropY: 0,
    lockUniScaling: true,
    src: '/assets/loothgrouphighrez (1).png',
    crossOrigin: 'anonymous', filters: [],
    _customName: 'Looth Logo',
  },
];

const output = {
  meta: { canvasW: W, canvasH: H, exportVersion: 1 },
  canvas: { version: '5.3.0', objects, background: BG }
};

fs.mkdirSync('output/16x9', { recursive: true });
fs.writeFileSync('output/16x9/hoa_misconceptions_16x9.json', JSON.stringify(output, null, 2));
console.log('Written: output/16x9/hoa_misconceptions_16x9.json');
