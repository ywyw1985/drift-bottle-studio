const encoder = new TextEncoder();
const SESSION_COOKIE = "dbs_admin";
const SESSION_SECONDS = 8 * 60 * 60;

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });

export function requireSameOrigin(request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}

export async function passwordMatches(password, expectedHash) {
  if (!expectedHash || typeof password !== "string") return false;
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(password));
  const actual = bytesToHex(new Uint8Array(digest));
  return timingSafeEqual(actual, expectedHash.toLowerCase());
}

export async function createSessionCookie(secret) {
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured.");
  const payload = base64UrlEncode(
    encoder.encode(
      JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
        nonce: crypto.randomUUID(),
      }),
    ),
  );
  const signature = await sign(payload, secret);
  return `${SESSION_COOKIE}=${payload}.${signature}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function isAdmin(request, env) {
  if (!env.ADMIN_SESSION_SECRET) return false;
  const cookie = request.headers.get("cookie") || "";
  const token = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!token) return false;

  const splitAt = token.lastIndexOf(".");
  if (splitAt < 1) return false;
  const payload = token.slice(0, splitAt);
  const signature = token.slice(splitAt + 1);
  const expected = await sign(payload, env.ADMIN_SESSION_SECRET);
  if (!timingSafeEqual(signature, expected)) return false;

  try {
    const session = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    return Number.isFinite(session.exp) && session.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function requireAdmin(request, env) {
  return (await isAdmin(request, env)) ? null : json({ message: "请先登录管理后台。" }, 401);
}

export function sanitizeManifest(input) {
  if (!input || typeof input !== "object") throw new Error("作品集数据格式不正确。");
  const categories = {};
  const entries = Object.entries(input.categories || {});
  if (entries.length > 30) throw new Error("栏目数量超过限制。");

  for (const [key, value] of entries) {
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(key) || !value || typeof value !== "object") continue;
    const images = Array.isArray(value.images) ? value.images.slice(0, 250) : [];
    categories[key] = {
      title: cleanText(value.title, 100) || key,
      images: images
        .map((image) => sanitizeImage(image))
        .filter(Boolean),
    };
  }

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    categories,
  };
}

function sanitizeImage(image) {
  if (!image || typeof image !== "object") return null;
  const key = cleanText(image.key, 512);
  const url = cleanText(image.url, 1000);
  if (!key.startsWith("portfolio/uploads/") || url !== `/media/${key}`) return null;
  return {
    key,
    url,
    alt: cleanText(image.alt, 240),
    caption: cleanText(image.caption, 500),
    originalName: cleanText(image.originalName, 240),
    width: positiveInteger(image.width),
    height: positiveInteger(image.height),
  };
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

async function sign(payload, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64UrlEncode(new Uint8Array(signature));
}

function timingSafeEqual(left, right) {
  const a = encoder.encode(String(left));
  const b = encoder.encode(String(right));
  if (a.byteLength !== b.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < a.byteLength; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64UrlEncode(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
