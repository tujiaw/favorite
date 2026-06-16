import { TYPES } from "./constants.js";
import { decryptSecret, encryptSecret } from "./crypto.js";
import { createBaseItem, deleteFavorite, listFavorites, saveFavorite, uploadImage } from "./data.js";
import { icons } from "./icons.js";
import { state, localUser, setSessionUser } from "./state.js";
import { loadLLMConfig, loadPrompts, runPrompt, saveLLMConfig, savePrompts } from "./ai.js";
import {
  createModalTemplate,
  deleteConfirmTemplate,
  detailTemplate,
  itemCardTemplate,
  loginTemplate,
  settingsModalTemplate,
  sidebarTemplate,
  topbarTemplate,
  vaultModalTemplate
} from "./templates.js";
import { classifyContent, domainFromUrl, makePreview, titleFromContent, withTimeout } from "./utils.js";

let app;

export function startApp(rootElement) {
  app = rootElement;
  boot();
}

async function boot() {
  // 加载保险箱密码
  loadVaultPassword();
  state.llmConfig = loadLLMConfig();
  state.prompts = loadPrompts();
  captureInstallPrompt();
  render();
  if (new URLSearchParams(window.location.search).get("demo") === "1") {
    state.supabaseReady = false;
    state.user = localUser();
    state.isLoadingAuth = false;
    state.booted = true;
    await refreshItems();
    render();
    return;
  }

  state.supabaseReady = Boolean(window.FAVORITE_SUPABASE?.url && window.FAVORITE_SUPABASE?.anonKey);
  if (state.supabaseReady) {
    try {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      state.supabase = createClient(window.FAVORITE_SUPABASE.url, window.FAVORITE_SUPABASE.anonKey);
      const {
        data: { subscription }
      } = state.supabase.auth.onAuthStateChange(async (_event, session) => {
        setSessionUser(session?.user ?? null);
        state.isLoadingAuth = false;
        if (state.user) await refreshItems();
        render();
      });
      state.authSubscription = subscription;

      const {
        data: { user },
        error
      } = await withTimeout(state.supabase.auth.getUser(), 5000, {
        data: { user: null },
        error: new Error("Supabase getUser timed out")
      });
      if (error) console.error("Error fetching user:", error);
      setSessionUser(user ?? null);
    } catch (error) {
      console.error("Supabase SDK 加载失败:", error);
      state.supabaseReady = false;
      state.status = "Supabase SDK 加载失败，已切换到本地模式";
      state.user = localUser();
    }
  } else {
    state.user = localUser();
  }
  state.isLoadingAuth = false;
  state.booted = true;
  if (state.user) await refreshItems();
  render();
}

function render() {
  if (!state.booted || state.isLoadingAuth) {
    app.innerHTML = `<main class="login-screen"><p class="status">正在连接 GitHub 登录...</p></main>`;
    return;
  }

  if (!state.user) {
    app.innerHTML = loginTemplate();
    bindLogin();
    return;
  }

  const filtered = filteredItems();
  const selected = selectedItem();
  const emptyText = state.query.trim()
    ? "没有匹配的收藏，试试换个关键词"
    : "还没有收藏，点击“创建”开始";
  app.innerHTML = `
    <main class="app-shell">
      ${topbarTemplate()}
      <div class="workspace ${state.sidebarCollapsed ? "sidebar-is-collapsed" : ""}">
        ${sidebarTemplate()}
        <section class="content">
          <div class="conversation-panel">
            <div class="conversation-head">
              <h2>收藏列表</h2>
              <div class="conversation-tools">
                <button class="icon-button ${state.favoriteOnly ? "active" : ""}" title="只显示已标星" data-action="toggle-favorite-filter">${icons.sliders()}</button>
                <button class="icon-button" title="排序" data-action="toggle-sort-menu">${icons.more()}</button>
              </div>
              ${state.sortMenu ? `
                <div class="sort-menu">
                  <button class="sort-option ${state.sortMode === "updated_at" ? "active" : ""}" data-sort="updated_at">
                    ${state.sortMode === "updated_at" && state.sortDesc ? "↓" : "↑"} 按时间
                  </button>
                  <button class="sort-option ${state.sortMode === "use_count" ? "active" : ""}" data-sort="use_count">
                    ${state.sortMode === "use_count" && state.sortDesc ? "↓" : "↑"} 按使用次数
                  </button>
                  <button class="sort-option ${state.sortMode === "title" ? "active" : ""}" data-sort="title">
                    ${state.sortMode === "title" && state.sortDesc ? "↓" : "↑"} 按名称
                  </button>
                </div>
              ` : ""}
            </div>
            <div class="conversation-body">
              <div class="item-list">
                ${
                  filtered.length
                    ? filtered.map((item) => itemCardTemplate(item, selected?.id === item.id)).join("")
                    : `<div class="empty-list">${emptyText}</div>`
                }
              </div>
            </div>
          </div>
        </section>
        ${detailTemplate(selected)}
      </div>
      <p class="notebook-note">收藏中心提供的内容仅供个人整理与复用，敏感字段会在浏览器端加密。</p>
      ${state.createModal ? createModalTemplate() : ""}
      ${state.vaultModal ? vaultModalTemplate() : ""}
      ${state.settingsModal ? settingsModalTemplate() : ""}
      ${state.deleteConfirm ? deleteConfirmTemplate() : ""}
    </main>
  `;
  bindWorkspace();
}

function bindLogin() {
  document.querySelectorAll("[data-auth]").forEach((button) => {
    button.addEventListener("click", () => signIn(button.dataset.auth));
  });
}

function restoreInputFocus(selector, cursorStart, cursorEnd) {
  window.requestAnimationFrame(() => {
    const input = document.querySelector(selector);
    if (!input) return;
    input.focus();
    if (typeof cursorStart === "number" && typeof cursorEnd === "number") {
      input.setSelectionRange(cursorStart, cursorEnd);
    }
  });
}

function bindWorkspace() {
  document.querySelector("[data-action='sign-out']")?.addEventListener("click", signOut);
  document.querySelectorAll("[data-action='toggle-sidebar']").forEach((button) => {
    button.addEventListener("click", () => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      render();
    });
  });
  document.querySelectorAll("[data-action='open-create']").forEach((button) => {
    button.addEventListener("click", () => {
      state.createModal = true;
      state.modalTab = "favorite";
      render();
      window.setTimeout(() => document.querySelector("[data-field='quick-input']")?.focus(), 0);
    });
  });
  const searchInput = document.querySelector("[data-field='query']");
  searchInput?.addEventListener("input", (event) => {
    const cursorStart = event.target.selectionStart;
    const cursorEnd = event.target.selectionEnd;
    state.query = event.target.value;
    if (event.isComposing) return;
    render();
    restoreInputFocus("[data-field='query']", cursorStart, cursorEnd);
  });
  searchInput?.addEventListener("compositionend", (event) => {
    state.query = event.target.value;
    render();
    restoreInputFocus("[data-field='query']", event.target.selectionStart, event.target.selectionEnd);
  });
  document.querySelectorAll("[data-type-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.typeFilter = button.dataset.typeFilter;
      render();
    });
  });
  document.querySelector("[data-action='toggle-favorite-filter']")?.addEventListener("click", () => {
    state.favoriteOnly = !state.favoriteOnly;
    render();
  });
  document.querySelector("[data-action='toggle-sort-menu']")?.addEventListener("click", () => {
    state.sortMenu = !state.sortMenu;
    render();
  });
  document.querySelectorAll("[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const sort = button.dataset.sort;
      if (state.sortMode === sort) {
        state.sortDesc = !state.sortDesc;
      } else {
        state.sortMode = sort;
        state.sortDesc = true;
      }
      state.sortMenu = false;
      render();
    });
  });
  const quick = document.querySelector("[data-field='quick-input']");
  quick?.addEventListener("input", (event) => {
    state.quickInput = event.target.value;
  });
  quick?.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      saveQuickInput();
    }
  });
  quick?.addEventListener("paste", handlePaste);
  document.querySelector("[data-action='save-quick']")?.addEventListener("click", saveQuickInput);
  document.querySelector("[data-action='choose-image']")?.addEventListener("click", () => {
    document.querySelector("[data-field='image-file']")?.click();
  });
  document.querySelector("[data-field='image-file']")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (file) await addImage(file);
  });
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.modalTab = button.dataset.tab;
      render();
    });
  });

  document.querySelectorAll("[data-select]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.selectedId = button.dataset.select;
      state.passwordVisible = false;
      // 如果是账号且有加密数据，尝试解密
      const item = state.items.find(i => i.id === button.dataset.select);
      if (item?.type === "account" && item.encrypted_secret && state.vaultPassword) {
        try {
          state.revealedSecret = await decryptSecret(state.vaultPassword, item.encrypted_secret);
        } catch {
          state.revealedSecret = null;
        }
      } else {
        state.revealedSecret = null;
      }
      render();
    });
  });

  bindDetail();
  bindModal();
}

function bindDetail() {
  const item = selectedItem();
  if (!item) return;
  document.querySelector("[data-action='toggle-favorite']")?.addEventListener("click", () => updateSelected({ favorite: !item.favorite }));
  document.querySelector("[data-action='copy-content']")?.addEventListener("click", () => copyText(item.content));
  document.querySelector("[data-action='delete-selected']")?.addEventListener("click", deleteSelected);
  document.querySelector("[data-action='toggle-password']")?.addEventListener("click", togglePasswordVisibility);
  document.querySelectorAll("[data-edit]").forEach((field) => {
    field.addEventListener("change", async (event) => {
      const key = event.target.dataset.edit;
      let value = event.target.value;
      if (key === "tags") {
        value = Array.from(
          new Set(
            value
              .split(/[,，]/)
              .map((tag) => tag.trim())
              .filter(Boolean)
          )
        );
      }
      if (key === "content") {
        await updateSelected({ content: value, preview: makePreview(value) });
        return;
      }
      await updateSelected({ [key]: value });
    });
  });
}

function bindModal() {
  document.querySelectorAll("[data-action='close-create']").forEach((button) => {
    button.addEventListener("click", () => {
      state.createModal = false;
      state.modalTab = "favorite";
      render();
    });
  });
  document.querySelectorAll("[data-action='open-vault']").forEach((button) => {
    button.addEventListener("click", () => {
      state.vaultModal = true;
      state.createModal = false;
      render();
    });
  });
  document.querySelectorAll("[data-action='close-vault']").forEach((button) => {
    button.addEventListener("click", () => {
      state.vaultModal = false;
      render();
    });
  });
  document.querySelectorAll("[data-action='clear-vault']").forEach((button) => {
    button.addEventListener("click", clearVaultPassword);
  });
  document.querySelectorAll("[data-action='cancel-delete']").forEach((button) => {
    button.addEventListener("click", () => {
      state.deleteConfirm = false;
      render();
    });
  });
  document.querySelectorAll("[data-action='confirm-delete']").forEach((button) => {
    button.addEventListener("click", confirmDelete);
  });
  document.querySelector("[data-action='fetch-site']")?.addEventListener("click", fetchSiteInfo);
  document.querySelector("[data-form='account']")?.addEventListener("submit", createAccount);
  document.querySelector("[data-form='vault']")?.addEventListener("submit", setVaultPassword);
  document.querySelectorAll("[data-action='open-settings']").forEach((button) => {
    button.addEventListener("click", () => {
      state.settingsModal = true;
      render();
    });
  });
  document.querySelectorAll("[data-action='close-settings']").forEach((button) => {
    button.addEventListener("click", () => {
      state.settingsModal = false;
      render();
    });
  });
  document.querySelectorAll("[data-action='add-prompt']").forEach((button) => {
    button.addEventListener("click", addPromptRow);
  });
  document.querySelectorAll("[data-action='delete-prompt']").forEach((button) => {
    button.addEventListener("click", deletePromptRow);
  });
  document.querySelector("[data-form='settings']")?.addEventListener("submit", saveSettings);
  document.querySelectorAll("[data-action='run-ai']").forEach((button) => {
    button.addEventListener("click", () => runAI(button.dataset.promptId));
  });
  document.querySelector("[data-action='prompt-install']")?.addEventListener("click", promptInstall);
}

async function signIn(provider) {
  if (!state.supabaseReady) {
    state.user = localUser();
    state.status = "当前是本地演示模式；配置 Supabase 后将使用真实 OAuth";
    await refreshItems();
    render();
    return;
  }
  state.isLoadingAuth = true;
  render();

  const redirectTo = getAuthRedirectUrl();
  console.log("最终使用的重定向URL:", redirectTo);
  const { error } = await state.supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo }
  });
  if (error) {
    console.error("登录错误:", error);
    state.status = `登录失败：${error.message}`;
    state.isLoadingAuth = false;
    render();
  }
}

async function signOut() {
  state.isLoadingAuth = true;
  render();
  if (state.supabaseReady) {
    const { error } = await state.supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
      state.status = `退出失败：${error.message}`;
    }
  }
  state.user = state.supabaseReady ? null : localUser();
  state.items = [];
  state.selectedId = null;
  state.revealedSecret = null;
  state.isLoadingAuth = false;
  if (state.user) await refreshItems();
  render();
}

function getAuthRedirectUrl() {
  let redirectUrl = `${window.location.origin}${window.location.pathname}`;
  if (!redirectUrl) {
    redirectUrl = `${window.location.href.split("?")[0]}`;
    console.log("使用备选重定向URL:", redirectUrl);
  }
  return redirectUrl;
}

async function refreshItems(preferredId) {
  state.items = await listFavorites();
  if (preferredId) state.selectedId = preferredId;
  if (!state.selectedId || !state.items.some((item) => item.id === state.selectedId)) {
    state.selectedId = state.items[0]?.id || null;
  }
}

async function saveQuickInput() {
  const content = state.quickInput.trim();
  if (!content) return;
  const type = classifyContent(content);
  const item = createBaseItem({
    type,
    title: titleFromContent(content, type),
    content,
    preview: makePreview(content),
    source_url: type === "link" ? content : null,
    domain: type === "link" ? domainFromUrl(content) : null
  });
  await saveFavorite(item);
  state.quickInput = "";
  state.createModal = false;
  state.modalTab = "favorite";
  state.status = `已保存为${TYPES[type].label}`;
  await refreshItems(item.id);
  render();
}

async function handlePaste(event) {
  const image = Array.from(event.clipboardData.files).find((file) => file.type.startsWith("image/"));
  if (!image) return;
  event.preventDefault();
  await addImage(image);
}

async function addImage(file) {
  const id = crypto.randomUUID();
  const uploaded = await uploadImage(state.user.id, id, file);
  const item = createBaseItem({
    id,
    type: "image",
    title: file.name || "图片收藏",
    content: uploaded.publicUrl,
    preview: file.name || "图片收藏",
    storage_path: uploaded.path
  });
  await saveFavorite(item);
  state.createModal = false;
  state.modalTab = "favorite";
  state.status = "图片已保存";
  await refreshItems(item.id);
  render();
}

async function updateSelected(patch) {
  const item = selectedItem();
  if (!item) return;
  const next = { ...item, ...patch, updated_at: new Date().toISOString() };
  await saveFavorite(next);
  await refreshItems(next.id);
  render();
}

async function deleteSelected() {
  const item = selectedItem();
  if (!item) return;
  state.deleteConfirm = true;
  render();
}

async function confirmDelete() {
  const item = selectedItem();
  if (!item) return;
  await deleteFavorite(item.id);
  state.deleteConfirm = false;
  state.selectedId = null;
  state.status = "已删除收藏";
  await refreshItems();
  render();
}

async function createAccount(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const url = String(form.get("url") || "");
  const encrypted = await encryptSecret(state.vaultPassword, {
    password: String(form.get("password") || "")
  });
  const item = createBaseItem({
    type: "account",
    title: domainFromUrl(url) || "账号记录",
    content: String(form.get("username") || ""),
    source_url: url || null,
    domain: domainFromUrl(url),
    preview: "敏感字段已端到端加密",
    note: String(form.get("note") || ""),
    encrypted_secret: encrypted
  });
  await saveFavorite(item);
  state.createModal = false;
  state.modalTab = "favorite";
  state.revealedSecret = null;
  state.status = "账号记录已加密保存";
  await refreshItems(item.id);
  render();
}

async function setVaultPassword(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const password = String(form.get("vaultPassword") || "");
  const confirm = String(form.get("confirmPassword") || "");
  const expireTime = Number(form.get("expireTime") || "3600000");

  if (password.length < 8) {
    state.status = "主密码至少需要 8 位";
    render();
    return;
  }
  if (password !== confirm) {
    state.status = "两次输入的密码不一致";
    render();
    return;
  }

  state.vaultPassword = password;
  state.vaultExpiresAt = expireTime === -1 ? null : Date.now() + expireTime;

  // 保存到 localStorage
  const vaultData = {
    password: btoa(password),
    expiresAt: state.vaultExpiresAt
  };
  localStorage.setItem("favorite-vault", JSON.stringify(vaultData));

  state.vaultModal = false;
  state.status = `保险箱主密码已设置${expireTime === -1 ? "（永不过期）" : ""}`;
  render();
}

function loadVaultPassword() {
  try {
    const saved = localStorage.getItem("favorite-vault");
    if (!saved) return;

    const vaultData = JSON.parse(saved);
    const { password, expiresAt } = vaultData;

    // 检查是否过期
    if (expiresAt && Date.now() > expiresAt) {
      localStorage.removeItem("favorite-vault");
      state.vaultPassword = "";
      state.vaultExpiresAt = null;
      return;
    }

    state.vaultPassword = atob(password);
    state.vaultExpiresAt = expiresAt;
  } catch (error) {
    console.error("加载保险箱密码失败:", error);
    localStorage.removeItem("favorite-vault");
  }
}

function clearVaultPassword() {
  localStorage.removeItem("favorite-vault");
  state.vaultPassword = "";
  state.vaultExpiresAt = null;
  state.status = "保险箱主密码已清除";
  render();
}

async function fetchSiteInfo() {
  const urlInput = document.querySelector("[data-field='account-url']");
  const url = urlInput?.value?.trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    state.status = "请输入有效的 URL";
    render();
    return;
  }

  try {
    const response = await fetch(url, { mode: "no-cors" });
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    const title = doc.querySelector("title")?.textContent || domainFromUrl(url) || "网站";

    const domain = domainFromUrl(url);
    const siteIcon = document.querySelector("[data-field='site-icon']");
    const siteTitle = document.querySelector("[data-field='site-title']");

    if (siteIcon) {
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      siteIcon.innerHTML = `<img src="${faviconUrl}" alt="">`;
    }
    if (siteTitle) {
      siteTitle.textContent = title;
    }

    state.status = `已获取: ${title}`;
  } catch (error) {
    const domain = domainFromUrl(url);
    const siteIcon = document.querySelector("[data-field='site-icon']");
    const siteTitle = document.querySelector("[data-field='site-title']");

    if (siteIcon && domain) {
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      siteIcon.innerHTML = `<img src="${faviconUrl}" alt="">`;
    }
    if (siteTitle && domain) {
      siteTitle.textContent = domain;
    }

    state.status = `已获取图标: ${domain || url}`;
  }
}

async function togglePasswordVisibility() {
  const item = selectedItem();
  if (!item) return;
  // 如果还没有解密且 vault 密码已设置，尝试解密
  if (!state.revealedSecret && item.encrypted_secret && state.vaultPassword) {
    try {
      state.revealedSecret = await decryptSecret(state.vaultPassword, item.encrypted_secret);
    } catch {
      console.error("解密失败");
    }
  }
  state.passwordVisible = !state.passwordVisible;
  render();
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
  const item = selectedItem();
  if (item) {
    await updateSelected({
      last_used_at: new Date().toISOString(),
      use_count: item.use_count + 1
    });
  } else {
    state.status = "已复制到剪贴板";
    render();
  }
}

async function copyPassword() {
  if (!state.revealedSecret?.password) return;
  const value = state.revealedSecret.password;
  await navigator.clipboard.writeText(value);
  state.status = "密码已复制，稍后会尝试清空本应用写入的剪贴板内容";
  render();
  window.setTimeout(async () => {
    try {
      if ((await navigator.clipboard.readText()) === value) {
        await navigator.clipboard.writeText("");
      }
    } catch {
      // Browsers may reject clipboard reads without a fresh user gesture.
    }
  }, 30000);
}

function filteredItems() {
  const query = state.query.trim().toLowerCase();
  let filtered = state.items.filter((item) => {
    const matchesType = state.typeFilter === "all" || item.type === state.typeFilter;
    const matchesFavorite = !state.favoriteOnly || item.favorite;
    const matchesTag = !state.tagFilter || item.tags.includes(state.tagFilter);
    const haystack = [item.title, item.content, item.source_url, item.domain, item.note, item.tags.join(" ")]
      .join(" ")
      .toLowerCase();
    return matchesType && matchesFavorite && matchesTag && (!query || haystack.includes(query));
  });

  // 排序
  filtered.sort((a, b) => {
    let aVal, bVal;
    switch (state.sortMode) {
      case "updated_at":
        aVal = new Date(a.updated_at || a.created_at).getTime();
        bVal = new Date(b.updated_at || b.created_at).getTime();
        break;
      case "use_count":
        aVal = a.use_count || 0;
        bVal = b.use_count || 0;
        break;
      case "title":
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
        break;
      default:
        return 0;
    }
    if (state.sortDesc) {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    } else {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    }
  });

  return filtered;
}

function selectedItem() {
  const filtered = filteredItems();
  return filtered.find((item) => item.id === state.selectedId) || filtered[0] || null;
}

function addPromptRow() {
  state.prompts.push({
    id: `prompt-${Date.now()}`,
    name: "新提示词",
    content: ""
  });
  render();
}

function deletePromptRow(event) {
  const index = Number(event.currentTarget.dataset.promptIndex);
  if (Number.isNaN(index)) return;
  state.prompts.splice(index, 1);
  if (state.prompts.length === 0) {
    state.status = "至少保留一个提示词";
  }
  render();
}

function saveSettings(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const baseUrl = String(form.baseUrl?.value || "").trim();
  const apiKey = String(form.apiKey?.value || "").trim();
  const model = String(form.model?.value || "").trim();
  const prompts = Array.from(state.prompts).map((p, index) => {
    const id = p.id;
    const nameEl = form.querySelector(`[data-prompt-name="${cssEscape(id)}"]`);
    const contentEl = form.querySelector(`[data-prompt-content="${cssEscape(id)}"]`);
    return {
      id,
      name: String(nameEl?.value || "").trim() || "未命名",
      content: String(contentEl?.value || "").trim()
    };
  });
  state.llmConfig = { baseUrl, apiKey, model };
  state.prompts = prompts;
  saveLLMConfig(state.llmConfig);
  savePrompts(state.prompts);
  state.settingsModal = false;
  state.status = "设置已保存";
  render();
}

function cssEscape(value) {
  return String(value).replace(/["\\]/g, "\\$&");
}

function captureInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.installPromptEvent = event;
    if (state.booted) render();
  });
  window.addEventListener("appinstalled", () => {
    state.installPromptEvent = null;
    if (state.booted) render();
  });
}

async function promptInstall() {
  if (!state.installPromptEvent) return;
  state.installPromptEvent.prompt();
  const { outcome } = await state.installPromptEvent.userChoice;
  state.installPromptEvent = null;
  if (outcome !== "accepted") {
    state.status = "已取消安装";
  }
  render();
}

async function runAI(promptId) {
  const item = selectedItem();
  if (!item || item.type === "image" || item.type === "account") return;
  const prompt = state.prompts.find((p) => p.id === promptId);
  if (!prompt) return;
  if (!state.llmConfig.baseUrl || !state.llmConfig.apiKey || !state.llmConfig.model) {
    state.status = "请先在设置中配置大模型";
    state.settingsModal = true;
    render();
    return;
  }
  state.aiLoading = true;
  state.status = `正在执行：${prompt.name}`;
  render();
  try {
    const result = await runPrompt(prompt.content, item.content, state.llmConfig);
    await updateSelected({ content: result, preview: makePreview(result) });
    state.status = `已应用：${prompt.name}`;
  } catch (error) {
    console.error("AI 处理失败:", error);
    state.status = `AI 处理失败：${error.message}`;
  } finally {
    state.aiLoading = false;
    render();
  }
}
