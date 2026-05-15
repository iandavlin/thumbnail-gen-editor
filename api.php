<?php
// /thumb/api.php — PHP port of serve.js endpoints with per-user namespacing.
// Routed via nginx: /thumb/api/* -> /thumb/api.php?path=*
//
// Layout (relative to this file):
//   ./editor.html
//   ./assets/_permanent/<sub>/<image>          (team library, manifest-managed)
//   ./assets/_permanent/manifest.json
//   ./assets/_user_<name>/<image>              (per-user personal assets)
//   ./assets/<episode>/<image>                 (per-episode shared buckets)
//   ./patterns/<file>.json                     (shared root-level patterns)
//   ./patterns/<folder>/<file>.json            (shared categorized patterns)
//   ./patterns/_user_<name>/<file>.json        (per-user patterns)
//   ./output/<file>.json                       (legacy shared outputs)
//   ./output/_user_<name>/<file>.json          (per-user outputs)
//   ./config.json (optional)
//
// User identity is taken from $_SERVER['REMOTE_USER'] (nginx basic auth).
// Patterns / outputs / personal assets default to the user's `_user_<name>/`
// namespace. Reads merge user + shared and tag each item with `source`
// ("mine" | "shared").

declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

$BASE     = __DIR__;
$ASSETS   = "$BASE/assets";
$PERM     = "$ASSETS/_permanent";
$PATTERNS = "$BASE/patterns";
$OUTPUT   = "$BASE/output";
$CONFIG   = "$BASE/config.json";

// --- Per-user identity ----------------------------------------------------
// Derived from HTTP basic auth username. Sanitize aggressively — this
// becomes part of a filesystem path.
$USER = preg_replace('/[^a-z0-9_-]/', '', strtolower($_SERVER['REMOTE_USER'] ?? ''));
if ($USER === '' || $USER[0] === '_') $USER = 'guest';
$USER_PREFIX = '_user_';
$USER_DIR    = $USER_PREFIX . $USER;          // e.g. "_user_ian"

$USER_PATTERNS = "$PATTERNS/$USER_DIR";
$USER_OUTPUT   = "$OUTPUT/$USER_DIR";
$USER_ASSETS   = "$ASSETS/$USER_DIR";

$DEFAULTS = [
  'assetsDir'    => 'assets',
  'permanentDir' => 'assets/_permanent',
  'patternsDir'  => 'patterns',
  'outputDir'    => 'output',
];

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('X-Thumb-User: ' . $USER);

function jr($x, int $code = 200): void {
  http_response_code($code);
  echo json_encode($x, JSON_UNESCAPED_SLASHES);
  exit;
}

function safe_seg(string $s): string {
  $s = preg_replace('#[/\\\\]#', '', $s) ?? '';
  $s = preg_replace('#\.\.+#', '', $s) ?? '';
  return $s;
}

function safe_folder(string $s): string {
  $s = preg_replace('#[^a-zA-Z0-9_\-]#', '_', $s) ?? '';
  return substr($s, 0, 50);
}

function safe_file(string $s): string {
  return preg_replace('#[^a-zA-Z0-9_\-.]#', '_', basename($s)) ?? '';
}

function within(string $base, string $abs): bool {
  $r = realpath($abs);
  $b = realpath($base);
  if ($r === false || $b === false) return false;
  return str_starts_with($r, $b . DIRECTORY_SEPARATOR) || $r === $b;
}

function read_body(): array {
  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $j = json_decode($raw, true);
  return is_array($j) ? $j : [];
}

function reject_unsafe_name(string $s): bool {
  if ($s === '' || $s[0] === '.') return true;
  if (str_contains($s, '..')) return true;
  if (str_contains($s, '/') || str_contains($s, '\\')) return true;
  return false;
}

// Is this folder a "_user_*" namespace owned by someone else?
function is_user_namespace(string $folder, string $current_user_dir): bool {
  global $USER_PREFIX;
  return str_starts_with($folder, $USER_PREFIX) && $folder !== $current_user_dir;
}

function ensure_dir(string $path): bool {
  if (is_dir($path)) return true;
  return @mkdir($path, 0775, true);
}

const IMAGE_MIME_MAP = [
  'image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp',
  'image/gif' => 'gif', 'image/svg+xml' => 'svg', 'image/avif' => 'avif',
];
const PREVIEW_MIME_MAP = IMAGE_MIME_MAP;

function decode_data_url(?string $url, array $allowedMap = IMAGE_MIME_MAP): ?array {
  if (!$url) return null;
  if (!preg_match('#^data:([^;,]+);base64,(.+)$#', $url, $m)) return null;
  $mime = strtolower($m[1]);
  if (!isset($allowedMap[$mime])) return null;
  $bin  = base64_decode($m[2], true);
  if ($bin === false) return null;
  if (strlen($bin) > 50 * 1024 * 1024) return null;
  return ['ext' => $allowedMap[$mime], 'buffer' => $bin];
}

function load_config(): array {
  global $CONFIG;
  if (!is_file($CONFIG)) return [];
  $j = json_decode((string)file_get_contents($CONFIG), true);
  return is_array($j) ? $j : [];
}
function save_config(array $cfg): void {
  global $CONFIG;
  file_put_contents($CONFIG, json_encode($cfg, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
}

function rebuild_manifest(): bool {
  global $PERM;
  if (!is_dir($PERM)) return false;
  $manifestPath = "$PERM/manifest.json";
  $manifest = ['schemaVersion' => 1, 'assets' => []];
  if (is_file($manifestPath)) {
    $j = json_decode((string)file_get_contents($manifestPath), true);
    if (is_array($j)) $manifest = $j;
    if (!isset($manifest['assets']) || !is_array($manifest['assets'])) $manifest['assets'] = [];
  }
  $existing = $manifest['assets'];
  $found    = [];
  $rii = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($PERM, FilesystemIterator::SKIP_DOTS)
  );
  $imgRe = '/\.(png|jpe?g|webp|gif|svg|avif)$/i';
  foreach ($rii as $f) {
    if (!$f->isFile() || !preg_match($imgRe, $f->getFilename())) continue;
    $rel = substr($f->getPathname(), strlen($PERM) + 1);
    $rel = str_replace(DIRECTORY_SEPARATOR, '/', $rel);
    $id  = preg_replace('/\.[^.]+$/', '', $rel);
    $id  = strtolower(str_replace('/', '-', (string)$id));
    $found[$id] = $rel;
  }
  $next = [];
  foreach ($found as $id => $rel) {
    if (isset($existing[$id])) {
      $entry = $existing[$id];
      $entry['path'] = $rel;
      $next[$id] = $entry;
    } else {
      $next[$id] = ['path' => $rel, 'tags' => [], 'description' => '', 'usage' => ''];
    }
  }
  $manifest['assets'] = $next;
  file_put_contents($manifestPath, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
  return true;
}

// ---------------------------------------------------------------------------

$path   = $_GET['path'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// --- Whoami -----------------------------------------------------------------
if ($path === 'whoami' && $method === 'GET') {
  jr(['user' => $USER, 'user_dir' => $USER_DIR]);
}

// --- Config -----------------------------------------------------------------
if ($path === 'config') {
  $cfg = load_config();
  if ($method === 'GET') jr(array_merge($DEFAULTS, $cfg, ['_defaults' => $DEFAULTS, 'user' => $USER]));
  if ($method === 'PATCH') {
    $body = read_body();
    foreach (['assetsDir','permanentDir','patternsDir','outputDir'] as $k) {
      if (array_key_exists($k, $body)) $cfg[$k] = (string)($body[$k] ?? '');
    }
    save_config($cfg);
    jr(['ok' => true, 'config' => array_merge($DEFAULTS, $cfg)]);
  }
}

// --- Patterns ---------------------------------------------------------------
if ($path === 'patterns' && $method === 'GET') {
  if (!is_dir($PATTERNS)) jr([]);
  $out = [];

  $emit = function(string $abs, string $file, ?string $folder, string $source) use (&$out) {
    $data = json_decode((string)file_get_contents($abs), true) ?: [];
    $rel = ($folder === null ? '' : "$folder/") . $file;
    $out[] = [
      'file'        => $file,
      'path'        => $rel,
      'folder'      => $folder,
      'url'         => "patterns/$rel",
      'source'      => $source,
      'name'        => (!empty($data['name']) ? $data['name'] : preg_replace('/\.json$/', '', $file)),
      'description' => $data['description'] ?? '',
      'canvasRef'   => $data['canvasRef'] ?? null,
      'thumbnail'   => $data['thumbnail'] ?? null,
    ];
  };

  foreach (scandir($PATTERNS) as $e) {
    if ($e === '.' || $e === '..') continue;
    $abs = "$PATTERNS/$e";
    if (is_file($abs) && str_ends_with($e, '.json')) $emit($abs, $e, null, 'shared');
  }

  foreach (scandir($PATTERNS) as $e) {
    if ($e === '.' || $e === '..') continue;
    $abs = "$PATTERNS/$e";
    if (!is_dir($abs)) continue;
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $e)) continue;
    if (is_user_namespace($e, $USER_DIR)) continue;

    $source = ($e === $USER_DIR) ? 'mine' : 'shared';
    $files = array_filter(scandir($abs), fn($f) => str_ends_with($f, '.json'));
    sort($files);
    foreach ($files as $f) $emit("$abs/$f", $f, $e, $source);
  }

  usort($out, function($a, $b) {
    if ($a['source'] !== $b['source']) return $a['source'] === 'mine' ? -1 : 1;
    if ($a['folder'] === $b['folder']) return strcmp($a['file'], $b['file']);
    if ($a['folder'] === null) return -1;
    if ($b['folder'] === null) return 1;
    return strcmp($a['folder'], $b['folder']);
  });
  jr($out);
}

if ($path === 'patterns-folders' && $method === 'GET') {
  if (!is_dir($PATTERNS)) jr([]);
  $folders = [];
  foreach (scandir($PATTERNS) as $e) {
    if (!is_dir("$PATTERNS/$e")) continue;
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $e)) continue;
    if (is_user_namespace($e, $USER_DIR)) continue;
    $folders[] = $e;
  }
  sort($folders);
  jr($folders);
}

if ($path === 'patterns-folder' && $method === 'POST') {
  $body = read_body();
  $folder = safe_folder((string)($body['folder'] ?? ''));
  if (!$folder) jr(['error' => 'invalid folder name'], 400);
  if (str_starts_with($folder, $USER_PREFIX)) jr(['error' => 'reserved folder prefix'], 400);
  $dir = "$PATTERNS/$folder";
  ensure_dir($dir);
  file_put_contents("$dir/.keep", '');
  jr(['ok' => true, 'folder' => $folder]);
}

if (preg_match('#^patterns-folder/([a-zA-Z0-9_\-]+)$#', $path, $m) && $method === 'DELETE') {
  $folder = $m[1];
  if (is_user_namespace($folder, $USER_DIR)) jr(['error' => 'forbidden'], 403);
  $dir = "$PATTERNS/$folder";
  if (!within($PATTERNS, $dir)) jr(['error' => 'forbidden'], 403);
  if (!is_dir($dir)) jr(['error' => 'not found'], 404);
  $rii = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
    RecursiveIteratorIterator::CHILD_FIRST
  );
  foreach ($rii as $f) { $f->isDir() ? rmdir($f->getPathname()) : unlink($f->getPathname()); }
  rmdir($dir);
  jr(['ok' => true]);
}

if ($path === 'patterns-move' && $method === 'POST') {
  $body = read_body();
  $from = (string)($body['from'] ?? '');
  if (!preg_match('#^(?:[a-zA-Z0-9_\-]+/)?[a-zA-Z0-9_\-.]+\.json$#', $from)) {
    jr(['error' => 'invalid from path'], 400);
  }
  $fromAbs = "$PATTERNS/$from";
  if (!within($PATTERNS, $fromAbs)) jr(['error' => 'forbidden'], 403);
  $fromParts = explode('/', $from);
  if (count($fromParts) > 1 && is_user_namespace($fromParts[0], $USER_DIR)) jr(['error' => 'forbidden'], 403);
  if (!is_file($fromAbs)) jr(['error' => 'not found'], 404);
  $name = basename($from);
  $toDir = $PATTERNS;
  if (!empty($body['folder'])) {
    $sf = safe_folder((string)$body['folder']);
    if ($sf && is_user_namespace($sf, $USER_DIR)) jr(['error' => 'forbidden'], 403);
    if ($sf) $toDir = "$PATTERNS/$sf";
  }
  ensure_dir($toDir);
  $toAbs = "$toDir/$name";
  if ($fromAbs !== $toAbs) rename($fromAbs, $toAbs);
  jr(['ok' => true]);
}

if ($path === 'patterns' && $method === 'POST') {
  $body = read_body();
  if (empty($body['filename']) || !isset($body['pattern'])) jr(['error' => 'filename and pattern required'], 400);
  $sf = safe_file((string)$body['filename']);
  if (reject_unsafe_name($sf)) jr(['error' => 'invalid filename'], 400);
  if (!str_ends_with($sf, '.json')) jr(['error' => 'filename must end in .json'], 400);

  $shared    = !empty($body['shared']);
  $targetDir = $shared ? $PATTERNS : $USER_PATTERNS;

  if (!empty($body['folder'])) {
    $f = safe_folder((string)$body['folder']);
    if (!$f || reject_unsafe_name($f)) jr(['error' => 'invalid folder'], 400);
    if (is_user_namespace($f, $USER_DIR)) jr(['error' => 'forbidden'], 403);
    $targetDir = $shared ? "$PATTERNS/$f" : "$USER_PATTERNS/$f";
  }
  ensure_dir($targetDir);
  file_put_contents("$targetDir/$sf", json_encode($body['pattern'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
  $rel = ltrim(str_replace($PATTERNS, '', "$targetDir/$sf"), '/');
  jr(['ok' => true, 'file' => $sf, 'path' => $rel, 'source' => $shared ? 'shared' : 'mine']);
}

// Promote a pattern from user-space to shared (move or copy).
if ($path === 'patterns-promote' && $method === 'POST') {
  $body = read_body();
  $from = (string)($body['from'] ?? '');
  if (!preg_match('#^[a-zA-Z0-9_\-]+/[a-zA-Z0-9_\-.]+\.json$#', $from)) jr(['error' => 'invalid path'], 400);
  $fromParts = explode('/', $from);
  if ($fromParts[0] !== $USER_DIR) jr(['error' => 'can only promote your own files'], 403);
  $fromAbs = "$PATTERNS/$from";
  if (!is_file($fromAbs)) jr(['error' => 'not found'], 404);
  $name = basename($from);
  $toDir = $PATTERNS;
  if (!empty($body['folder'])) {
    $sf = safe_folder((string)$body['folder']);
    if ($sf && is_user_namespace($sf, $USER_DIR)) jr(['error' => 'forbidden'], 403);
    if ($sf) { $toDir = "$PATTERNS/$sf"; ensure_dir($toDir); }
  }
  $toAbs = "$toDir/$name";
  if (file_exists($toAbs) && empty($body['overwrite'])) jr(['error' => 'target exists, pass overwrite=true to replace'], 409);
  copy($fromAbs, $toAbs);
  if (!empty($body['move'])) unlink($fromAbs);
  jr(['ok' => true, 'shared_path' => ltrim(str_replace($PATTERNS, '', $toAbs), '/')]);
}

// Fork a shared pattern into the user's namespace.
if ($path === 'patterns-fork' && $method === 'POST') {
  $body = read_body();
  $from = (string)($body['from'] ?? '');
  if (!preg_match('#^(?:[a-zA-Z0-9_\-]+/)?[a-zA-Z0-9_\-.]+\.json$#', $from)) jr(['error' => 'invalid path'], 400);
  $fromParts = explode('/', $from);
  if (count($fromParts) > 1 && is_user_namespace($fromParts[0], $USER_DIR)) jr(['error' => 'cannot fork another users file'], 403);
  $fromAbs = "$PATTERNS/$from";
  if (!is_file($fromAbs)) jr(['error' => 'not found'], 404);
  ensure_dir($USER_PATTERNS);
  $name = basename($from);
  $toAbs = "$USER_PATTERNS/$name";
  if (file_exists($toAbs) && empty($body['overwrite'])) jr(['error' => 'target exists in your namespace'], 409);
  copy($fromAbs, $toAbs);
  jr(['ok' => true, 'mine_path' => "$USER_DIR/$name"]);
}

if (preg_match('#^patterns/(.+\.json)$#', $path, $m) && $method === 'DELETE') {
  $rel = $m[1];
  if (!preg_match('#^(?:[a-zA-Z0-9_\-]+(?:/[a-zA-Z0-9_\-]+)*/)?[a-zA-Z0-9_\-.]+\.json$#', $rel)) {
    jr(['error' => 'invalid path'], 400);
  }
  $relParts = explode('/', $rel);
  if (count($relParts) > 1 && is_user_namespace($relParts[0], $USER_DIR)) {
    jr(['error' => 'forbidden — not your file'], 403);
  }
  $abs = "$PATTERNS/$rel";
  if (!within($PATTERNS, $abs)) jr(['error' => 'forbidden'], 403);
  if (!is_file($abs)) jr(['error' => 'not found'], 404);
  unlink($abs);
  jr(['ok' => true]);
}

// --- Assets -----------------------------------------------------------------
if ($path === 'assets' && $method === 'GET') {
  $manifestPath = "$PERM/manifest.json";
  if (!is_file($manifestPath)) jr(['schemaVersion' => 1, 'assets' => (object)[]]);
  $data = json_decode((string)file_get_contents($manifestPath), true);
  if (!is_array($data)) jr(['error' => 'manifest parse error'], 500);
  if (isset($data['assets']) && is_array($data['assets'])) {
    foreach ($data['assets'] as $id => &$a) {
      $a['url']    = "assets/_permanent/" . ($a['path'] ?? '');
      $a['source'] = 'shared';
    }
    unset($a);
  }
  jr($data);
}

if ($path === 'assets-mine' && $method === 'GET') {
  $out = [];
  if (is_dir($USER_ASSETS)) {
    foreach (scandir($USER_ASSETS) as $f) {
      if (preg_match('/\.(png|jpe?g|webp|gif|svg|avif)$/i', $f)) {
        $out[] = ['name' => $f, 'url' => "assets/$USER_DIR/$f", 'source' => 'mine'];
      }
    }
  }
  jr($out);
}

if ($path === 'episodes' && $method === 'GET') {
  if (!is_dir($ASSETS)) jr([]);
  $out = [];
  foreach (scandir($ASSETS) as $e) {
    if ($e === '.' || $e === '..') continue;
    if ($e[0] === '_') continue;
    if (is_dir("$ASSETS/$e")) $out[] = $e;
  }
  sort($out);
  jr($out);
}

if (preg_match('#^episode-files/([^/]+)$#', $path, $m) && $method === 'GET') {
  $ep = safe_seg(rawurldecode($m[1]));
  if (!$ep) jr(['error' => 'invalid episode'], 400);
  $epDir = "$ASSETS/$ep";
  if (!within($ASSETS, $epDir)) jr(['error' => 'forbidden'], 403);
  if (!is_dir($epDir)) jr(['episode' => $ep, 'files' => []]);
  $files = [];
  foreach (scandir($epDir) as $f) {
    if (preg_match('/\.(png|jpe?g|webp|gif|svg|avif)$/i', $f)) {
      $files[] = ['name' => $f, 'url' => "assets/$ep/$f"];
    }
  }
  jr(['episode' => $ep, 'files' => $files]);
}

if ($path === 'assets' && $method === 'POST') {
  $body = read_body();
  $dest = $body['destination'] ?? '';
  $decoded = decode_data_url($body['dataUrl'] ?? null);
  if (!$decoded) jr(['error' => 'invalid dataUrl'], 400);
  $base = safe_seg(preg_replace('/\.[^.]+$/', '', (string)($body['filename'] ?? 'asset')));
  if (reject_unsafe_name($base)) jr(['error' => 'invalid filename'], 400);
  $finalName = "$base." . $decoded['ext'];

  if ($dest === 'permanent') {
    $sub = safe_seg((string)($body['subfolder'] ?? 'misc')) ?: 'misc';
    if (reject_unsafe_name($sub)) jr(['error' => 'invalid subfolder'], 400);
    $destDir = "$PERM/$sub";
    ensure_dir($destDir);
    $destPath = "$destDir/$finalName";
    file_put_contents($destPath, $decoded['buffer']);
    rebuild_manifest();
    $manifestPath = "$PERM/manifest.json";
    $manifest = json_decode((string)file_get_contents($manifestPath), true) ?: ['assets' => []];
    $rel = "$sub/$finalName";
    $id = null;
    foreach ($manifest['assets'] as $k => $a) { if (($a['path'] ?? '') === $rel) { $id = $k; break; } }
    if ($id !== null) {
      if (isset($body['tags']) && is_array($body['tags'])) $manifest['assets'][$id]['tags'] = $body['tags'];
      if (!empty($body['description'])) $manifest['assets'][$id]['description'] = $body['description'];
      if (!empty($body['usage']))       $manifest['assets'][$id]['usage']       = $body['usage'];
      file_put_contents($manifestPath, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
    }
    jr(['ok' => true, 'id' => $id, 'path' => $rel, 'url' => "assets/_permanent/$rel", 'source' => 'shared']);
  }

  if ($dest === 'episode') {
    $ep = safe_seg((string)($body['episode'] ?? ''));
    if (reject_unsafe_name($ep)) jr(['error' => 'invalid episode'], 400);
    $destDir = "$ASSETS/$ep";
    ensure_dir($destDir);
    $destPath = "$destDir/$finalName";
    file_put_contents($destPath, $decoded['buffer']);
    jr(['ok' => true, 'path' => "$ep/$finalName", 'url' => "assets/$ep/$finalName", 'source' => 'shared']);
  }

  if ($dest === 'mine' || $dest === 'personal') {
    ensure_dir($USER_ASSETS);
    file_put_contents("$USER_ASSETS/$finalName", $decoded['buffer']);
    jr(['ok' => true, 'path' => "$USER_DIR/$finalName", 'url' => "assets/$USER_DIR/$finalName", 'source' => 'mine']);
  }

  jr(['error' => 'invalid destination'], 400);
}

if ($path === 'assets/rebuild' && $method === 'POST') {
  jr(['ok' => rebuild_manifest()]);
}

if (preg_match('#^assets/([a-zA-Z0-9_\-]+)$#', $path, $m) && in_array($method, ['PATCH','DELETE'], true)) {
  $id = $m[1];
  $manifestPath = "$PERM/manifest.json";
  if (!is_file($manifestPath)) jr(['error' => 'no manifest'], 404);
  $manifest = json_decode((string)file_get_contents($manifestPath), true);
  if (!is_array($manifest) || !isset($manifest['assets'][$id])) jr(['error' => 'asset not found'], 404);
  $entry = $manifest['assets'][$id];

  if ($method === 'DELETE') {
    $abs = "$PERM/" . $entry['path'];
    if (is_file($abs)) unlink($abs);
    unset($manifest['assets'][$id]);
    file_put_contents($manifestPath, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
    jr(['ok' => true]);
  }

  $body = read_body();
  $newId = $id;
  if (!empty($body['rename'])) {
    $newBase = safe_seg(preg_replace('/\.[^.]+$/', '', (string)$body['rename']));
    if (!$newBase) jr(['error' => 'invalid rename'], 400);
    $ext = pathinfo($entry['path'], PATHINFO_EXTENSION);
    $dir = dirname($entry['path']);
    $newRel = ($dir === '.' ? '' : "$dir/") . "$newBase.$ext";
    $oldAbs = "$PERM/" . $entry['path'];
    $newAbs = "$PERM/$newRel";
    if (file_exists($newAbs) && $newAbs !== $oldAbs) jr(['error' => 'target filename exists'], 409);
    rename($oldAbs, $newAbs);
    $entry['path'] = $newRel;
    $newId = strtolower(str_replace(['/', '\\'], '-', preg_replace('/\.[^.]+$/', '', $newRel)));
    if ($newId !== $id) {
      unset($manifest['assets'][$id]);
      $manifest['assets'][$newId] = $entry;
    } else {
      $manifest['assets'][$id] = $entry;
    }
  }
  foreach (['displayName','tags','description','usage'] as $f) {
    if (array_key_exists($f, $body)) {
      if ($f === 'tags' && !is_array($body[$f])) continue;
      $manifest['assets'][$newId][$f] = $body[$f];
    }
  }
  file_put_contents($manifestPath, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
  jr(['ok' => true, 'id' => $newId, 'path' => $manifest['assets'][$newId]['path']]);
}

// --- JSON output ------------------------------------------------------------
if ($path === 'save-json' && $method === 'POST') {
  $body = read_body();
  if (empty($body['filename']) || !isset($body['data'])) jr(['error' => 'filename and data required'], 400);
  $sf = safe_file((string)$body['filename']);
  if (reject_unsafe_name($sf)) jr(['error' => 'invalid filename'], 400);
  if (!str_ends_with($sf, '.json')) jr(['error' => 'filename must end in .json'], 400);

  $shared    = !empty($body['shared']);
  $targetDir = $shared ? $OUTPUT : $USER_OUTPUT;

  if (!empty($body['subfolder'])) {
    $s = safe_folder((string)$body['subfolder']);
    if ($s && !reject_unsafe_name($s)) {
      if (is_user_namespace($s, $USER_DIR)) jr(['error' => 'forbidden'], 403);
      $targetDir = $shared ? "$OUTPUT/$s" : "$USER_OUTPUT/$s";
    }
  }
  ensure_dir($targetDir);
  $payload = is_string($body['data'])
    ? $body['data']
    : json_encode($body['data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
  file_put_contents("$targetDir/$sf", $payload);
  if (!empty($body['preview'])) {
    $p = decode_data_url((string)$body['preview']);
    if ($p) {
      $previewDest = preg_replace('/\.json$/i', '.preview.' . $p['ext'], "$targetDir/$sf");
      @file_put_contents($previewDest, $p['buffer']);
    }
  }
  $rel = ltrim(str_replace($OUTPUT, '', "$targetDir/$sf"), '/');
  jr(['ok' => true, 'path' => $rel, 'dir' => $OUTPUT, 'source' => $shared ? 'shared' : 'mine']);
}

if ($path === 'outputs' && $method === 'GET') {
  if (!is_dir($OUTPUT)) jr([]);
  $out = [];
  $rii = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($OUTPUT, FilesystemIterator::SKIP_DOTS)
  );
  foreach ($rii as $f) {
    if (!$f->isFile() || !str_ends_with($f->getFilename(), '.json')) continue;
    $rel = substr($f->getPathname(), strlen($OUTPUT) + 1);
    $rel = str_replace(DIRECTORY_SEPARATOR, '/', $rel);
    $first = explode('/', $rel)[0];
    if (is_user_namespace($first, $USER_DIR)) continue;
    $source = ($first === $USER_DIR) ? 'mine' : 'shared';
    $out[] = ['path' => $rel, 'source' => $source];
  }
  usort($out, function($a, $b) {
    if ($a['source'] !== $b['source']) return $a['source'] === 'mine' ? -1 : 1;
    return strcmp($a['path'], $b['path']);
  });
  jr($out);
}

// --- Bug reports ------------------------------------------------------------
if ($path === 'bug-report' && $method === 'POST') {
  $body = read_body();
  $title = trim((string)($body['title'] ?? ''));
  if ($title === '') jr(['error' => 'title required'], 400);
  $bugsDir = "$BASE/bugs";
  ensure_dir($bugsDir);
  $slug = strtolower(preg_replace('/[^a-zA-Z0-9_-]+/', '-', $title));
  $slug = trim(preg_replace('/-+/', '-', $slug ?? ''), '-');
  $slug = substr($slug ?: 'bug', 0, 50);
  $stamp = date('Ymd-His');
  $file = "$stamp-$slug.json";
  $payload = $body + [
    '_receivedAt' => date('c'),
    '_remoteIp'   => $_SERVER['REMOTE_ADDR'] ?? null,
    '_user'       => $USER,
  ];
  file_put_contents("$bugsDir/$file", json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
  jr(['ok' => true, 'file' => $file]);
}

jr(['error' => 'unknown route', 'path' => $path, 'method' => $method], 404);
