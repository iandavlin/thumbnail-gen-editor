#!/usr/bin/env node
// Scans assets/_permanent/ and regenerates manifest.json.
// - Auto-fills mechanical fields (width, height, format, fileSize, hasAlpha, hash)
// - PRESERVES human-authored fields (tags, description, usage, safeArea, focalPoint, variants)
// - Drops entries whose files no longer exist
// - Ids default to the path without extension, with slashes->dashes
//   (e.g. "logos/looth-group.png" -> id "logos-looth-group"), unless
//   an existing manifest entry already maps that path to a different id.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const PERM_DIR = path.join(ROOT, "assets", "_permanent");
const MANIFEST_PATH = path.join(PERM_DIR, "manifest.json");

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
const HUMAN_FIELDS = ["displayName", "tags", "description", "usage", "safeArea", "focalPoint", "variants", "addedAt"];

function walk(dir, rel = "") {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "manifest.json" || entry.name === "manifest.schema.json") continue;
    const abs = path.join(dir, entry.name);
    const r = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(abs, r));
    else if (IMAGE_EXTS.has(path.extname(entry.name).toLowerCase())) out.push(r);
  }
  return out;
}

function idFromPath(p) {
  return p.replace(/\.[^.]+$/, "").replace(/[/\\]/g, "-").toLowerCase();
}

async function probeImage(absPath, ext) {
  const buf = fs.readFileSync(absPath);
  const hash = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
  const fileSize = buf.length;
  const format = ext.slice(1).toLowerCase();

  if (format === "svg") {
    return { width: 0, height: 0, aspectRatio: 0, format, fileSize, hasAlpha: true, hash };
  }

  const meta = await sharp(buf).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  return {
    width,
    height,
    aspectRatio: height ? Number((width / height).toFixed(4)) : 0,
    format: format === "jpeg" ? "jpg" : format,
    fileSize,
    hasAlpha: !!meta.hasAlpha,
    hash,
  };
}

async function main() {
  if (!fs.existsSync(PERM_DIR)) {
    console.error(`Missing ${PERM_DIR}`);
    process.exit(1);
  }

  let prev = { schemaVersion: 1, assets: {} };
  if (fs.existsSync(MANIFEST_PATH)) {
    try { prev = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")); } catch {}
  }
  const prevByPath = {};
  for (const [id, entry] of Object.entries(prev.assets || {})) prevByPath[entry.path] = { id, entry };

  const files = walk(PERM_DIR);
  const assets = {};

  for (const relPath of files) {
    const absPath = path.join(PERM_DIR, relPath);
    const ext = path.extname(relPath).toLowerCase();
    const existing = prevByPath[relPath];
    const id = existing ? existing.id : idFromPath(relPath);

    const probed = await probeImage(absPath, ext);
    const entry = { path: relPath, ...probed };

    if (existing) {
      for (const f of HUMAN_FIELDS) {
        if (existing.entry[f] !== undefined) entry[f] = existing.entry[f];
      }
    } else {
      entry.addedAt = new Date().toISOString().slice(0, 10);
      entry.tags = [];
    }
    assets[id] = entry;
  }

  const manifest = {
    schemaVersion: 1,
    tagVocabulary: prev.tagVocabulary || ["logo", "brand", "texture", "photo", "icon", "background"],
    assets,
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  const added = Object.keys(assets).filter(id => !prev.assets || !prev.assets[id]);
  const removed = Object.keys(prev.assets || {}).filter(id => !assets[id]);
  console.log(`Wrote ${MANIFEST_PATH}`);
  console.log(`  ${Object.keys(assets).length} assets (${added.length} added, ${removed.length} removed)`);
  if (added.length) console.log(`  + ${added.join(", ")}`);
  if (removed.length) console.log(`  - ${removed.join(", ")}`);
}

main().catch(err => { console.error(err); process.exit(1); });
