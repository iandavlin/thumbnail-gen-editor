// Episode asset prep for "AI-Assisted Web Design" (Ted Bergstrand, May 15).
//
//   1. Chromakey the black background off ted_bergstrand_android.jpg to get a
//      transparent PNG cutout for compositing.
//   2. Generate a matrix-rain background procedurally (SVG -> PNG via sharp)
//      at two sizes: 1920x1080 for 16:9 and 1080x1080 for 1:1.

const sharp = require('sharp');
const path = require('path');

const EPISODE = path.join(__dirname, 'assets', 'episode');
const SRC_TED = path.join(EPISODE, 'ted_bergstrand_android.jpg');
const OUT_TED = path.join(EPISODE, 'ted_bergstrand_android_cutout.png');
const OUT_BG_16X9 = path.join(EPISODE, 'matrix_rain_1920x1080.png');
const OUT_BG_1X1 = path.join(EPISODE, 'matrix_rain_1080x1080.png');

// --- 1. Chromakey ---
async function chromakeyTed() {
  const { data, info } = await sharp(SRC_TED)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  // Soft threshold: fully transparent below 25, feathered alpha through 45.
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i+1], b = data[i+2];
    const max = Math.max(r, g, b);
    if (max < 25) {
      data[i+3] = 0;
    } else if (max < 45) {
      data[i+3] = Math.round(((max - 25) / 20) * 255);
    }
  }
  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(OUT_TED);
  console.log(`wrote ${OUT_TED}`);
}

// --- 2. Matrix rain SVG -> PNG ---
// Katakana half-width range plus digits. Most CJK system fonts render these.
const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';
const rnd = (min, max) => min + Math.random() * (max - min);
const pickChar = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

function matrixSVG(W, H, colW = 22, rowH = 26) {
  const cols = Math.ceil(W / colW);
  const rows = Math.ceil(H / rowH);
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  parts.push(`<rect width="${W}" height="${H}" fill="#050a05"/>`);
  // Subtle vertical glow gradient to pretend it's CRT-y
  parts.push(`<defs><radialGradient id="glow" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#001500" stop-opacity="0.0"/><stop offset="100%" stop-color="#000000" stop-opacity="0.5"/></radialGradient></defs>`);

  for (let c = 0; c < cols; c++) {
    const x = c * colW + colW / 2;
    // Each column has a single bright "head" somewhere with a fading tail.
    const headRow = Math.floor(rnd(-rows * 0.3, rows * 1.3));
    const trailLen = Math.floor(rnd(8, 28));
    for (let r = 0; r < rows; r++) {
      const dist = headRow - r;
      if (dist < 0 || dist > trailLen) continue;
      const y = r * rowH + rowH - 6;
      const t = dist / trailLen;               // 0 at head, 1 at tail tip
      const alpha = Math.max(0.05, 1 - t);
      const fill = dist === 0 ? '#E8FFE8' : (dist < 3 ? '#7FFF8A' : '#00C030');
      parts.push(`<text font-family="Consolas, 'Courier New', monospace" font-size="20" font-weight="bold" x="${x}" y="${y}" fill="${fill}" fill-opacity="${alpha.toFixed(2)}" text-anchor="middle">${pickChar()}</text>`);
    }
  }
  parts.push(`<rect width="${W}" height="${H}" fill="url(#glow)"/>`);
  parts.push('</svg>');
  return parts.join('');
}

async function renderMatrix(outPath, W, H) {
  const svg = matrixSVG(W, H);
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`wrote ${outPath}`);
}

(async () => {
  await chromakeyTed();
  await renderMatrix(OUT_BG_16X9, 1920, 1080);
  await renderMatrix(OUT_BG_1X1, 1080, 1080);
})().catch(err => { console.error(err); process.exit(1); });
