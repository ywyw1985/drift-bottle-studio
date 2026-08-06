export async function onRequestGet({ request, env, params }) {
  const rawPath = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");
  let key;
  try {
    key = decodeURIComponent(rawPath);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (!key.startsWith("portfolio/uploads/") || key.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const object = await env.PORTFOLIO_UPLOADS.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}
