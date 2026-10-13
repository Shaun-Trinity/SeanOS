// Owner sign-in: one password (ADMIN_PASSWORD) and a signed, HttpOnly session cookie.
// Files under api/_lib are helpers, not routes (Vercel skips names starting with "_").
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "seanos_session";
const MAX_AGE = 7 * 24 * 60 * 60; // a week, in seconds

function sessionSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET is not set (use 32+ random characters)");
  return s;
}

const sign = (data) => createHmac("sha256", sessionSecret()).update(data).digest("base64url");
const secureFlag = () => (process.env.SEANOS_LOCAL ? "" : "; Secure"); // local dev runs on plain http

export function sessionCookie() {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + MAX_AGE })).toString("base64url");
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE}${secureFlag()}`;
}

export function clearedCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureFlag()}`;
}

function safeEqual(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function isSignedIn(request) {
  const match = (request.headers.get("cookie") || "").match(/(?:^|;\s*)seanos_session=([^;]+)/);
  if (!match) return false;
  const [payload, sig] = match[1].split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return false;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

// Compare hashes so the check takes the same time whatever the input length.
export function passwordMatches(given) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) throw new Error("ADMIN_PASSWORD is not set");
  const h = (v) => createHmac("sha256", "seanos-password").update(String(v)).digest();
  return timingSafeEqual(h(given), h(real));
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

// Every change-making request must be signed in and carry the X-SeanOS header. Browsers won't send a
// custom header cross-site without CORS, which (with SameSite=Strict) blocks request forgery.
export function guard(request) {
  if (request.headers.get("x-seanos") !== "1") return json({ error: "Bad request" }, 400);
  if (!isSignedIn(request)) return json({ error: "Not signed in" }, 401);
  return null;
}
