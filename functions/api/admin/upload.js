import { json, requireAdmin, requireSameOrigin } from "../../_lib/admin.js";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function onRequestPost({ request, env }) {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  if (!requireSameOrigin(request)) return json({ message: "请求来源无效。" }, 403);

  const contentType = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const extension = ALLOWED_TYPES.get(contentType);
  if (!extension) return json({ message: "只支持 JPG、PNG 和 WebP 图片。" }, 415);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (!contentLength || contentLength > MAX_UPLOAD_BYTES) {
    return json({ message: "单张图片必须小于 12 MB。" }, 413);
  }
  if (!request.body) return json({ message: "没有收到图片内容。" }, 400);

  const url = new URL(request.url);
  const category = String(url.searchParams.get("category") || "");
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(category)) {
    return json({ message: "栏目名称无效。" }, 400);
  }

  const key = `portfolio/uploads/${category}/${crypto.randomUUID()}.${extension}`;
  await env.PORTFOLIO_UPLOADS.put(key, request.body, {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: {
      originalName: String(url.searchParams.get("name") || "photo").slice(0, 240),
      uploadedBy: "portfolio-admin",
    },
  });

  return json({
    ok: true,
    image: {
      key,
      url: `/media/${key}`,
      alt: "",
      caption: "",
      originalName: String(url.searchParams.get("name") || "photo").slice(0, 240),
      width: positiveInteger(url.searchParams.get("width")),
      height: positiveInteger(url.searchParams.get("height")),
    },
  });
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}
