const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { exec } = require("child_process");

// --- CONFIG ---
const GUEST = "Seth Lee Jones";
const TOPIC = "PALM BENDERS";
const DATE_LINE = "JUNE 5  \u2022  3 PM EASTERN";
const PHOTO_PATH = path.join(__dirname, "assets", "episode", "seth_lee_jones.webp");
const LOGO_PATH = path.join(__dirname, "assets", "loothgrouphighrez (1).png");
const OUTPUT_DIR = path.join(__dirname, "output");
const OUTPUT_16x9 = path.join(OUTPUT_DIR, "16x9");
const OUTPUT_1x1 = path.join(OUTPUT_DIR, "1x1");
const TEMP_DIR = path.join(__dirname, "temp");

// --- PALETTE (no # prefix for pptxgenjs) ---
const C = {
  GOLD: "ECB351",
  GOLD_LIGHT: "F1DE83",
  GREEN_PALE: "D4E0B8",
  GREEN_LIGHT: "C2D5AA",
  GREEN_MID: "A8BE8B",
  GREEN_SAGE: "97A97C",
  GREEN_DARK: "87986A",
  CORAL: "FE6B4F",
  DARK: "2B2318",
  OFFWHITE: "FAF6EE",
  WHITE: "FFFFFF",
  BLACK50: "000000", // for shadow overlays
};

// --- IMAGE PROCESSING ---
async function preparePhotos() {
  const meta = await sharp(PHOTO_PATH).metadata();
  const w = meta.width;
  const h = meta.height;
  console.log(`  Original photo: ${w}x${h}`);

  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  // Full landscape — for cinematic/full-bleed layouts
  const fullPath = path.join(TEMP_DIR, "photo_full.png");
  await sharp(PHOTO_PATH)
    .resize(1920, null, { fit: "inside" })
    .png()
    .toFile(fullPath);

  // Portrait-ish crop biased center-left (Seth is center-left in frame)
  // For split layouts that need a taller crop
  const portraitW = Math.floor(h * 0.85);
  const portraitLeft = Math.max(0, Math.floor((w - portraitW) * 0.35));
  const actualW = Math.min(portraitW, w - portraitLeft);
  const portraitPath = path.join(TEMP_DIR, "photo_portrait.png");
  await sharp(PHOTO_PATH)
    .extract({ left: portraitLeft, top: 0, width: actualW, height: h })
    .resize(900, 1080, { fit: "cover" })
    .png()
    .toFile(portraitPath);

  // Square crop centered on Seth
  const side = Math.min(w, h);
  const sqLeft = Math.max(0, Math.floor((w - side) * 0.4));
  const squarePath = path.join(TEMP_DIR, "photo_square.png");
  await sharp(PHOTO_PATH)
    .extract({ left: sqLeft, top: 0, width: Math.min(side, w - sqLeft), height: h })
    .resize(1200, 1200, { fit: "cover" })
    .png()
    .toFile(squarePath);

  // Wide cinematic band — cropped tighter vertically for the banded layout
  const bandH = Math.floor(h * 0.75);
  const bandTop = Math.floor(h * 0.05);
  const bandPath = path.join(TEMP_DIR, "photo_band.png");
  await sharp(PHOTO_PATH)
    .extract({ left: 0, top: bandTop, width: w, height: bandH })
    .resize(1920, null, { fit: "inside" })
    .png()
    .toFile(bandPath);

  return { fullPath, portraitPath, squarePath, bandPath };
}

async function prepareLogo() {
  const logoPath = path.join(TEMP_DIR, "logo.png");
  await sharp(LOGO_PATH)
    .resize(400, 400, { fit: "inside" })
    .png()
    .toFile(logoPath);
  return logoPath;
}

// =====================================================
// 16:9 LAYOUTS (12.8" x 7.2")
// =====================================================

// --- LAYOUT A: Full Bleed Cinematic ---
// Photo fills entire slide, dark gradient bottom, ribbon over gradient
function buildA_16x9(pres, slide, photos, logoPath) {
  const W = 12.8, H = 7.2;
  slide.background = { color: C.DARK };

  // Photo full bleed
  slide.addImage({
    path: photos.fullPath,
    x: 0, y: 0, w: W, h: H,
    sizing: { type: "cover", w: W, h: H },
  });

  // Dark gradient overlay — bottom 50%
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: H * 0.45, w: W, h: H * 0.55,
    fill: { color: C.DARK, transparency: 15 },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: H * 0.6, w: W, h: H * 0.4,
    fill: { color: C.DARK, transparency: 5 },
  });

  // Topic title — large, over gradient
  slide.addText(TOPIC, {
    x: 0.6, y: H - 3.0, w: W - 1.2, h: 1.0,
    fontSize: 52, fontFace: "Jost", bold: true,
    color: C.GOLD, align: "left", valign: "bottom",
  });

  // Ribbon banner behind guest name
  const ribbonY = H - 1.85;
  const ribbonH = 0.75;
  const ribbonW = 7.5;
  const notch = 0.3;
  // Ribbon shape (notched ends)
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: ribbonY, w: ribbonW, h: ribbonH,
    fill: { color: C.CORAL },
    shadow: { type: "outer", blur: 6, offset: 3, angle: 135, color: "000000", opacity: 0.4 },
  });
  // Notch (right end) — small dark triangle to fake the notch
  slide.addShape(pres.shapes.RECTANGLE, {
    x: ribbonW - notch, y: ribbonY, w: notch, h: ribbonH / 2,
    fill: { color: C.DARK, transparency: 70 },
    rotate: 0,
  });

  // Guest name on ribbon
  slide.addText(GUEST, {
    x: 0.6, y: ribbonY, w: ribbonW - 1.2, h: ribbonH,
    fontSize: 36, fontFace: "Jost", bold: true,
    color: C.WHITE, align: "left", valign: "middle",
  });

  // Date line
  slide.addText(DATE_LINE, {
    x: 0.6, y: H - 0.9, w: W - 1.2, h: 0.6,
    fontSize: 22, fontFace: "Jost", bold: true,
    color: C.OFFWHITE, align: "left", valign: "middle",
  });

  // Logo — top right
  const logoSize = 1.1;
  slide.addImage({
    path: logoPath,
    x: W - logoSize - 0.3, y: 0.3,
    w: logoSize, h: logoSize,
    sizing: { type: "contain", w: logoSize, h: logoSize },
  });
}

// --- LAYOUT B: Asymmetric Split ---
// Photo left ~58% with angled edge, color panel right, ribbon spans the divide
function buildB_16x9(pres, slide, photos, logoPath) {
  const W = 12.8, H = 7.2;
  const photoW = 7.4;

  // Right panel background
  slide.background = { color: C.GREEN_DARK };

  // Photo left side
  slide.addImage({
    path: photos.fullPath,
    x: 0, y: 0, w: photoW, h: H,
    sizing: { type: "cover", w: photoW, h: H },
  });

  // Angled overlay to create diagonal divide
  // Dark strip that blends the edge
  slide.addShape(pres.shapes.RECTANGLE, {
    x: photoW - 1.0, y: 0, w: 1.5, h: H,
    fill: { color: C.GREEN_DARK, transparency: 40 },
  });

  // Topic title — right panel, top
  const textX = photoW + 0.3;
  const textW = W - textX - 0.4;

  slide.addText(TOPIC, {
    x: textX, y: 0.5, w: textW, h: 1.5,
    fontSize: 48, fontFace: "Jost", bold: true,
    color: C.GOLD, align: "left", valign: "top",
  });

  // Ribbon — spans across the divide
  const ribbonY = 3.0;
  const ribbonH = 0.85;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: photoW - 2.0, y: ribbonY, w: W - photoW + 2.5, h: ribbonH,
    fill: { color: C.DARK },
    shadow: { type: "outer", blur: 8, offset: 3, angle: 135, color: "000000", opacity: 0.5 },
  });
  // Left notch accent
  slide.addShape(pres.shapes.RECTANGLE, {
    x: photoW - 2.0, y: ribbonY, w: 0.15, h: ribbonH,
    fill: { color: C.GOLD },
  });

  // Guest name on ribbon
  slide.addText(GUEST, {
    x: photoW - 1.6, y: ribbonY, w: W - photoW + 2.0, h: ribbonH,
    fontSize: 38, fontFace: "Jost", bold: true,
    color: C.GOLD, align: "left", valign: "middle",
  });

  // Date line — right panel, below ribbon
  slide.addText(DATE_LINE, {
    x: textX, y: 4.2, w: textW, h: 0.7,
    fontSize: 22, fontFace: "Jost", bold: true,
    color: C.OFFWHITE, align: "left", valign: "middle",
  });

  // Logo — bottom left on photo
  const logoSize = 1.2;
  slide.addImage({
    path: logoPath,
    x: 0.3, y: H - logoSize - 0.2,
    w: logoSize, h: logoSize,
    sizing: { type: "contain", w: logoSize, h: logoSize },
  });
}

// --- LAYOUT C: Banded Editorial ---
// Three horizontal bands: title bar top, photo middle, info bar bottom
function buildC_16x9(pres, slide, photos, logoPath) {
  const W = 12.8, H = 7.2;
  const topBarH = 1.2;
  const botBarH = 2.0;
  const photoH = H - topBarH - botBarH;

  slide.background = { color: C.DARK };

  // Top bar — brand color with topic
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: W, h: topBarH,
    fill: { color: C.GREEN_DARK },
  });

  slide.addText(TOPIC, {
    x: 0.6, y: 0, w: W - 2.0, h: topBarH,
    fontSize: 44, fontFace: "Jost", bold: true,
    color: C.OFFWHITE, align: "left", valign: "middle",
  });

  // Logo in top bar — right side
  const logoSize = 0.85;
  slide.addImage({
    path: logoPath,
    x: W - logoSize - 0.4, y: (topBarH - logoSize) / 2,
    w: logoSize, h: logoSize,
    sizing: { type: "contain", w: logoSize, h: logoSize },
  });

  // Photo band — full width cinematic strip
  slide.addImage({
    path: photos.bandPath,
    x: 0, y: topBarH, w: W, h: photoH,
    sizing: { type: "cover", w: W, h: photoH },
  });

  // Bottom bar — dark
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: topBarH + photoH, w: W, h: botBarH,
    fill: { color: C.DARK },
  });

  // Ribbon centered in bottom bar
  const ribbonW = 8.0;
  const ribbonH = 0.8;
  const ribbonX = (W - ribbonW) / 2;
  const ribbonY = topBarH + photoH + 0.3;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: ribbonX, y: ribbonY, w: ribbonW, h: ribbonH,
    fill: { color: C.GOLD },
    shadow: { type: "outer", blur: 6, offset: 2, angle: 135, color: "000000", opacity: 0.4 },
  });
  // Left notch accent
  slide.addShape(pres.shapes.RECTANGLE, {
    x: ribbonX, y: ribbonY, w: 0.12, h: ribbonH,
    fill: { color: C.DARK },
  });
  // Right notch accent
  slide.addShape(pres.shapes.RECTANGLE, {
    x: ribbonX + ribbonW - 0.12, y: ribbonY, w: 0.12, h: ribbonH,
    fill: { color: C.DARK },
  });

  // Guest name on ribbon
  slide.addText(GUEST, {
    x: ribbonX + 0.3, y: ribbonY, w: ribbonW - 0.6, h: ribbonH,
    fontSize: 36, fontFace: "Jost", bold: true,
    color: C.DARK, align: "center", valign: "middle",
  });

  // Date below ribbon
  slide.addText(DATE_LINE, {
    x: 0.6, y: ribbonY + ribbonH + 0.15, w: W - 1.2, h: 0.6,
    fontSize: 22, fontFace: "Jost", bold: true,
    color: C.OFFWHITE, align: "center", valign: "middle",
  });
}

// =====================================================
// 1:1 LAYOUTS (8" x 8")
// =====================================================

// --- LAYOUT X: Stacked Poster ---
// Photo top ~58%, dark panel bottom with ribbon
function buildX_1x1(pres, slide, photos, logoPath) {
  const S = 8;
  const photoH = S * 0.58;

  slide.background = { color: C.DARK };

  // Photo top
  slide.addImage({
    path: photos.fullPath,
    x: 0, y: 0, w: S, h: photoH,
    sizing: { type: "cover", w: S, h: photoH },
  });

  // Topic — large, centered
  slide.addText(TOPIC, {
    x: 0.4, y: photoH + 0.2, w: S - 0.8, h: 0.9,
    fontSize: 42, fontFace: "Jost", bold: true,
    color: C.GOLD, align: "center", valign: "middle",
  });

  // Ribbon full width
  const ribbonY = photoH + 1.3;
  const ribbonH = 0.7;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.3, y: ribbonY, w: S - 0.6, h: ribbonH,
    fill: { color: C.CORAL },
    shadow: { type: "outer", blur: 6, offset: 3, angle: 135, color: "000000", opacity: 0.4 },
  });

  // Guest name on ribbon
  slide.addText(GUEST, {
    x: 0.6, y: ribbonY, w: S - 1.2, h: ribbonH,
    fontSize: 32, fontFace: "Jost", bold: true,
    color: C.WHITE, align: "center", valign: "middle",
  });

  // Date
  slide.addText(DATE_LINE, {
    x: 0.4, y: ribbonY + ribbonH + 0.2, w: S - 0.8, h: 0.6,
    fontSize: 22, fontFace: "Jost", bold: true,
    color: C.OFFWHITE, align: "center", valign: "middle",
  });

  // Logo bottom right
  const logoSize = 0.9;
  slide.addImage({
    path: logoPath,
    x: S - logoSize - 0.3, y: S - logoSize - 0.2,
    w: logoSize, h: logoSize,
    sizing: { type: "contain", w: logoSize, h: logoSize },
  });
}

// --- LAYOUT Y: Full Bleed + Floating Card ---
// Photo fills everything, floating rounded card at bottom
function buildY_1x1(pres, slide, photos, logoPath) {
  const S = 8;

  slide.background = { color: C.DARK };

  // Photo full bleed
  slide.addImage({
    path: photos.squarePath,
    x: 0, y: 0, w: S, h: S,
    sizing: { type: "cover", w: S, h: S },
  });

  // Dark overlay at bottom for readability
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: S * 0.5, w: S, h: S * 0.5,
    fill: { color: C.DARK, transparency: 25 },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: S * 0.7, w: S, h: S * 0.3,
    fill: { color: C.DARK, transparency: 10 },
  });

  // Ribbon floating on the photo
  const ribbonY = S - 2.8;
  const ribbonH = 0.7;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: ribbonY, w: S - 0.8, h: ribbonH,
    fill: { color: C.GOLD },
    shadow: { type: "outer", blur: 8, offset: 3, angle: 135, color: "000000", opacity: 0.5 },
  });

  // Guest name on ribbon
  slide.addText(GUEST, {
    x: 0.6, y: ribbonY, w: S - 1.2, h: ribbonH,
    fontSize: 30, fontFace: "Jost", bold: true,
    color: C.DARK, align: "center", valign: "middle",
  });

  // Floating card below ribbon
  const cardY = ribbonY + ribbonH + 0.2;
  const cardH = 1.5;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: cardY, w: S - 0.8, h: cardH,
    fill: { color: C.DARK, transparency: 20 },
    rectRadius: 0.1,
    shadow: { type: "outer", blur: 6, offset: 2, angle: 135, color: "000000", opacity: 0.3 },
  });

  // Topic in card
  slide.addText(TOPIC, {
    x: 0.7, y: cardY + 0.1, w: S - 2.6, h: 0.7,
    fontSize: 34, fontFace: "Jost", bold: true,
    color: C.OFFWHITE, align: "left", valign: "middle",
  });

  // Date in card
  slide.addText(DATE_LINE, {
    x: 0.7, y: cardY + 0.75, w: S - 2.6, h: 0.55,
    fontSize: 20, fontFace: "Jost", bold: true,
    color: C.GREEN_PALE, align: "left", valign: "middle",
  });

  // Logo in card — right side
  const logoSize = 0.9;
  slide.addImage({
    path: logoPath,
    x: S - logoSize - 0.7, y: cardY + (cardH - logoSize) / 2,
    w: logoSize, h: logoSize,
    sizing: { type: "contain", w: logoSize, h: logoSize },
  });
}

// --- LAYOUT Z: Side Stack ---
// Dark strip left ~35%, photo fills right, text stacked vertically with ribbon
function buildZ_1x1(pres, slide, photos, logoPath) {
  const S = 8;
  const stripW = S * 0.35;

  slide.background = { color: C.DARK };

  // Photo right side
  slide.addImage({
    path: photos.portraitPath,
    x: stripW, y: 0, w: S - stripW, h: S,
    sizing: { type: "cover", w: S - stripW, h: S },
  });

  // Left strip — solid dark
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: stripW, h: S,
    fill: { color: C.DARK },
  });

  // Subtle accent line between strip and photo
  slide.addShape(pres.shapes.RECTANGLE, {
    x: stripW - 0.06, y: 0, w: 0.06, h: S,
    fill: { color: C.GOLD },
  });

  // Topic stacked vertically on strip
  slide.addText("PALM", {
    x: 0.25, y: 0.4, w: stripW - 0.5, h: 0.9,
    fontSize: 40, fontFace: "Jost", bold: true,
    color: C.GREEN_PALE, align: "left", valign: "bottom",
  });
  slide.addText("BENDERS", {
    x: 0.25, y: 1.2, w: stripW - 0.5, h: 0.9,
    fontSize: 40, fontFace: "Jost", bold: true,
    color: C.GREEN_PALE, align: "left", valign: "top",
  });

  // Ribbon on the strip for guest name
  const ribbonY = 3.0;
  const ribbonH = 1.6;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: ribbonY, w: stripW + 0.8, h: ribbonH,
    fill: { color: C.CORAL },
    shadow: { type: "outer", blur: 6, offset: 3, angle: 90, color: "000000", opacity: 0.4 },
  });

  // Guest name stacked on ribbon
  slide.addText("Seth Lee", {
    x: 0.25, y: ribbonY + 0.15, w: stripW + 0.4, h: 0.65,
    fontSize: 30, fontFace: "Jost", bold: true,
    color: C.WHITE, align: "left", valign: "middle",
  });
  slide.addText("Jones", {
    x: 0.25, y: ribbonY + 0.8, w: stripW + 0.4, h: 0.65,
    fontSize: 30, fontFace: "Jost", bold: true,
    color: C.WHITE, align: "left", valign: "middle",
  });

  // Date
  slide.addText("JUNE 5", {
    x: 0.25, y: 5.2, w: stripW - 0.5, h: 0.6,
    fontSize: 20, fontFace: "Jost", bold: true,
    color: C.OFFWHITE, align: "left", valign: "middle",
  });
  slide.addText("3 PM EST", {
    x: 0.25, y: 5.7, w: stripW - 0.5, h: 0.5,
    fontSize: 18, fontFace: "Jost", bold: true,
    color: C.GREEN_SAGE, align: "left", valign: "middle",
  });

  // Logo — bottom left
  const logoSize = 0.9;
  slide.addImage({
    path: logoPath,
    x: (stripW - logoSize) / 2, y: S - logoSize - 0.3,
    w: logoSize, h: logoSize,
    sizing: { type: "contain", w: logoSize, h: logoSize },
  });
}

// =====================================================
// FABRIC.JS JSON EXPORT
// =====================================================
const DPI = 100;
function in2px(inches) { return inches * DPI; }

function imageToDataURL(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

// Notched banner/ribbon polygon — flag shape with V-cut ends
// style: 'right' (notch on right only), 'both' (notch both ends), 'left' (notch left only)
// Banner end styles: 'flat', 'arrow' (point out), 'chevron' (V-notch in)
function buildBannerPoints(pxW, pxH, leftEnd, rightEnd, notchL, notchR) {
  const pts = [];
  // Top-left to top-right
  if (leftEnd === 'arrow') {
    pts.push({ x: notchL, y: 0 });
  } else if (leftEnd === 'chevron') {
    pts.push({ x: 0, y: 0 });
  } else { // flat
    pts.push({ x: 0, y: 0 });
  }

  if (rightEnd === 'arrow') {
    pts.push({ x: pxW - notchR, y: 0 });
    pts.push({ x: pxW, y: pxH / 2 });
    pts.push({ x: pxW - notchR, y: pxH });
  } else if (rightEnd === 'chevron') {
    pts.push({ x: pxW, y: 0 });
    pts.push({ x: pxW - notchR, y: pxH / 2 });
    pts.push({ x: pxW, y: pxH });
  } else { // flat
    pts.push({ x: pxW, y: 0 });
    pts.push({ x: pxW, y: pxH });
  }

  // Bottom-right to bottom-left
  if (leftEnd === 'arrow') {
    pts.push({ x: notchL, y: pxH });
    pts.push({ x: 0, y: pxH / 2 });
  } else if (leftEnd === 'chevron') {
    pts.push({ x: 0, y: pxH });
    // Insert chevron point before closing — re-enter at notch
    // Actually we need the V pointing inward: bottom-left → chevron → top-left
    // Restructure: after bottom-right, go to (0, pxH), then (notchL, pxH/2), close at (0, 0)
    pts.push({ x: notchL, y: pxH / 2 });
  } else { // flat
    pts.push({ x: 0, y: pxH });
  }

  return pts;
}

function fabricBanner(x, y, w, h, fill, name, opts = {}) {
  const pxX = in2px(x), pxY = in2px(y), pxW = in2px(w), pxH = in2px(h);
  const notch = opts.notch ? in2px(opts.notch) : pxH * 0.35;
  const style = opts.style || 'right';

  // Convert legacy style to per-end
  let leftEnd = 'flat', rightEnd = 'flat';
  if (opts.leftEnd && opts.rightEnd) {
    leftEnd = opts.leftEnd;
    rightEnd = opts.rightEnd;
  } else if (style === 'both') {
    leftEnd = 'arrow'; rightEnd = 'arrow';
  } else if (style === 'left') {
    leftEnd = 'arrow'; rightEnd = 'flat';
  } else if (style === 'right') {
    leftEnd = 'flat'; rightEnd = 'arrow';
  } else if (style === 'chevron-both') {
    leftEnd = 'chevron'; rightEnd = 'chevron';
  } else if (style === 'chevron-right') {
    leftEnd = 'flat'; rightEnd = 'chevron';
  } else if (style === 'chevron-left') {
    leftEnd = 'chevron'; rightEnd = 'flat';
  }

  const notchL = opts.notchL ? in2px(opts.notchL) : notch;
  const notchR = opts.notchR ? in2px(opts.notchR) : notch;
  const points = buildBannerPoints(pxW, pxH, leftEnd, rightEnd, notchL, notchR);

  return {
    type: 'polygon',
    points,
    left: pxX,
    top: pxY,
    fill: '#' + fill,
    _customName: name,
    shadow: opts.shadow || null,
    _bannerLeftEnd: leftEnd,
    _bannerRightEnd: rightEnd,
    _bannerNotchL: notchL,
    _bannerNotchR: notchR,
  };
}

// Combined banner + centered text helper
function fabricBannerText(x, y, w, h, bannerFill, bannerName, text, fontSize, textColor, textName, bannerOpts = {}, textOpts = {}) {
  const banner = fabricBanner(x, y, w, h, bannerFill, bannerName, bannerOpts);
  const pxX = in2px(x), pxY = in2px(y), pxW = in2px(w), pxH = in2px(h);
  // Calculate text padding based on notch sizes
  const notch = bannerOpts.notch ? in2px(bannerOpts.notch) : pxH * 0.35;
  const nL = bannerOpts.notchL ? in2px(bannerOpts.notchL) : notch;
  const nR = bannerOpts.notchR ? in2px(bannerOpts.notchR) : notch;
  const style = bannerOpts.style || 'right';
  let padL = 10, padR = 10;
  if (style === 'left' || style === 'both') padL = nL + 8;
  if (style === 'right' || style === 'both') padR = nR + 8;
  if (bannerOpts.leftEnd === 'arrow' || bannerOpts.leftEnd === 'chevron') padL = nL + 8;
  if (bannerOpts.rightEnd === 'arrow' || bannerOpts.rightEnd === 'chevron') padR = nR + 8;

  const textObj = {
    type: 'textbox',
    left: pxX + padL,
    top: pxY + (pxH - fontSize * 1.2) / 2, // vertically center
    width: pxW - padL - padR,
    text, fontSize, fontFamily: 'Jost', fontWeight: 'bold',
    fill: '#' + textColor,
    textAlign: textOpts.align || 'center',
    _customName: textName,
  };
  return [banner, textObj];
}

function fabricRect(x, y, w, h, fill, name, opts = {}) {
  return {
    type: 'rect', left: in2px(x), top: in2px(y), width: in2px(w), height: in2px(h),
    fill: '#' + fill, _customName: name,
    selectable: opts.selectable !== undefined ? opts.selectable : true,
    evented: opts.evented !== undefined ? opts.evented : true,
    opacity: opts.opacity || 1,
    rx: opts.rx ? in2px(opts.rx) : 0,
    ry: opts.ry ? in2px(opts.ry) : 0,
    shadow: opts.shadow || null,
  };
}

function fabricText(x, y, w, h, text, fontSize, color, name, opts = {}) {
  return {
    type: 'textbox', left: in2px(x), top: in2px(y), width: in2px(w),
    text, fontSize, fontFamily: 'Jost', fontWeight: 'bold',
    fill: '#' + color, textAlign: opts.align || 'left',
    _customName: name,
  };
}

// "Cover" image: uniform scale to fill target area, centered, overflow hidden by other layers
function fabricImage(src, x, y, w, h, origW, origH, name) {
  const tW = in2px(w), tH = in2px(h);
  // Cover: use the larger scale so image fills the target completely (no stretching)
  const scale = Math.max(tW / origW, tH / origH);
  // Center the image within the target area
  const scaledW = origW * scale;
  const scaledH = origH * scale;
  const offsetX = (tW - scaledW) / 2;
  const offsetY = (tH - scaledH) / 2;

  return {
    type: 'image',
    left: in2px(x) + offsetX,
    top: in2px(y) + offsetY,
    width: origW,
    height: origH,
    scaleX: scale,
    scaleY: scale,
    src,
    _customName: name,
  };
}

async function buildFabricJSON(layoutName, ratio, photos, logoPath, buildFn) {
  const is16x9 = ratio === '16x9';
  const W = is16x9 ? 12.8 : 8;
  const H = is16x9 ? 7.2 : 8;
  const cW = in2px(W);
  const cH = in2px(H);

  const photoFullDU = imageToDataURL(photos.fullPath);
  const photoPortraitDU = imageToDataURL(photos.portraitPath);
  const photoSquareDU = imageToDataURL(photos.squarePath);
  const photoBandDU = imageToDataURL(photos.bandPath);
  const logoDU = imageToDataURL(logoPath);

  const objects = buildFn({
    W, H, cW, cH,
    photoFullDU, photoPortraitDU, photoSquareDU, photoBandDU, logoDU,
  });

  return {
    meta: { canvasW: cW, canvasH: cH, variant: layoutName, ratio, exportVersion: 1 },
    canvas: {
      version: '5.3.1',
      background: '#' + C.DARK,
      objects,
    },
  };
}

// Fabric builders for each layout
function fabricA16x9(ctx) {
  const { W, H, photoFullDU, logoDU } = ctx;
  const objs = [];
  objs.push(fabricRect(0, 0, W, H, C.DARK, 'Background', { selectable: false, evented: false }));
  objs.push(fabricImage(photoFullDU, 0, 0, W, H, 1920, 1371, 'Photo'));
  objs.push(fabricRect(0, H * 0.35, W, H * 0.65, C.DARK, 'Dark Overlay', { opacity: 0.85 }));
  // Topic ribbon + text
  const topicY = H - 3.2;
  objs.push(...fabricBannerText(0, topicY, 9.5, 1.2, C.GREEN_DARK, 'Topic Ribbon',
    TOPIC, 72, C.GOLD, 'Topic',
    { leftEnd: 'flat', rightEnd: 'arrow', shadow: { color: 'rgba(0,0,0,0.4)', blur: 10, offsetX: 3, offsetY: 3 } },
    { align: 'left' }
  ));
  // Guest ribbon + text
  const ribbonY = H - 1.85;
  objs.push(...fabricBannerText(0, ribbonY, 8.0, 0.85, C.CORAL, 'Ribbon',
    GUEST, 44, C.WHITE, 'Guest Name',
    { leftEnd: 'flat', rightEnd: 'chevron', shadow: { color: 'rgba(0,0,0,0.4)', blur: 12, offsetX: 4, offsetY: 4 } },
    { align: 'left' }
  ));
  // Date ribbon + text
  const dateY = H - 0.8;
  objs.push(...fabricBannerText(0, dateY, 7.0, 0.6, C.GREEN_DARK, 'Date Ribbon',
    DATE_LINE, 28, C.OFFWHITE, 'Date',
    { leftEnd: 'flat', rightEnd: 'arrow', shadow: { color: 'rgba(0,0,0,0.3)', blur: 8, offsetX: 2, offsetY: 2 } },
    { align: 'left' }
  ));
  objs.push(fabricImage(logoDU, W - 1.6, 0.2, 1.3, 1.3, 400, 400, 'Logo'));
  return objs;
}

function fabricB16x9(ctx) {
  const { W, H, photoFullDU, logoDU } = ctx;
  const photoW = 7.4;
  const objs = [];
  objs.push(fabricRect(0, 0, W, H, C.GREEN_DARK, 'Background', { selectable: false, evented: false }));
  objs.push(fabricImage(photoFullDU, 0, 0, photoW, H, 1920, 1371, 'Photo'));
  objs.push(fabricRect(photoW - 0.8, 0, 1.2, H, C.GREEN_DARK, 'Edge Blend', { opacity: 0.85 }));
  const textX = photoW + 0.3;
  // Topic ribbon + text
  objs.push(...fabricBannerText(textX - 0.2, 0.3, W - textX + 0.2, 1.7, C.DARK, 'Topic Ribbon',
    TOPIC, 64, C.GOLD, 'Topic',
    { leftEnd: 'chevron', rightEnd: 'flat', shadow: { color: 'rgba(0,0,0,0.4)', blur: 10, offsetX: 3, offsetY: 3 } },
  ));
  // Guest ribbon + text
  const ribbonY = 2.8;
  objs.push(...fabricBannerText(photoW - 2.0, ribbonY, W - photoW + 2.5, 1.0, C.CORAL, 'Ribbon',
    GUEST, 46, C.WHITE, 'Guest Name',
    { leftEnd: 'chevron', rightEnd: 'flat', shadow: { color: 'rgba(0,0,0,0.5)', blur: 16, offsetX: 4, offsetY: 4 } },
  ));
  // Date ribbon + text
  const dateY = 4.1;
  objs.push(...fabricBannerText(textX - 0.2, dateY, W - textX + 0.2, 0.7, C.DARK, 'Date Ribbon',
    DATE_LINE, 28, C.OFFWHITE, 'Date',
    { leftEnd: 'chevron', rightEnd: 'flat', shadow: { color: 'rgba(0,0,0,0.3)', blur: 8, offsetX: 2, offsetY: 2 } },
  ));
  objs.push(fabricImage(logoDU, 0.3, H - 1.5, 1.3, 1.3, 400, 400, 'Logo'));
  return objs;
}

function fabricC16x9(ctx) {
  const { W, H, photoBandDU, logoDU } = ctx;
  const topBarH = 1.2;
  const botBarH = 2.0;
  const photoH = H - topBarH - botBarH;
  const objs = [];
  objs.push(fabricRect(0, 0, W, H, C.DARK, 'Background', { selectable: false, evented: false }));
  // Top bar as topic ribbon + text
  objs.push(...fabricBannerText(0, 0, W, topBarH, C.GREEN_DARK, 'Topic Ribbon',
    TOPIC, 56, C.OFFWHITE, 'Topic',
    { leftEnd: 'chevron', rightEnd: 'chevron', shadow: { color: 'rgba(0,0,0,0.4)', blur: 10, offsetX: 0, offsetY: 4 } },
  ));
  objs.push(fabricImage(logoDU, W - 1.3, (topBarH - 0.9) / 2, 0.9, 0.9, 400, 400, 'Logo'));
  objs.push(fabricImage(photoBandDU, 0, topBarH, W, photoH, 1920, 1028, 'Photo'));
  objs.push(fabricRect(0, topBarH + photoH, W, botBarH, C.DARK, 'Bottom Bar'));
  // Guest ribbon + text
  const ribbonW = 8.0;
  const ribbonX = (W - ribbonW) / 2;
  const ribbonY = topBarH + photoH + 0.3;
  objs.push(...fabricBannerText(ribbonX, ribbonY, ribbonW, 0.9, C.GOLD, 'Ribbon',
    GUEST, 44, C.DARK, 'Guest Name',
    { leftEnd: 'chevron', rightEnd: 'chevron', shadow: { color: 'rgba(0,0,0,0.4)', blur: 12, offsetX: 3, offsetY: 3 } },
  ));
  // Date ribbon + text
  const dateW = 6.0;
  const dateX = (W - dateW) / 2;
  const dateY = ribbonY + 1.05;
  objs.push(...fabricBannerText(dateX, dateY, dateW, 0.6, C.GREEN_DARK, 'Date Ribbon',
    DATE_LINE, 28, C.OFFWHITE, 'Date',
    { leftEnd: 'chevron', rightEnd: 'chevron', shadow: { color: 'rgba(0,0,0,0.3)', blur: 8, offsetX: 2, offsetY: 2 } },
  ));
  return objs;
}

function fabricX1x1(ctx) {
  const { H: S, photoFullDU, logoDU } = ctx;
  const photoH = S * 0.58;
  const objs = [];
  objs.push(fabricRect(0, 0, S, S, C.DARK, 'Background', { selectable: false, evented: false }));
  objs.push(fabricImage(photoFullDU, 0, 0, S, photoH, 1920, 1371, 'Photo'));
  // Topic ribbon + text
  const topicY = photoH + 0.1;
  objs.push(...fabricBannerText(0.2, topicY, S - 0.4, 1.0, C.GREEN_DARK, 'Topic Ribbon',
    TOPIC, 54, C.GOLD, 'Topic',
    { leftEnd: 'chevron', rightEnd: 'chevron', shadow: { color: 'rgba(0,0,0,0.4)', blur: 10, offsetX: 3, offsetY: 3 } },
  ));
  // Guest ribbon + text
  const ribbonY = photoH + 1.3;
  objs.push(...fabricBannerText(0.2, ribbonY, S - 0.4, 0.8, C.CORAL, 'Ribbon',
    GUEST, 40, C.WHITE, 'Guest Name',
    { leftEnd: 'arrow', rightEnd: 'arrow', shadow: { color: 'rgba(0,0,0,0.4)', blur: 12, offsetX: 3, offsetY: 3 } },
  ));
  // Date ribbon + text
  const dateY = ribbonY + 1.0;
  objs.push(...fabricBannerText(0.8, dateY, S - 1.6, 0.6, C.GREEN_DARK, 'Date Ribbon',
    DATE_LINE, 28, C.OFFWHITE, 'Date',
    { leftEnd: 'chevron', rightEnd: 'chevron', shadow: { color: 'rgba(0,0,0,0.3)', blur: 8, offsetX: 2, offsetY: 2 } },
  ));
  objs.push(fabricImage(logoDU, S - 1.3, S - 1.2, 1.0, 1.0, 400, 400, 'Logo'));
  return objs;
}

function fabricY1x1(ctx) {
  const { H: S, photoSquareDU, logoDU } = ctx;
  const objs = [];
  objs.push(fabricRect(0, 0, S, S, C.DARK, 'Background', { selectable: false, evented: false }));
  objs.push(fabricImage(photoSquareDU, 0, 0, S, S, 1200, 1200, 'Photo'));
  objs.push(fabricRect(0, S * 0.55, S, S * 0.45, C.DARK, 'Dark Overlay', { opacity: 0.88 }));
  // Guest ribbon + text
  const ribbonY = S - 2.9;
  objs.push(...fabricBannerText(0.3, ribbonY, S - 0.6, 0.8, C.GOLD, 'Ribbon',
    GUEST, 38, C.DARK, 'Guest Name',
    { leftEnd: 'arrow', rightEnd: 'arrow', shadow: { color: 'rgba(0,0,0,0.5)', blur: 16, offsetX: 3, offsetY: 3 } },
  ));
  // Topic ribbon + text
  const topicY = ribbonY + 1.0;
  objs.push(...fabricBannerText(0.3, topicY, S - 0.6, 0.85, C.GREEN_DARK, 'Topic Ribbon',
    TOPIC, 44, C.OFFWHITE, 'Topic',
    { leftEnd: 'chevron', rightEnd: 'chevron', shadow: { color: 'rgba(0,0,0,0.4)', blur: 10, offsetX: 3, offsetY: 3 } },
  ));
  // Date ribbon + text
  const dateY = topicY + 1.0;
  objs.push(...fabricBannerText(0.6, dateY, S - 1.2, 0.55, C.GREEN_DARK, 'Date Ribbon',
    DATE_LINE, 26, C.GREEN_PALE, 'Date',
    { leftEnd: 'chevron', rightEnd: 'chevron', shadow: { color: 'rgba(0,0,0,0.3)', blur: 8, offsetX: 2, offsetY: 2 } },
  ));
  objs.push(fabricImage(logoDU, S - 1.5, dateY - 0.1, 1.0, 1.0, 400, 400, 'Logo'));
  return objs;
}

function fabricZ1x1(ctx) {
  const { H: S, photoPortraitDU, logoDU } = ctx;
  const stripW = S * 0.35;
  const objs = [];
  objs.push(fabricRect(0, 0, S, S, C.DARK, 'Background', { selectable: false, evented: false }));
  objs.push(fabricImage(photoPortraitDU, stripW, 0, S - stripW, S, 900, 1080, 'Photo'));
  objs.push(fabricRect(0, 0, stripW, S, C.DARK, 'Left Strip'));
  objs.push(fabricRect(stripW - 0.06, 0, 0.06, S, C.GOLD, 'Accent Line'));
  // Topic ribbons + text
  objs.push(...fabricBannerText(0, 0.2, stripW + 0.4, 1.0, C.GREEN_DARK, 'Topic Ribbon 1',
    'PALM', 52, C.GREEN_PALE, 'Topic 1',
    { leftEnd: 'flat', rightEnd: 'chevron', shadow: { color: 'rgba(0,0,0,0.3)', blur: 8, offsetX: 3, offsetY: 3 } },
    { align: 'left' }
  ));
  objs.push(...fabricBannerText(0, 1.1, stripW + 0.4, 1.0, C.GREEN_DARK, 'Topic Ribbon 2',
    'BENDERS', 52, C.GREEN_PALE, 'Topic 2',
    { leftEnd: 'flat', rightEnd: 'chevron', shadow: { color: 'rgba(0,0,0,0.3)', blur: 8, offsetX: 3, offsetY: 3 } },
    { align: 'left' }
  ));
  // Guest ribbon + text (two lines manually since we split the name)
  const ribbonY = 3.0;
  objs.push(fabricBanner(0, ribbonY, stripW + 0.8, 1.6, C.CORAL, 'Ribbon', {
    leftEnd: 'flat', rightEnd: 'arrow',
    shadow: { color: 'rgba(0,0,0,0.4)', blur: 12, offsetX: 4, offsetY: 4 },
  }));
  objs.push(fabricText(0.25, ribbonY + 0.15, stripW + 0.1, 0.7, 'Seth Lee', 38, C.WHITE, 'Guest First'));
  objs.push(fabricText(0.25, ribbonY + 0.8, stripW + 0.1, 0.7, 'Jones', 38, C.WHITE, 'Guest Last'));
  // Date ribbon + text
  objs.push(fabricBanner(0, 5.1, stripW + 0.2, 1.2, C.GREEN_DARK, 'Date Ribbon', {
    leftEnd: 'flat', rightEnd: 'chevron',
    shadow: { color: 'rgba(0,0,0,0.3)', blur: 8, offsetX: 2, offsetY: 2 },
  }));
  objs.push(fabricText(0.25, 5.2, stripW - 0.4, 0.6, 'JUNE 5', 26, C.OFFWHITE, 'Date 1'));
  objs.push(fabricText(0.25, 5.7, stripW - 0.4, 0.5, '3 PM EST', 22, C.GREEN_SAGE, 'Date 2'));
  objs.push(fabricImage(logoDU, (stripW - 0.9) / 2, S - 1.2, 0.9, 0.9, 400, 400, 'Logo'));
  return objs;
}

// =====================================================
// MAIN
// =====================================================
async function main() {
  if (!fs.existsSync(OUTPUT_16x9)) fs.mkdirSync(OUTPUT_16x9, { recursive: true });
  if (!fs.existsSync(OUTPUT_1x1)) fs.mkdirSync(OUTPUT_1x1, { recursive: true });

  console.log("Processing photo...");
  const photos = await preparePhotos();

  console.log("Processing logo...");
  const logoPath = await prepareLogo();

  const filePrefix = "palm_benders_slj";

  // 16:9 layouts
  const layouts16 = [
    { name: "A_cinematic", label: "Full Bleed Cinematic", build: buildA_16x9, fabric: fabricA16x9 },
    { name: "B_split", label: "Asymmetric Split", build: buildB_16x9, fabric: fabricB16x9 },
    { name: "C_banded", label: "Banded Editorial", build: buildC_16x9, fabric: fabricC16x9 },
  ];

  const layouts1x1 = [
    { name: "X_poster", label: "Stacked Poster", build: buildX_1x1, fabric: fabricX1x1 },
    { name: "Y_bleed", label: "Full Bleed Card", build: buildY_1x1, fabric: fabricY1x1 },
    { name: "Z_side", label: "Side Stack", build: buildZ_1x1, fabric: fabricZ1x1 },
  ];

  console.log("\nBuilding 16:9 layouts...");
  for (const layout of layouts16) {
    const pres = new pptxgen();
    pres.defineLayout({ name: "CUSTOM_16x9", width: 12.8, height: 7.2 });
    pres.layout = "CUSTOM_16x9";
    pres.author = "The Looth Group";
    pres.title = `Palm Benders - ${GUEST} (${layout.label})`;

    const slide = pres.addSlide();
    layout.build(pres, slide, photos, logoPath);

    const fname = `${filePrefix}_16x9_${layout.name}.pptx`;
    await pres.writeFile({ fileName: path.join(OUTPUT_16x9, fname) });
    console.log(`  Created: ${fname}`);
  }

  console.log("\nBuilding 1:1 layouts...");
  for (const layout of layouts1x1) {
    const pres = new pptxgen();
    pres.defineLayout({ name: "CUSTOM_1x1", width: 8, height: 8 });
    pres.layout = "CUSTOM_1x1";
    pres.author = "The Looth Group";
    pres.title = `Palm Benders - ${GUEST} (${layout.label})`;

    const slide = pres.addSlide();
    layout.build(pres, slide, photos, logoPath);

    const fname = `${filePrefix}_1x1_${layout.name}.pptx`;
    await pres.writeFile({ fileName: path.join(OUTPUT_1x1, fname) });
    console.log(`  Created: ${fname}`);
  }

  // --- JSON layouts for editor ---
  console.log("\nBuilding editor JSON layouts...");
  for (const layout of layouts16) {
    const json = await buildFabricJSON(layout.name, '16x9', photos, logoPath, layout.fabric);
    const jname = `${filePrefix}_16x9_${layout.name}.json`;
    fs.writeFileSync(path.join(OUTPUT_16x9, jname), JSON.stringify(json, null, 2));
    console.log(`  Created: ${jname}`);
  }
  for (const layout of layouts1x1) {
    const json = await buildFabricJSON(layout.name, '1x1', photos, logoPath, layout.fabric);
    const jname = `${filePrefix}_1x1_${layout.name}.json`;
    fs.writeFileSync(path.join(OUTPUT_1x1, jname), JSON.stringify(json, null, 2));
    console.log(`  Created: ${jname}`);
  }

  // Cleanup temp
  console.log("\nCleaning up temp files...");
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });

  console.log("\nDone! 6 layouts generated:");
  console.log("  16:9: A (Cinematic), B (Split), C (Banded)");
  console.log("  1:1:  X (Poster), Y (Full Bleed), Z (Side Stack)");

  // --- Open editor if --open flag ---
  const shouldOpen = process.argv.includes("--open") || process.argv.includes("-o");
  if (shouldOpen) {
    const jsonFiles = [];
    for (const l of layouts16) jsonFiles.push(`output/16x9/${filePrefix}_16x9_${l.name}.json`);
    for (const l of layouts1x1) jsonFiles.push(`output/1x1/${filePrefix}_1x1_${l.name}.json`);
    await openEditor(jsonFiles);
  }
}

// --- LOCAL SERVER ---
function openEditor(jsonFiles) {
  return new Promise((resolve) => {
    const ROOT = __dirname;
    const MIME = {
      '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
      '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    };
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (urlPath === '/') urlPath = '/editor.html';
      const filePath = path.join(ROOT, urlPath);
      if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
      if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const url = `http://127.0.0.1:${port}/?load=${encodeURIComponent(jsonFiles.join(','))}`;
      console.log(`\n  Editor: ${url}`);
      const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
      exec(cmd);
      process.on('SIGINT', () => { server.close(); process.exit(0); });
    });
  });
}

main().catch((err) => { console.error("Error:", err); process.exit(1); });
