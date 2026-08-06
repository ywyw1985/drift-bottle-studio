import {
  createSessionCookie,
  json,
  passwordMatches,
  requireSameOrigin,
} from "../../_lib/admin.js";

export async function onRequestPost({ request, env }) {
  if (!requireSameOrigin(request)) return json({ message: "请求来源无效。" }, 403);
  if (!env.ADMIN_PASSWORD_HASH || !env.ADMIN_SESSION_SECRET) {
    return json({ message: "管理后台尚未完成安全配置。" }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ message: "登录信息格式不正确。" }, 400);
  }

  if (!(await passwordMatches(body.password, env.ADMIN_PASSWORD_HASH))) {
    return json({ message: "密码不正确。" }, 401);
  }

  return json(
    { ok: true },
    200,
    { "set-cookie": await createSessionCookie(env.ADMIN_SESSION_SECRET) },
  );
}
