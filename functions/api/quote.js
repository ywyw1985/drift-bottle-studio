const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ message: "Invalid JSON body." }, 400);
  }

  const required = ["name", "email", "service", "message"];
  const missing = required.filter((field) => !String(data[field] || "").trim());
  if (missing.length) {
    return json({ message: `Missing required fields: ${missing.join(", ")}` }, 400);
  }

  if (!env.RESEND_API_KEY || !env.INQUIRY_TO_EMAIL || !env.RESEND_FROM_EMAIL) {
    return json(
      {
        ok: true,
        emailPending: true,
        message:
          "询价板块已预留；邮件通知会在 Resend API 配置后启用。当前请直接发送邮件到 hello@driftbottlestudio.com。",
      },
      202,
    );
  }

  const subject = `Drift Bottle Studio 新询价：${data.service} / ${data.name}`;
  const html = renderInquiry(data);

  const ownerResponse = await sendEmail(env, {
    from: env.RESEND_FROM_EMAIL,
    to: [env.INQUIRY_TO_EMAIL],
    reply_to: data.email,
    subject,
    html,
  });

  if (!ownerResponse.ok) {
    return json({ message: "Resend failed to send owner notification." }, 502);
  }

  await sendEmail(env, {
    from: env.RESEND_FROM_EMAIL,
    to: [data.email],
    subject: "已收到你的 Drift Bottle Studio 询价",
    html: `<p>${escapeHtml(data.name)}，你好。</p><p>我们已收到你的拍摄需求，会尽快回复档期、建议和报价。</p><p>Drift Bottle Studio</p>`,
  });

  return json({ ok: true });
}

function renderInquiry(data) {
  const rows = [
    ["姓名", data.name],
    ["邮箱", data.email],
    ["电话 / 微信", data.phone],
    ["摄影类型", data.service],
    ["拍摄日期", data.date],
    ["拍摄地点", data.location],
    ["预算范围", data.budget],
    ["需求描述", data.message],
  ];

  return `
    <h1>Drift Bottle Studio 新询价</h1>
    <table cellpadding="8" cellspacing="0" border="1">
      ${rows
        .map(([label, value]) => `<tr><th align="left">${label}</th><td>${escapeHtml(value || "-")}</td></tr>`)
        .join("")}
    </table>
  `;
}

async function sendEmail(env, payload) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
  });
}
