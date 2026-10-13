// POST { urls: [...] } → delete uploaded files the dashboard no longer uses (signed in).
import { guard, json } from "./_lib/auth.js";
import { deleteFiles } from "./_lib/store.js";

export async function POST(request) {
  const denied = guard(request);
  if (denied) return denied;
  const { urls = [] } = await request.json().catch(() => ({}));
  return json({ deleted: await deleteFiles(Array.isArray(urls) ? urls.slice(0, 100) : []) });
}
