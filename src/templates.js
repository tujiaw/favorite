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
        <label class="global-search">
          ${icons.search()}
          <input data-field="query" placeholder="搜索收藏内容、标签、URL" value="${escapeAttr(state.query)}" />
          <kbd>⌘ K</kbd>
        </label>
        <div class="topbar-actions">
          <button class="create-notebook" data-action="open-create">${icons.plus()} 收藏 <span class="button-divider"></span>${icons.chevronDown()}</button>
          ${
            state.installPromptEvent
              ? `<button class="install-button" data-action="prompt-install" title="安装到本地">${icons.grid()} 安装</button>`
              : ""
          }
          <button class="ai-top-button" data-action="open-settings">${icons.sparkles()} AI 智能整理</button>
          <button class="icon-button" title="刷新同步" data-action="refresh-items">${icons.refresh()}</button>
          <button class="icon-button ${hasVault ? "vault-active" : ""}" title="保险箱" data-action="open-vault">${icons.shield()}</button>
          <button class="icon-button" title="分享当前收藏" data-action="share-selected">${icons.share()}</button>
          <button class="icon-button" title="快捷操作" data-action="open-app-menu">${icons.grid()}</button>
          <span class="avatar" title="${escapeAttr(subtitle)}">${escapeHtml((state.user.name || state.user.email || "用").slice(0, 1))}</span>
        </div>
        <button class="icon-button" title="退出登录" data-action="sign-out">${icons.logout()}</button>
      </div>
    </header>
  `;
}

export function sidebarTemplate() {
  const counts = typeCounts();
  const activeItems = state.items.filter((item) => !isTrashed(item));
  const favoriteCount = activeItems.filter((item) => item.favorite).length;
  const recentCount = activeItems.filter((item) => item.last_used_at).length;
  const readLaterCount = activeItems.filter((item) => isReadLater(item)).length;
  const trashCount = state.items.filter((item) => isTrashed(item)).length;
  const tags = tagCounts();
  if (state.sidebarCollapsed) {
    return `
      <aside class="sidebar sidebar-collapsed">
        <section class="sources-panel collapsed-panel">
          <button class="icon-button compact" title="展开分类" data-action="toggle-sidebar">${icons.panel()}</button>
          <button class="icon-button compact" title="搜索" data-action="toggle-sidebar">${icons.search()}</button>
          <button class="icon-button compact" title="分类" data-action="toggle-sidebar">${icons.sparkles()}</button>
        </section>
      </aside>
    `;
  }

  return `
    <aside class="sidebar">
      <section class="sources-panel">
        <div class="nav-list">
          <button class="nav-button overview-button ${!state.specialFilter && state.typeFilter === "all" && !state.favoriteOnly && !state.tagFilter ? "active" : ""}" data-action="show-overview">${icons.home()}<span>概览</span></button>
        </div>
        <div class="section-label">收藏管理</div>
        <div class="nav-list">
          <button class="nav-button ${state.typeFilter === "all" && !state.favoriteOnly && !state.specialFilter ? "active" : ""}" data-type-filter="all">${icons.sparkles()}<span>全部收藏</span><strong>${activeItems.length}</strong></button>
          <button class="nav-button ${state.specialFilter === "recent" ? "active" : ""}" data-action="recent-filter">${icons.clock()}<span>最近使用</span><strong>${recentCount}</strong></button>
          <button class="nav-button ${state.favoriteOnly ? "active" : ""}" data-action="toggle-favorite-filter">${icons.star()}<span>星标收藏</span><strong>${favoriteCount}</strong></button>
          <button class="nav-button ${state.specialFilter === "readLater" ? "active" : ""}" data-action="show-read-later">${icons.bookmark()}<span>稍后阅读</span><strong>${readLaterCount}</strong></button>
          <button class="nav-button ${state.specialFilter === "trash" ? "active" : ""}" data-action="show-trash">${icons.trash()}<span>回收站</span><strong>${trashCount}</strong></button>
        </div>
        <div class="section-label">分类</div>
        <div class="nav-list">
          ${Object.entries(TYPES)
            .filter(([type]) => type !== "all")
            .slice(0, 5)
            .map(([type, meta]) => `
              <button class="nav-button ${state.typeFilter === type ? "active" : ""}" data-type-filter="${type}">
                ${type === "link" ? icons.folder() : meta.icon()}<span>${categoryLabel(type)}</span><strong>${counts[type] || 0}</strong>
              </button>
            `)
            .join("")}
          <button class="nav-button nav-action" data-action="new-category">${icons.plus()}<span>新建分类</span></button>
        </div>
        <div class="section-label">标签</div>
        <div class="tag-cloud">
          ${
            tags.length
              ? tags.slice(0, 8).map(([tag, count]) => `<button class="tag-chip ${state.tagFilter === tag ? "active" : ""}" data-tag-filter="${escapeAttr(tag)}">${escapeHtml(tag)} <strong>${count}</strong></button>`).join("")
              : `<span class="muted-chip">暂无标签</span>`
          }
          ${state.tagFilter ? `<button class="tag-chip clear" data-tag-filter="">清除</button>` : ""}
        </div>
        <div class="storage-card">
          <div><span>存储空间</span><strong>1.2GB / 5GB</strong></div>
          <div class="storage-meter"><i></i></div>
          <button class="upgrade-button" data-action="show-storage-tip">升级空间</button>
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
  const date = new Date(item.last_used_at || item.created_at).toLocaleString("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  return `
    <button class="item-card ${selected ? "selected" : ""}" data-select="${item.id}">
      <div class="item-main">
        <div class="item-title-row">
          <span class="type-badge type-${escapeAttr(item.type)}">${TYPES[item.type].icon()}</span>
          <div class="min-w-0">
            <h2 class="item-title">${escapeHtml(item.title)} <span class="inline-type">${TYPES[item.type].label}</span></h2>
            <p class="item-preview">${escapeHtml(item.preview || item.content)}</p>
          </div>
        </div>
        ${item.favorite ? `<span class="favorite-star">${icons.star(true)}</span>` : ""}
      </div>
      <div class="meta-row">
        ${item.domain ? `<span>${escapeHtml(item.domain)}</span>` : ""}
        ${item.tags.filter((tag) => !isSystemTag(tag)).map((tag) => `<span class="meta-tag">${escapeHtml(tag)}</span>`).join("")}
        <span>${date}</span>
        ${isReadLater(item) ? `<span class="meta-tag">稍后阅读</span>` : ""}
        ${selected && item.type !== "image" && item.type !== "account" ? `<span class="ai-list-action" data-action="refresh-ai-summary">${icons.sparkles()} AI 总结</span>` : ""}
      </div>
    </button>
  `;
}

export function detailTemplate(item) {
  if (!item) {
    return `
      <aside class="detail-panel">
        <div class="detail-scroll">
          <button class="add-note-button" data-action="open-create">${icons.text()} 创建收藏</button>
          <div class="detail-empty">${icons.eye()}<p>选择一条收藏查看详情</p></div>
        </div>
      </aside>
    `;
  }

  return `
    <aside class="detail-panel">
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
                  <div class="min-w-0">
                    <h2 class="detail-title">${escapeHtml(item.title)} <span class="inline-type">${TYPES[item.type].label}</span></h2>
                  </div>
                  <button class="favorite-toggle" title="星标收藏" data-action="toggle-favorite">${icons.star(item.favorite)}</button>
                </div>
              </div>
              <div class="detail-toolbar">
                <button class="toolbar-button" data-action="focus-editor">${icons.edit()} 编辑</button>
                <button class="toolbar-button" data-action="copy-content">${icons.copy()} 复制</button>
                <button class="toolbar-button" data-action="share-selected">${icons.share()} 分享</button>
                <div class="more-wrap">
                  <button class="toolbar-button" data-action="toggle-more-menu">${icons.more()} 更多</button>
                  ${state.moreMenu ? `
                    <div class="more-menu">
                      <button data-action="toggle-read-later">${icons.bookmark()} ${isReadLater(item) ? "取消稍后阅读" : "加入稍后阅读"}</button>
                      <button data-action="duplicate-selected">${icons.copy()} 复制为新收藏</button>
                      <button data-action="export-selected">${icons.external()} 导出文本</button>
                    </div>
                  ` : ""}
                </div>
              </div>
              <div class="detail-row detail-tags-row">
                <label class="field tags-field">
                  <span>标签</span>
                  <div class="editable-tags">
                    ${item.tags.filter((tag) => !isSystemTag(tag)).map((tag) => `<span class="meta-pill">${escapeHtml(tag)}</span>`).join("")}
                    <input data-edit="tags" placeholder="+" value="${escapeAttr(item.tags.filter((tag) => !isSystemTag(tag)).join(", "))}" />
                  </div>
                </label>
              </div>
              <label class="field note-field">
                <span>备注</span>
                <input class="input" data-edit="note" value="${escapeAttr(item.note || "")}" placeholder="添加备注" />
              </label>
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
                  : `<div class="editor-card">
                      <div class="editor-toolbar">
                        <button title="粗体" data-format="bold">${icons.bold()}</button>
                        <button title="斜体" data-format="italic">${icons.italic()}</button>
                        <button title="下划线" data-format="underline">${icons.underline()}</button>
                        <button title="无序列表" data-format="list">${icons.list()}</button>
                        <button title="代码块" data-format="code">${icons.code()}</button>
                        <button title="链接" data-format="link">${icons.link()}</button>
                        <button title="待办" data-format="task">${icons.check()}</button>
                        <button title="表格" data-format="table">${icons.table()}</button>
                        <div class="editor-ai-menu">
                          <button class="ai-button">${icons.sparkles()} AI 智能处理 ${icons.chevronDown()}</button>
                          <div class="ai-popover">
                            ${state.prompts.map((p) => `
                              <button
                                data-action="run-ai"
                                data-prompt-id="${escapeAttr(p.id)}"
                                title="${escapeAttr(p.name)}"
                                ${state.aiLoading ? "disabled" : ""}
                              >${icons.sparkles()} ${escapeHtml(p.name)}${state.aiLoading ? "…" : ""}</button>
                            `).join("")}
                          </div>
                        </div>
                      </div>
                      <textarea class="textarea" data-edit="content">${escapeHtml(item.content)}</textarea>
                    </div>`
              }
            `
        }
        ${item.type !== "account" ? aiSummaryTemplate(item) : ""}
        <div class="detail-actions">
          ${
            item.source_url
              ? `<a class="outline-button" href="${escapeAttr(item.source_url)}" target="_blank" rel="noreferrer">${icons.external()} 打开</a>`
              : `<button class="outline-button" disabled>${icons.eyeOff()} 无链接</button>`
          }
          ${state.specialFilter === "trash" ? `<button class="outline-button" data-action="restore-selected">${icons.refresh()} 恢复</button>` : ""}
          <button class="danger-button" data-action="delete-selected">${icons.trash()} 删除</button>
        </div>
      </div>
    </aside>
  `;
}

function aiSummaryTemplate(item) {
  const summary = state.aiSummaryById[item.id] || summaryFromItem(item);
  const text = state.aiSummaryExpanded ? summary : truncate(summary, 120);
  return `
    <section class="ai-summary-card">
      <h3>${icons.sparkles()} AI 总结</h3>
      <p>${escapeHtml(text)}</p>
      <div>
        <span>由 AI 生成，可能不完全准确</span>
        <button class="ghost-button" data-action="copy-ai-summary">${icons.copy()} 复制</button>
        <button class="ghost-button" data-action="toggle-ai-summary">${icons.list()} ${state.aiSummaryExpanded ? "收起" : "展开"}</button>
        <button class="ghost-button" data-action="refresh-ai-summary">${icons.refresh()} 重新生成</button>
      </div>
    </section>
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

function typeCounts() {
  return Object.keys(TYPES).reduce((acc, type) => {
    acc[type] = state.items.filter((item) => item.type === type && !isTrashed(item)).length;
    return acc;
  }, {});
}

function tagCounts() {
  const map = new Map();
  state.items.forEach((item) => {
    if (isTrashed(item)) return;
    item.tags.filter((tag) => !isSystemTag(tag)).forEach((tag) => map.set(tag, (map.get(tag) || 0) + 1));
  });
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"));
}

function categoryLabel(type) {
  const labels = {
    link: "远程办公",
    text: "学习资料",
    image: "工作",
    code: "工具",
    json: "数据文档",
    account: "账号保险箱"
  };
  return labels[type] || TYPES[type].label;
}

function summaryFromItem(item) {
  const source = item.preview || item.note || item.content || item.title;
  return source || "当前收藏内容已准备好进行 AI 整理。";
}

function truncate(value, size) {
  return value.length > size ? `${value.slice(0, size)}...` : value;
}

function isSystemTag(tag) {
  return tag === "__read_later" || tag === "__trash";
}

function isReadLater(item) {
  return item.tags.includes("__read_later");
}

function isTrashed(item) {
  return item.tags.includes("__trash");
}
