const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// --- CONFIG ---
const GUEST_LINE = "Dr David Olson & Eric Warner";
const DATE_LINE = "APRIL 28  \u2022  12 PM EASTERN";
const PHOTO_PATH = path.join(__dirname, "assets", "episode", "David_Olson_H (1).jpeg");
const LOGO_PATH = path.join(__dirname, "assets", "loothgrouphighrez (1).png");
const PRT_BADGE_PATH = path.join(__dirname, "assets", "episode", "PRT_badge_mist.webp");
const OUTPUT_DIR = path.join(__dirname, "output");
const OUTPUT_1x1 = path.join(OUTPUT_DIR, "1x1");
const TEMP_DIR = path.join(__dirname, "temp");

const C = {
  GOLD: "ECB351",
  GOLD_LIGHT: "F1DE83",
  GREEN_PALE: "D4E0B8",
  GREEN_DARK: "87986A",
  CORAL: "FE6B4F",
  DARK: "2B2318",
  OFFWHITE: "FAF6EE",
  WHITE: "FFFFFF",
};

// Match the user's tweaked 16:9 style — variants differ by color only
const variants = [
  {
    name: "v1",
    label: "Dark & Gold",
    badgeBg: C.DARK,
    barBg: C.GREEN_DARK,
    nameColor: C.GOLD,
    dateColor: C.OFFWHITE,
  },
  {
    name: "v2",
    label: "Forest & Gold",
    badgeBg: C.GREEN_DARK,
    barBg: C.DARK,
    nameColor: C.GOLD,
    dateColor: C.OFFWHITE,
  },
  {
    name: "v3",
    label: "Warm & Light",
    badgeBg: C.GREEN_PALE,
    barBg: C.DARK,
    nameColor: C.CORAL,
    dateColor: C.OFFWHITE,
  },
];

async function prepareAssets() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  const meta = await sharp(PHOTO_PATH).metadata();
  console.log(`  Photo: ${meta.width}x${meta.height}`);

  // Wide crop biased left for David — used as top banner in square
  const side = Math.min(meta.width, meta.height);
  const cropLeft = Math.max(0, Math.floor(meta.width * 0.05));
  const cropW = Math.min(meta.width - cropLeft, Math.floor(side * 1.5));
  const photoPath = path.join(TEMP_DIR, "photo_wide.png");
  await sharp(PHOTO_PATH)
    .extract({ left: cropLeft, top: 0, width: cropW, height: meta.height })
    .png()
    .toFile(photoPath);

  const logoPath = path.join(TEMP_DIR, "logo.png");
  await sharp(LOGO_PATH).resize(400, 400, { fit: "inside" }).png().toFile(logoPath);

  const badgePath = path.join(TEMP_DIR, "prt_badge.png");
  await sharp(PRT_BADGE_PATH).resize(500, 500, { fit: "inside" }).png().toFile(badgePath);

  return { photoPath, logoPath, badgePath };
}

function buildSquare(pres, slide, v, assets) {
  const S = 8;

  // Layout: photo top-left ~60% width x ~60% height, badge top-right, bottom bar
  const photoW = S * 0.65;
  const photoH = S * 0.60;
  const badgeAreaW = S - photoW;

  // Background for badge area (right strip)
  slide.background = { color: v.badgeBg };

  // Photo — top left, cover to fill without stretching
  slide.addImage({
    path: assets.photoPath,
    x: 0,
    y: 0,
    w: photoW,
    h: photoH,
    sizing: { type: "cover", w: photoW, h: photoH },
  });

  // PRT badge — centered in right area, vertically centered in photo zone
  const badgeSize = badgeAreaW * 0.85;
  const badgeX = photoW + (badgeAreaW - badgeSize) / 2;
  const badgeY = (photoH - badgeSize) / 2;
  slide.addImage({
    path: assets.badgePath,
    x: badgeX,
    y: badgeY,
    w: badgeSize,
    h: badgeSize,
    sizing: { type: "contain", w: badgeSize, h: badgeSize },
  });

  // Bottom bar — dark, full width, from below photo to bottom
  const barY = photoH;
  const barH = S - photoH;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0,
    y: barY,
    w: S,
    h: barH,
    fill: { color: v.barBg },
  });

  // Guest names — large, centered
  slide.addText(GUEST_LINE, {
    x: 1.2,
    y: barY + 0.25,
    w: S - 1.6,
    h: 1.2,
    fontSize: 32,
    fontFace: "Jost",
    bold: true,
    color: v.nameColor,
    align: "center",
    valign: "middle",
    margin: 0,
  });

  // Date line — below names
  slide.addText(DATE_LINE, {
    x: 1.2,
    y: barY + 1.5,
    w: S - 1.6,
    h: 0.8,
    fontSize: 24,
    fontFace: "Jost",
    bold: true,
    color: v.dateColor,
    align: "center",
    valign: "middle",
    margin: 0,
  });

  // Looth logo — bottom left, overlapping photo/bar edge
  const logoSize = 1.1;
  slide.addImage({
    path: assets.logoPath,
    x: 0.15,
    y: barY - logoSize * 0.4,
    w: logoSize,
    h: logoSize,
    sizing: { type: "contain", w: logoSize, h: logoSize },
  });
}

async function main() {
  if (!fs.existsSync(OUTPUT_1x1)) fs.mkdirSync(OUTPUT_1x1, { recursive: true });

  console.log("Preparing assets...");
  const assets = await prepareAssets();

  const filePrefix = "sonic_grading_olson_warner";

  // Individual files
  for (const v of variants) {
    const pres = new pptxgen();
    pres.defineLayout({ name: "SQ", width: 8, height: 8 });
    pres.layout = "SQ";
    pres.author = "The Looth Group";
    pres.title = `Sonic Grading - ${v.label} (1:1)`;

    const slide = pres.addSlide();
    buildSquare(pres, slide, v, assets);

    const fname = `${filePrefix}_1x1_${v.name}.pptx`;
    await pres.writeFile({ fileName: path.join(OUTPUT_1x1, fname) });
    console.log(`  Created: ${fname}`);
  }

  // Combined file
  const presAll = new pptxgen();
  presAll.defineLayout({ name: "SQ", width: 8, height: 8 });
  presAll.layout = "SQ";
  presAll.author = "The Looth Group";
  presAll.title = "Sonic Grading - All Variants (1:1)";
  for (const v of variants) {
    const slide = presAll.addSlide();
    buildSquare(presAll, slide, v, assets);
  }
  const combinedName = `${filePrefix}_1x1_all.pptx`;
  await presAll.writeFile({ fileName: path.join(OUTPUT_1x1, combinedName) });
  console.log(`  Created: ${combinedName}`);

  // Cleanup
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  console.log("\nDone! 1:1 variants in ./output/1x1/");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
