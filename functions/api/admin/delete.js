import { json, requireAdmin, requireSameOrigin } from "../../_lib/admin.js";

export async function onRequestDelete({ request, env }) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  if (!requireSameOrigin(request)) return json({ message: "请求来源无效。" }, 403);

  const key = new URL(request.url).searchParams.get("key") || "";
  if (!/^portfolio\/uploads\/[a-z0-9-]+\/[a-f0-9-]+\.(jpg|png|webp)$/.test(key)) {
    return json({ message: "图片路径无效。" }, 400);
  }
  await env.PORTFOLIO_UPLOADS.delete(key);
  return json({ ok: true });
}
