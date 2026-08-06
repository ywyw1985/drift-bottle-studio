import {
  json,
  requireAdmin,
  requireSameOrigin,
  sanitizeManifest,
} from "../../_lib/admin.js";

const DRAFT_KEY = "portfolio/meta/draft.json";
const PUBLISHED_KEY = "portfolio/meta/published.json";

export async function onRequestGet({ request, env }) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  const object = await env.PORTFOLIO_UPLOADS.get(DRAFT_KEY);
  if (!object) return json({ version: 1, updatedAt: null, categories: {} });
  return json(await object.json());
}

export async function onRequestPut({ request, env }) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  if (!requireSameOrigin(request)) return json({ message: "请求来源无效。" }, 403);

  try {
    const manifest = sanitizeManifest(await request.json());
    const payload = JSON.stringify(manifest);
    await env.PORTFOLIO_UPLOADS.put(DRAFT_KEY, payload, {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
    });

    if (new URL(request.url).searchParams.get("publish") === "1") {
      await env.PORTFOLIO_UPLOADS.put(PUBLISHED_KEY, payload, {
        httpMetadata: { contentType: "application/json; charset=utf-8" },
      });
    }

    return json({ ok: true, manifest, published: new URL(request.url).searchParams.get("publish") === "1" });
  } catch (error) {
    return json({ message: error.message || "保存失败。" }, 400);
  }
}
