const quoteForm = document.querySelector("#quoteForm");
const quoteStatus = document.querySelector("#quoteStatus");
const uploadForm = document.querySelector("#uploadForm");
const uploadStatus = document.querySelector("#uploadStatus");
const uploadedPreview = document.querySelector("#uploadedPreview");
const lightbox = document.querySelector("#lightbox");
const header = document.querySelector(".site-header");
const nav = document.querySelector("nav");
const navLinks = Array.from(document.querySelectorAll("nav a"));
const navIndicator = document.querySelector(".nav-indicator");

document.querySelectorAll(".work").forEach((item) => {
  item.addEventListener("click", () => {
    const tone = item.style.getPropertyValue("--tone");
    const image = item.style.getPropertyValue("--image");
    lightbox.querySelector(".lightbox-art").style.setProperty("--tone", tone);
    lightbox.querySelector(".lightbox-art").style.setProperty("--image", image);
    lightbox.querySelector("p").textContent = `${item.dataset.category} / ${item.dataset.title || item.textContent.trim()}`;
    lightbox.showModal();
  });
});

document.querySelector(".close").addEventListener("click", () => lightbox.close());

const sectionMap = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

function moveIndicator(target) {
  if (!target || !navIndicator) return;
  const navBox = nav.getBoundingClientRect();
  const box = target.getBoundingClientRect();
  nav.style.setProperty("--nav-x", `${box.left - navBox.left}px`);
  nav.style.setProperty("--nav-w", `${Math.max(box.width / 24, 1).toFixed(2)}`);
  nav.classList.add("has-indicator");
}

function setActiveNav(id) {
  const active = navLinks.find((link) => link.getAttribute("href") === `#${id}`) || navLinks[0];
  navLinks.forEach((link) => link.classList.toggle("is-active", link === active));
  moveIndicator(active);
}

navLinks.forEach((link) => {
  link.addEventListener("pointerenter", () => moveIndicator(link));
  link.addEventListener("focus", () => moveIndicator(link));
});

nav.addEventListener("pointerleave", () => {
  const active = nav.querySelector("a.is-active") || navLinks[0];
  moveIndicator(active);
});

const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setActiveNav(visible.target.id);
  },
  { rootMargin: "-38% 0px -48% 0px", threshold: [0.15, 0.35, 0.6] },
);

sectionMap.forEach((section) => observer.observe(section));
setActiveNav("portfolio");

window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
});

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
    quoteStatus.textContent = result.message || "已收到询价，我们会尽快邮件回复。";
    if (!result.emailPending) quoteForm.reset();
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
