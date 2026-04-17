// Generator for the "AI-Assisted Web Design / Ted Bergstrand / May 15" episode.
// Produces editor JSON layouts directly — no live editor required. On load the
// editor's reattachBehaviors() rebuilds banner polygon points from metadata,
// so we only emit the metadata + a minimal placeholder polygon.
//
//   Run:  node generate_ted.js
//   Out:  output/16x9/ted_*_16x9_*.json
//         output/1x1/ted_*_1x1_*.json

const fs = require('fs');
const path = require('path');

const OUT_16X9 = path.join(__dirname, 'output', '16x9');
const OUT_1X1 = path.join(__dirname, 'output', '1x1');
for (const d of [OUT_16X9, OUT_1X1]) fs.mkdirSync(d, { recursive: true });

// --- primitives ---

function image(opts) {
  return {
    type: 'image',
    version: '5.3.0',
    originX: 'left', originY: 'top',
    left: opts.left, top: opts.top,
    width: opts.srcW, height: opts.srcH,
    fill: 'rgb(0,0,0)', stroke: null, strokeWidth: 0,
    strokeDashArray: null, strokeLineCap: 'butt', strokeDashOffset: 0,
    strokeLineJoin: 'miter', strokeUniform: false, strokeMiterLimit: 4,
    scaleX: opts.scale, scaleY: opts.scale,
    angle: 0, flipX: false, flipY: false, opacity: 1,
    shadow: null, visible: true, backgroundColor: '',
    fillRule: 'nonzero', paintFirst: 'fill',
    globalCompositeOperation: 'source-over', skewX: 0, skewY: 0,
    cropX: 0, cropY: 0,
    _customName: opts.name,
    lockUniScaling: true,
    lockMovementX: false, lockMovementY: false,
    lockScalingX: false, lockScalingY: false, lockRotation: false,
    src: opts.src,
    crossOrigin: 'anonymous',
    filters: [],
  };
}

// Minimal polygon — points will be replaced by recenterBannerText on load.
function bannerPolygon(opts) {
  return {
    type: 'polygon', version: '5.3.0',
    originX: 'left', originY: 'top',
    left: -50, top: -20, width: 100, height: 40,
    fill: opts.fill,
    stroke: opts.stroke || null,
    strokeWidth: opts.stroke ? 2 : 0,
    strokeDashArray: null, strokeLineCap: 'butt', strokeDashOffset: 0,
    strokeLineJoin: 'miter', strokeUniform: false, strokeMiterLimit: 4,
    scaleX: 1, scaleY: 1,
    angle: 0, flipX: false, flipY: false, opacity: 1,
    shadow: opts.shadow || null,
    visible: true, backgroundColor: '',
    fillRule: 'nonzero', paintFirst: 'fill',
    globalCompositeOperation: 'source-over', skewX: 0, skewY: 0,
    lockMovementX: false, lockMovementY: false,
    lockScalingX: false, lockScalingY: false, lockRotation: false,
    points: [
      { x: 0, y: 0 }, { x: 100, y: 0 },
      { x: 100, y: 40 }, { x: 0, y: 40 },
    ],
  };
}

function bannerText(opts) {
  return {
    type: 'textbox', version: '5.3.0',
    originX: 'left', originY: 'top',
    left: -40, top: -16, width: 80, height: 32,
    fill: opts.fill,
    stroke: opts.stroke || null,
    strokeWidth: opts.stroke ? 2 : 0,
    strokeDashArray: null, strokeLineCap: 'butt', strokeDashOffset: 0,
    strokeLineJoin: 'miter', strokeUniform: false, strokeMiterLimit: 4,
    scaleX: 1, scaleY: 1,
    angle: 0, flipX: false, flipY: false, opacity: 1,
    shadow: null, visible: true, backgroundColor: '',
    fillRule: 'nonzero', paintFirst: 'stroke',
    globalCompositeOperation: 'source-over', skewX: 0, skewY: 0,
    fontFamily: 'Jost', fontWeight: 'bold', fontSize: opts.fontSize,
    text: opts.text,
    underline: false, overline: false, linethrough: false,
    textAlign: 'center', fontStyle: 'normal', lineHeight: 1.16,
    textBackgroundColor: '', charSpacing: 0, styles: [],
    direction: 'ltr', path: null, pathStartOffset: 0,
    pathSide: 'left', pathAlign: 'baseline', minWidth: 20,
    splitByGrapheme: false,
    lockMovementX: false, lockMovementY: false,
    lockScalingX: false, lockScalingY: false, lockRotation: false,
  };
}

// Standalone textbox (not inside a banner group). Supports multi-line via \n.
function textbox(opts) {
  return {
    type: 'textbox', version: '5.3.0',
    originX: 'left', originY: 'top',
    left: opts.left, top: opts.top,
    width: opts.width || 600,
    height: opts.height || 100,
    fill: opts.fill,
    stroke: opts.stroke || null,
    strokeWidth: opts.strokeWidth ?? (opts.stroke ? 3 : 0),
    strokeDashArray: null, strokeLineCap: 'butt', strokeDashOffset: 0,
    strokeLineJoin: 'miter', strokeUniform: false, strokeMiterLimit: 4,
    scaleX: 1, scaleY: 1,
    angle: 0, flipX: false, flipY: false,
    opacity: opts.opacity ?? 1,
    shadow: opts.shadow || null,
    visible: true, backgroundColor: '',
    fillRule: 'nonzero',
    paintFirst: opts.paintFirst || 'stroke',
    globalCompositeOperation: 'source-over', skewX: 0, skewY: 0,
    fontFamily: opts.fontFamily || 'Jost',
    fontWeight: opts.fontWeight || 'bold',
    fontSize: opts.fontSize,
    text: opts.text,
    underline: false, overline: false, linethrough: false,
    textAlign: opts.textAlign || 'left',
    fontStyle: 'normal', lineHeight: opts.lineHeight ?? 0.95,
    textBackgroundColor: '', charSpacing: opts.charSpacing || 0,
    styles: [],
    direction: 'ltr', path: null, pathStartOffset: 0,
    pathSide: 'left', pathAlign: 'baseline', minWidth: 20,
    splitByGrapheme: false,
    _customName: opts.name,
    lockMovementX: false, lockMovementY: false,
    lockScalingX: false, lockScalingY: false, lockRotation: false,
  };
}

// Plain rect (used for bottom bars, color blocks, dividers).
function rect(opts) {
  return {
    type: 'rect', version: '5.3.0',
    originX: 'left', originY: 'top',
    left: opts.left, top: opts.top,
    width: opts.width, height: opts.height,
    fill: opts.fill,
    stroke: opts.stroke || null,
    strokeWidth: opts.stroke ? (opts.strokeWidth || 2) : 0,
    strokeDashArray: null, strokeLineCap: 'butt', strokeDashOffset: 0,
    strokeLineJoin: 'miter', strokeUniform: false, strokeMiterLimit: 4,
    scaleX: 1, scaleY: 1,
    angle: 0, flipX: false, flipY: false,
    opacity: opts.opacity ?? 1,
    shadow: null, visible: true, backgroundColor: '',
    fillRule: 'nonzero', paintFirst: 'fill',
    globalCompositeOperation: 'source-over', skewX: 0, skewY: 0,
    rx: opts.rx || 0, ry: opts.ry || 0,
    _customName: opts.name,
    lockMovementX: false, lockMovementY: false,
    lockScalingX: false, lockScalingY: false, lockRotation: false,
  };
}

function bannerGroup(opts) {
  return {
    type: 'group', version: '5.3.0',
    originX: 'left', originY: 'top',
    left: opts.left, top: opts.top,
    width: 100, height: 40,
    fill: 'rgb(0,0,0)', stroke: null, strokeWidth: 0,
    strokeDashArray: null, strokeLineCap: 'butt', strokeDashOffset: 0,
    strokeLineJoin: 'miter', strokeUniform: false, strokeMiterLimit: 4,
    scaleX: 1, scaleY: 1,
    angle: 0, flipX: false, flipY: false, opacity: 1,
    shadow: null, visible: true, backgroundColor: '',
    fillRule: 'nonzero', paintFirst: 'fill',
    globalCompositeOperation: 'source-over', skewX: 0, skewY: 0,
    _customName: opts.name,
    lockUniScaling: true,
    lockMovementX: false, lockMovementY: false,
    lockScalingX: false, lockScalingY: false, lockRotation: false,
    _bannerLeftEnd: opts.lEnd || 'chevron',
    _bannerRightEnd: opts.rEnd || 'arrow',
    _bannerNotchL: opts.nL || 20,
    _bannerNotchR: opts.nR || 20,
    _isBannerGroup: true,
    _padL: opts.padL ?? 14, _padR: opts.padR ?? 14,
    _padT: opts.padT ?? 8, _padB: opts.padB ?? 8,
    objects: [
      bannerPolygon({
        fill: opts.fill,
        stroke: opts.bstroke,
        shadow: opts.shadow === false ? null : {
          color: 'rgba(0,0,0,0.4)', blur: 8,
          offsetX: 3, offsetY: 3,
          affectStroke: false, nonScaling: false,
        },
      }),
      bannerText({
        text: opts.text,
        fontSize: opts.fontSize,
        fill: opts.tcol,
        stroke: opts.tstroke || '#2b2318',
      }),
    ],
  };
}

// --- palettes ---

const FILL_PANEL = 'rgba(43,35,24,0.85)';  // dark brown, 85%

const VARIANTS = {
  A_tech_dark: {
    nameColor: '#ECB351',          // gold
    nameBorder: '#ECB351',
    topicColor: '#FAF6EE',         // offwhite
    topicBorder: '#FE6B4F',        // coral accent
    dateColor: '#FAF6EE',
    dateBorder: '#87986A',         // sage accent
    panelFill: FILL_PANEL,
  },
  B_sage_pop: {
    nameColor: '#ECB351',
    nameBorder: '#ECB351',
    topicColor: '#FAF6EE',
    topicBorder: '#ECB351',
    dateColor: '#FAF6EE',
    dateBorder: '#ECB351',
    panelFill: 'rgba(135,152,106,0.88)',   // sage #87986A
  },
  C_coral_punch: {
    nameColor: '#FAF6EE',
    nameBorder: '#FAF6EE',
    topicColor: '#2B2318',
    topicBorder: '#2B2318',
    dateColor: '#FAF6EE',
    dateBorder: '#2B2318',
    panelFill: 'rgba(254,107,79,0.92)',    // coral #FE6B4F
  },
};

// --- layout builders ---

function build16x9(variantKey) {
  const v = VARIANTS[variantKey];
  const W = 1280, H = 720;
  const objs = [];

  // BG — matrix rain, full bleed
  objs.push(image({
    name: 'Matrix BG',
    src: '/assets/episode/matrix_rain_1920x1080.png',
    srcW: 1920, srcH: 1080,
    left: 0, top: 0,
    scale: W / 1920,
  }));

  // Ted cutout — right side, ~50% width, anchored bottom
  const tedNatW = 1024, tedNatH = 1024;
  const tedScale = Math.min((W * 0.50) / tedNatW, (H * 0.90) / tedNatH);
  objs.push(image({
    name: 'Ted Android',
    src: '/assets/episode/ted_bergstrand_android_cutout.png',
    srcW: tedNatW, srcH: tedNatH,
    scale: tedScale,
    left: W - tedNatW * tedScale - 20,
    top: H - tedNatH * tedScale - 10,
  }));

  // Looth logo — bottom-left, ~130px tall
  const logoNatW = 3200, logoNatH = 3200;
  const logoTargetH = 130;
  const logoScale = logoTargetH / logoNatH;
  objs.push(image({
    name: 'Looth Logo',
    src: '/loothgrouphighrez%20(1).png',
    srcW: logoNatW, srcH: logoNatH,
    scale: logoScale,
    left: 16, top: H - logoTargetH - 12,
  }));

  // Banner staircase — name / topic / date
  objs.push(bannerGroup({
    name: 'Name',
    text: 'TED BERGSTRAND',
    fontSize: 72,
    tcol: v.nameColor, tstroke: '#2b2318',
    fill: v.panelFill, bstroke: v.nameBorder,
    padL: 18, padR: 18, padT: 10, padB: 10,
    left: 40, top: 380,
    lEnd: 'chevron', rEnd: 'arrow',
  }));
  objs.push(bannerGroup({
    name: 'Topic',
    text: 'AI-ASSISTED WEB DESIGN',
    fontSize: 48,
    tcol: v.topicColor, tstroke: '#2b2318',
    fill: v.panelFill, bstroke: v.topicBorder,
    padL: 14, padR: 14, padT: 6, padB: 6,
    left: 100, top: 485,
    lEnd: 'chevron', rEnd: 'arrow',
  }));
  objs.push(bannerGroup({
    name: 'Date',
    text: 'MAY 15 · 3 PM ET',
    fontSize: 32,
    tcol: v.dateColor, tstroke: '#2b2318',
    fill: v.panelFill, bstroke: v.dateBorder,
    padL: 12, padR: 12, padT: 4, padB: 4,
    left: 160, top: 568,
    lEnd: 'flat', rEnd: 'flat',
  }));

  return { meta: { canvasW: W, canvasH: H, exportVersion: 1 }, canvas: {
    version: '5.3.0',
    objects: objs,
    background: '#2B2318',
  } };
}

function build1x1(variantKey) {
  const v = VARIANTS[variantKey];
  const W = 1080, H = 1080;
  const objs = [];

  // BG — matrix rain square
  objs.push(image({
    name: 'Matrix BG',
    src: '/assets/episode/matrix_rain_1080x1080.png',
    srcW: 1080, srcH: 1080,
    left: 0, top: 0,
    scale: 1,
  }));

  // Ted cutout — centered horizontally, top ~65%
  const tedNatW = 1024, tedNatH = 1024;
  const tedScale = Math.min((W * 0.80) / tedNatW, (H * 0.75) / tedNatH);
  objs.push(image({
    name: 'Ted Android',
    src: '/assets/episode/ted_bergstrand_android_cutout.png',
    srcW: tedNatW, srcH: tedNatH,
    scale: tedScale,
    left: (W - tedNatW * tedScale) / 2,
    top: 20,
  }));

  // Looth logo — bottom-right corner, smaller
  const logoTargetH = 140;
  const logoScale = logoTargetH / 3200;
  objs.push(image({
    name: 'Looth Logo',
    src: '/loothgrouphighrez%20(1).png',
    srcW: 3200, srcH: 3200,
    scale: logoScale,
    left: W - logoTargetH - 18,
    top: H - logoTargetH - 14,
  }));

  // Banners — stacked bottom
  objs.push(bannerGroup({
    name: 'Name',
    text: 'TED BERGSTRAND',
    fontSize: 64,
    tcol: v.nameColor, tstroke: '#2b2318',
    fill: v.panelFill, bstroke: v.nameBorder,
    padL: 16, padR: 16, padT: 10, padB: 10,
    left: 40, top: 800,
    lEnd: 'chevron', rEnd: 'arrow',
  }));
  objs.push(bannerGroup({
    name: 'Topic',
    text: 'AI-ASSISTED WEB DESIGN',
    fontSize: 42,
    tcol: v.topicColor, tstroke: '#2b2318',
    fill: v.panelFill, bstroke: v.topicBorder,
    padL: 14, padR: 14, padT: 6, padB: 6,
    left: 80, top: 895,
    lEnd: 'chevron', rEnd: 'arrow',
  }));
  objs.push(bannerGroup({
    name: 'Date',
    text: 'MAY 15 · 3 PM ET',
    fontSize: 30,
    tcol: v.dateColor, tstroke: '#2b2318',
    fill: v.panelFill, bstroke: v.dateBorder,
    padL: 12, padR: 12, padT: 4, padB: 4,
    left: 120, top: 980,
    lEnd: 'flat', rEnd: 'flat',
  }));

  return { meta: { canvasW: W, canvasH: H, exportVersion: 1 }, canvas: {
    version: '5.3.0',
    objects: objs,
    background: '#2B2318',
  } };
}

// --- LAYOUT VARIANT: D_masthead (16:9) ---
// Different SHAPE from A/B/C, not just different colors:
//   - Topic-dominant (not name-dominant): huge stacked multi-line masthead
//     "AI-ASSISTED / WEB DESIGN" takes the upper-left, reads first
//   - Ted bottom-right anchored, larger (his head touches the subhead baseline)
//   - Name + date as a single horizontal ribbon ACROSS the bottom edge
//     (instead of a staircase)
//   - Looth logo top-right corner, smaller
// Palette rides on top: matrix-green headline, coral stroke, white ribbon text.

function buildD_masthead_16x9() {
  const W = 1280, H = 720;
  const objs = [];

  // BG — matrix rain full bleed
  objs.push(image({
    name: 'Matrix BG',
    src: '/assets/episode/matrix_rain_1920x1080.png',
    srcW: 1920, srcH: 1080,
    left: 0, top: 0,
    scale: W / 1920,
  }));

  // Stacked masthead — two lines, LEFT-aligned, matrix-green with coral stroke.
  // Placed upper-left as primary read element. Line height tight so the block
  // reads as one headline, not two lines of equal weight.
  objs.push(textbox({
    name: 'Masthead',
    text: 'AI-ASSISTED\nWEB DESIGN',
    left: 36, top: 60,
    width: 780,
    fontSize: 128,
    fontWeight: '900',
    fill: '#51a457',       // matrix green
    stroke: '#FE6B4F',      // coral
    strokeWidth: 4,
    paintFirst: 'stroke',
    textAlign: 'left',
    lineHeight: 0.92,
    charSpacing: -20,       // tighten horizontally so letters hug
  }));

  // Ted cutout — bottom-right anchored, larger
  const tedNatW = 1024, tedNatH = 1024;
  const tedScale = 0.72;
  objs.push(image({
    name: 'Ted Android',
    src: '/assets/episode/ted_bergstrand_android_cutout.png',
    srcW: tedNatW, srcH: tedNatH,
    scale: tedScale,
    left: W - tedNatW * tedScale + 40,
    top: H - tedNatH * tedScale + 40,
  }));

  // Bottom ribbon: combines name + date in one horizontal strip.
  // Uses a dark semi-transparent rect as the bed so the ribbon feels like a
  // "status bar" across the frame rather than a banner chip.
  const ribbonH = 56;
  const ribbonTop = H - ribbonH - 20;
  objs.push(rect({
    name: 'Ribbon Bed',
    left: 0, top: ribbonTop,
    width: W, height: ribbonH,
    fill: 'rgba(43,35,24,0.85)',
  }));
  // Thin accent line above the ribbon to divide from content
  objs.push(rect({
    name: 'Ribbon Rule',
    left: 0, top: ribbonTop - 3,
    width: W, height: 3,
    fill: '#87986A',        // sage accent
  }));

  // Name, large offwhite, left side of ribbon
  objs.push(textbox({
    name: 'Name',
    text: 'TED BERGSTRAND',
    left: 36, top: ribbonTop + 10,
    width: 700,
    fontSize: 34,
    fill: '#FAF6EE',
    stroke: null,
    textAlign: 'left',
    lineHeight: 1,
  }));
  // Date, smaller, right side of ribbon
  objs.push(textbox({
    name: 'Date',
    text: 'MAY 15  ·  3 PM ET',
    left: W - 340, top: ribbonTop + 13,
    width: 300,
    fontSize: 28,
    fill: '#ECB351',        // gold accent
    stroke: null,
    textAlign: 'right',
    lineHeight: 1,
  }));

  // Looth logo — top-right corner, modest
  const logoTargetH = 110;
  const logoScale = logoTargetH / 3200;
  objs.push(image({
    name: 'Looth Logo',
    src: '/loothgrouphighrez%20(1).png',
    srcW: 3200, srcH: 3200,
    scale: logoScale,
    left: W - logoTargetH - 20,
    top: 20,
  }));

  return { meta: { canvasW: W, canvasH: H, exportVersion: 1 }, canvas: {
    version: '5.3.0',
    objects: objs,
    background: '#2B2318',
  } };
}

// --- run ---

const BASE = 'ted_bergstrand_ai_web_design';
for (const variant of Object.keys(VARIANTS)) {
  const p16 = path.join(OUT_16X9, `${BASE}_16x9_${variant}.json`);
  const p11 = path.join(OUT_1X1, `${BASE}_1x1_${variant}.json`);
  fs.writeFileSync(p16, JSON.stringify(build16x9(variant), null, 2));
  fs.writeFileSync(p11, JSON.stringify(build1x1(variant), null, 2));
  console.log(`wrote ${p16}`);
  console.log(`wrote ${p11}`);
}
{
  const pD = path.join(OUT_16X9, `${BASE}_16x9_D_masthead.json`);
  fs.writeFileSync(pD, JSON.stringify(buildD_masthead_16x9(), null, 2));
  console.log(`wrote ${pD}`);
}
