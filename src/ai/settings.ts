import type { LLMConfig, PromptConfig } from "@/app/types";

const CONFIG_KEY = "favorite-llm-config";
const PROMPTS_KEY = "favorite-prompts";

export const EMPTY_LLM_CONFIG: LLMConfig = { baseUrl: "", apiKey: "", model: "" };
export type LLMConfigListSetting = { activeId?: string; items: LLMConfig[] };

export const DEFAULT_PROMPTS: PromptConfig[] = [
  {
    id: "markdown",
    name: "整理为 Markdown",
    content:
      "请将以下内容整理为规范的 Markdown 格式，合理使用标题层级、列表、代码块和引用，保留所有关键信息，直接输出整理后的内容，不要添加额外说明：\n\n"
  },
  {
    id: "polish",
    name: "优化文字语法",
    content:
      "请修正以下内容中的语法错误、错别字和不通顺的表达，保持原意不变，直接输出修改后的完整内容，不要添加任何解释或说明：\n\n"
  }
];

function normalizeStoredLLMConfig(value: unknown): LLMConfigListSetting {
  if (!value || typeof value !== "object") return { items: [{ ...EMPTY_LLM_CONFIG, id: "default", name: "默认模型" }] };
  if (Array.isArray(value)) {
    const items = value.map(normalizeLLMConfigItem).filter(Boolean) as LLMConfig[];
    return { activeId: items[0]?.id, items: items.length ? items : [{ ...EMPTY_LLM_CONFIG, id: "default", name: "默认模型" }] };
  }
  const candidate = value as Partial<LLMConfigListSetting> & Partial<LLMConfig>;
  if (Array.isArray(candidate.items)) {
    const items = candidate.items.map(normalizeLLMConfigItem).filter(Boolean) as LLMConfig[];
    return { activeId: typeof candidate.activeId === "string" ? candidate.activeId : items[0]?.id, items: items.length ? items : [{ ...EMPTY_LLM_CONFIG, id: "default", name: "默认模型" }] };
  }
  const item = normalizeLLMConfigItem(candidate);
  return { activeId: item.id, items: [item] };
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

export function loadLLMConfigs(): LLMConfigListSetting {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (!saved) return { activeId: "default", items: [{ ...EMPTY_LLM_CONFIG, id: "default", name: "默认模型" }] };
    return normalizeStoredLLMConfig(JSON.parse(saved));
  } catch {
    return { activeId: "default", items: [{ ...EMPTY_LLM_CONFIG, id: "default", name: "默认模型" }] };
  }
}

export function loadLLMConfig(): LLMConfig {
  const setting = loadLLMConfigs();
  return setting.items.find((item) => item.id === setting.activeId) || setting.items[0] || { ...EMPTY_LLM_CONFIG };
}

export function saveLLMConfigs(setting: LLMConfigListSetting) {
  const current = loadLLMConfigs();
  const items = setting.items.length ? setting.items.map(normalizeLLMConfigItem) : current.items;
  const activeId = setting.activeId && items.some((item) => item.id === setting.activeId)
    ? setting.activeId
    : items[0]?.id;
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ activeId, items }));
}

export function saveLLMConfig(config: LLMConfig) {
  const item = normalizeLLMConfigItem(config);
  saveLLMConfigs({ activeId: item.id, items: [item] });
}

export function mergeLocalLLMApiKeys(setting: LLMConfigListSetting): LLMConfigListSetting {
  const localKeys = new Map(loadLLMConfigs().items.map((config) => [config.id, config.apiKey]));
  return {
    activeId: setting.activeId,
    items: setting.items.map((config) => ({
      ...config,
      apiKey: config.apiKey || localKeys.get(config.id) || ""
    }))
  };
}

export function withoutLLMApiKeys(setting: LLMConfigListSetting): LLMConfigListSetting {
  return {
    activeId: setting.activeId,
    items: setting.items.map((config) => ({ ...config, apiKey: "" }))
  };
}

export function baseLLMConfigs(configs: LLMConfig[], activeConfig: LLMConfig) {
  return configs.length ? configs : [{ ...activeConfig, id: activeConfig.id || "default", name: activeConfig.name || "默认模型" }];
}

export function addLLMConfigRow(configs: LLMConfig[], activeConfig: LLMConfig) {
  return [
    ...baseLLMConfigs(configs, activeConfig),
    { id: `llm-${crypto.randomUUID()}`, name: "新模型", baseUrl: "", apiKey: "", model: "" }
  ];
}

export function deleteLLMConfigRow(configs: LLMConfig[], activeConfig: LLMConfig, id?: string) {
  if (!id) return configs;
  const next = baseLLMConfigs(configs, activeConfig).filter((config) => config.id !== id);
  return next.length ? next : [{ id: `llm-${crypto.randomUUID()}`, name: "默认模型", baseUrl: "", apiKey: "", model: "" }];
}

export function readLLMConfigsFromForm(form: FormData, configs: LLMConfig[], activeConfig: LLMConfig): LLMConfigListSetting {
  const llmIds = String(form.get("llmIds") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const sourceConfigIds = llmIds.length
    ? llmIds
    : baseLLMConfigs(configs, activeConfig).map((config) => config.id || `llm-${crypto.randomUUID()}`);
  const items = sourceConfigIds.map((id) => {
    const fallback = configs.find((config) => config.id === id) || (activeConfig.id === id ? activeConfig : null);
    return {
      id,
      name: String(form.get(`llm-name-${id}`) || fallback?.name || "").trim() || "未命名模型",
      baseUrl: String(form.get(`llm-baseUrl-${id}`) || fallback?.baseUrl || "").trim(),
      apiKey: String(form.get(`llm-apiKey-${id}`) || fallback?.apiKey || "").trim(),
      model: String(form.get(`llm-model-${id}`) || fallback?.model || "").trim()
    };
  });
  return { activeId: String(form.get("activeLlmId") || items[0]?.id || ""), items };
}

export function readPromptsFromForm(form: FormData, prompts: PromptConfig[]) {
  const promptIds = String(form.get("promptIds") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const sourcePromptIds = promptIds.length ? promptIds : prompts.map((prompt) => prompt.id);
  return sourcePromptIds.map((id) => ({
    id,
    name: String(form.get(`prompt-name-${id}`) || "").trim() || "未命名",
    content: String(form.get(`prompt-content-${id}`) || "").trim()
  }));
}

export function addPromptRow(prompts: PromptConfig[]) {
  return [...prompts, { id: `prompt-${Date.now()}`, name: "新提示词", content: "" }];
}

export function deletePromptRow(prompts: PromptConfig[], id: string) {
  return prompts.filter((prompt) => prompt.id !== id);
}

export function loadPrompts(): PromptConfig[] {
  try {
    const saved = localStorage.getItem(PROMPTS_KEY);
    if (!saved) return DEFAULT_PROMPTS.map((prompt) => ({ ...prompt }));
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PROMPTS.map((prompt) => ({ ...prompt }));
    return parsed;
  } catch {
    return DEFAULT_PROMPTS.map((prompt) => ({ ...prompt }));
  }
}

export function savePrompts(prompts: PromptConfig[]) {
  localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
}
