const quoteForm = document.querySelector("#quoteForm");
const quoteStatus = document.querySelector("#quoteStatus");
const lightbox = document.querySelector("#lightbox");
const header = document.querySelector(".site-header");
const nav = document.querySelector("nav");
const navLinks = Array.from(document.querySelectorAll("nav a"));
const navIndicator = document.querySelector(".nav-indicator");
const pageLang = document.documentElement.lang || "zh-CN";
const formMessages = pageLang.startsWith("en")
  ? {
      sending: "Sending...",
      failed: "Could not send yet:",
      fallbackError: "Send failed",
      success: "Inquiry received. We will reply by email soon.",
    }
  : pageLang.toLowerCase().includes("hant")
    ? {
        sending: "正在發送...",
        failed: "暫未發送成功：",
        fallbackError: "發送失敗",
        success: "已收到詢價，我們會盡快郵件回覆。",
      }
    : {
        sending: "正在发送...",
        failed: "暂未发送成功：",
        fallbackError: "发送失败",
        success: "已收到询价，我们会尽快邮件回复。",
      };

loadPortfolioOverrides().finally(initGalleries);

function initGalleries() {
  document.querySelectorAll(".work, .story-card").forEach((item) => {
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
}

async function loadPortfolioOverrides() {
  const workKeys = {
    "Editorial Portrait": "portrait",
    "Modern Wedding": "wedding",
    "Birthday Party": "birthday-party",
    "Game Motion": "sports",
    "Family Memory": "family-memory",
    "Corporate Image": "commercial",
    "Product Color": "product",
    "Food Story": "food",
    "Interior Space": "interior",
    Graduation: "graduation",
    "Live Event": "live-event",
    "Travel Color": "travel",
    "Street Frame": "street",
    "Tender Moment": "maternity-family",
    "Color Editorial": "creative-color",
  };
  const storyKeys = ["portrait", "wedding", "commercial", "birthday-party", "sports", "family-memory"];

  document.querySelectorAll(".work").forEach((item) => {
    item.dataset.portfolioKey = workKeys[item.dataset.title] || "";
  });
  document.querySelectorAll(".story-card").forEach((item, index) => {
    item.dataset.portfolioKey = storyKeys[index] || "";
  });

  const previewDraft = new URLSearchParams(window.location.search).get("portfolio") === "draft";
  try {
    const response = await fetch(`/api/portfolio${previewDraft ? "?draft=1" : ""}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) return;
    const manifest = await response.json();
    applyPortfolioManifest(manifest);
  } catch {
    // The static portfolio remains available when the optional R2 manifest cannot be loaded.
  }
}

function applyPortfolioManifest(manifest) {
  const categories = manifest?.categories || {};
  document.querySelectorAll("[data-portfolio-key]").forEach((item) => {
    const images = categories[item.dataset.portfolioKey]?.images;
    if (!Array.isArray(images) || images.length === 0) return;
    const urls = images.map((image) => image.url).filter(Boolean);
    if (!urls.length) return;

    item.dataset.image = urls[0];
    item.dataset.gallery = urls.join("|");
    item.style.setProperty("--image", `url("${urls[0]}")`);
    const cover = item.querySelector("img");
    if (cover) {
      cover.src = urls[0];
      if (images[0].alt) cover.alt = images[0].alt;
    }
    const count = item.querySelector("em");
    if (count) {
      count.textContent = pageLang.startsWith("en") ? `${urls.length} images` : `${urls.length} 张`;
    }
  });
}

document.querySelector(".close").addEventListener("click", () => lightbox.close());

function setLightboxImage(url) {
  lightbox.querySelector(".lightbox-art").style.setProperty("--image", `url("${url}")`);
}

const sectionMap = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const sectionsByTop = sectionMap
  .map((section) => ({ section, id: section.id }))
  .filter(({ id }) => id);

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

function updateActiveNavFromScroll() {
  const probe = window.scrollY + Math.min(window.innerHeight * 0.42, 360);
  let current = sectionsByTop[0]?.id || "portfolio";
  sectionsByTop.forEach(({ section, id }) => {
    if (section.offsetTop <= probe) current = id;
  });
  setActiveNav(current);
}

updateActiveNavFromScroll();
requestAnimationFrame(updateActiveNavFromScroll);

window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
  updateActiveNavFromScroll();
});

window.addEventListener("resize", updateActiveNavFromScroll);
window.addEventListener("load", updateActiveNavFromScroll);

quoteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  quoteStatus.textContent = formMessages.sending;
  const payload = Object.fromEntries(new FormData(quoteForm).entries());

  try {
    const response = await fetch("/api/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || formMessages.fallbackError);
    quoteStatus.textContent = result.message || formMessages.success;
    if (!result.emailPending) quoteForm.reset();
  } catch (error) {
    quoteStatus.textContent = `${formMessages.failed}${error.message}`;
  }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
  });
}
