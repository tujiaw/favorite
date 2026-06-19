import { loadLLMConfig, loadPrompts } from "@/ai/settings";
import { TYPE_META } from "./meta";
import type { BitwardenExport, BitwardenItem, FavoriteItem, FavoriteType, LLMConfig, PromptConfig, SortMode } from "./types";

export function parseBitwardenExport(value: string): BitwardenExport {
  const parsed = JSON.parse(value) as BitwardenExport;
  if (parsed.encrypted) throw new Error("请选择 Bitwarden 未加密 JSON 导出文件");
  if (!Array.isArray(parsed.items)) throw new Error("未找到 Bitwarden items 列表");
  return parsed;
}

export function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function isBitwardenLoginItem(item: BitwardenItem): item is BitwardenItem & { login: NonNullable<BitwardenItem["login"]> } {
  return Number(item.type) === 1 && Boolean(item.login);
}

export function accountFingerprint(item: Pick<FavoriteItem, "title" | "content"> & { source_url?: string | null }) {
  return [item.source_url || "", item.content || "", item.title || ""]
    .map((part) => String(part).trim().toLowerCase())
    .join("|");
}

export function validDateString(value: unknown) {
  if (typeof value !== "string") return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function buildBitwardenImportNote(uris: string[], folderName: string) {
  const lines = ["Imported from Bitwarden"];
  if (folderName) lines.push(`Folder: ${folderName}`);
  if (uris.length > 1) {
    lines.push("Additional URLs:");
    lines.push(...uris.slice(1));
  }
  return lines.join("\n");
}

export function waitForPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });
}

export function loadVaultPassword() {
  try {
    const saved = localStorage.getItem("favorite-vault");
    if (!saved) return { password: "", expiresAt: null };
    const vaultData = JSON.parse(saved);
    if (vaultData.expiresAt && Date.now() > vaultData.expiresAt) {
      localStorage.removeItem("favorite-vault");
      return { password: "", expiresAt: null };
    }
    return { password: atob(vaultData.password), expiresAt: vaultData.expiresAt };
  } catch {
    localStorage.removeItem("favorite-vault");
    return { password: "", expiresAt: null };
  }
}

export function compareItems(a: FavoriteItem, b: FavoriteItem, sortMode: SortMode, desc: boolean) {
  let aVal: string | number;
  let bVal: string | number;
  if (sortMode === "use_count") {
    aVal = a.use_count || 0;
    bVal = b.use_count || 0;
  } else if (sortMode === "title") {
    aVal = a.title.toLowerCase();
    bVal = b.title.toLowerCase();
  } else {
    aVal = new Date(a.updated_at || a.created_at).getTime();
    bVal = new Date(b.updated_at || b.created_at).getTime();
  }
  if (aVal === bVal) return 0;
  return desc ? (aVal > bVal ? -1 : 1) : (aVal < bVal ? -1 : 1);
}

export function countTypes(items: FavoriteItem[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});
}

export function tagCounts(items: FavoriteItem[]): [string, number][] {
  const map = new Map<string, number>();
  items.forEach((item) => item.tags.filter((tag) => !isSystemTag(tag)).forEach((tag) => map.set(tag, (map.get(tag) || 0) + 1)));
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"));
}

export function categoryLabel(type: FavoriteType) {
  return TYPE_META[type].label;
}

export function sortLabel(mode: SortMode) {
  if (mode === "use_count") return "使用次数";
  if (mode === "title") return "名称";
  return "更新时间";
}

export function formatListDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatDetailDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function isSystemTag(tag: string) {
  return tag === "__read_later" || tag === "__trash";
}

export function isRunningAsPwa() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function normalizeLLMConfig(value: unknown): LLMConfig {
  if (!value || typeof value !== "object") return loadLLMConfig();
  const candidate = value as Partial<LLMConfig>;
  return {
    baseUrl: typeof candidate.baseUrl === "string" ? candidate.baseUrl : "",
    apiKey: typeof candidate.apiKey === "string" ? candidate.apiKey : "",
    model: typeof candidate.model === "string" ? candidate.model : ""
  };
}

export function normalizePrompts(value: unknown): PromptConfig[] {
  if (!Array.isArray(value) || value.length === 0) return loadPrompts();
  return value
    .filter((prompt) => prompt && typeof prompt === "object")
    .map((prompt) => {
      const candidate = prompt as Partial<PromptConfig>;
      return {
        id: typeof candidate.id === "string" && candidate.id ? candidate.id : `prompt-${crypto.randomUUID()}`,
        name: typeof candidate.name === "string" && candidate.name.trim() ? candidate.name : "未命名",
        content: typeof candidate.content === "string" ? candidate.content : ""
      };
    });
}

export function addTag(tags: string[], tag: string) {
  return Array.from(new Set([...(tags || []), tag].filter(Boolean)));
}

export function safeFilename(value: string) {
  return String(value || "favorite").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
}

export function makeLocalSummary(item: FavoriteItem) {
  const plain = [item.title, item.note, item.preview, item.content]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "这条收藏暂无可总结内容。";
  const firstSentence = plain.split(/[。！？.!?]/).find(Boolean) || plain;
  return truncate(firstSentence, 160);
}

export function truncate(value: string, size: number) {
  return value.length > size ? `${value.slice(0, size)}...` : value;
}

export function renderMarkdown(value: string) {
  const escaped = escapeHtml(value || "");
  const lines = escaped.split(/\r?\n/);
  const html: string[] = [];
  let inCode = false;
  let list: "ul" | "ol" | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!list) return;
    html.push(`</${list}>`);
    list = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^```/.test(line.trim())) {
      flushParagraph();
      closeList();
      html.push(inCode ? "</code></pre>" : "<pre><code>");
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      html.push(`${line}\n`);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      html.push(`<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`);
      continue;
    }
    const task = line.match(/^-\s+\[( |x)\]\s+(.+)$/i);
    if (task) {
      flushParagraph();
      if (list !== "ul") {
        closeList();
        list = "ul";
        html.push("<ul>");
      }
      html.push(`<li><input type="checkbox" disabled ${task[1].toLowerCase() === "x" ? "checked" : ""}> ${inlineMarkdown(task[2])}</li>`);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      if (list !== "ul") {
        closeList();
        list = "ul";
        html.push("<ul>");
      }
      html.push(`<li>${inlineMarkdown(bullet[1])}</li>`);
      continue;
    }
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (list !== "ol") {
        closeList();
        list = "ol";
        html.push("<ol>");
      }
      html.push(`<li>${inlineMarkdown(ordered[1])}</li>`);
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  closeList();
  if (inCode) html.push("</code></pre>");
  return html.join("");
}

function escapeHtml(value: string) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function inlineMarkdown(value: string) {
  return value
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

