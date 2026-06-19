import type { LLMConfig, PromptConfig } from "@/app/types";

const CONFIG_KEY = "favorite-llm-config";
const PROMPTS_KEY = "favorite-prompts";

export const EMPTY_LLM_CONFIG: LLMConfig = { baseUrl: "", apiKey: "", model: "" };

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

export function loadLLMConfig(): LLMConfig {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (!saved) return { ...EMPTY_LLM_CONFIG };
    return { ...EMPTY_LLM_CONFIG, ...JSON.parse(saved) };
  } catch {
    return { ...EMPTY_LLM_CONFIG };
  }
}

export function saveLLMConfig(config: LLMConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
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
