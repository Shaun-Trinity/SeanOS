// GET ?url=… (signed in) → details for a pasted YouTube or TikTok link:
// { platform, id, short, title, cover?, warning? }. TikTok covers are copied into storage because
// TikTok's own thumbnail links expire.
import { isSignedIn, json } from "./_lib/auth.js";
import { saveFile } from "./_lib/store.js";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

async function fetchJson(u) {
  const r = await fetch(u, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(8000) });
  return r.ok ? r.json() : null;
}

function youtubeId(u) {
  const m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{6,20})/i);
  return m && m[1];
}

async function resolveYouTube(link, id) {
  const meta = await fetchJson(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent("https://www.youtube.com/watch?v=" + id)}`).catch(() => null);
  return {
    platform: "youtube",
    id,
    short: /\/shorts\//i.test(link),
    title: meta?.title || "",
    ...(!meta && { warning: "Couldn't fetch the title. You can type it in." }),
  };
}

async function resolveTikTok(link) {
  let full = link;
  if (/\/\/(vt|vm)\.tiktok\.com\//i.test(link)) {
    // Short share links redirect to the full video address.
    const r = await fetch(link, { redirect: "manual", headers: { "user-agent": UA }, signal: AbortSignal.timeout(8000) });
    full = r.headers.get("location") || link;
  }
  const id = full.match(/\/video\/(\d{8,25})/)?.[1];
  if (!id) return null;

  const meta = await fetchJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(full.split("?")[0])}`).catch(() => null);
  let cover;
  if (meta?.thumbnail_url) {
    try {
      const img = await fetch(meta.thumbnail_url, { headers: { "user-agent": UA, referer: "https://www.tiktok.com/" }, signal: AbortSignal.timeout(10000) });
      if (img.ok) cover = await saveFile(`covers/tiktok-${id}.jpg`, await img.arrayBuffer(), "image/jpeg");
    } catch {}
  }
  const title = (meta?.title || "").replace(/\s*#\S+/g, "").trim().slice(0, 80);
  return {
    platform: "tiktok",
    id,
    short: true,
    title,
    ...(cover && { cover }),
    ...(!meta && { warning: "TikTok didn't share the title or cover right now (it limits lookups). Type a title and upload a cover, or try Get again later." }),
  };
}

export async function GET(request) {
  if (!isSignedIn(request)) return json({ error: "Not signed in" }, 401);
  const link = (new URL(request.url).searchParams.get("url") || "").trim();
  if (!/^https?:\/\//i.test(link)) return json({ error: "Paste a full link starting with https://" }, 400);
  try {
    const yt = youtubeId(link);
    if (yt) return json(await resolveYouTube(link, yt));
    if (/tiktok\.com\//i.test(link)) {
      const tt = await resolveTikTok(link);
      if (tt) return json(tt);
    }
    return json({ error: "That doesn't look like a YouTube or TikTok video link" }, 400);
  } catch {
    return json({ error: "Couldn't reach that link. Check it and try again." }, 502);
  }
}
