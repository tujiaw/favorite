import { TYPES } from "./constants.js";
import { icons } from "./icons.js";
import { state } from "./state.js";
import { escapeAttr, escapeHtml } from "./utils.js";

export function loginTemplate() {
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

export function topbarTemplate() {
  const subtitle = state.supabaseReady ? escapeHtml(state.user.email) : "本地演示模式";
  const favoriteCount = state.items.filter((item) => item.favorite).length;
  const hasVault = state.vaultPassword && state.vaultPassword.length >= 8;
  return `
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <div class="brand-mark">${icons.archive()}</div>
          <div>
            <h1 class="brand-title">个人收藏夹</h1>
            <p class="brand-subtitle">${subtitle}</p>
          </div>
        </div>
        <div class="topbar-actions">
          <button class="create-notebook" data-action="open-create">${icons.plus()} 创建</button>
          ${
            state.installPromptEvent
              ? `<button class="install-button" data-action="prompt-install" title="安装到本地">${icons.grid()} 安装</button>`
              : ""
          }
          <button class="icon-button ${hasVault ? "vault-active" : ""}" title="保险箱" data-action="open-vault">${icons.shield()}</button>
          <button class="icon-button" title="分享">${icons.share()}</button>
          <button class="icon-button" title="设置" data-action="open-settings">${icons.settings()}</button>
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

export function sidebarTemplate() {
  if (state.sidebarCollapsed) {
    return `
      <aside class="sidebar sidebar-collapsed">
        <section class="panel sources-panel collapsed-panel">
          <button class="icon-button compact" title="展开分类" data-action="toggle-sidebar">${icons.panel()}</button>
          <button class="icon-button compact" title="搜索" data-action="toggle-sidebar">${icons.search()}</button>
          <button class="icon-button compact" title="分类" data-action="toggle-sidebar">${icons.sparkles()}</button>
        </section>
      </aside>
    `;
  }

  return `
    <aside class="sidebar">
      <section class="panel sources-panel">
        <div class="panel-title-row">
          <h2>分类</h2>
          <button class="icon-button compact" title="折叠左侧栏" data-action="toggle-sidebar">${icons.panel()}</button>
        </div>
        <div class="search-wrap">
          ${icons.search()}
          <input class="input search-input" data-field="query" placeholder="搜索收藏" value="${escapeAttr(state.query)}" />
        </div>
        <div class="section-label">分类列表</div>
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
      </section>
    </aside>
  `;
}

export function sourceModalTemplate() {
  return `
    <div class="modal-backdrop">
      <section class="source-modal modal-card">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">创建收藏</h2>
            <p class="modal-subtitle">粘贴 URL、文本、代码、JSON，或直接粘贴图片。</p>
          </div>
          <button class="icon-button" type="button" data-action="close-source">×</button>
        </div>
        <textarea class="textarea quick-input" data-field="quick-input" placeholder="在这里粘贴内容。按 Ctrl/⌘ + Enter 保存。">${escapeHtml(state.quickInput)}</textarea>
        <div class="composer-actions source-modal-actions">
          <p class="status">${escapeHtml(state.status)}</p>
          <span class="source-count">${state.items.length} 个来源</span>
          <input class="hidden" type="file" accept="image/*" data-field="image-file" />
          <button class="icon-button" title="添加图片" data-action="choose-image">${icons.image()}</button>
          <button class="primary-button" data-action="save-quick">${icons.plus()} 保存</button>
        </div>
      </section>
    </div>
  `;
}

export function createModalTemplate() {
  const isFavorite = state.modalTab === "favorite";
  const hasVaultPassword = state.vaultPassword && state.vaultPassword.length >= 8;
  return `
    <div class="modal-backdrop">
      <section class="create-modal modal-card">
        <div class="modal-header">
          <div class="tab-tabs">
            <button class="tab-tab ${isFavorite ? "active" : ""}" data-tab="favorite">${icons.text()} 收藏</button>
            <button class="tab-tab ${!isFavorite ? "active" : ""}" data-tab="account">${icons.key()} 账号</button>
          </div>
          <button class="icon-button" type="button" data-action="close-create">×</button>
        </div>
        ${isFavorite ? `
          <textarea class="textarea quick-input" data-field="quick-input" placeholder="粘贴 URL、文本、代码、JSON，或直接粘贴图片。按 Ctrl/⌘ + Enter 保存。">${escapeHtml(state.quickInput)}</textarea>
          <div class="composer-actions source-modal-actions">
            <p class="status">${escapeHtml(state.status)}</p>
            <input class="hidden" type="file" accept="image/*" data-field="image-file" />
            <button class="icon-button" title="添加图片" data-action="choose-image">${icons.image()}</button>
            <button class="primary-button" data-action="save-quick">${icons.plus()} 保存</button>
          </div>
        ` : `
          ${!hasVaultPassword ? `
            <div class="vault-notice">
              <p>请先在右上角设置保险箱主密码</p>
              <button class="icon-button" data-action="open-vault">${icons.shield()}</button>
            </div>
          ` : `
            <form data-form="account">
              <div class="account-form">
                <div class="url-input-group">
                  <input class="input" name="url" placeholder="URL" data-field="account-url" />
                  <button class="fetch-button" type="button" data-action="fetch-site" title="获取网站信息">${icons.refresh()}</button>
                </div>
                <div class="site-preview" data-field="site-preview">
                  <span class="site-icon" data-field="site-icon"></span>
                  <span class="site-title" data-field="site-title">网站标题</span>
                </div>
                <input class="input" name="username" placeholder="用户名" />
                <input class="input" name="password" placeholder="密码" type="password" required />
                <textarea class="textarea" name="note" placeholder="备注，可选" rows="2"></textarea>
              </div>
              <div class="modal-actions">
                <span class="status">敏感字段加密保存</span>
                <button type="submit" class="primary-button">${icons.shield()} 加密保存</button>
              </div>
            </form>
          `}
        `}
      </section>
    </div>
  `;
}

export function itemCardTemplate(item, selected) {
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

export function detailTemplate(item) {
  if (!item) {
    return `
      <aside class="detail-panel">
        ${studioTitleTemplate()}
        <div class="detail-scroll">
          <button class="add-note-button" data-action="open-create">${icons.text()} 创建收藏</button>
          <div class="detail-empty">${icons.eye()}<p>选择一条收藏查看详情</p></div>
        </div>
      </aside>
    `;
  }

  return `
    <aside class="detail-panel">
      ${studioTitleTemplate()}
      <div class="detail-scroll">
        ${
          item.type === "account"
            ? `
              <section class="vault-box">
                <div class="vault-title">
                  ${icons.key()} ${escapeHtml(item.title)}
                  <button class="icon-button" style="margin-left: auto;" data-action="toggle-favorite">${icons.heart(item.favorite)}</button>
                </div>
                <div class="account-fields">
                  <div class="account-field">
                    <label class="field-label">用户名</label>
                    <input class="field-value-input" data-edit="content" value="${escapeAttr(item.content)}" />
                  </div>
                  ${
                    item.encrypted_secret
                      ? `
                        <div class="account-field">
                          <label class="field-label">密码</label>
                          <div class="password-field">
                            <input class="password-input" type="${state.passwordVisible ? "text" : "password"}" value="${escapeHtml(state.revealedSecret?.password || "••••••••")}" readonly />
                            <button class="icon-button" data-action="toggle-password" title="${state.passwordVisible ? "隐藏密码" : "显示密码"}">
                              ${state.passwordVisible ? icons.eyeOff() : icons.eye()}
                            </button>
                          </div>
                        </div>
                      `
                      : ""
                  }
                  <div class="account-field">
                    <label class="field-label">网站</label>
                    <input class="field-value-input" data-edit="source_url" value="${escapeAttr(item.source_url || "")}" placeholder="https://" />
                  </div>
                </div>
              </section>
            `
            : `
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
              <div class="detail-row">
                <label class="field">
                  <span>标题</span>
                  <input class="input" data-edit="title" value="${escapeAttr(item.title)}" />
                </label>
                <label class="field">
                  <span>类型</span>
                  <select class="select" data-edit="type">
                    ${Object.keys(TYPES)
                      .filter((type) => type !== "all" && type !== "account")
                      .map((type) => `<option value="${type}" ${item.type === type ? "selected" : ""}>${TYPES[type].label}</option>`)
                      .join("")}
                  </select>
                </label>
              </div>
              ${
                item.type === "image"
                  ? `<div class="image-preview"><img src="${escapeAttr(item.content)}" alt="${escapeAttr(item.title)}" /></div>`
                  : `<div class="field-content">
                      <div class="field-content-head">
                        <span>内容</span>
                        <div class="ai-tools">
                          ${state.prompts.map((p) => `
                            <button
                              class="ai-button"
                              data-action="run-ai"
                              data-prompt-id="${escapeAttr(p.id)}"
                              title="${escapeAttr(p.name)}"
                              ${state.aiLoading ? "disabled" : ""}
                            >${icons.sparkles()} ${escapeHtml(p.name)}${state.aiLoading ? "…" : ""}</button>
                          `).join("")}
                        </div>
                      </div>
                      <textarea class="textarea" data-edit="content">${escapeHtml(item.content)}</textarea>
                    </div>`
              }
            `
        }
        <label class="field">
          <span>标签</span>
          <input class="input" data-edit="tags" placeholder="逗号分隔，例如：工作, 常用" value="${escapeAttr(item.tags.join(", "))}" />
        </label>
        <label class="field">
          <span>备注</span>
          <textarea class="textarea" data-edit="note">${escapeHtml(item.note)}</textarea>
        </label>
        <div class="detail-actions">
          <button class="outline-button" data-action="copy-content">${icons.copy()} 复制</button>
          ${
            item.source_url
              ? `<a class="outline-button" href="${escapeAttr(item.source_url)}" target="_blank" rel="noreferrer">${icons.external()} 打开</a>`
              : `<button class="outline-button" disabled>${icons.eyeOff()} 无链接</button>`
          }
          <button class="danger-button" data-action="delete-selected">${icons.trash()} 删除</button>
        </div>
      </div>
    </aside>
  `;
}

export function settingsModalTemplate() {
  const { baseUrl, apiKey, model } = state.llmConfig;
  return `
    <div class="modal-backdrop">
      <form class="modal-card settings-modal" data-form="settings">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">设置</h2>
            <p class="modal-subtitle">配置大模型与提示词，所有信息仅保存在浏览器本地</p>
          </div>
          <button class="icon-button" type="button" data-action="close-settings">×</button>
        </div>
        <div class="settings-section">
          <h3 class="settings-section-title">大模型配置</h3>
          <div class="settings-grid">
            <label class="settings-field span-2">
              <span>Base URL</span>
              <input class="input" name="baseUrl" placeholder="https://api.openai.com/v1" value="${escapeAttr(baseUrl)}" />
            </label>
            <label class="settings-field">
              <span>模型</span>
              <input class="input" name="model" placeholder="gpt-4o-mini" value="${escapeAttr(model)}" />
            </label>
            <label class="settings-field span-2">
              <span>API Key</span>
              <input class="input" name="apiKey" type="password" placeholder="sk-..." value="${escapeAttr(apiKey)}" />
            </label>
          </div>
          <p class="settings-hint">兼容 OpenAI 接口格式，自动拼接 <code>/chat/completions</code>。</p>
        </div>
        <div class="settings-section">
          <div class="settings-section-head">
            <h3 class="settings-section-title">提示词</h3>
            <button class="outline-button compact-button" type="button" data-action="add-prompt">${icons.plus()} 新增</button>
          </div>
          <div class="prompt-list">
            ${state.prompts.map((p, index) => `
              <div class="prompt-item" data-prompt-index="${index}">
                <div class="prompt-item-head">
                  <input class="input" data-prompt-name="${escapeAttr(p.id)}" value="${escapeAttr(p.name)}" placeholder="提示词名称" />
                  <button class="icon-button" type="button" data-action="delete-prompt" data-prompt-index="${index}" title="删除">${icons.trash()}</button>
                </div>
                <textarea class="textarea" data-prompt-content="${escapeAttr(p.id)}" placeholder="提示词内容，将拼接到正文之前">${escapeHtml(p.content)}</textarea>
              </div>
            `).join("")}
          </div>
        </div>
        <div class="modal-actions">
          <span class="status">${escapeHtml(state.status)}</span>
          <button type="button" class="ghost-button" data-action="close-settings">取消</button>
          <button type="submit" class="primary-button">${icons.check()} 保存</button>
        </div>
      </form>
    </div>
  `;
}

export function deleteConfirmTemplate() {
  const item = state.items.find(i => i.id === state.selectedId);
  if (!item) return "";
  return `
    <div class="modal-backdrop">
      <div class="modal-card confirm-modal">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">确认删除</h2>
            <p class="modal-subtitle">此操作无法撤销</p>
          </div>
        </div>
        <div class="confirm-content">
          <p>确定要删除这条收藏吗？</p>
          <div class="confirm-item">
            <span class="type-badge">${TYPES[item.type].icon()}</span>
            <div class="confirm-item-info">
              <div class="confirm-item-title">${escapeHtml(item.title)}</div>
              <div class="confirm-item-preview">${escapeHtml(item.preview || item.content)}</div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="outline-button" data-action="cancel-delete">取消</button>
          <button class="danger-button" data-action="confirm-delete">${icons.trash()} 确认删除</button>
        </div>
      </div>
    </div>
  `;
}

export function vaultModalTemplate() {
  const savedUntil = state.vaultExpiresAt ? new Date(state.vaultExpiresAt).toLocaleString("zh-CN") : null;
  return `
    <div class="modal-backdrop">
      <form class="modal-card vault-modal" data-form="vault">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">保险箱设置</h2>
            <p class="modal-subtitle">设置主密码后，账号密码将被加密保存</p>
          </div>
          <button class="icon-button" type="button" data-action="close-vault">×</button>
        </div>
        ${savedUntil ? `
          <div class="vault-status">
            <span class="vault-status-text">${icons.shield()} 已设置，有效期至 ${savedUntil}</span>
            <button class="ghost-button" type="button" data-action="clear-vault">${icons.trash()} 清除</button>
          </div>
        ` : `
          <div class="vault-form">
            <input class="input" name="vaultPassword" placeholder="设置主密码，至少 8 位" type="password" required minlength="8" />
            <input class="input" name="confirmPassword" placeholder="确认主密码" type="password" required minlength="8" />
            <select class="input" name="expireTime">
              <option value="3600000">1小时后过期</option>
              <option value="86400000">1天后过期</option>
              <option value="604800000">7天后过期</option>
              <option value="2592000000">30天后过期</option>
              <option value="-1">永不过期</option>
            </select>
          </div>
        `}
        <div class="modal-actions">
          <span class="status">主密码仅保存在浏览器本地</span>
          ${savedUntil ? `
            <button class="outline-button" type="button" data-action="close-vault">关闭</button>
          ` : `
            <button type="submit" class="primary-button">${icons.check()} 确认设置</button>
          `}
        </div>
      </form>
    </div>
  `;
}

export function accountModalTemplate() {
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

function studioTitleTemplate() {
  return `
    <div class="panel-title-row studio-title-row">
      <div class="studio-summary">
        <span><strong>${state.items.length}</strong> 条收藏</span>
        <span><strong>${state.items.filter((item) => item.favorite).length}</strong> 已标星</span>
        <span><strong>${new Set(state.items.flatMap((item) => item.tags)).size}</strong> 标签</span>
      </div>
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
