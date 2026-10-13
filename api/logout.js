// POST → clears the session cookie.
import { clearedCookie, json } from "./_lib/auth.js";

export async function POST() {
  return json({ ok: true }, 200, { "set-cookie": clearedCookie() });
}
