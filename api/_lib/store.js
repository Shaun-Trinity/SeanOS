// Where content and uploads live: Vercel Blob when BLOB_READ_WRITE_TOKEN is set (on Vercel),
// otherwise a local .data/ folder so the dashboard can be tried with `npm run dev`.
import { promises as fs } from "node:fs";
import { dirname, join, normalize } from "node:path";

const LOCAL = !process.env.BLOB_READ_WRITE_TOKEN;
const CONTENT = "content/portfolio.json";
const DATA_DIR = join(process.cwd(), ".data");

export const storageMode = LOCAL ? "local" : "blob";

function localPath(pathname) {
  const p = normalize(join(DATA_DIR, pathname));
  if (!p.startsWith(DATA_DIR)) throw new Error("Invalid path");
  return p;
}

export async function readContent() {
  if (LOCAL) {
    try {
      return JSON.parse(await fs.readFile(localPath(CONTENT), "utf8"));
    } catch {
      return null;
    }
  }
  const { head, BlobNotFoundError } = await import("@vercel/blob");
  try {
    const meta = await head(CONTENT);
    // The version query skips any CDN copy older than this save.
    const res = await fetch(`${meta.url}?v=${new Date(meta.uploadedAt).getTime()}`, { cache: "no-store" });
    return res.ok ? await res.json() : null;
  } catch (e) {
    if (e instanceof BlobNotFoundError) return null;
    throw e;
  }
}

export async function writeContent(data) {
  const body = JSON.stringify(data, null, 2);
  if (LOCAL) {
    await fs.mkdir(dirname(localPath(CONTENT)), { recursive: true });
    await fs.writeFile(localPath(CONTENT), body);
    return;
  }
  const { put } = await import("@vercel/blob");
  await put(CONTENT, body, {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
}

// Server-side save of a file (TikTok covers fetched by /api/resolve, local-mode uploads). Returns its URL.
export async function saveFile(pathname, data, contentType) {
  if (LOCAL) {
    const file = localPath(join("uploads", pathname));
    await fs.mkdir(dirname(file), { recursive: true });
    await fs.writeFile(file, Buffer.from(data));
    return "/uploads/" + pathname;
  }
  const { put } = await import("@vercel/blob");
  const blob = await put(pathname, Buffer.from(data), { access: "public", contentType, addRandomSuffix: true });
  return blob.url;
}

// Remove uploads that the dashboard no longer uses. Only our own files are ever touched.
export async function deleteFiles(urls) {
  const mine = urls.filter((u) => typeof u === "string" && (LOCAL ? u.startsWith("/uploads/") : /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//i.test(u)));
  if (!mine.length) return 0;
  if (LOCAL) {
    await Promise.all(mine.map((u) => fs.rm(localPath(u.slice(1)), { force: true })));
  } else {
    const { del } = await import("@vercel/blob");
    await del(mine);
  }
  return mine.length;
}
