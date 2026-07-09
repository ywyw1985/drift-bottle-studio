const quoteForm = document.querySelector("#quoteForm");
const quoteStatus = document.querySelector("#quoteStatus");
const uploadForm = document.querySelector("#uploadForm");
const uploadStatus = document.querySelector("#uploadStatus");
const uploadedPreview = document.querySelector("#uploadedPreview");
const lightbox = document.querySelector("#lightbox");

document.querySelectorAll(".work").forEach((item) => {
  item.addEventListener("click", () => {
    const tone = item.style.getPropertyValue("--tone");
    lightbox.querySelector(".lightbox-art").style.setProperty("--tone", tone);
    lightbox.querySelector("p").textContent = `${item.dataset.category} / ${item.textContent.trim()}`;
    lightbox.showModal();
  });
});

document.querySelector(".close").addEventListener("click", () => lightbox.close());

quoteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  quoteStatus.textContent = "正在发送...";
  const payload = Object.fromEntries(new FormData(quoteForm).entries());

  try {
    const response = await fetch("/api/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "发送失败");
    quoteStatus.textContent = "已收到询价，我们会尽快邮件回复。";
    quoteForm.reset();
  } catch (error) {
    quoteStatus.textContent = `暂未发送成功：${error.message}`;
  }
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  uploadStatus.textContent = "正在处理图片...";
  const data = new FormData(uploadForm);
  const file = data.get("image");
  const title = data.get("title");
  const category = data.get("category");

  if (file) {
    const previewUrl = URL.createObjectURL(file);
    addUploadedCard(previewUrl, title, category);
  }

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: data,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "云端上传未配置");
    uploadStatus.textContent = result.url ? "已上传到云端图库。" : "已生成上传入口。";
  } catch (error) {
    uploadStatus.textContent = `已本地预览；云端上传稍后配置：${error.message}`;
  }

  uploadForm.reset();
});

function addUploadedCard(url, title, category) {
  const card = document.createElement("article");
  card.className = "uploaded-card";
  card.style.backgroundImage = `linear-gradient(0deg, rgba(0,0,0,.62), transparent), url("${url}")`;
  card.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(category)}</span>`;
  uploadedPreview.prepend(card);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
  });
}
