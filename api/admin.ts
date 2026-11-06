import { createHmac, timingSafeEqual } from "node:crypto";

type AdminTrack = {
  id: string;
  title: string;
  duration: string;
  actId: string;
  youtubeId: string;
};

type AdminNight = {
  id: string;
  city: string;
  date: string;
  month: string;
  dateLabel: string;
  venue: string;
  tagline: string;
  tracks: AdminTrack[];
};

const COOKIE_NAME = "sky_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24;
const allowedNightIds = new Set(["hanoi", "danang", "hochiminh"]);
const allowedActIds = new Set(["awakening", "golden", "love", "rebel", "ours", "encore"]);

// The in-memory store keeps the local/Vercel demo functional without adding a
// database. For production persistence, replace this with Vercel KV/Redis.
let savedSetlist: AdminNight[] | null = null;

const isProduction = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
const getAdminConfig = () => ({
  username: process.env.SKY_ADMIN_USERNAME ?? (isProduction ? "" : "admin"),
  password: process.env.SKY_ADMIN_PASSWORD ?? (isProduction ? "" : "sky-tour-admin"),
  secret: process.env.SKY_ADMIN_SESSION_SECRET ?? (isProduction ? "" : "local-sky-tour-secret"),
});

const json = (payload: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(payload), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", ...headers },
});

const encode = (value: string) => Buffer.from(value, "utf8").toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("base64url");

const createSession = (username: string, secret: string) => {
  const payload = encode(JSON.stringify({ sub: username, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }));
  return `${payload}.${sign(payload, secret)}`;
};

const parseCookies = (header: string | null) => Object.fromEntries((header ?? "").split(";").map((item) => {
  const index = item.indexOf("=");
  return index < 0 ? ["", ""] : [item.slice(0, index).trim(), decodeURIComponent(item.slice(index + 1).trim())];
}).filter(([key]) => key));

const hasValidSession = (request: Request) => {
  const { username, secret } = getAdminConfig();
  if (!username || !secret) return false;
  const token = parseCookies(request.headers.get("cookie"))[COOKIE_NAME];
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  try {
    const parsed = JSON.parse(decode(payload)) as { sub?: string; exp?: number };
    const expected = sign(payload, secret);
    const validSignature = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    return validSignature && parsed.sub === username && typeof parsed.exp === "number" && parsed.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
};

const sessionCookie = (token: string) => `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${isProduction ? "; Secure" : ""}`;
const clearedSessionCookie = `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? "; Secure" : ""}`;

const cleanText = (value: unknown, maxLength: number, fallback = "") => typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;

const normalizeSetlist = (value: unknown): AdminNight[] | null => {
  if (!Array.isArray(value) || value.length === 0 || value.length > 6) return null;
  const normalized: AdminNight[] = [];
  for (const rawNight of value) {
    if (!rawNight || typeof rawNight !== "object") return null;
    const source = rawNight as Record<string, unknown>;
    const id = cleanText(source.id, 24);
    if (!allowedNightIds.has(id) || !Array.isArray(source.tracks) || source.tracks.length > 40) return null;
    const tracks: AdminTrack[] = [];
    for (const rawTrack of source.tracks) {
      if (!rawTrack || typeof rawTrack !== "object") return null;
      const track = rawTrack as Record<string, unknown>;
      const actId = cleanText(track.actId, 24);
      const youtubeId = cleanText(track.youtubeId, 32).replace(/[^a-zA-Z0-9_-]/g, "");
      if (!allowedActIds.has(actId) || !youtubeId) return null;
      tracks.push({
        id: cleanText(track.id, 8),
        title: cleanText(track.title, 120, "Untitled track"),
        duration: cleanText(track.duration, 24, "YouTube"),
        actId,
        youtubeId,
      });
    }
    normalized.push({
      id,
      city: cleanText(source.city, 80, id),
      date: cleanText(source.date, 8),
      month: cleanText(source.month, 12),
      dateLabel: cleanText(source.dateLabel, 24),
      venue: cleanText(source.venue, 100),
      tagline: cleanText(source.tagline, 80),
      tracks,
    });
  }
  return normalized;
};

export async function handleAdminRequest(request: Request) {
  if (request.method === "GET") {
    if (new URL(request.url).searchParams.get("auth") === "1") {
      if (!hasValidSession(request)) return json({ authenticated: false }, 401);
      return json({ authenticated: true, setlist: savedSetlist });
    }
    return json({ setlist: savedSetlist });
  }

  if (request.method !== "POST") return json({ error: "Method Not Allowed" }, 405, { allow: "GET, POST" });
  let body: { action?: string; username?: string; password?: string; setlist?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return json({ error: "Dữ liệu không hợp lệ." }, 400);
  }

  if (body.action === "login") {
    const config = getAdminConfig();
    if (!config.username || !config.password || !config.secret) return json({ error: "Chưa cấu hình tài khoản admin trên server." }, 503);
    if (body.username !== config.username || body.password !== config.password) return json({ error: "Tài khoản hoặc mật khẩu không đúng." }, 401);
    return json({ authenticated: true }, 200, { "set-cookie": sessionCookie(createSession(config.username, config.secret)) });
  }

  if (body.action === "logout") return json({ authenticated: false }, 200, { "set-cookie": clearedSessionCookie });
  if (body.action === "save") {
    if (!hasValidSession(request)) return json({ error: "Phiên admin không hợp lệ hoặc đã hết hạn." }, 401);
    const nextSetlist = normalizeSetlist(body.setlist);
    if (!nextSetlist) return json({ error: "Setlist không hợp lệ. Hãy kiểm tra link YouTube và act của từng bài." }, 400);
    savedSetlist = nextSetlist;
    return json({ saved: true, setlist: savedSetlist });
  }

  return json({ error: "Thao tác không được hỗ trợ." }, 400);
}

export default { fetch: handleAdminRequest };
