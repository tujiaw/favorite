const icons = iconMap();
primaryRoundStyles();

const TYPES = {
  all: { label: "全部", icon: icons.sparkles },
  link: { label: "链接", icon: icons.globe },
  text: { label: "文本", icon: icons.text },
  image: { label: "图片", icon: icons.image },
  code: { label: "代码", icon: icons.code },
  json: { label: "JSON", icon: icons.json },
  account: { label: "账号", icon: icons.key }
};

const STORAGE_KEY = "favorite-center-items";
const state = {
  user: null,
  items: [],
  selectedId: null,
  query: "",
  typeFilter: "all",
  favoriteOnly: false,
  tagFilter: null,
  status: "准备收藏你的下一段资料",
  quickInput: "",
  accountModal: false,
  vaultPassword: "",
  vaultUnlockedItem: null,
  revealedSecret: null,
  supabase: null,
  supabaseReady: false,
  isLoadingAuth: true,
  booted: false
};

const app = document.querySelector("#app");

boot();

async function boot() {
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

function withTimeout(promise, timeoutMs, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      window.setTimeout(() => resolve(fallback), timeoutMs);
    })
  ]);
}

function setSessionUser(user) {
  state.user = user
    ? {
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.name || user.email || "已登录用户"
      }
    : null;
}

function localUser() {
  return { id: "local-user", email: "local@favorite.app", name: "本地模式" };
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
  app.innerHTML = `
    <main class="app-shell">
      ${topbarTemplate()}
      <div class="workspace">
        ${sidebarTemplate()}
        <section class="content">
          <div class="conversation-panel">
            <div class="conversation-head">
              <h2>收藏列表</h2>
              <div class="conversation-tools">
                <button class="icon-button" title="筛选">${icons.sliders()}</button>
                <button class="icon-button" title="更多">${icons.more()}</button>
              </div>
            </div>
            <div class="conversation-body">
              <div class="item-list">
                ${
                  filtered.length
                    ? filtered.map((item) => itemCardTemplate(item, selected?.id === item.id)).join("")
                    : `<div class="empty-list">从左侧添加来源，或在下方输入框保存第一条资料</div>`
                }
              </div>
            </div>
            ${composerTemplate()}
            <p class="notebook-note">收藏中心提供的内容仅供个人整理与复用，敏感字段会在浏览器端加密。</p>
          </div>
        </section>
        ${detailTemplate(selected)}
      </div>
      ${state.accountModal ? accountModalTemplate() : ""}
    </main>
  `;
  bindWorkspace();
}

function loginTemplate() {
  return `
    <main class="login-screen">
      <section class="login-card">
        <div class="brand">
          <div class="brand-mark">${icons.archive()}</div>
          <div>
            <h1 class="brand-title">个人收藏中心</h1>
            <p class="brand-subtitle">登录后同步你的资料、图片和账号保险箱</p>
          </div>
        </div>
        <div class="login-actions">
          <button class="outline-button" data-auth="github">${icons.github()} 使用 GitHub 登录</button>
        </div>
      </section>
    </main>
  `;
}

function topbarTemplate() {
  const subtitle = state.supabaseReady ? escapeHtml(state.user.email) : "本地演示模式";
  const favoriteCount = state.items.filter((item) => item.favorite).length;
  return `
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <div class="brand-mark">${icons.archive()}</div>
          <div>
            <h1 class="brand-title">小查AI智能标注系统界面</h1>
            <p class="brand-subtitle">${subtitle}</p>
          </div>
        </div>
        <div class="topbar-actions">
          <button class="create-notebook" data-action="focus-composer">${icons.plus()} 创建笔记本</button>
          <button class="icon-button" title="分享">${icons.share()}</button>
          <button class="icon-button" title="设置">${icons.settings()}</button>
          <button class="icon-button" title="应用">${icons.grid()}</button>
          <span class="avatar" title="${escapeAttr(subtitle)}">悟</span>
          <span class="topbar-chip">${state.items.length} 条</span>
          <span class="topbar-chip">${favoriteCount} 收藏</span>
        </div>
        <button class="icon-button" title="退出登录" data-action="sign-out">${icons.logout()}</button>
      </div>
    </header>
  `;
}

function sidebarTemplate() {
  const allTags = Array.from(new Set(state.items.flatMap((item) => item.tags))).sort((a, b) => a.localeCompare(b));
  return `
    <aside class="sidebar">
      <section class="panel sources-panel">
        <div class="panel-title-row">
          <h2>来源</h2>
          <button class="icon-button compact" title="折叠来源">${icons.panel()}</button>
        </div>
        <button class="add-source-button" data-action="focus-composer">${icons.plus()} 添加来源</button>
        <div class="source-search-card">
          <p>在网络中搜索新来源</p>
          <div class="source-search-actions">
            <button class="mini-pill">${icons.globe()} ${icons.chevronDown()}</button>
            <button class="mini-pill">${icons.sparkles()} ${icons.chevronDown()}</button>
            <button class="round-disabled">${icons.search()}</button>
          </div>
        </div>
        <div class="search-wrap">
          ${icons.search()}
          <input class="input search-input" data-field="query" placeholder="搜索标题、内容、标签和备注" value="${escapeAttr(state.query)}" />
        </div>
        <div class="section-label">资料类型</div>
        <div class="nav-list">
          ${Object.entries(TYPES)
            .map(
              ([type, meta]) => `
                <button class="nav-button ${state.typeFilter === type ? "active" : ""}" data-type-filter="${type}">
                  ${meta.icon()} ${meta.label}
                </button>
              `
            )
            .join("")}
        </div>
        <div class="source-select-row">
          <span>全选</span>
          <span class="check-box">${icons.check()}</span>
        </div>
        <button class="nav-button ${state.favoriteOnly ? "active" : ""}" data-action="toggle-favorite-filter">
          ${icons.star()} 只看收藏
        </button>
        <div class="section-label">${icons.tag()} 标签索引</div>
        <div class="tags">
          ${
            allTags.length
              ? allTags
                  .map(
                    (tag) => `
                      <button class="tag-chip ${state.tagFilter === tag ? "active" : ""}" data-tag-filter="${escapeAttr(tag)}">
                        ${escapeHtml(tag)}
                      </button>
                    `
                  )
                  .join("")
              : `<span class="brand-subtitle">暂无标签</span>`
          }
        </div>
      </section>
    </aside>
  `;
}

function composerTemplate() {
  return `
    <section class="composer">
      <textarea class="textarea quick-input" data-field="quick-input" placeholder="粘贴 URL、文本、代码、JSON，或直接粘贴图片。按 Ctrl/⌘ + Enter 保存。">${escapeHtml(state.quickInput)}</textarea>
      <div class="composer-actions">
        <p class="status">${escapeHtml(state.status)}</p>
        <span class="source-count">${state.items.length} 个来源</span>
        <div class="button-row">
          <input class="hidden" type="file" accept="image/*" data-field="image-file" />
          <button class="icon-button" title="添加图片" data-action="choose-image">${icons.image()}</button>
          <button class="icon-button" title="创建账号记录" data-action="open-account">${icons.key()}</button>
          <button class="primary-button" data-action="save-quick">${icons.plus()} 保存</button>
        </div>
      </div>
    </section>
  `;
}

function itemCardTemplate(item, selected) {
  return `
    <button class="item-card ${selected ? "selected" : ""}" data-select="${item.id}">
      <div class="item-main">
        <div class="item-title-row">
          <span class="type-badge">${TYPES[item.type].icon()}</span>
          <div class="min-w-0">
            <h2 class="item-title">${escapeHtml(item.title)}</h2>
            <p class="item-preview">${escapeHtml(item.preview || item.content)}</p>
          </div>
        </div>
        ${item.favorite ? `<span class="favorite-star">${icons.star(true)}</span>` : ""}
      </div>
      <div class="meta-row">
        <span class="meta-pill">${TYPES[item.type].label}</span>
        ${item.domain ? `<span>${escapeHtml(item.domain)}</span>` : ""}
        ${item.tags.map((tag) => `<span class="meta-tag">${escapeHtml(tag)}</span>`).join("")}
        <span>${new Date(item.last_used_at || item.created_at).toLocaleString("zh-CN")}</span>
      </div>
    </button>
  `;
}

function detailTemplate(item) {
  if (!item) {
    return `
      <aside class="detail-panel">
        <div class="panel-title-row">
          <h2>Studio</h2>
          <button class="icon-button compact" title="折叠 Studio">${icons.panel()}</button>
        </div>
        ${studioToolsTemplate()}
        <button class="add-note-button" data-action="open-account">${icons.text()} 添加笔记</button>
        <div class="detail-empty">${icons.eye()}<p>选择一条资料查看详情</p></div>
      </aside>
    `;
  }

  const isUnlocked = state.vaultUnlockedItem === item.id && state.revealedSecret;
  return `
    <aside class="detail-panel">
      <div class="panel-title-row">
        <h2>Studio</h2>
        <button class="icon-button compact" title="折叠 Studio">${icons.panel()}</button>
      </div>
      ${studioToolsTemplate()}
      <div class="detail-header">
        <div class="detail-title-wrap">
          <span class="type-badge">${TYPES[item.type].icon()}</span>
          <div class="min-w-0">
            <p class="detail-type">${TYPES[item.type].label}</p>
            <h2 class="detail-title">${escapeHtml(item.title)}</h2>
          </div>
        </div>
        <button class="icon-button" title="收藏" data-action="toggle-favorite">
          ${icons.heart(item.favorite)}
        </button>
      </div>
      <label class="field">
        <span>标题</span>
        <input class="input" data-edit="title" value="${escapeAttr(item.title)}" />
      </label>
      <label class="field">
        <span>类型</span>
        <select class="select" data-edit="type">
          ${Object.keys(TYPES)
            .filter((type) => type !== "all")
            .map((type) => `<option value="${type}" ${item.type === type ? "selected" : ""}>${TYPES[type].label}</option>`)
            .join("")}
        </select>
      </label>
      ${
        item.type === "image"
          ? `<div class="image-preview"><img src="${escapeAttr(item.content)}" alt="${escapeAttr(item.title)}" /></div>`
          : `<label class="field">
              <span>内容</span>
              <textarea class="textarea" data-edit="content">${escapeHtml(item.content)}</textarea>
            </label>`
      }
      <label class="field">
        <span>标签</span>
        <input class="input" data-edit="tags" placeholder="逗号分隔，例如：工作, 常用" value="${escapeAttr(item.tags.join(", "))}" />
      </label>
      <label class="field">
        <span>备注</span>
        <textarea class="textarea" data-edit="note">${escapeHtml(item.note)}</textarea>
      </label>
      ${
        item.type === "account"
          ? `
            <section class="vault-box">
              <div class="vault-title">${isUnlocked ? icons.unlock() : icons.lock()} 账号保险箱</div>
              ${
                item.encrypted_secret
                  ? isUnlocked
                    ? secretTemplate(state.revealedSecret)
                    : `
                      <div class="vault-unlock">
                        <input class="input" type="password" data-field="vault-password" placeholder="输入主密码" value="${escapeAttr(state.vaultPassword)}" />
                        <button class="icon-button primary-round" data-action="unlock-vault" title="解锁">${icons.shield()}</button>
                      </div>
                    `
                  : `<p class="status">这条账号记录没有加密字段。</p>`
              }
            </section>
          `
          : ""
      }
      <div class="two-cols">
        <button class="outline-button" data-action="copy-content">${icons.copy()} 复制</button>
        ${
          item.source_url
            ? `<a class="outline-button" href="${escapeAttr(item.source_url)}" target="_blank" rel="noreferrer">${icons.external()} 打开</a>`
            : `<button class="outline-button" disabled>${icons.eyeOff()} 无链接</button>`
        }
        <button class="danger-button span-2" data-action="delete-selected">${icons.trash()} 删除</button>
      </div>
    </aside>
  `;
}

function studioToolsTemplate() {
  const tools = [
    ["音频...", icons.audio(), "blue"],
    ["演示...", icons.book(), "sand"],
    ["视频...", icons.video(), "green"],
    ["思维...", icons.nodes(), "pink"],
    ["报告", icons.report(), "sand"],
    ["闪卡", icons.card(), "rose"],
    ["测验", icons.quiz(), "cyan"],
    ["信息图", icons.chart(), "pink"],
    ["数据...", icons.table(), "blue"]
  ];
  return `
    <div class="studio-grid">
      ${tools
        .map(
          ([label, icon, tone], index) => `
            <button class="studio-tile ${tone}">
              <span>${icon}</span>
              <strong>${label}</strong>
              ${index === 1 || index === 7 ? `<em>Beta 版</em>` : ""}
              <i>${icons.chevronRight()}</i>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function secretTemplate(secret) {
  return `
    <div class="secret-row">
      <span>密码：••••••••••••</span>
      <button class="icon-button" data-action="copy-password" title="复制密码">${icons.copy()}</button>
    </div>
    ${secret.recoveryCodes ? `<pre class="secret-pre">${escapeHtml(secret.recoveryCodes)}</pre>` : ""}
    ${secret.privateNote ? `<p class="secret-pre">${escapeHtml(secret.privateNote)}</p>` : ""}
  `;
}

function accountModalTemplate() {
  return `
    <div class="modal-backdrop">
      <form class="modal-card" data-form="account">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">创建账号记录</h2>
            <p class="modal-subtitle">密码、恢复码和私密备注只在浏览器本地加密</p>
          </div>
          <button class="icon-button" type="button" data-action="close-account">×</button>
        </div>
        <div class="form-grid">
          <input class="input" name="title" placeholder="网站标题" />
          <input class="input" name="url" placeholder="URL" />
          <input class="input" name="username" placeholder="用户名" />
          <input class="input" name="password" placeholder="密码" type="password" required />
          <textarea class="textarea span-2" name="recoveryCodes" placeholder="恢复码，可选"></textarea>
          <textarea class="textarea span-2" name="privateNote" placeholder="私密备注，可选"></textarea>
          <input class="input span-2" name="masterPassword" placeholder="保险箱主密码，至少 8 位" type="password" required />
        </div>
        <div class="modal-actions">
          <span class="status">敏感字段不会以明文保存</span>
          <div class="button-row">
            <button class="ghost-button" type="button" data-action="close-account">取消</button>
            <button class="primary-button" type="submit">加密保存</button>
          </div>
        </div>
      </form>
    </div>
  `;
}

function bindLogin() {
  document.querySelectorAll("[data-auth]").forEach((button) => {
    button.addEventListener("click", () => signIn(button.dataset.auth));
  });
}

function bindWorkspace() {
  document.querySelector("[data-action='sign-out']")?.addEventListener("click", signOut);
  document.querySelectorAll("[data-action='focus-composer']").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.querySelector("[data-field='quick-input']");
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
      input?.focus();
    });
  });
  document.querySelector("[data-field='query']")?.addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
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
  document.querySelectorAll("[data-tag-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tagFilter = state.tagFilter === button.dataset.tagFilter ? null : button.dataset.tagFilter;
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
  document.querySelector("[data-action='open-account']")?.addEventListener("click", () => {
    state.accountModal = true;
    render();
  });

  document.querySelectorAll("[data-select]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.select;
      state.vaultUnlockedItem = null;
      state.revealedSecret = null;
      state.vaultPassword = "";
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
  document.querySelector("[data-action='unlock-vault']")?.addEventListener("click", unlockVault);
  document.querySelector("[data-action='copy-password']")?.addEventListener("click", copyPassword);
  document.querySelector("[data-field='vault-password']")?.addEventListener("input", (event) => {
    state.vaultPassword = event.target.value;
  });
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
  document.querySelectorAll("[data-action='close-account']").forEach((button) => {
    button.addEventListener("click", () => {
      state.accountModal = false;
      render();
    });
  });
  document.querySelector("[data-form='account']")?.addEventListener("submit", createAccount);
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
  state.vaultUnlockedItem = null;
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
  await deleteFavorite(item.id);
  state.status = "已删除收藏";
  await refreshItems();
  render();
}

async function createAccount(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const masterPassword = String(form.get("masterPassword") || "");
  if (masterPassword.length < 8) {
    state.status = "主密码至少需要 8 位";
    state.accountModal = false;
    render();
    return;
  }
  const url = String(form.get("url") || "");
  const encrypted = await encryptSecret(masterPassword, {
    password: String(form.get("password") || ""),
    recoveryCodes: String(form.get("recoveryCodes") || ""),
    privateNote: String(form.get("privateNote") || "")
  });
  const item = createBaseItem({
    type: "account",
    title: String(form.get("title") || "") || domainFromUrl(url) || "账号记录",
    content: String(form.get("username") || ""),
    source_url: url || null,
    domain: domainFromUrl(url),
    preview: "敏感字段已端到端加密",
    encrypted_secret: encrypted
  });
  await saveFavorite(item);
  state.accountModal = false;
  state.vaultPassword = "";
  state.vaultUnlockedItem = null;
  state.revealedSecret = null;
  state.status = "账号记录已加密保存";
  await refreshItems(item.id);
  render();
}

async function unlockVault() {
  const item = selectedItem();
  if (!item?.encrypted_secret) return;
  try {
    state.revealedSecret = await decryptSecret(state.vaultPassword, item.encrypted_secret);
    state.vaultUnlockedItem = item.id;
    state.status = "保险箱已解锁";
  } catch {
    state.revealedSecret = null;
    state.vaultUnlockedItem = null;
    state.status = "主密码错误，无法解密";
  }
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
  return state.items.filter((item) => {
    const matchesType = state.typeFilter === "all" || item.type === state.typeFilter;
    const matchesFavorite = !state.favoriteOnly || item.favorite;
    const matchesTag = !state.tagFilter || item.tags.includes(state.tagFilter);
    const haystack = [item.title, item.content, item.source_url, item.domain, item.note, item.tags.join(" ")]
      .join(" ")
      .toLowerCase();
    return matchesType && matchesFavorite && matchesTag && (!query || haystack.includes(query));
  });
}

function selectedItem() {
  return state.items.find((item) => item.id === state.selectedId) || state.items[0] || null;
}

function classifyContent(value) {
  const text = value.trim();
  if (/^https?:\/\//i.test(text)) return "link";
  try {
    JSON.parse(text);
    return "json";
  } catch {
    // Not JSON; continue with code heuristics.
  }
  const codeSignals = [
    /function\s+\w+\s*\(/,
    /const\s+\w+\s*=/,
    /let\s+\w+\s*=/,
    /class\s+\w+/,
    /import\s+.+from\s+["']/,
    /<\/?[a-z][\s\S]*>/i,
    /\bSELECT\b[\s\S]+\bFROM\b/i,
    /\bdef\s+\w+\s*\(/,
    /\bconsole\.log\s*\(/
  ];
  return codeSignals.some((pattern) => pattern.test(text)) ? "code" : "text";
}

function domainFromUrl(value) {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function makePreview(value) {
  return String(value).trim().replace(/\s+/g, " ").slice(0, 160);
}

function titleFromContent(value, type) {
  const text = value.trim();
  if (type === "link") return domainFromUrl(text) || text.slice(0, 80);
  if (type === "json") return "JSON 片段";
  if (type === "code") return text.split(/\r?\n/).find(Boolean)?.slice(0, 80) || "代码片段";
  return text.split(/\r?\n/).find(Boolean)?.slice(0, 80) || "文本收藏";
}

function createBaseItem(input) {
  const now = new Date().toISOString();
  return {
    id: input.id || crypto.randomUUID(),
    user_id: state.user.id,
    type: input.type,
    title: input.title,
    content: input.content || "",
    source_url: input.source_url || null,
    domain: input.domain || null,
    preview: input.preview || "",
    tags: [],
    note: "",
    favorite: false,
    storage_path: input.storage_path || null,
    encrypted_secret: input.encrypted_secret || null,
    created_at: now,
    updated_at: now,
    last_used_at: null,
    use_count: 0
  };
}

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocal(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

async function listFavorites() {
  if (state.supabaseReady) {
    const { data, error } = await state.supabase
      .from("favorites")
      .select("*")
      .eq("user_id", state.user.id)
      .order("updated_at", { ascending: false });
    if (error) {
      state.status = error.message;
      return [];
    }
    return data || [];
  }
  return readLocal()
    .filter((item) => item.user_id === state.user.id)
    .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
}

async function saveFavorite(item) {
  if (state.supabaseReady) {
    const { error } = await state.supabase.from("favorites").upsert(item);
    if (error) throw error;
    return;
  }
  const items = readLocal();
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index >= 0) items[index] = item;
  else items.unshift(item);
  writeLocal(items);
}

async function deleteFavorite(id) {
  if (state.supabaseReady) {
    const { error } = await state.supabase.from("favorites").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  writeLocal(readLocal().filter((item) => item.id !== id));
}

async function uploadImage(userId, itemId, file) {
  const extension = file.name.split(".").pop() || "png";
  const path = `${userId}/${itemId}/image.${extension}`;
  if (state.supabaseReady) {
    const { error } = await state.supabase.storage.from("favorite-images").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = state.supabase.storage.from("favorite-images").getPublicUrl(path);
    return { path, publicUrl: data.publicUrl };
  }
  return {
    path,
    publicUrl: await fileToDataUrl(file)
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const iterations = 210000;

async function encryptSecret(password, payload) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(payload))
  );
  return {
    version: 1,
    algorithm: "AES-GCM",
    kdf: "PBKDF2-SHA-256",
    iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext))
  };
}

async function decryptSecret(password, encrypted) {
  const key = await deriveKey(password, base64ToBytes(encrypted.salt));
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(encrypted.iv) },
    key,
    base64ToBytes(encrypted.ciphertext)
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

async function deriveKey(password, salt) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveKey"
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function svg(path, attrs = "") {
  return `<svg ${attrs} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function filledSvg(path, attrs = "") {
  return `<svg ${attrs} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function iconMap() {
  return {
    archive: () => svg('<rect width="20" height="5" x="2" y="3" rx="1"></rect><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"></path><path d="M10 12h4"></path>'),
    sparkles: () => svg('<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"></path>'),
    globe: () => svg('<circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 0 20"></path><path d="M12 2a15.3 15.3 0 0 0 0 20"></path>'),
    text: () => svg('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path>'),
    image: () => svg('<rect width="18" height="18" x="3" y="3" rx="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"></path>'),
    code: () => svg('<path d="m16 18 6-6-6-6"></path><path d="m8 6-6 6 6 6"></path>'),
    json: () => svg('<path d="M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1"></path><path d="M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1"></path>'),
    key: () => svg('<circle cx="7.5" cy="15.5" r="5.5"></circle><path d="m21 2-9.6 9.6"></path><path d="m15.5 7.5 3 3L22 7"></path>'),
    github: () => svg('<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.1-1.3-.4-2.6-1.3-3.5.4-1.1.4-2.4 0-3.5 0 0-1 0-3 1.5a10.4 10.4 0 0 0-5.4 0C8.3 2 7.3 2 7.3 2c-.4 1.1-.4 2.4 0 3.5A5 5 0 0 0 6 9c0 3.5 3 5.5 6 5.5-.4.5-.8 1.4-.8 2.5v5"></path><path d="M9 18c-4.5 2-5-2-7-2"></path>'),
    logout: () => svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="m16 17 5-5-5-5"></path><path d="M21 12H9"></path>'),
    search: () => svg('<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>'),
    star: (filled = false) => (filled ? filledSvg('<path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01Z"></path>') : svg('<path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01Z"></path>')),
    tag: () => svg('<path d="M12.6 2.4 3 12l9 9 9.6-9.6a2 2 0 0 0 0-2.8l-6.2-6.2a2 2 0 0 0-2.8 0Z"></path><circle cx="8.5" cy="8.5" r=".5"></circle>'),
    plus: () => svg('<path d="M5 12h14"></path><path d="M12 5v14"></path>'),
    eye: () => svg('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle>'),
    eyeOff: () => svg('<path d="m15 18-.7-3"></path><path d="M2 2l20 20"></path><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"></path><path d="M9.9 4.2A10.4 10.4 0 0 1 12 4c7 0 10 8 10 8a13.3 13.3 0 0 1-2.1 3.4"></path><path d="M6.6 6.6C3.7 8.6 2 12 2 12s3 8 10 8a9.7 9.7 0 0 0 5.4-1.6"></path>'),
    heart: (filled = false) => (filled ? filledSvg('<path d="M19.5 12.6 12 20l-7.5-7.4a5 5 0 1 1 7.1-7.1l.4.4.4-.4a5 5 0 1 1 7.1 7.1Z"></path>') : svg('<path d="M19.5 12.6 12 20l-7.5-7.4a5 5 0 1 1 7.1-7.1l.4.4.4-.4a5 5 0 1 1 7.1 7.1Z"></path>')),
    copy: () => svg('<rect width="14" height="14" x="8" y="8" rx="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>'),
    external: () => svg('<path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>'),
    trash: () => svg('<path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>'),
    lock: () => svg('<rect width="18" height="11" x="3" y="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>'),
    unlock: () => svg('<rect width="18" height="11" x="3" y="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path>'),
    shield: () => svg('<path d="M20 13c0 5-3.5 7.5-7.7 8.9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z"></path><path d="m9 12 2 2 4-4"></path>'),
    sliders: () => svg('<path d="M4 21v-7"></path><path d="M4 10V3"></path><path d="M12 21v-9"></path><path d="M12 8V3"></path><path d="M20 21v-5"></path><path d="M20 12V3"></path><path d="M2 14h4"></path><path d="M10 8h4"></path><path d="M18 16h4"></path>'),
    more: () => svg('<circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle>'),
    share: () => svg('<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="m8.6 13.5 6.8 4"></path><path d="m15.4 6.5-6.8 4"></path>'),
    settings: () => svg('<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"></path><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.5 1Z"></path>'),
    grid: () => svg('<circle cx="5" cy="5" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="19" cy="5" r="1"></circle><circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="19" r="1"></circle><circle cx="12" cy="19" r="1"></circle><circle cx="19" cy="19" r="1"></circle>'),
    panel: () => svg('<rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M12 3v18"></path>'),
    chevronDown: () => svg('<path d="m6 9 6 6 6-6"></path>'),
    chevronRight: () => svg('<path d="m9 18 6-6-6-6"></path>'),
    audio: () => svg('<path d="M2 10v4"></path><path d="M6 7v10"></path><path d="M10 4v16"></path><path d="M14 8v8"></path><path d="M18 11v2"></path><path d="M22 9v6"></path>'),
    book: () => svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M4 4v15.5"></path><path d="M20 22V6a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 6.5"></path>'),
    video: () => svg('<rect width="16" height="12" x="3" y="6" rx="2"></rect><path d="m15 10 5-3v10l-5-3Z"></path>'),
    nodes: () => svg('<rect width="6" height="6" x="3" y="3" rx="1"></rect><rect width="6" height="6" x="15" y="3" rx="1"></rect><rect width="6" height="6" x="9" y="15" rx="1"></rect><path d="M9 6h6"></path><path d="m6 9 6 6 6-6"></path>'),
    report: () => svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path><path d="M8 13h8"></path><path d="M8 17h6"></path>'),
    card: () => svg('<rect width="18" height="14" x="3" y="5" rx="2"></rect><path d="M7 9h5"></path><path d="M7 13h3"></path><path d="m16 9 1 1 2-2"></path>'),
    quiz: () => svg('<path d="M9.1 9a3 3 0 1 1 5.8 1c-.7 1.3-2.1 1.7-2.6 2.7"></path><path d="M12 17h.01"></path><rect width="18" height="18" x="3" y="3" rx="2"></rect>'),
    chart: () => svg('<path d="M3 3v18h18"></path><rect width="3" height="7" x="7" y="10"></rect><rect width="3" height="12" x="13" y="5"></rect><rect width="3" height="4" x="19" y="13"></rect>'),
    table: () => svg('<rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M3 15h18"></path><path d="M9 3v18"></path>')
  };
}

function primaryRoundStyles() {
  const style = document.createElement("style");
  style.textContent = ".primary-round{background:var(--blue);color:white}.min-w-0{min-width:0}.google-g{display:grid;place-items:center;width:18px;height:18px;border:1px solid var(--line);border-radius:50%;color:var(--blue);font-size:12px;font-weight:700}";
  document.head.append(style);
}
