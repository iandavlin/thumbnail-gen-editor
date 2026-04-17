const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { exec } = require("child_process");

// --- CONFIG ---
const SHOW = "Sonic Grading";
const GUEST1 = "Dr David Olson";
const GUEST2 = "Eric Warner";
const ORG = "Pacific Rim Tonewoods";
const TOPIC = "SONIC GRADING";
const DATE_LINE = "APRIL 28  \u2022  12 PM EASTERN";
const PHOTO_PATH = path.join(__dirname, "assets", "episode", "David_Olson_H (1).jpeg");
const LOGO_PATH = path.join(__dirname, "assets", "loothgrouphighrez (1).png");
const PRT_BADGE_PATH = path.join(__dirname, "assets", "episode", "PRT_badge_mist.webp");
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
};

// --- VARIANTS ---
const variants = [
  {
    name: "v1",
    label: "Dark & Gold",
    bg: C.DARK,
    guestColor: C.GOLD,
    orgColor: C.OFFWHITE,
    topicColor: C.GOLD_LIGHT,
    dateBarBg: C.GREEN_DARK,
    dateBarText: C.OFFWHITE,
  },
  {
    name: "v2",
    label: "Forest & Coral",
    bg: C.GREEN_DARK,
    guestColor: C.OFFWHITE,
    orgColor: C.GOLD,
    topicColor: C.CORAL,
    dateBarBg: C.DARK,
    dateBarText: C.GOLD,
  },
  {
    name: "v3",
    label: "Warm & Light",
    bg: C.GREEN_PALE,
    guestColor: C.DARK,
    orgColor: C.GREEN_DARK,
    topicColor: C.CORAL,
    dateBarBg: C.GOLD,
    dateBarText: C.DARK,
  },
];

// --- IMAGE PROCESSING ---
// Save pre-cropped images to temp files so pptxgenjs can use file paths
// with its own sizing (cover/contain) without double-processing
async function preparePhotos() {
  const meta = await sharp(PHOTO_PATH).metadata();
  const w = meta.width;
  const h = meta.height;
  console.log(`  Original photo: ${w}x${h}`);

  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  // For 16:9 slides: crop left-biased portrait chunk so David is centered
  // We want a tall crop (portrait-ish) from the left side of the landscape image
  // This will be placed on the left side of the 16:9 slide and shown via cover
  const portraitW = Math.floor(h * 0.75); // 3:4 aspect portrait crop
  const portraitLeft = Math.max(0, Math.floor(w * 0.05)); // start near left edge where David is
  const actualPortraitW = Math.min(portraitW, w - portraitLeft);
  const portraitPath = path.join(TEMP_DIR, "photo_portrait.png");
  await sharp(PHOTO_PATH)
    .extract({ left: portraitLeft, top: 0, width: actualPortraitW, height: h })
    .resize(900, 1200, { fit: "cover" })
    .png()
    .toFile(portraitPath);

  // For 1:1 slides: square crop centered on David (left-biased)
  const side = Math.min(w, h);
  let sqLeft = Math.max(0, Math.floor(w * 0.05)); // bias left where David is
  sqLeft = Math.min(sqLeft, w - side);
  const squarePath = path.join(TEMP_DIR, "photo_square.png");
  await sharp(PHOTO_PATH)
    .extract({ left: sqLeft, top: 0, width: side, height: side })
    .resize(1200, 1200, { fit: "cover" })
    .png()
    .toFile(squarePath);

  // Also save the full original for background use
  const fullPath = path.join(TEMP_DIR, "photo_full.png");
  await sharp(PHOTO_PATH).png().toFile(fullPath);

  return { portraitPath, squarePath, fullPath };
}

async function prepareLogo() {
  const logoPath = path.join(TEMP_DIR, "logo.png");
  await sharp(LOGO_PATH)
    .resize(400, 400, { fit: "inside" })
    .png()
    .toFile(logoPath);
  return logoPath;
}

async function preparePrtBadge() {
  const badgePath = path.join(TEMP_DIR, "prt_badge.png");
  await sharp(PRT_BADGE_PATH)
    .resize(500, 500, { fit: "inside" })
    .png()
    .toFile(badgePath);
  return badgePath;
}

// --- SLIDE BUILDERS ---

function build16x9(pres, slide, v, photos, logoPath, prtBadgePath) {
  const W = 12.8;
  const H = 7.2;

  // Background
  slide.background = { color: v.bg };

  // Photo on left side ~40% width, using cover so it fills without stretching
  const photoW = 5.2;
  slide.addImage({
    path: photos.portraitPath,
    x: 0,
    y: 0,
    w: photoW,
    h: H,
    sizing: { type: "cover", w: photoW, h: H },
  });

  // Semi-transparent overlay on photo's right edge for blending
  slide.addShape(pres.shapes.RECTANGLE, {
    x: photoW - 1.5,
    y: 0,
    w: 1.5,
    h: H,
    fill: { color: v.bg, transparency: 30 },
  });

  // Text area - right side
  const textX = photoW + 0.5;
  const textW = W - textX - 0.4;

  // Topic - large, bold, prominent
  slide.addText(TOPIC, {
    x: textX,
    y: 0.4,
    w: textW,
    h: 1.4,
    fontSize: 54,
    fontFace: "Jost",
    bold: true,
    color: v.topicColor,
    align: "left",
    valign: "middle",
    margin: 0,
  });

  // Guest names - big and legible
  slide.addText(GUEST1, {
    x: textX,
    y: 2.0,
    w: textW,
    h: 0.85,
    fontSize: 42,
    fontFace: "Jost",
    bold: true,
    color: v.guestColor,
    align: "left",
    valign: "middle",
    margin: 0,
  });

  slide.addText(GUEST2, {
    x: textX,
    y: 2.85,
    w: textW,
    h: 0.85,
    fontSize: 42,
    fontFace: "Jost",
    bold: true,
    color: v.guestColor,
    align: "left",
    valign: "middle",
    margin: 0,
  });

  // Org name
  slide.addText(ORG, {
    x: textX,
    y: 3.85,
    w: textW,
    h: 0.55,
    fontSize: 22,
    fontFace: "Jost",
    bold: true,
    color: v.orgColor,
    align: "left",
    valign: "middle",
    margin: 0,
  });

  // PRT badge - next to org text, right side
  const prtSize = 1.4;
  slide.addImage({
    path: prtBadgePath,
    x: W - prtSize - 0.4,
    y: 3.4,
    w: prtSize,
    h: prtSize,
    sizing: { type: "contain", w: prtSize, h: prtSize },
  });

  // Date bar - full width at bottom
  const barH = 0.75;
  const barY = H - barH;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0,
    y: barY,
    w: W,
    h: barH,
    fill: { color: v.dateBarBg },
  });

  slide.addText(DATE_LINE, {
    x: 0.5,
    y: barY,
    w: W - 1,
    h: barH,
    fontSize: 24,
    fontFace: "Jost",
    bold: true,
    color: v.dateBarText,
    align: "center",
    valign: "middle",
    margin: 0,
  });

  // Looth logo - bottom left corner, on top of date bar
  const logoSize = 1.3;
  slide.addImage({
    path: logoPath,
    x: 0.2,
    y: barY - logoSize + 0.15,
    w: logoSize,
    h: logoSize,
    sizing: { type: "contain", w: logoSize, h: logoSize },
  });
}

function build1x1(pres, slide, v, photos, logoPath, prtBadgePath) {
  const S = 8;

  // Background
  slide.background = { color: v.bg };

  // Photo in top portion - cover to fill width without stretching
  const photoH = 4.0;
  slide.addImage({
    path: photos.squarePath,
    x: 0,
    y: 0,
    w: S,
    h: photoH,
    sizing: { type: "cover", w: S, h: photoH },
  });

  // Overlay at bottom of photo for blending
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0,
    y: photoH - 1.0,
    w: S,
    h: 1.0,
    fill: { color: v.bg, transparency: 30 },
  });

  // Topic - large
  slide.addText(TOPIC, {
    x: 0.4,
    y: photoH + 0.1,
    w: S - 0.8,
    h: 0.9,
    fontSize: 42,
    fontFace: "Jost",
    bold: true,
    color: v.topicColor,
    align: "center",
    valign: "middle",
    margin: 0,
  });

  // Guest names - bigger
  slide.addText(GUEST1 + "  &  " + GUEST2, {
    x: 0.4,
    y: photoH + 1.05,
    w: S - 0.8,
    h: 0.7,
    fontSize: 28,
    fontFace: "Jost",
    bold: true,
    color: v.guestColor,
    align: "center",
    valign: "middle",
    margin: 0,
  });

  // Org
  slide.addText(ORG, {
    x: 0.4,
    y: photoH + 1.75,
    w: S - 0.8,
    h: 0.45,
    fontSize: 18,
    fontFace: "Jost",
    bold: true,
    color: v.orgColor,
    align: "center",
    valign: "middle",
    margin: 0,
  });

  // Date bar
  const barH = 0.65;
  const barY = S - barH;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0,
    y: barY,
    w: S,
    h: barH,
    fill: { color: v.dateBarBg },
  });

  slide.addText(DATE_LINE, {
    x: 0.3,
    y: barY,
    w: S - 0.6,
    h: barH,
    fontSize: 20,
    fontFace: "Jost",
    bold: true,
    color: v.dateBarText,
    align: "center",
    valign: "middle",
    margin: 0,
  });

  // Looth logo - bottom left, overlapping date bar edge
  const logoSize = 1.0;
  slide.addImage({
    path: logoPath,
    x: 0.2,
    y: barY - logoSize + 0.1,
    w: logoSize,
    h: logoSize,
    sizing: { type: "contain", w: logoSize, h: logoSize },
  });

  // PRT badge - bottom right, above date bar
  const prtSize = 1.1;
  slide.addImage({
    path: prtBadgePath,
    x: S - prtSize - 0.2,
    y: barY - prtSize + 0.1,
    w: prtSize,
    h: prtSize,
    sizing: { type: "contain", w: prtSize, h: prtSize },
  });
}

// --- FABRIC.JS JSON EXPORT ---
// Converts slide layout to Fabric.js-compatible JSON for the editor
// pptxgenjs uses inches; editor canvas uses pixels at 100 DPI

const DPI = 100; // inches -> pixels
function in2px(inches) { return inches * DPI; }

function imageToDataURL(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function buildFabricJSON(ratio, v, photos, logoPath, prtBadgePath) {
  const is16x9 = ratio === '16x9';
  const W = is16x9 ? 12.8 : 8;
  const H = is16x9 ? 7.2 : 8;
  const cW = in2px(W);
  const cH = in2px(H);

  const objects = [];

  if (is16x9) {
    // Background
    objects.push({
      type: 'rect', left: 0, top: 0, width: cW, height: cH,
      fill: '#' + v.bg, selectable: false, evented: false,
      _customName: 'Background',
    });

    // Photo
    const photoW = in2px(5.2);
    const photoDataURL = imageToDataURL(photos.portraitPath);
    objects.push({
      type: 'image', left: 0, top: 0,
      width: 900, height: 1200,
      scaleX: photoW / 900, scaleY: cH / 1200,
      src: photoDataURL,
      _customName: 'Photo',
    });

    // Text area
    const textX = in2px(5.2 + 0.5);
    const textW = cW - textX - in2px(0.4);

    // Topic
    objects.push({
      type: 'textbox', left: textX, top: in2px(0.4), width: textW, height: in2px(1.4),
      text: TOPIC, fontSize: 54, fontFamily: 'Jost', fontWeight: 'bold',
      fill: '#' + v.topicColor, textAlign: 'left',
      _customName: 'Topic',
    });

    // Guest 1
    objects.push({
      type: 'textbox', left: textX, top: in2px(2.0), width: textW, height: in2px(0.85),
      text: GUEST1, fontSize: 42, fontFamily: 'Jost', fontWeight: 'bold',
      fill: '#' + v.guestColor, textAlign: 'left',
      _customName: 'Guest 1',
    });

    // Guest 2
    objects.push({
      type: 'textbox', left: textX, top: in2px(2.85), width: textW, height: in2px(0.85),
      text: GUEST2, fontSize: 42, fontFamily: 'Jost', fontWeight: 'bold',
      fill: '#' + v.guestColor, textAlign: 'left',
      _customName: 'Guest 2',
    });

    // Org
    objects.push({
      type: 'textbox', left: textX, top: in2px(3.85), width: textW, height: in2px(0.55),
      text: ORG, fontSize: 22, fontFamily: 'Jost', fontWeight: 'bold',
      fill: '#' + v.orgColor, textAlign: 'left',
      _customName: 'Org Name',
    });

    // PRT badge
    const prtSize = in2px(1.4);
    const prtDataURL = imageToDataURL(prtBadgePath);
    objects.push({
      type: 'image', left: cW - prtSize - in2px(0.4), top: in2px(3.4),
      width: 500, height: 500,
      scaleX: prtSize / 500, scaleY: prtSize / 500,
      src: prtDataURL,
      _customName: 'PRT Badge',
    });

    // Date bar
    const barH = in2px(0.75);
    const barY = cH - barH;
    objects.push({
      type: 'rect', left: 0, top: barY, width: cW, height: barH,
      fill: '#' + v.dateBarBg,
      _customName: 'Date Bar',
    });

    objects.push({
      type: 'textbox', left: in2px(0.5), top: barY, width: cW - in2px(1), height: barH,
      text: DATE_LINE, fontSize: 24, fontFamily: 'Jost', fontWeight: 'bold',
      fill: '#' + v.dateBarText, textAlign: 'center',
      _customName: 'Date Text',
    });

    // Logo
    const logoSize = in2px(1.3);
    const logoDataURL = imageToDataURL(logoPath);
    objects.push({
      type: 'image', left: in2px(0.2), top: barY - logoSize + in2px(0.15),
      width: 400, height: 400,
      scaleX: logoSize / 400, scaleY: logoSize / 400,
      src: logoDataURL,
      _customName: 'Looth Logo',
    });
  } else {
    // 1:1 layout
    const S = cH; // square

    objects.push({
      type: 'rect', left: 0, top: 0, width: S, height: S,
      fill: '#' + v.bg, selectable: false, evented: false,
      _customName: 'Background',
    });

    // Photo top
    const photoH = in2px(4.0);
    const photoDataURL = imageToDataURL(photos.squarePath);
    objects.push({
      type: 'image', left: 0, top: 0,
      width: 1200, height: 1200,
      scaleX: S / 1200, scaleY: photoH / 1200,
      src: photoDataURL,
      _customName: 'Photo',
    });

    // Topic
    objects.push({
      type: 'textbox', left: in2px(0.4), top: photoH + in2px(0.1), width: S - in2px(0.8), height: in2px(0.9),
      text: TOPIC, fontSize: 42, fontFamily: 'Jost', fontWeight: 'bold',
      fill: '#' + v.topicColor, textAlign: 'center',
      _customName: 'Topic',
    });

    // Guest names
    objects.push({
      type: 'textbox', left: in2px(0.4), top: photoH + in2px(1.05), width: S - in2px(0.8), height: in2px(0.7),
      text: GUEST1 + '  &  ' + GUEST2, fontSize: 28, fontFamily: 'Jost', fontWeight: 'bold',
      fill: '#' + v.guestColor, textAlign: 'center',
      _customName: 'Guest Names',
    });

    // Org
    objects.push({
      type: 'textbox', left: in2px(0.4), top: photoH + in2px(1.75), width: S - in2px(0.8), height: in2px(0.45),
      text: ORG, fontSize: 18, fontFamily: 'Jost', fontWeight: 'bold',
      fill: '#' + v.orgColor, textAlign: 'center',
      _customName: 'Org Name',
    });

    // Date bar
    const barH = in2px(0.65);
    const barY = S - barH;
    objects.push({
      type: 'rect', left: 0, top: barY, width: S, height: barH,
      fill: '#' + v.dateBarBg,
      _customName: 'Date Bar',
    });

    objects.push({
      type: 'textbox', left: in2px(0.3), top: barY, width: S - in2px(0.6), height: barH,
      text: DATE_LINE, fontSize: 20, fontFamily: 'Jost', fontWeight: 'bold',
      fill: '#' + v.dateBarText, textAlign: 'center',
      _customName: 'Date Text',
    });

    // Logo
    const logoSize = in2px(1.0);
    const logoDataURL = imageToDataURL(logoPath);
    objects.push({
      type: 'image', left: in2px(0.2), top: barY - logoSize + in2px(0.1),
      width: 400, height: 400,
      scaleX: logoSize / 400, scaleY: logoSize / 400,
      src: logoDataURL,
      _customName: 'Looth Logo',
    });

    // PRT badge
    const prtSize = in2px(1.1);
    const prtDataURL = imageToDataURL(prtBadgePath);
    objects.push({
      type: 'image', left: S - prtSize - in2px(0.2), top: barY - prtSize + in2px(0.1),
      width: 500, height: 500,
      scaleX: prtSize / 500, scaleY: prtSize / 500,
      src: prtDataURL,
      _customName: 'PRT Badge',
    });
  }

  return {
    meta: { canvasW: cW, canvasH: cH, variant: v.name, ratio, exportVersion: 1 },
    canvas: {
      version: '5.3.1',
      background: '#' + v.bg,
      objects,
    },
  };
}

// --- LOCAL SERVER + BROWSER OPEN ---
function openEditor(jsonFiles) {
  return new Promise((resolve) => {
    const ROOT = __dirname;
    const MIME = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };

    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (urlPath === '/') urlPath = '/editor.html';

      const filePath = path.join(ROOT, urlPath);

      // Security: stay inside project root
      if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found: ' + urlPath);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
      fs.createReadStream(filePath).pipe(res);
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const loadParam = jsonFiles.join(',');
      const url = `http://127.0.0.1:${port}/?load=${encodeURIComponent(loadParam)}`;

      console.log(`\n  Editor server running at http://127.0.0.1:${port}`);
      console.log(`  Opening browser...`);
      console.log(`  (Press Ctrl+C to stop the server)\n`);

      // Cross-platform browser open
      const cmd = process.platform === 'win32' ? `start "" "${url}"`
                : process.platform === 'darwin' ? `open "${url}"`
                : `xdg-open "${url}"`;
      exec(cmd, (err) => {
        if (err) console.error('  Could not open browser:', err.message);
      });

      // Keep server alive until Ctrl+C
      process.on('SIGINT', () => {
        console.log('\n  Shutting down editor server...');
        server.close();
        process.exit(0);
      });

      // Don't resolve — keep the process alive for the server
    });
  });
}

// --- MAIN ---
async function main() {
  if (!fs.existsSync(OUTPUT_16x9)) fs.mkdirSync(OUTPUT_16x9, { recursive: true });
  if (!fs.existsSync(OUTPUT_1x1)) fs.mkdirSync(OUTPUT_1x1, { recursive: true });

  console.log("Processing photo...");
  const photos = await preparePhotos();

  console.log("Processing logo...");
  const logoPath = await prepareLogo();

  console.log("Processing PRT badge...");
  const prtBadgePath = await preparePrtBadge();

  const filePrefix = "sonic_grading_olson_warner";

  // --- Individual files (6 total) ---
  for (const v of variants) {
    // 16:9
    const pres16 = new pptxgen();
    pres16.defineLayout({ name: "CUSTOM_16x9", width: 12.8, height: 7.2 });
    pres16.layout = "CUSTOM_16x9";
    pres16.author = "The Looth Group";
    pres16.title = `${SHOW} - ${GUEST1} & ${GUEST2} (${v.label})`;

    const slide16 = pres16.addSlide();
    build16x9(pres16, slide16, v, photos, logoPath, prtBadgePath);

    const file16 = `${filePrefix}_16x9_${v.name}.pptx`;
    await pres16.writeFile({ fileName: path.join(OUTPUT_16x9, file16) });
    console.log(`  Created: ${file16}`);

    // 1:1
    const pres1 = new pptxgen();
    pres1.defineLayout({ name: "CUSTOM_1x1", width: 8, height: 8 });
    pres1.layout = "CUSTOM_1x1";
    pres1.author = "The Looth Group";
    pres1.title = `${SHOW} - ${GUEST1} & ${GUEST2} (${v.label})`;

    const slide1 = pres1.addSlide();
    build1x1(pres1, slide1, v, photos, logoPath, prtBadgePath);

    const file1 = `${filePrefix}_1x1_${v.name}.pptx`;
    await pres1.writeFile({ fileName: path.join(OUTPUT_1x1, file1) });
    console.log(`  Created: ${file1}`);
  }

  // --- Combined files (2 total: one per ratio, 3 slides each) ---
  console.log("\nBuilding combined files...");

  // Combined 16:9
  const pres16all = new pptxgen();
  pres16all.defineLayout({ name: "CUSTOM_16x9", width: 12.8, height: 7.2 });
  pres16all.layout = "CUSTOM_16x9";
  pres16all.author = "The Looth Group";
  pres16all.title = `${SHOW} - ${GUEST1} & ${GUEST2} - All Variants 16:9`;
  for (const v of variants) {
    const slide = pres16all.addSlide();
    build16x9(pres16all, slide, v, photos, logoPath, prtBadgePath);
  }
  const combined16 = `${filePrefix}_16x9_all.pptx`;
  await pres16all.writeFile({ fileName: path.join(OUTPUT_16x9, combined16) });
  console.log(`  Created: ${combined16}`);

  // Combined 1:1
  const pres1all = new pptxgen();
  pres1all.defineLayout({ name: "CUSTOM_1x1", width: 8, height: 8 });
  pres1all.layout = "CUSTOM_1x1";
  pres1all.author = "The Looth Group";
  pres1all.title = `${SHOW} - ${GUEST1} & ${GUEST2} - All Variants 1:1`;
  for (const v of variants) {
    const slide = pres1all.addSlide();
    build1x1(pres1all, slide, v, photos, logoPath, prtBadgePath);
  }
  const combined1 = `${filePrefix}_1x1_all.pptx`;
  await pres1all.writeFile({ fileName: path.join(OUTPUT_1x1, combined1) });
  console.log(`  Created: ${combined1}`);

  // --- JSON layouts for editor ---
  console.log("\nBuilding editor JSON layouts...");
  for (const v of variants) {
    const json16 = await buildFabricJSON('16x9', v, photos, logoPath, prtBadgePath);
    const jsonFile16 = `${filePrefix}_16x9_${v.name}.json`;
    fs.writeFileSync(path.join(OUTPUT_16x9, jsonFile16), JSON.stringify(json16, null, 2));
    console.log(`  Created: ${jsonFile16}`);

    const json1 = await buildFabricJSON('1x1', v, photos, logoPath, prtBadgePath);
    const jsonFile1 = `${filePrefix}_1x1_${v.name}.json`;
    fs.writeFileSync(path.join(OUTPUT_1x1, jsonFile1), JSON.stringify(json1, null, 2));
    console.log(`  Created: ${jsonFile1}`);
  }

  // Cleanup temp
  console.log("\nCleaning up temp files...");
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });

  console.log("\nDone! Output:");
  console.log("  16:9 files in ./output/16x9/");
  console.log("  1:1 files in ./output/1x1/");
  console.log("  Combined: _all.pptx has 3 slides (V1, V2, V3) per ratio");

  // --- Open editor if --open flag is passed (or always) ---
  const shouldOpen = process.argv.includes("--open") || process.argv.includes("-o");
  if (shouldOpen) {
    // Collect all JSON file paths relative to project root
    const jsonFiles = [];
    for (const v of variants) {
      jsonFiles.push(`output/16x9/${filePrefix}_16x9_${v.name}.json`);
      jsonFiles.push(`output/1x1/${filePrefix}_1x1_${v.name}.json`);
    }
    await openEditor(jsonFiles);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
