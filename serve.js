const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = __dirname;
const PORT = 3333;

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// --- Config ------------------------------------------------------------------
const CONFIG_PATH = path.join(ROOT, "config.json");

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")); }
  catch { return {}; }
}
function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + "\n");
}
let cfg = loadConfig();

// Resolve a config dir entry. value may be absolute, relative-to-ROOT, or absent.
function resolveDir(value, ...fallbackSegments) {
  if (!value) return path.join(ROOT, ...fallbackSegments);
  return path.isAbsolute(value) ? value : path.join(ROOT, value);
}
function getAssetsDir()   { return resolveDir(cfg.assetsDir,    "assets"); }
function getPermDir()     { return resolveDir(cfg.permanentDir, "assets", "_permanent"); }
function getPatternsDir() { return resolveDir(cfg.patternsDir,  "templates", "patterns"); }
function getOutputDir()   { return resolveDir(cfg.outputDir,    "output"); }

// Default values shown in the UI (relative paths from ROOT)
const DEFAULTS = {
  assetsDir:    "assets",
  permanentDir: "assets/_permanent",
  patternsDir:  "templates/patterns",
  outputDir:    "output",
};

// -----------------------------------------------------------------------------

function jsonResp(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch { resolve({}); }
    });
    req.on("error", reject);
  });
}

function rebuildManifest() {
  try {
    execFileSync(process.execPath, [path.join(ROOT, "scripts", "rebuild-manifest.js")], { stdio: "pipe" });
    return true;
  } catch (e) {
    console.error("rebuild-manifest failed:", e.message);
    return false;
  }
}

function decodeDataUrl(dataUrl) {
  const m = /^data:image\/([a-z+]+);base64,(.+)$/i.exec(dataUrl || "");
  if (!m) return null;
  let ext = m[1].toLowerCase();
  if (ext === "jpeg") ext = "jpg";
  if (ext === "svg+xml") ext = "svg";
  if (!["png", "jpg", "webp", "gif", "svg"].includes(ext)) return null;
  return { buffer: Buffer.from(m[2], "base64"), ext };
}

function safeSegment(s, max = 60) {
  return String(s || "").replace(/[^a-zA-Z0-9_\-]/g, "_").replace(/_+/g, "_").slice(0, max);
}

// Resolve a static file path for a URL, routing configured dirs to their
// real filesystem locations while keeping everything else under ROOT.
// Returns null if the path escapes its allowed directory.
function resolveStaticPath(urlPath) {
  const ASSETS_PREFIX   = "/assets/";
  const PATTERNS_PREFIX = "/templates/patterns/";

  let fsPath, allowedBase;

  const OUTPUT_PREFIX = "/output/";
  if (urlPath === "/assets" || urlPath.startsWith(ASSETS_PREFIX)) {
    const rel = urlPath === "/assets" ? "" : urlPath.slice(ASSETS_PREFIX.length);
    fsPath = path.join(getAssetsDir(), rel);
    allowedBase = getAssetsDir();
  } else if (urlPath === "/templates/patterns" || urlPath.startsWith(PATTERNS_PREFIX)) {
    const rel = urlPath === "/templates/patterns" ? "" : urlPath.slice(PATTERNS_PREFIX.length);
    fsPath = path.join(getPatternsDir(), rel);
    allowedBase = getPatternsDir();
  } else if (urlPath === "/output" || urlPath.startsWith(OUTPUT_PREFIX)) {
    const rel = urlPath === "/output" ? "" : urlPath.slice(OUTPUT_PREFIX.length);
    fsPath = path.join(getOutputDir(), rel);
    allowedBase = getOutputDir();
  } else {
    fsPath = path.join(ROOT, urlPath);
    allowedBase = ROOT;
  }

  // Guard against path traversal
  if (!fsPath.startsWith(allowedBase)) return null;
  return fsPath;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const pathname = decodeURIComponent(url.pathname);

  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // --- Config -----------------------------------------------------------------
  if (pathname === "/api/config") {
    if (req.method === "GET") {
      return jsonResp(res, { ...DEFAULTS, ...cfg, _defaults: DEFAULTS });
    }
    if (req.method === "PATCH") {
      const body = await readBody(req);
      const keys = ["assetsDir", "permanentDir", "patternsDir", "outputDir"];
      keys.forEach(k => { if (body[k] !== undefined) cfg[k] = body[k] || ""; });
      saveConfig(cfg);
      return jsonResp(res, { ok: true, config: { ...DEFAULTS, ...cfg } });
    }
  }

  // --- Patterns ---------------------------------------------------------------
  if (pathname === "/api/patterns" && req.method === "GET") {
    const patternsDir = getPatternsDir();
    try {
      const allPatterns = [];
      const entries = fs.readdirSync(patternsDir, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory() && e.name.endsWith(".json")) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(patternsDir, e.name), "utf8"));
            allPatterns.push({ file: e.name, path: e.name, folder: null,
              url: `/templates/patterns/${e.name}`,
              name: data.name || e.name.replace(/\.json$/, ""),
              description: data.description || "", canvasRef: data.canvasRef || null, thumbnail: data.thumbnail || null });
          } catch {
            allPatterns.push({ file: e.name, path: e.name, folder: null, url: `/templates/patterns/${e.name}`, name: e.name.replace(/\.json$/, "") });
          }
        }
      }
      for (const e of entries) {
        if (e.isDirectory() && /^[a-zA-Z0-9_-]+$/.test(e.name)) {
          const subDir = path.join(patternsDir, e.name);
          try {
            const subFiles = fs.readdirSync(subDir).filter(f => f.endsWith(".json")).sort();
            for (const f of subFiles) {
              try {
                const data = JSON.parse(fs.readFileSync(path.join(subDir, f), "utf8"));
                allPatterns.push({ file: f, path: `${e.name}/${f}`, folder: e.name,
                  url: `/templates/patterns/${e.name}/${f}`,
                  name: data.name || f.replace(/\.json$/, ""),
                  description: data.description || "", canvasRef: data.canvasRef || null, thumbnail: data.thumbnail || null });
              } catch {
                allPatterns.push({ file: f, path: `${e.name}/${f}`, folder: e.name, url: `/templates/patterns/${e.name}/${f}`, name: f.replace(/\.json$/, "") });
              }
            }
          } catch {}
        }
      }
      allPatterns.sort((a, b) => {
        if (a.folder === b.folder) return a.file.localeCompare(b.file);
        if (!a.folder) return -1; if (!b.folder) return 1;
        return a.folder.localeCompare(b.folder);
      });
      return jsonResp(res, allPatterns);
    } catch { return jsonResp(res, []); }
  }

  if (pathname === "/api/patterns-folders" && req.method === "GET") {
    const patternsDir = getPatternsDir();
    try {
      const entries = fs.readdirSync(patternsDir, { withFileTypes: true });
      const folders = entries.filter(e => e.isDirectory() && /^[a-zA-Z0-9_-]+$/.test(e.name)).map(e => e.name).sort();
      return jsonResp(res, folders);
    } catch { return jsonResp(res, []); }
  }

  if (pathname === "/api/patterns-folder" && req.method === "POST") {
    const body = await readBody(req);
    if (!body.folder) return jsonResp(res, { error: "folder required" }, 400);
    const safeFolder = String(body.folder).replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 50);
    if (!safeFolder) return jsonResp(res, { error: "invalid folder name" }, 400);
    const folderPath = path.join(getPatternsDir(), safeFolder);
    fs.mkdirSync(folderPath, { recursive: true });
    fs.writeFileSync(path.join(folderPath, ".keep"), "");
    return jsonResp(res, { ok: true, folder: safeFolder });
  }

  const folderDelMatch = pathname.match(/^\/api\/patterns-folder\/([a-zA-Z0-9_\-]+)$/);
  if (folderDelMatch && req.method === "DELETE") {
    const safeFolder = folderDelMatch[1];
    const patternsDir = getPatternsDir();
    const folderPath = path.join(patternsDir, safeFolder);
    if (!folderPath.startsWith(patternsDir + path.sep)) return jsonResp(res, { error: "forbidden" }, 403);
    if (!fs.existsSync(folderPath)) return jsonResp(res, { error: "not found" }, 404);
    fs.rmSync(folderPath, { recursive: true, force: true });
    return jsonResp(res, { ok: true });
  }

  if (pathname === "/api/patterns-move" && req.method === "POST") {
    const body = await readBody(req);
    const fromPath = body.from;
    if (!fromPath || !/^(?:[a-zA-Z0-9_\-]+\/)?[a-zA-Z0-9_\-\.]+\.json$/.test(fromPath))
      return jsonResp(res, { error: "invalid from path" }, 400);
    const patternsDir = getPatternsDir();
    const fromAbs = path.join(patternsDir, fromPath);
    if (!fromAbs.startsWith(patternsDir)) return jsonResp(res, { error: "forbidden" }, 403);
    if (!fs.existsSync(fromAbs)) return jsonResp(res, { error: "not found" }, 404);
    const filename = path.basename(fromPath);
    let toDir = patternsDir;
    if (body.folder) {
      const safeFolder = String(body.folder).replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 50);
      if (safeFolder) toDir = path.join(patternsDir, safeFolder);
    }
    fs.mkdirSync(toDir, { recursive: true });
    const toAbs = path.join(toDir, filename);
    if (fromAbs !== toAbs) fs.renameSync(fromAbs, toAbs);
    return jsonResp(res, { ok: true });
  }

  if (pathname === "/api/patterns" && req.method === "POST") {
    const body = await readBody(req);
    if (!body.filename || !body.pattern) return jsonResp(res, { error: "filename and pattern required" }, 400);
    const safeFile = path.basename(body.filename).replace(/[^a-zA-Z0-9_\-\.]/g, "_");
    if (!safeFile.endsWith(".json")) return jsonResp(res, { error: "filename must end in .json" }, 400);
    const patternsDir = getPatternsDir();
    let targetDir = patternsDir;
    if (body.folder) {
      const safeFolder = String(body.folder).replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 50);
      if (safeFolder) targetDir = path.join(patternsDir, safeFolder);
    }
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, safeFile), JSON.stringify(body.pattern, null, 2));
    return jsonResp(res, { ok: true, file: safeFile });
  }

  const delMatch = pathname.match(/^\/api\/patterns\/(.+\.json)$/);
  if (delMatch && req.method === "DELETE") {
    const relPath = delMatch[1];
    if (!/^(?:[a-zA-Z0-9_\-]+\/)?[a-zA-Z0-9_\-\.]+\.json$/.test(relPath))
      return jsonResp(res, { error: "invalid path" }, 400);
    const patternsDir = getPatternsDir();
    const filePath2 = path.join(patternsDir, relPath);
    if (!filePath2.startsWith(patternsDir)) return jsonResp(res, { error: "forbidden" }, 403);
    if (!fs.existsSync(filePath2)) return jsonResp(res, { error: "not found" }, 404);
    fs.unlinkSync(filePath2);
    return jsonResp(res, { ok: true });
  }

  // --- Assets -----------------------------------------------------------------
  if (pathname === "/api/assets" && req.method === "GET") {
    const manifestPath = path.join(getPermDir(), "manifest.json");
    if (!fs.existsSync(manifestPath)) return jsonResp(res, { schemaVersion: 1, assets: {} });
    try {
      const data = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      for (const id of Object.keys(data.assets || {})) {
        data.assets[id].url = `/assets/_permanent/${data.assets[id].path}`;
      }
      return jsonResp(res, data);
    } catch (e) { return jsonResp(res, { error: e.message }, 500); }
  }

  if (pathname === "/api/episodes" && req.method === "GET") {
    try {
      const entries = fs.readdirSync(getAssetsDir(), { withFileTypes: true })
        .filter(e => e.isDirectory() && !e.name.startsWith("_"))
        .map(e => e.name).sort();
      return jsonResp(res, entries);
    } catch { return jsonResp(res, []); }
  }

  const epFilesMatch = pathname.match(/^\/api\/episode-files\/([^/]+)$/);
  if (epFilesMatch && req.method === "GET") {
    const episode = safeSegment(decodeURIComponent(epFilesMatch[1]));
    if (!episode) return jsonResp(res, { error: "invalid episode" }, 400);
    const epDir = path.join(getAssetsDir(), episode);
    if (!epDir.startsWith(getAssetsDir() + path.sep) && epDir !== getAssetsDir()) return jsonResp(res, { error: "forbidden" }, 403);
    try {
      const IMAGE_RE = /\.(png|jpe?g|webp|gif|svg|avif)$/i;
      const files = fs.readdirSync(epDir, { withFileTypes: true })
        .filter(e => e.isFile() && IMAGE_RE.test(e.name))
        .map(e => ({ name: e.name, url: `/assets/${episode}/${e.name}` }));
      return jsonResp(res, { episode, files });
    } catch { return jsonResp(res, { episode, files: [] }); }
  }

  if (pathname === "/api/assets" && req.method === "POST") {
    const body = await readBody(req);
    const dest = body.destination;
    const decoded = decodeDataUrl(body.dataUrl);
    if (!decoded) return jsonResp(res, { error: "invalid dataUrl" }, 400);
    const baseName = safeSegment((body.filename || "asset").replace(/\.[^.]+$/, ""));
    if (!baseName) return jsonResp(res, { error: "invalid filename" }, 400);
    const finalName = `${baseName}.${decoded.ext}`;

    if (dest === "permanent") {
      const permDir = getPermDir();
      const subfolder = safeSegment(body.subfolder || "misc") || "misc";
      const destDir = path.join(permDir, subfolder);
      fs.mkdirSync(destDir, { recursive: true });
      const destPath = path.join(destDir, finalName);
      if (!destPath.startsWith(permDir + path.sep)) return jsonResp(res, { error: "forbidden" }, 403);
      fs.writeFileSync(destPath, decoded.buffer);
      rebuildManifest();
      const manifestPath = path.join(permDir, "manifest.json");
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const relPath = `${subfolder}/${finalName}`;
      const id = Object.keys(manifest.assets).find(k => manifest.assets[k].path === relPath);
      if (id) {
        if (Array.isArray(body.tags)) manifest.assets[id].tags = body.tags;
        if (body.description) manifest.assets[id].description = body.description;
        if (body.usage) manifest.assets[id].usage = body.usage;
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
      }
      return jsonResp(res, { ok: true, id, path: relPath, url: `/assets/_permanent/${relPath}` });
    }

    if (dest === "episode") {
      const assetsDir = getAssetsDir();
      const episode = safeSegment(body.episode || "");
      if (!episode) return jsonResp(res, { error: "episode required" }, 400);
      const destDir = path.join(assetsDir, episode);
      fs.mkdirSync(destDir, { recursive: true });
      const destPath = path.join(destDir, finalName);
      if (!destPath.startsWith(assetsDir + path.sep)) return jsonResp(res, { error: "forbidden" }, 403);
      fs.writeFileSync(destPath, decoded.buffer);
      return jsonResp(res, { ok: true, path: `${episode}/${finalName}`, url: `/assets/${episode}/${finalName}` });
    }
    return jsonResp(res, { error: "invalid destination" }, 400);
  }

  if (pathname === "/api/assets/rebuild" && req.method === "POST") {
    return jsonResp(res, { ok: rebuildManifest() });
  }

  const assetIdMatch = pathname.match(/^\/api\/assets\/([a-zA-Z0-9_\-]+)$/);
  if (assetIdMatch && (req.method === "PATCH" || req.method === "DELETE")) {
    const id = assetIdMatch[1];
    const permDir = getPermDir();
    const manifestPath = path.join(permDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) return jsonResp(res, { error: "no manifest" }, 404);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const entry = manifest.assets[id];
    if (!entry) return jsonResp(res, { error: "asset not found" }, 404);

    if (req.method === "DELETE") {
      const absPath = path.join(permDir, entry.path);
      if (!absPath.startsWith(permDir + path.sep)) return jsonResp(res, { error: "forbidden" }, 403);
      if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
      delete manifest.assets[id];
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
      return jsonResp(res, { ok: true });
    }

    const body = await readBody(req);
    let newId = id;
    if (body.rename) {
      const newBase = safeSegment(String(body.rename).replace(/\.[^.]+$/, ""));
      if (!newBase) return jsonResp(res, { error: "invalid rename" }, 400);
      const ext = path.extname(entry.path);
      const dir = path.dirname(entry.path);
      const newRel = (dir === "." ? "" : dir + "/") + newBase + ext;
      const oldAbs = path.join(permDir, entry.path);
      const newAbs = path.join(permDir, newRel);
      if (!newAbs.startsWith(permDir + path.sep)) return jsonResp(res, { error: "forbidden" }, 403);
      if (fs.existsSync(newAbs) && newAbs !== oldAbs) return jsonResp(res, { error: "target filename exists" }, 409);
      fs.renameSync(oldAbs, newAbs);
      entry.path = newRel;
      newId = newRel.replace(/\.[^.]+$/, "").replace(/[/\\]/g, "-").toLowerCase();
      if (newId !== id) { delete manifest.assets[id]; manifest.assets[newId] = entry; }
    }
    const patchable = ["displayName", "tags", "description", "usage"];
    for (const f of patchable) {
      if (body[f] !== undefined) {
        if (f === "tags" && !Array.isArray(body[f])) continue;
        manifest.assets[newId][f] = body[f];
      }
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    return jsonResp(res, { ok: true, id: newId, path: manifest.assets[newId].path });
  }

  // --- JSON output ------------------------------------------------------------
  // POST /api/save-json  { filename, subfolder?, data }
  // Saves a thumbnail JSON to the configured output directory.
  if (pathname === "/api/save-json" && req.method === "POST") {
    const body = await readBody(req);
    if (!body.filename || !body.data) return jsonResp(res, { error: "filename and data required" }, 400);
    const safeFile = path.basename(String(body.filename)).replace(/[^a-zA-Z0-9_\-\.]/g, "_");
    if (!safeFile.endsWith(".json")) return jsonResp(res, { error: "filename must end in .json" }, 400);
    const outputDir = getOutputDir();
    let targetDir = outputDir;
    if (body.subfolder) {
      const sf = String(body.subfolder).replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 50);
      if (sf) targetDir = path.join(outputDir, sf);
    }
    fs.mkdirSync(targetDir, { recursive: true });
    const dest = path.join(targetDir, safeFile);
    if (!dest.startsWith(outputDir + path.sep) && dest !== outputDir) return jsonResp(res, { error: "forbidden" }, 403);
    const payload = typeof body.data === "string" ? body.data : JSON.stringify(body.data, null, 2);
    fs.writeFileSync(dest, payload);
    if (body.preview) {
      const decoded = decodeDataUrl(String(body.preview));
      if (decoded) {
        const previewDest = dest.replace(/\.json$/i, ".preview." + decoded.ext);
        try { fs.writeFileSync(previewDest, decoded.buffer); } catch {}
      }
    }
    const rel = path.relative(outputDir, dest).replace(/\\/g, "/");
    return jsonResp(res, { ok: true, path: rel, dir: outputDir });
  }

  // GET /api/outputs — list JSON files in the output directory
  if (pathname === "/api/outputs" && req.method === "GET") {
    const outputDir = getOutputDir();
    try {
      const results = [];
      const scan = (dir, prefix) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          if (e.isDirectory()) scan(path.join(dir, e.name), prefix ? `${prefix}/${e.name}` : e.name);
          else if (e.name.endsWith(".json")) results.push(prefix ? `${prefix}/${e.name}` : e.name);
        }
      };
      if (fs.existsSync(outputDir)) scan(outputDir, "");
      return jsonResp(res, results.sort());
    } catch { return jsonResp(res, []); }
  }

  // --- Static file fallback ---------------------------------------------------
  let urlPath = pathname;
  if (urlPath === "/") urlPath = "/editor.html";

  const filePath = resolveStaticPath(urlPath);
  if (!filePath) { res.writeHead(403); res.end("Forbidden"); return; }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found: " + urlPath);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";
  const headers = { "Content-Type": mime, "Access-Control-Allow-Origin": "*" };
  if (ext === ".html") headers["Cache-Control"] = "no-store";
  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Editor server running at http://127.0.0.1:${PORT}`);
});
