import { isAdmin, json } from "../_lib/admin.js";

export async function onRequestGet({ request, env }) {
  const wantsDraft = new URL(request.url).searchParams.get("draft") === "1";
  if (wantsDraft && !(await isAdmin(request, env))) {
    return json({ message: "请先登录管理后台。" }, 401);
  }

  const key = wantsDraft ? "portfolio/meta/draft.json" : "portfolio/meta/published.json";
  const object = await env.PORTFOLIO_UPLOADS.get(key);
  if (!object) return json({ version: 1, updatedAt: null, categories: {} });
  return new Response(object.body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": wantsDraft ? "no-store" : "public, max-age=60, must-revalidate",
      etag: object.httpEtag,
    },
  });
}
