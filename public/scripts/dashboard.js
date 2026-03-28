const state = {
  currentUser: null,
  users: [],
  assets: [],
  shuffle: null,
};

const toastRoot = document.getElementById("toast-root");
const assetGrid = document.getElementById("asset-grid");
const assetModal = document.getElementById("asset-modal");
const assetModalBody = document.getElementById("asset-modal-body");

const showToast = (message, type = "success") => {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  toastRoot.appendChild(el);
  setTimeout(() => el.remove(), 3500);
};

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
  });

  if (response.status === 401) {
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Request failed.");
  }

  return json;
};

const formatBytes = (size = 0) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const isImage = (mime) => mime?.startsWith("image/");
const isVideo = (mime) => mime?.startsWith("video/");
const isPdf = (mime) => mime === "application/pdf";

const renderUserMeta = (user) => `
  <div class="user-row">
    <div class="user-row__meta">
      <strong>${escapeHtml(user.name)}</strong>
      <span>${escapeHtml(user.email)}</span>
      <code>API Key: ${escapeHtml(user.api_key)}</code>
    </div>
    <div class="stack">
      <span class="muted small">${user.role}</span>
      <button class="button secondary" data-reset-password="${user.id}" type="button">
        Change Password
      </button>
    </div>
  </div>
`;

const renderAssetCard = (asset) => {
  const thumb = isImage(asset.mime_type)
    ? `<img src="${asset.url}" alt="${escapeHtml(asset.original_name)}" />`
    : isVideo(asset.mime_type)
      ? `<video src="${asset.url}" muted></video>`
      : `<div class="muted">${escapeHtml(asset.type_group.toUpperCase())}</div>`;

  return `
    <div class="asset-item col-12 col-sm-6 col-lg-4 col-xxl-3" data-groups='["${asset.type_group}"]' data-asset-id="${asset.id}">
      <article class="asset-card h-100">
        <div class="asset-card__thumb">${thumb}</div>
        <div class="asset-card__body">
          <p class="asset-card__title">${escapeHtml(asset.original_name)}</p>
          <p class="asset-card__meta">${formatBytes(asset.size)} | ${escapeHtml(asset.uploaded_by_email || "system")}</p>
        </div>
      </article>
    </div>
  `;
};

const setTab = (tabId) => {
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.tabTarget === tabId);
  });
};

const renderAssets = () => {
  assetGrid.innerHTML = state.assets.map(renderAssetCard).join("");

  if (!state.shuffle && window.Shuffle) {
    state.shuffle = new window.Shuffle(assetGrid, {
      itemSelector: ".asset-item",
    });
  } else if (state.shuffle) {
    state.shuffle.remove(state.shuffle.items.map((item) => item.element));
    state.shuffle.add(Array.from(assetGrid.children));
  }
};

const openAssetModal = (asset) => {
  const media = isImage(asset.mime_type)
    ? `<img src="${asset.url}" alt="${escapeHtml(asset.original_name)}" />`
    : isVideo(asset.mime_type)
      ? `<video src="${asset.url}" controls></video>`
      : isPdf(asset.mime_type)
        ? `<iframe src="${asset.url}"></iframe>`
        : `<iframe src="${asset.url}"></iframe>`;

  assetModalBody.innerHTML = `
    <div class="modal-preview">
      <div class="modal-preview__media">${media}</div>
      <div class="stack">
        <h3>${escapeHtml(asset.original_name)}</h3>
        <div class="info-row"><span>Type</span><strong>${escapeHtml(asset.mime_type)}</strong></div>
        <div class="info-row"><span>Size</span><strong>${formatBytes(asset.size)}</strong></div>
        <div class="info-row"><span>Uploaded By</span><strong>${escapeHtml(asset.uploaded_by_email || "system")}</strong></div>
        <div class="info-row"><span>URL</span><code>${escapeHtml(asset.url)}</code></div>
      </div>
    </div>
  `;

  assetModal.classList.remove("hidden");
};

const closeAssetModal = () => {
  assetModal.classList.add("hidden");
};

const renderUsers = () => {
  const wrapper = document.getElementById("users-list");
  if (!wrapper) return;
  wrapper.innerHTML = state.users.map(renderUserMeta).join("");
};

const hydrateProfile = () => {
  const user = state.currentUser;
  document.getElementById("current-user-name").textContent = user.name;
  document.getElementById("current-user-role").textContent = user.role;
  document.getElementById("welcome-title").textContent = `Welcome, ${user.name}`;
  document.getElementById("metric-assets").textContent = String(state.assets.length);
  document.getElementById("metric-users").textContent = String(state.users.length);
  document.getElementById("my-api-key").textContent = user.api_key;
  document.getElementById("settings-name").textContent = user.name;
  document.getElementById("settings-email").textContent = user.email;
  document.getElementById("settings-role").textContent = user.role;
};

const loadDashboard = async () => {
  const me = await api("/api/v1/auth/me");
  state.currentUser = me.data;

  const assets = await api("/api/v1/assets");
  state.assets = assets.data || [];

  if (state.currentUser.role === "admin") {
    const users = await api("/api/v1/users");
    state.users = users.data || [];
    document.querySelectorAll(".admin-only").forEach((el) => {
      el.classList.remove("hidden");
    });
  } else {
    document.querySelectorAll(".admin-only").forEach((el) => {
      el.classList.add("hidden");
    });
  }

  renderAssets();
  renderUsers();
  hydrateProfile();
};

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => setTab(button.dataset.tabTarget));
});

document.getElementById("logout-button")?.addEventListener("click", async () => {
  try {
    await api("/api/v1/auth/logout", { method: "POST" });
  } finally {
    window.location.href = "/login";
  }
});

document.getElementById("copy-api-key")?.addEventListener("click", async () => {
  await navigator.clipboard.writeText(state.currentUser.api_key);
  showToast("API key copied.");
});

document.getElementById("upload-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const files = document.getElementById("upload-files").files;
  if (!files.length) return;

  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("files", file));

  try {
    await api("/api/v1/assets/upload", {
      method: "POST",
      body: formData,
    });
    showToast("Assets uploaded successfully.");
    const assets = await api("/api/v1/assets");
    state.assets = assets.data || [];
    renderAssets();
    hydrateProfile();
    event.target.reset();
  } catch (error) {
    showToast(error.message || "Failed to upload assets.", "error");
  }
});

document.getElementById("create-user-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);

  try {
    await api("/api/v1/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        password: String(formData.get("password") || "").trim(),
        role: String(formData.get("role") || "user").trim(),
      }),
    });
    showToast("User created successfully.");
    const users = await api("/api/v1/users");
    state.users = users.data || [];
    renderUsers();
    hydrateProfile();
    event.target.reset();
  } catch (error) {
    showToast(error.message || "Failed to create user.", "error");
  }
});

document.getElementById("change-password-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);

  try {
    await api("/api/v1/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        current_password: String(formData.get("current_password") || "").trim(),
        new_password: String(formData.get("new_password") || "").trim(),
      }),
    });
    showToast("Password changed successfully.");
    event.target.reset();
  } catch (error) {
    showToast(error.message || "Failed to change password.", "error");
  }
});

document.addEventListener("click", async (event) => {
  const filterButton = event.target.closest("[data-filter]");
  if (filterButton && state.shuffle) {
    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.classList.toggle("active", button === filterButton);
    });

    const filter = filterButton.dataset.filter;
    state.shuffle.filter(filter === "all" ? () => true : filter);
  }

  const assetCard = event.target.closest("[data-asset-id]");
  if (assetCard) {
    const asset = state.assets.find((item) => item.id === assetCard.dataset.assetId);
    if (asset) {
      openAssetModal(asset);
    }
  }

  if (event.target.closest("[data-close-modal='true']")) {
    closeAssetModal();
  }

  const resetButton = event.target.closest("[data-reset-password]");
  if (resetButton) {
    const userId = resetButton.dataset.resetPassword;
    const newPassword = window.prompt("Enter a new password (min 6 chars):");
    if (!newPassword) return;

    try {
      await api(`/api/v1/auth/users/${userId}/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          new_password: newPassword,
        }),
      });
      showToast("User password updated successfully.");
    } catch (error) {
      showToast(error.message || "Failed to update user password.", "error");
    }
  }
});

loadDashboard().catch((error) => {
  showToast(error.message || "Failed to load dashboard.", "error");
});
