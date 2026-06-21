import { loadLLMConfig, loadLLMConfigs, loadPrompts, type LLMConfigListSetting } from "@/ai/settings";
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

export function errorMessage(error: unknown, fallback = "操作失败") {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error.trim();
  return fallback;
}

const VAULT_SESSION_KEY = "favorite-vault-session";
const VAULT_LEGACY_KEY = "favorite-vault";

export function loadVaultPassword() {
  try {
    localStorage.removeItem(VAULT_LEGACY_KEY);
    const saved = sessionStorage.getItem(VAULT_SESSION_KEY);
    if (!saved) return { password: "", expiresAt: null };
    const vaultData = JSON.parse(saved);
    if (vaultData.expiresAt && Date.now() > vaultData.expiresAt) {
      sessionStorage.removeItem(VAULT_SESSION_KEY);
      return { password: "", expiresAt: null };
    }
    return { password: atob(vaultData.password), expiresAt: vaultData.expiresAt };
  } catch {
    sessionStorage.removeItem(VAULT_SESSION_KEY);
    return { password: "", expiresAt: null };
  }
}

export function saveVaultPassword(password: string, expiresAt: number | null) {
  localStorage.removeItem(VAULT_LEGACY_KEY);
  sessionStorage.setItem(VAULT_SESSION_KEY, JSON.stringify({ password: btoa(password), expiresAt }));
}

export function clearVaultPasswordCache() {
  sessionStorage.removeItem(VAULT_SESSION_KEY);
  localStorage.removeItem(VAULT_LEGACY_KEY);
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
  const setting = normalizeLLMConfigs(value);
  return setting.items.find((item) => item.id === setting.activeId) || setting.items[0] || loadLLMConfig();
}

function normalizeLLMConfigItem(value: unknown): LLMConfig {
  const candidate = value && typeof value === "object" ? value as Partial<LLMConfig> : {};
  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : `llm-${crypto.randomUUID()}`,
    name: typeof candidate.name === "string" && candidate.name.trim() ? candidate.name : "默认模型",
    baseUrl: typeof candidate.baseUrl === "string" ? candidate.baseUrl : "",
    apiKey: typeof candidate.apiKey === "string" ? candidate.apiKey : "",
    model: typeof candidate.model === "string" ? candidate.model : ""
  };
}

export function normalizeLLMConfigs(value: unknown): LLMConfigListSetting {
  if (!value || typeof value !== "object") return loadLLMConfigs();
  if (Array.isArray(value)) {
    const items = value.map(normalizeLLMConfigItem);
    return { activeId: items[0]?.id, items: items.length ? items : loadLLMConfigs().items };
  }
  const candidate = value as Partial<LLMConfigListSetting> & Partial<LLMConfig>;
  if (Array.isArray(candidate.items)) {
    const items = candidate.items.map(normalizeLLMConfigItem);
    return {
      activeId: typeof candidate.activeId === "string" ? candidate.activeId : items[0]?.id,
      items: items.length ? items : loadLLMConfigs().items
    };
  }
  const item = normalizeLLMConfigItem(candidate);
  return { activeId: item.id, items: [item] };
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
