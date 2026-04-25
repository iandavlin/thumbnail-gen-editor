// Generator for the "Luthier Interview / Ryan Thorell / June 25" episode.
// Single 16:9 layout — instrument hero (sunburst archtop), framed border,
// banner staircase for name/topic/date.
//
//   Run:  node generate_thorell.js
//   Out:  output/16x9/ryan_thorell_luthier_interview_16x9.json
//
// Image expected at: assets/episode/ryan_thorell_guitar.jpg

const fs = require('fs');
const path = require('path');

const OUT_16X9 = path.join(__dirname, 'output', '16x9');
fs.mkdirSync(OUT_16X9, { recursive: true });

// --- primitives (mirrors generate_ted.js) ---

function image(opts) {
  return {
    type: 'image', version: '5.3.0',
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

// --- layout ---
// Photo is the guitar — warm sunburst on cool teal floor. Per SKILL.md
// warm-vs-cool guidance, sage and offwhite play nicely against this; gold
// lives in the photo so it's reserved for the name accent only.

function build16x9() {
  const W = 1280, H = 720;
  const FRAME_INSET = 22;       // gap between frame and canvas edge
  const FRAME_STROKE = 6;
  const FRAME_COLOR = '#A8BE8B'; // GREEN_MID — sage frame

  const objs = [];

  // Outer canvas background (shows in the inset gap around the frame)
  // No need to add — canvas.background handles it.

  // Photo — fills inside the frame, full bleed within. Guitar press shots
  // are typically ~16:10 / 3:2; we set srcW/srcH to a reasonable guess and
  // fit-cover into the frame interior. Editor's W/H controls let you nudge.
  const innerLeft = FRAME_INSET + FRAME_STROKE / 2;
  const innerTop  = FRAME_INSET + FRAME_STROKE / 2;
  const innerW    = W - 2 * innerLeft;
  const innerH    = H - 2 * innerTop;

  // Actual source dims: 1600x905. Cover-fit into the inner frame.
  const photoNatW = 1600, photoNatH = 905;
  const photoScale = Math.max(innerW / photoNatW, innerH / photoNatH);
  const photoW = photoNatW * photoScale;
  const photoH = photoNatH * photoScale;
  objs.push(image({
    name: 'Guitar',
    src: '/assets/2026-06-25_thorell/ryan_thorell_guitar.jpg',
    srcW: photoNatW, srcH: photoNatH,
    scale: photoScale,
    left: innerLeft + (innerW - photoW) / 2,
    top:  innerTop  + (innerH - photoH) / 2,
  }));

  // Frame — editor-native frame object. reattachBehaviors() reattaches
  // frameRender (custom _render draws the ring from fill + _frameThickness)
  // and applyFramePadding recomputes dims from _framePad*. We emit a rect
  // with _isFrame metadata.
  objs.push({
    type: 'rect', version: '5.3.0',
    originX: 'left', originY: 'top',
    left: FRAME_INSET, top: FRAME_INSET,
    width: W - 2 * FRAME_INSET,
    height: H - 2 * FRAME_INSET,
    fill: FRAME_COLOR,
    stroke: null, strokeWidth: 0,
    strokeDashArray: null, strokeLineCap: 'butt', strokeDashOffset: 0,
    strokeLineJoin: 'miter', strokeUniform: false, strokeMiterLimit: 4,
    scaleX: 1, scaleY: 1,
    angle: 0, flipX: false, flipY: false, opacity: 1,
    shadow: null, visible: true, backgroundColor: '',
    fillRule: 'nonzero', paintFirst: 'fill',
    globalCompositeOperation: 'source-over', skewX: 0, skewY: 0,
    rx: 0, ry: 0,
    _customName: 'Frame',
    _isFrame: true,
    _frameThickness: FRAME_STROKE,
    _frameRadius: 12,
    _framePadT: FRAME_INSET, _framePadR: FRAME_INSET,
    _framePadB: FRAME_INSET, _framePadL: FRAME_INSET,
    _frameOffset: FRAME_INSET,
    selectable: false, evented: false,
    lockMovementX: true, lockMovementY: true,
    lockScalingX: true, lockScalingY: true, lockRotation: true,
  });

  // Looth logo — bottom-left, inside the frame
  const logoTargetH = 120;
  const logoScale = logoTargetH / 3200;
  objs.push(image({
    name: 'Looth Logo',
    src: '/loothgrouphighrez%20(1).png',
    srcW: 3200, srcH: 3200,
    scale: logoScale,
    left: FRAME_INSET + 14,
    top:  H - FRAME_INSET - logoTargetH - 14,
  }));

  // Banner staircase — name / role / date.
  // Photo is warm/golden so we let the dark panel + sage strokes handle
  // contrast; gold reserved for the name banner.
  const PANEL = 'rgba(43,35,24,0.86)';

  objs.push(bannerGroup({
    name: 'Name',
    text: 'RYAN THORELL',
    fontSize: 76,
    tcol: '#ECB351', tstroke: '#2b2318',
    fill: PANEL, bstroke: '#ECB351',     // gold border on name
    padL: 18, padR: 18, padT: 10, padB: 10,
    left: 60, top: 380,
    lEnd: 'chevron', rEnd: 'arrow',
  }));

  objs.push(bannerGroup({
    name: 'Topic',
    text: 'LUTHIER INTERVIEW',
    fontSize: 48,
    tcol: '#FAF6EE', tstroke: '#2b2318',
    fill: PANEL, bstroke: '#A8BE8B',     // sage border, matches frame
    padL: 14, padR: 14, padT: 6, padB: 6,
    left: 120, top: 482,
    lEnd: 'chevron', rEnd: 'arrow',
  }));

  objs.push(bannerGroup({
    name: 'Date',
    text: 'JUN 25 · 3 PM ET',
    fontSize: 32,
    tcol: '#FAF6EE', tstroke: '#2b2318',
    fill: PANEL, bstroke: '#A8BE8B',
    padL: 12, padR: 12, padT: 4, padB: 4,
    left: 180, top: 562,
    lEnd: 'flat', rEnd: 'flat',
  }));

  return { meta: { canvasW: W, canvasH: H, exportVersion: 1 }, canvas: {
    version: '5.3.0',
    objects: objs,
    background: '#2B2318',
  } };
}

// --- run ---

const outPath = path.join(OUT_16X9, 'ryan_thorell_luthier_interview_16x9.json');
fs.writeFileSync(outPath, JSON.stringify(build16x9(), null, 2));
console.log(`wrote ${outPath}`);
