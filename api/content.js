// GET  → the published portfolio content (404 until the first save; the site then uses data.js).
//        `?draft=1` (signed in) skips the CDN cache so the dashboard always sees the latest save.
// PUT  → save new content (signed in).
import { guard, isSignedIn, json } from "./_lib/auth.js";
import { readContent, writeContent } from "./_lib/store.js";
import { cleanContent } from "./_lib/content.js";

export async function GET(request) {
  const fresh = new URL(request.url).searchParams.has("draft") && isSignedIn(request);
  const data = await readContent();
  if (!data) return json({ error: "Nothing saved yet" }, 404);
  return json(data, 200, {
    "cache-control": fresh ? "no-store" : "public, max-age=0, s-maxage=30, stale-while-revalidate=300",
  });
}

export async function PUT(request) {
  const denied = guard(request);
  if (denied) return denied;
  const text = await request.text();
  if (text.length > 1_000_000) return json({ error: "Content is too large" }, 413);
  let content;
  try {
    content = cleanContent(JSON.parse(text));
  } catch (e) {
    return json({ error: e.message || "Invalid content" }, 400);
  }
  await writeContent(content);
  return json({ ok: true, savedAt: new Date().toISOString(), content });
}
