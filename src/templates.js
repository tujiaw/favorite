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
          <button class="create-notebook" data-action="focus-composer">${icons.plus()} 创建收藏</button>
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
            <h2 class="modal-title">创建</h2>
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
        <div class="panel-title-row">
          <h2>Studio</h2>
          <button class="icon-button compact" title="折叠 Studio">${icons.panel()}</button>
        </div>
        ${studioToolsTemplate()}
        <button class="add-note-button" data-action="open-source">${icons.text()} 创建收藏</button>
        <div class="detail-empty">${icons.eye()}<p>选择一条收藏查看详情</p></div>
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

function studioToolsTemplate() {
  return `
    <div class="studio-summary">
      <div>
        <strong>${state.items.length}</strong>
        <span>全部收藏</span>
      </div>
      <div>
        <strong>${state.items.filter((item) => item.favorite).length}</strong>
        <span>已标星</span>
      </div>
      <div>
        <strong>${new Set(state.items.flatMap((item) => item.tags)).size}</strong>
        <span>标签</span>
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
