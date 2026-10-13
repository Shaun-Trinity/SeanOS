// Local preview with a working dashboard: `npm run dev`, then open http://localhost:3000.
// Serves the site and runs the same /api routes Vercel runs, saving to .data/ instead of Vercel Blob.
// Settings come from .env.local (copy .env.example). Listens on 127.0.0.1 only.
import { createServer } from "node:http";
import { promises as fs, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const PORT = Number(process.env.PORT) || 3000;

try {
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  console.warn("No .env.local found: copy .env.example to .env.local and set a password.");
}
process.env.SEANOS_LOCAL = "1";
delete process.env.BLOB_READ_WRITE_TOKEN; // always use the local .data/ folder here

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".pdf": "application/pdf",
};
// Never serve dotfiles (.env.local, .git, .data …), dependencies, API source or server files.
const HIDDEN = /(^|\/)\.|^\/(node_modules|api)(\/|$)|^\/(dev-server\.mjs|package(-lock)?\.json)$/;

async function handleApi(req, res, url) {
  const name = url.pathname.slice(5);
  if (!/^[a-z-]+$/.test(name)) return send(res, 404, "Not found");
  let mod;
  try {
    mod = await import(pathToFileURL(join(ROOT, "api", name + ".js")).href);
  } catch {
    return send(res, 404, "Not found");
  }
  const handler = mod[req.method];
  if (!handler) return send(res, 405, "Method not allowed");
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const request = new Request(new URL(req.url, `http://${req.headers.host}`), {
    method: req.method,
    headers: req.headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
  });
  try {
    const response = await handler(request);
    const headers = {};
    response.headers.forEach((v, k) => (headers[k] = v));
    res.writeHead(response.status, headers);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    console.error(e);
    send(res, 500, JSON.stringify({ error: e.message }), "application/json");
  }
}

async function handleStatic(res, url) {
  let path = decodeURIComponent(url.pathname);
  if (HIDDEN.test(path)) return send(res, 404, "Not found");
  let file = path.startsWith("/uploads/") ? join(ROOT, ".data", path) : join(ROOT, path);
  file = normalize(file);
  if (!file.startsWith(ROOT)) return send(res, 403, "Forbidden");
  try {
    if ((await fs.stat(file)).isDirectory()) file = join(file, "index.html");
  } catch {
    if (!extname(file)) file += ".html"; // clean URLs, like Vercel: /dashboard → dashboard.html
  }
  try {
    const body = await fs.readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file).toLowerCase()] || "application/octet-stream", "cache-control": "no-store" });
    res.end(body);
  } catch {
    send(res, 404, "Not found");
  }
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "content-type": type });
  res.end(body);
}

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  (url.pathname.startsWith("/api/") ? handleApi(req, res, url) : handleStatic(res, url)).catch((e) => {
    console.error(e);
    send(res, 500, "Server error");
  });
}).listen(PORT, "127.0.0.1", () => console.log(`SeanOS running at http://localhost:${PORT}  (dashboard: /dashboard)`));
