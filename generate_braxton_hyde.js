// Generator for "Loothing For Dollars: The Multiple-Looth Shop" — guests
// Braxton & Hyde of Philadelphia Fretworks. Single 16:9 layout to start.
// Pill-shaped (rounded-end) banner staircase per user's request.
//
//   Run:  node generate_braxton_hyde.js
//   Out:  output/16x9/braxton_hyde_loothing_for_dollars_16x9.json
//
// Image expected at: assets/2026-04-19_braxton_hyde/philly_fretworks_shop.jpg

const fs = require('fs');
const path = require('path');

const OUT_16X9 = path.join(__dirname, 'output', '16x9');
fs.mkdirSync(OUT_16X9, { recursive: true });

// --- primitives (mirrors generate_thorell.js) ---

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

// Pill banner — both ends round. Notch values are ignored for round ends
// (the inset is computed from h/2), but we still set them for completeness.
function pillBanner(opts) {
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
    _bannerLeftEnd: 'round',
    _bannerRightEnd: 'round',
    _bannerNotchL: 20,
    _bannerNotchR: 20,
    _isBannerGroup: true,
    _padL: opts.padL ?? 28, _padR: opts.padR ?? 28,
    _padT: opts.padT ?? 10, _padB: opts.padB ?? 10,
    objects: [
      bannerPolygon({
        fill: opts.fill,
        stroke: opts.bstroke,
        shadow: opts.shadow === false ? null : {
          color: 'rgba(0,0,0,0.45)', blur: 10,
          offsetX: 3, offsetY: 4,
          affectStroke: false, nonScaling: false,
        },
      }),
      bannerText({
        text: opts.text,
        fontSize: opts.fontSize,
        fill: opts.tcol,
        stroke: opts.tstroke || '#1B1812',
      }),
    ],
  };
}

// --- layout ---
// Photo is the B&W Philadelphia Fretworks workshop with Braxton & Hyde
// (and a third workshopmate). B&W photo means we lean hard on the brand
// palette for color: gold name, sage topic, offwhite secondary lines.

function build16x9() {
  const W = 1280, H = 720;
  const objs = [];

  // Photo — full bleed across the canvas. Source: 1199x599 webp.
  const photoNatW = 1199, photoNatH = 599;
  const photoScale = Math.max(W / photoNatW, H / photoNatH);
  const photoW = photoNatW * photoScale;
  const photoH = photoNatH * photoScale;
  objs.push(image({
    name: 'Workshop',
    src: '/assets/2026-04-19_braxton_hyde/philly_fretworks_shop.webp',
    srcW: photoNatW, srcH: photoNatH,
    scale: photoScale,
    left: (W - photoW) / 2,
    top: (H - photoH) / 2,
  }));

  // Soft dark vignette on bottom-left so the banner staircase reads cleanly
  // over the busy workshop background. Rect with alpha — Coffee #1B1812 @ 55%.
  objs.push({
    type: 'rect', version: '5.3.0',
    originX: 'left', originY: 'top',
    left: 0, top: 280, width: 880, height: 440,
    fill: 'rgba(27,24,18,0.55)',
    stroke: null, strokeWidth: 0,
    strokeDashArray: null, strokeLineCap: 'butt', strokeDashOffset: 0,
    strokeLineJoin: 'miter', strokeUniform: false, strokeMiterLimit: 4,
    scaleX: 1, scaleY: 1,
    angle: 0, flipX: false, flipY: false, opacity: 1,
    shadow: null, visible: true, backgroundColor: '',
    fillRule: 'nonzero', paintFirst: 'fill',
    globalCompositeOperation: 'source-over', skewX: 0, skewY: 0,
    rx: 0, ry: 0,
    _customName: 'Vignette',
  });

  // Looth logo — top-right, small.
  const logoH = 110;
  const logoScale = logoH / 3200;
  objs.push(image({
    name: 'Looth Logo',
    src: '/loothgrouphighrez%20(1).png',
    srcW: 3200, srcH: 3200,
    scale: logoScale,
    left: W - logoH - 28,
    top: 24,
  }));

  // Banner staircase. Show name biggest, then topic, then guests, then date.
  // Coral fills the show name (it's the headline brand of the episode);
  // gold for topic; sage for guests; dark pill with offwhite for the date.
  const PANEL_DARK = 'rgba(27,24,18,0.92)';

  objs.push(pillBanner({
    name: 'Show Name',
    text: 'LOOTHING FOR DOLLARS',
    fontSize: 64,
    tcol: '#F5F0E4', tstroke: '#1B1812',
    fill: '#9E5131', bstroke: '#F5F0E4',
    padL: 36, padR: 36, padT: 10, padB: 10,
    left: 60, top: 320,
  }));

  objs.push(pillBanner({
    name: 'Topic',
    text: 'THE MULTIPLE-LOOTH SHOP',
    fontSize: 44,
    tcol: '#1B1812', tstroke: null,
    fill: '#C9A155', bstroke: '#1B1812',
    padL: 32, padR: 32, padT: 8, padB: 8,
    left: 110, top: 420,
  }));

  objs.push(pillBanner({
    name: 'Guests',
    text: 'BRAXTON & HYDE',
    fontSize: 38,
    tcol: '#1B1812', tstroke: null,
    fill: '#A7B597', bstroke: '#1B1812',
    padL: 30, padR: 30, padT: 6, padB: 6,
    left: 160, top: 502,
  }));

  objs.push(pillBanner({
    name: 'Org',
    text: 'PHILADELPHIA FRETWORKS',
    fontSize: 28,
    tcol: '#F5F0E4', tstroke: '#1B1812',
    fill: PANEL_DARK, bstroke: '#A7B597',
    padL: 26, padR: 26, padT: 5, padB: 5,
    left: 200, top: 568,
  }));

  objs.push(pillBanner({
    name: 'Date',
    text: 'SUN APR 19  ·  3 PM ET',
    fontSize: 26,
    tcol: '#C9A155', tstroke: '#1B1812',
    fill: PANEL_DARK, bstroke: '#C9A155',
    padL: 24, padR: 24, padT: 4, padB: 4,
    left: 240, top: 626,
  }));

  return {
    meta: { canvasW: W, canvasH: H, exportVersion: 1 },
    canvas: {
      version: '5.3.0',
      objects: objs,
      background: '#1B1812',
    },
  };
}

// --- run ---

const outPath = path.join(OUT_16X9, 'braxton_hyde_loothing_for_dollars_16x9.json');
fs.writeFileSync(outPath, JSON.stringify(build16x9(), null, 2));
console.log(`wrote ${outPath}`);
