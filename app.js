const quoteForm = document.querySelector("#quoteForm");
const quoteStatus = document.querySelector("#quoteStatus");
const lightbox = document.querySelector("#lightbox");
const header = document.querySelector(".site-header");
const nav = document.querySelector("nav");
const navLinks = Array.from(document.querySelectorAll("nav a"));
const navIndicator = document.querySelector(".nav-indicator");

document.querySelectorAll(".work").forEach((item) => {
  item.addEventListener("click", () => {
    const tone = item.style.getPropertyValue("--tone");
    const gallery = (item.dataset.gallery || item.dataset.image || "")
      .split("|")
      .map((url) => url.trim())
      .filter(Boolean);
    const images = gallery.length ? gallery : [item.dataset.image];
    const lightboxArt = lightbox.querySelector(".lightbox-art");
    const strip = lightbox.querySelector(".lightbox-strip");
    lightboxArt.style.setProperty("--tone", tone);
    setLightboxImage(images[0]);
    lightbox.querySelector("p").textContent = `${item.dataset.category} / ${item.dataset.title || item.textContent.trim()}`;
    strip.innerHTML = "";
    images.forEach((url, index) => {
      const thumb = document.createElement("button");
      thumb.type = "button";
      thumb.className = index === 0 ? "is-selected" : "";
      thumb.style.backgroundImage = `url("${url}")`;
      thumb.setAttribute("aria-label", `${item.dataset.category} 样片 ${index + 1}`);
      thumb.addEventListener("click", () => {
        strip.querySelectorAll("button").forEach((button) => button.classList.toggle("is-selected", button === thumb));
        setLightboxImage(url);
      });
      strip.append(thumb);
    });
    lightbox.showModal();
  });
});

document.querySelector(".close").addEventListener("click", () => lightbox.close());

function setLightboxImage(url) {
  lightbox.querySelector(".lightbox-art").style.setProperty("--image", `url("${url}")`);
}

const sectionMap = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

function moveIndicator(target) {
  if (!target || !navIndicator) return;
  if (target.getAttribute("href") === "#inquiry") {
    nav.classList.remove("has-indicator");
    return;
  }
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

if (nav) {
  nav.addEventListener("pointerleave", () => {
    const active = nav.querySelector("a.is-active") || navLinks[0];
    moveIndicator(active);
  });
}

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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
  });
}
