const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export async function onRequestPost({ request, env }) {
  const form = await request.formData();
  const image = form.get("image");
  if (!image || typeof image === "string") {
    return json({ message: "Missing image file." }, 400);
  }

  const title = String(form.get("title") || "").trim();
  const category = String(form.get("category") || "").trim();
  const originalName = image.name || "portfolio-image";
  const safeName = originalName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  const key = `portfolio/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName || "image"}`;
  const metadata = { title, category, originalName };

  if (env.PORTFOLIO_UPLOADS) {
    await env.PORTFOLIO_UPLOADS.put(key, image.stream(), {
      httpMetadata: {
        contentType: image.type || "application/octet-stream",
      },
      customMetadata: metadata,
    });

    return json({
      ok: true,
      storage: "r2",
      key,
      title,
      category,
    });
  }

  if (!env.CLOUDFLARE_IMAGES_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) {
    return json(
      {
        message:
          "Cloud upload is not configured. Bind PORTFOLIO_UPLOADS to an R2 bucket, or set CLOUDFLARE_IMAGES_TOKEN and CLOUDFLARE_ACCOUNT_ID.",
      },
      503,
    );
  }

  const upload = new FormData();
  upload.append("file", image, originalName);
  upload.append("metadata", JSON.stringify(metadata));

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${env.CLOUDFLARE_IMAGES_TOKEN}` },
      body: upload,
    },
  );

  const result = await response.json();
  if (!response.ok || !result.success) {
    return json({ message: "Cloudflare Images upload failed.", detail: result.errors || result }, 502);
  }

  return json({
    ok: true,
    storage: "cloudflare-images",
    id: result.result.id,
    url: result.result.variants?.[0] || null,
  });
}
