import { clearSessionCookie, json, requireSameOrigin } from "../../_lib/admin.js";

export function onRequestPost({ request }) {
  if (!requireSameOrigin(request)) return json({ message: "请求来源无效。" }, 403);
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
}
