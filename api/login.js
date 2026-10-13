// POST { password } → sets the session cookie. Failed attempts are slowed down to deter guessing.
import { passwordMatches, sessionCookie, json } from "./_lib/auth.js";

export async function POST(request) {
  if (request.headers.get("x-seanos") !== "1") return json({ error: "Bad request" }, 400);
  let password = "";
  try {
    ({ password = "" } = await request.json());
  } catch {}
  if (!passwordMatches(password)) {
    await new Promise((r) => setTimeout(r, 900));
    return json({ error: "Incorrect password" }, 401);
  }
  return json({ ok: true }, 200, { "set-cookie": sessionCookie() });
}
