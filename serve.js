const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = __dirname;
const PORT = 3333;
const PERM_DIR = path.join(ROOT, "assets", "_permanent");
const EPISODES_DIR = path.join(ROOT, "assets");

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
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

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

// Decode dataURL "data:image/png;base64,...." => { buffer, ext }
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const pathname = decodeURIComponent(url.pathname);

  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // GET /api/patterns — list templates/patterns/*.json and subfolders with metadata
  if (pathname === "/api/patterns" && req.method === "GET") {
    const patternsDir = path.join(ROOT, "templates", "patterns");
    try {
      const allPatterns = [];
      const entries = fs.readdirSync(patternsDir, { withFileTypes: true });
      // Root-level JSON files
      for (const e of entries) {
        if (!e.isDirectory() && e.name.endsWith(".json")) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(patternsDir, e.name), "utf8"));
            allPatterns.push({
              file: e.name, path: e.name, folder: null,
              url: `/templates/patterns/${e.name}`,
              name: data.name || e.name.replace(/\.json$/, ""),
              description: data.description || "",
              canvasRef: data.canvasRef || null,
              thumbnail: data.thumbnail || null,
            });
          } catch {
            allPatterns.push({ file: e.name, path: e.name, folder: null, url: `/templates/patterns/${e.name}`, name: e.name.replace(/\.json$/, "") });
          }
        }
      }
      // Subdirectory JSON files (1 level deep, safe folder names only)
      for (const e of entries) {
        if (e.isDirectory() && /^[a-zA-Z0-9_-]+$/.test(e.name)) {
          const subDir = path.join(patternsDir, e.name);
          try {
            const subFiles = fs.readdirSync(subDir).filter(f => f.endsWith(".json")).sort();
            for (const f of subFiles) {
              try {
                const data = JSON.parse(fs.readFileSync(path.join(subDir, f), "utf8"));
                allPatterns.push({
                  file: f, path: `${e.name}/${f}`, folder: e.name,
                  url: `/templates/patterns/${e.name}/${f}`,
                  name: data.name || f.replace(/\.json$/, ""),
                  description: data.description || "",
                  canvasRef: data.canvasRef || null,
                  thumbnail: data.thumbnail || null,
                });
              } catch {
                allPatterns.push({ file: f, path: `${e.name}/${f}`, folder: e.name, url: `/templates/patterns/${e.name}/${f}`, name: f.replace(/\.json$/, "") });
              }
            }
          } catch {}
        }
      }
      allPatterns.sort((a, b) => {
        if (a.folder === b.folder) return a.file.localeCompare(b.file);
        if (!a.folder) return -1;
        if (!b.folder) return 1;
        return a.folder.localeCompare(b.folder);
      });
      return jsonResp(res, allPatterns);
    } catch {
      return jsonResp(res, []);
    }
  }

  // GET /api/patterns-folders — list all subdirectory names (including empty ones)
  if (pathname === "/api/patterns-folders" && req.method === "GET") {
    const patternsDir = path.join(ROOT, "templates", "patterns");
    try {
      const entries = fs.readdirSync(patternsDir, { withFileTypes: true });
      const folders = entries
        .filter(e => e.isDirectory() && /^[a-zA-Z0-9_-]+$/.test(e.name))
        .map(e => e.name)
        .sort();
      return jsonResp(res, folders);
    } catch {
      return jsonResp(res, []);
    }
  }

  // POST /api/patterns-folder — create a new folder
  if (pathname === "/api/patterns-folder" && req.method === "POST") {
    const body = await readBody(req);
    if (!body.folder) return jsonResp(res, { error: "folder required" }, 400);
    const safeFolder = String(body.folder).replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 50);
    if (!safeFolder) return jsonResp(res, { error: "invalid folder name" }, 400);
    const folderPath = path.join(ROOT, "templates", "patterns", safeFolder);
    fs.mkdirSync(folderPath, { recursive: true });
    fs.writeFileSync(path.join(folderPath, ".keep"), "");
    return jsonResp(res, { ok: true, folder: safeFolder });
  }

  // DELETE /api/patterns-folder/:name — delete a folder and all its contents
  const folderDelMatch = pathname.match(/^\/api\/patterns-folder\/([a-zA-Z0-9_\-]+)$/);
  if (folderDelMatch && req.method === "DELETE") {
    const safeFolder = folderDelMatch[1];
    const folderPath = path.join(ROOT, "templates", "patterns", safeFolder);
    if (!folderPath.startsWith(path.join(ROOT, "templates", "patterns") + path.sep)) {
      return jsonResp(res, { error: "forbidden" }, 403);
    }
    if (!fs.existsSync(folderPath)) return jsonResp(res, { error: "not found" }, 404);
    fs.rmSync(folderPath, { recursive: true, force: true });
    return jsonResp(res, { ok: true });
  }

  // POST /api/patterns-move — move a pattern file to a different folder
  if (pathname === "/api/patterns-move" && req.method === "POST") {
    const body = await readBody(req);
    const fromPath = body.from;
    if (!fromPath || !/^(?:[a-zA-Z0-9_\-]+\/)?[a-zA-Z0-9_\-\.]+\.json$/.test(fromPath)) {
      return jsonResp(res, { error: "invalid from path" }, 400);
    }
    const fromAbs = path.join(ROOT, "templates", "patterns", fromPath);
    if (!fromAbs.startsWith(path.join(ROOT, "templates", "patterns"))) return jsonResp(res, { error: "forbidden" }, 403);
    if (!fs.existsSync(fromAbs)) return jsonResp(res, { error: "not found" }, 404);
    const filename = path.basename(fromPath);
    let toDir = path.join(ROOT, "templates", "patterns");
    if (body.folder) {
      const safeFolder = String(body.folder).replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 50);
      if (safeFolder) toDir = path.join(ROOT, "templates", "patterns", safeFolder);
    }
    fs.mkdirSync(toDir, { recursive: true });
    const toAbs = path.join(toDir, filename);
    if (fromAbs !== toAbs) fs.renameSync(fromAbs, toAbs);
    return jsonResp(res, { ok: true });
  }

  // POST /api/patterns — save a pattern JSON to templates/patterns/ or a subfolder
  if (pathname === "/api/patterns" && req.method === "POST") {
    const body = await readBody(req);
    if (!body.filename || !body.pattern) return jsonResp(res, { error: "filename and pattern required" }, 400);
    const safeFile = path.basename(body.filename).replace(/[^a-zA-Z0-9_\-\.]/g, "_");
    if (!safeFile.endsWith(".json")) return jsonResp(res, { error: "filename must end in .json" }, 400);
    let targetDir = path.join(ROOT, "templates", "patterns");
    if (body.folder) {
      const safeFolder = String(body.folder).replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 50);
      if (safeFolder) targetDir = path.join(ROOT, "templates", "patterns", safeFolder);
    }
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, safeFile), JSON.stringify(body.pattern, null, 2));
    return jsonResp(res, { ok: true, file: safeFile });
  }

  // DELETE /api/patterns/:path — supports folder/filename.json
  const delMatch = pathname.match(/^\/api\/patterns\/(.+\.json)$/);
  if (delMatch && req.method === "DELETE") {
    const relPath = delMatch[1];
    if (!/^(?:[a-zA-Z0-9_\-]+\/)?[a-zA-Z0-9_\-\.]+\.json$/.test(relPath)) {
      return jsonResp(res, { error: "invalid path" }, 400);
    }
    const filePath2 = path.join(ROOT, "templates", "patterns", relPath);
    if (!filePath2.startsWith(path.join(ROOT, "templates", "patterns"))) {
      return jsonResp(res, { error: "forbidden" }, 403);
    }
    if (!fs.existsSync(filePath2)) return jsonResp(res, { error: "not found" }, 404);
    fs.unlinkSync(filePath2);
    return jsonResp(res, { ok: true });
  }

  // GET /api/assets — return the full permanent manifest
  if (pathname === "/api/assets" && req.method === "GET") {
    const manifestPath = path.join(PERM_DIR, "manifest.json");
    if (!fs.existsSync(manifestPath)) return jsonResp(res, { schemaVersion: 1, assets: {} });
    try {
      const data = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      // Attach a served URL to each entry for convenience
      for (const id of Object.keys(data.assets || {})) {
        data.assets[id].url = `/assets/_permanent/${data.assets[id].path}`;
      }
      return jsonResp(res, data);
    } catch (e) {
      return jsonResp(res, { error: e.message }, 500);
    }
  }

  // GET /api/episodes — list episode folders under assets/
  if (pathname === "/api/episodes" && req.method === "GET") {
    try {
      const entries = fs.readdirSync(EPISODES_DIR, { withFileTypes: true })
        .filter(e => e.isDirectory() && !e.name.startsWith("_"))
        .map(e => e.name)
        .sort();
      return jsonResp(res, entries);
    } catch {
      return jsonResp(res, []);
    }
  }

  // POST /api/assets — upload an image. Body: { dataUrl, destination, filename, id?, tags?, description?, usage?, episode? }
  //   destination: "permanent" | "episode" | "oneoff"
  //   "oneoff" is a no-op on disk; the client just embeds the dataURL inline
  if (pathname === "/api/assets" && req.method === "POST") {
    const body = await readBody(req);
    const dest = body.destination;
    const decoded = decodeDataUrl(body.dataUrl);
    if (!decoded) return jsonResp(res, { error: "invalid dataUrl" }, 400);

    const baseName = safeSegment((body.filename || "asset").replace(/\.[^.]+$/, ""));
    if (!baseName) return jsonResp(res, { error: "invalid filename" }, 400);
    const finalName = `${baseName}.${decoded.ext}`;

    if (dest === "permanent") {
      const subfolder = safeSegment(body.subfolder || "misc") || "misc";
      const destDir = path.join(PERM_DIR, subfolder);
      fs.mkdirSync(destDir, { recursive: true });
      const destPath = path.join(destDir, finalName);
      if (!destPath.startsWith(PERM_DIR + path.sep)) return jsonResp(res, { error: "forbidden" }, 403);
      fs.writeFileSync(destPath, decoded.buffer);

      rebuildManifest();

      // Locate the entry we just added and patch in any human-authored fields
      const manifestPath = path.join(PERM_DIR, "manifest.json");
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
      const episode = safeSegment(body.episode || "");
      if (!episode) return jsonResp(res, { error: "episode required" }, 400);
      const destDir = path.join(EPISODES_DIR, episode);
      fs.mkdirSync(destDir, { recursive: true });
      const destPath = path.join(destDir, finalName);
      if (!destPath.startsWith(EPISODES_DIR + path.sep)) return jsonResp(res, { error: "forbidden" }, 403);
      fs.writeFileSync(destPath, decoded.buffer);
      return jsonResp(res, { ok: true, path: `${episode}/${finalName}`, url: `/assets/${episode}/${finalName}` });
    }

    return jsonResp(res, { error: "invalid destination" }, 400);
  }

  // POST /api/assets/rebuild — manually refresh manifest
  if (pathname === "/api/assets/rebuild" && req.method === "POST") {
    const ok = rebuildManifest();
    return jsonResp(res, { ok });
  }

  // PATCH /api/assets/:id — update human-authored fields + optional file rename
  // DELETE /api/assets/:id — remove file and manifest entry
  const assetIdMatch = pathname.match(/^\/api\/assets\/([a-zA-Z0-9_\-]+)$/);
  if (assetIdMatch && (req.method === "PATCH" || req.method === "DELETE")) {
    const id = assetIdMatch[1];
    const manifestPath = path.join(PERM_DIR, "manifest.json");
    if (!fs.existsSync(manifestPath)) return jsonResp(res, { error: "no manifest" }, 404);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const entry = manifest.assets[id];
    if (!entry) return jsonResp(res, { error: "asset not found" }, 404);

    if (req.method === "DELETE") {
      const absPath = path.join(PERM_DIR, entry.path);
      if (!absPath.startsWith(PERM_DIR + path.sep)) return jsonResp(res, { error: "forbidden" }, 403);
      if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
      delete manifest.assets[id];
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
      return jsonResp(res, { ok: true });
    }

    // PATCH
    const body = await readBody(req);
    // Optional file rename (changes the id — we remove the old key and add new)
    let newId = id;
    if (body.rename) {
      const newBase = safeSegment(String(body.rename).replace(/\.[^.]+$/, ""));
      if (!newBase) return jsonResp(res, { error: "invalid rename" }, 400);
      const ext = path.extname(entry.path);
      const dir = path.dirname(entry.path);
      const newRel = (dir === "." ? "" : dir + "/") + newBase + ext;
      const oldAbs = path.join(PERM_DIR, entry.path);
      const newAbs = path.join(PERM_DIR, newRel);
      if (!newAbs.startsWith(PERM_DIR + path.sep)) return jsonResp(res, { error: "forbidden" }, 403);
      if (fs.existsSync(newAbs) && newAbs !== oldAbs) return jsonResp(res, { error: "target filename exists" }, 409);
      fs.renameSync(oldAbs, newAbs);
      entry.path = newRel;
      newId = newRel.replace(/\.[^.]+$/, "").replace(/[/\\]/g, "-").toLowerCase();
      if (newId !== id) {
        delete manifest.assets[id];
        manifest.assets[newId] = entry;
      }
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

  // Static file fallback
  let urlPath = pathname;
  if (urlPath === "/") urlPath = "/editor.html";

  const filePath = path.join(ROOT, urlPath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found: " + urlPath);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": mime, "Access-Control-Allow-Origin": "*" });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Editor server running at http://127.0.0.1:${PORT}`);
});
