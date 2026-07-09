const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export async function onRequestPost({ request, env }) {
  if (!env.CLOUDFLARE_IMAGES_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) {
    return json(
      {
        message:
          "Cloud upload is not configured. Set CLOUDFLARE_IMAGES_TOKEN and CLOUDFLARE_ACCOUNT_ID to enable persistent image uploads.",
      },
      503,
    );
  }

  const form = await request.formData();
  const image = form.get("image");
  if (!image || typeof image === "string") {
    return json({ message: "Missing image file." }, 400);
  }

  const upload = new FormData();
  upload.append("file", image, image.name || "portfolio-image");
  upload.append(
    "metadata",
    JSON.stringify({
      title: form.get("title") || "",
      category: form.get("category") || "",
    }),
  );

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
    id: result.result.id,
    url: result.result.variants?.[0] || null,
  });
}
