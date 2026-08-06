const CATEGORIES = [
  ["portrait", "人像摄影 / Portrait"],
  ["wedding", "婚礼摄影 / Wedding"],
  ["birthday-party", "生日派对 / Birthday Party"],
  ["sports", "体育摄影 / Sports"],
  ["family-memory", "家庭纪念 / Family Memory"],
  ["commercial", "商业摄影 / Commercial"],
  ["product", "产品摄影 / Product"],
  ["food", "餐饮摄影 / Food"],
  ["interior", "空间摄影 / Interior"],
  ["graduation", "毕业摄影 / Graduation"],
  ["live-event", "现场活动 / Live Event"],
  ["travel", "旅行风景 / Travel"],
  ["street", "街头纪实 / Street"],
  ["maternity-family", "母婴亲子 / Maternity & Family"],
  ["creative-color", "创意色彩 / Creative Color"],
];

const elements = Object.fromEntries(
  [
    "loginShell", "loginForm", "password", "loginStatus", "app", "logoutButton",
    "categorySelect", "categoryTitle", "dropzone", "fileInput", "progress", "progressBar",
    "uploadStatus", "categoryEyebrow", "categoryHeading", "saveState", "emptyState",
    "photoGrid", "globalStatus", "saveButton", "previewButton", "publishButton",
  ].map((id) => [id, document.getElementById(id)]),
);

let manifest = { version: 1, updatedAt: null, categories: {} };
let selectedCategory = CATEGORIES[0][0];
let dirty = false;
let busy = false;
let draggedIndex = null;

elements.categorySelect.innerHTML = CATEGORIES.map(
  ([key, label]) => `<option value="${key}">${escapeHtml(label)}</option>`,
).join("");

elements.loginForm.addEventListener("submit", login);
elements.logoutButton.addEventListener("click", logout);
elements.categorySelect.addEventListener("change", () => {
  selectedCategory = elements.categorySelect.value;
  renderCategory();
});
elements.categoryTitle.addEventListener("input", () => {
  currentCategory().title = elements.categoryTitle.value;
  markDirty();
  updateHeading();
});
elements.fileInput.addEventListener("change", () => uploadFiles(elements.fileInput.files));
elements.saveButton.addEventListener("click", () => save(false));
elements.previewButton.addEventListener("click", preview);
elements.publishButton.addEventListener("click", () => save(true));

for (const eventName of ["dragenter", "dragover"]) {
  elements.dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropzone.classList.add("is-dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  elements.dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropzone.classList.remove("is-dragging");
  });
}
elements.dropzone.addEventListener("drop", (event) => uploadFiles(event.dataTransfer.files));

elements.photoGrid.addEventListener("input", (event) => {
  const card = event.target.closest(".photo-card");
  if (!card) return;
  const image = currentCategory().images[Number(card.dataset.index)];
  if (event.target.matches("[data-field='alt']")) image.alt = event.target.value;
  if (event.target.matches("[data-field='caption']")) image.caption = event.target.value;
  markDirty();
});

elements.photoGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  const card = event.target.closest(".photo-card");
  if (!button || !card || busy) return;
  const index = Number(card.dataset.index);
  const images = currentCategory().images;
  if (button.dataset.action === "cover" && index > 0) images.unshift(images.splice(index, 1)[0]);
  if (button.dataset.action === "left" && index > 0) [images[index - 1], images[index]] = [images[index], images[index - 1]];
  if (button.dataset.action === "right" && index < images.length - 1) [images[index + 1], images[index]] = [images[index], images[index + 1]];
  if (button.dataset.action === "delete") {
    if (!window.confirm("确认从后台和云端存储中删除这张照片？")) return;
    const [image] = images.splice(index, 1);
    await api(`/api/admin/delete?key=${encodeURIComponent(image.key)}`, { method: "DELETE" });
  }
  markDirty();
  renderCategory();
});

elements.photoGrid.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".photo-card");
  if (!card) return;
  draggedIndex = Number(card.dataset.index);
  card.classList.add("is-dragging");
});
elements.photoGrid.addEventListener("dragover", (event) => {
  event.preventDefault();
  event.target.closest(".photo-card")?.classList.add("is-drop-target");
});
elements.photoGrid.addEventListener("dragleave", (event) => event.target.closest(".photo-card")?.classList.remove("is-drop-target"));
elements.photoGrid.addEventListener("drop", (event) => {
  event.preventDefault();
  const card = event.target.closest(".photo-card");
  if (!card || draggedIndex === null) return;
  const targetIndex = Number(card.dataset.index);
  const images = currentCategory().images;
  const [moved] = images.splice(draggedIndex, 1);
  images.splice(targetIndex, 0, moved);
  draggedIndex = null;
  markDirty();
  renderCategory();
});
elements.photoGrid.addEventListener("dragend", () => {
  draggedIndex = null;
  elements.photoGrid.querySelectorAll(".photo-card").forEach((card) => card.classList.remove("is-dragging", "is-drop-target"));
});

window.addEventListener("beforeunload", (event) => {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

boot();

async function boot() {
  try {
    const session = await api("/api/admin/session");
    if (session.authenticated) return loadDashboard();
  } catch {}
  showLogin();
}

async function login(event) {
  event.preventDefault();
  elements.loginStatus.textContent = "正在登录…";
  try {
    await api("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: elements.password.value }),
    });
    elements.password.value = "";
    await loadDashboard();
  } catch (error) {
    elements.loginStatus.textContent = error.message;
  }
}

async function logout() {
  await api("/api/admin/logout", { method: "POST" }).catch(() => {});
  manifest = { version: 1, updatedAt: null, categories: {} };
  showLogin();
}

function showLogin() {
  elements.app.hidden = true;
  elements.loginShell.hidden = false;
  elements.password.focus();
}

async function loadDashboard() {
  manifest = await api("/api/admin/content");
  elements.loginShell.hidden = true;
  elements.app.hidden = false;
  dirty = false;
  renderCategory();
}

function currentCategory() {
  if (!manifest.categories[selectedCategory]) {
    const label = CATEGORIES.find(([key]) => key === selectedCategory)?.[1] || selectedCategory;
    manifest.categories[selectedCategory] = { title: label.split(" / ")[0], images: [] };
  }
  return manifest.categories[selectedCategory];
}

function renderCategory() {
  const category = currentCategory();
  elements.categoryTitle.value = category.title || "";
  updateHeading();
  elements.emptyState.hidden = category.images.length > 0;
  elements.photoGrid.innerHTML = category.images.map((image, index) => photoCard(image, index)).join("");
}

function updateHeading() {
  const category = currentCategory();
  elements.categoryEyebrow.textContent = CATEGORIES.find(([key]) => key === selectedCategory)?.[1] || selectedCategory;
  elements.categoryHeading.textContent = `${category.title || "作品照片"} · ${category.images.length} 张`;
}

function photoCard(image, index) {
  return `
    <article class="photo-card" data-index="${index}" draggable="true">
      <div class="photo-image">
        <img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt || image.originalName || "作品照片")}" loading="lazy" />
        ${index === 0 ? '<span class="cover-badge">网站封面</span>' : ""}
      </div>
      <div class="photo-fields">
        <label><span>图片说明（SEO）</span><input data-field="alt" maxlength="240" value="${escapeHtml(image.alt || "")}" placeholder="例如：教堂内的小提琴独奏" /></label>
        <label><span>照片标题（可选）</span><input data-field="caption" maxlength="500" value="${escapeHtml(image.caption || "")}" placeholder="显示在作品浏览器中" /></label>
        <div class="photo-actions">
          ${index === 0 ? "" : '<button class="mini-button" data-action="cover" type="button">设为封面</button>'}
          <button class="mini-button" data-action="left" type="button" aria-label="向前移动">←</button>
          <button class="mini-button" data-action="right" type="button" aria-label="向后移动">→</button>
          <button class="mini-button danger" data-action="delete" type="button">删除</button>
        </div>
      </div>
    </article>`;
}

async function uploadFiles(fileList) {
  const files = Array.from(fileList || []).filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
  if (!files.length || busy) return;
  setBusy(true);
  elements.progress.hidden = false;
  elements.uploadStatus.textContent = `准备上传 ${files.length} 张照片…`;

  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      elements.uploadStatus.textContent = `正在处理 ${index + 1}/${files.length}：${file.name}`;
      const optimized = await optimizeImage(file);
      const result = await api(
        `/api/admin/upload?category=${encodeURIComponent(selectedCategory)}&name=${encodeURIComponent(file.name)}&width=${optimized.width}&height=${optimized.height}`,
        { method: "POST", headers: { "content-type": optimized.blob.type }, body: optimized.blob },
      );
      result.image.alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      currentCategory().images.push(result.image);
      elements.progressBar.style.width = `${Math.round(((index + 1) / files.length) * 100)}%`;
      renderCategory();
    }
    markDirty();
    await save(false, true);
    elements.uploadStatus.textContent = `${files.length} 张照片已上传并保存为草稿。`;
  } catch (error) {
    elements.uploadStatus.textContent = `上传中断：${error.message}`;
  } finally {
    elements.fileInput.value = "";
    setBusy(false);
    setTimeout(() => {
      elements.progress.hidden = true;
      elements.progressBar.style.width = "0";
    }, 1000);
  }
}

async function optimizeImage(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const maxEdge = 2400;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("无法压缩图片。"))), "image/jpeg", 0.86),
  );
  return { blob, width, height };
}

async function preview() {
  const previewWindow = window.open("about:blank", "portfolio-preview");
  try {
    await save(false);
    if (previewWindow) previewWindow.location = "/?portfolio=draft";
  } catch {
    previewWindow?.close();
  }
}

async function save(publish, allowWhileBusy = false) {
  if (busy && !allowWhileBusy) return;
  setBusy(true);
  elements.globalStatus.textContent = publish ? "正在发布到网站…" : "正在保存草稿…";
  try {
    const result = await api(`/api/admin/content${publish ? "?publish=1" : ""}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(manifest),
    });
    manifest = result.manifest;
    dirty = false;
    updateSaveState();
    elements.globalStatus.textContent = publish ? "发布成功，网站将在一分钟内显示新照片。" : "草稿已保存。";
    return result;
  } catch (error) {
    elements.globalStatus.textContent = error.message;
    throw error;
  } finally {
    setBusy(false);
  }
}

function markDirty() {
  dirty = true;
  updateSaveState();
}

function updateSaveState() {
  elements.saveState.textContent = dirty ? "有未保存修改" : "已保存";
  elements.saveState.classList.toggle("is-dirty", dirty);
}

function setBusy(value) {
  busy = value;
  for (const button of [elements.saveButton, elements.previewButton, elements.publishButton, elements.logoutButton]) button.disabled = value;
}

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  const result = await response.json().catch(() => ({ message: "服务器返回了无法识别的内容。" }));
  if (response.status === 401 && url !== "/api/admin/login") showLogin();
  if (!response.ok) throw new Error(result.message || "操作失败。");
  return result;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]);
}
