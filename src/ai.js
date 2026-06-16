const CONFIG_KEY = "favorite-llm-config";
const PROMPTS_KEY = "favorite-prompts";

export const DEFAULT_PROMPTS = [
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

const EMPTY_CONFIG = { baseUrl: "", apiKey: "", model: "" };

export function loadLLMConfig() {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (!saved) return { ...EMPTY_CONFIG };
    return { ...EMPTY_CONFIG, ...JSON.parse(saved) };
  } catch {
    return { ...EMPTY_CONFIG };
  }
}

export function saveLLMConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function loadPrompts() {
  try {
    const saved = localStorage.getItem(PROMPTS_KEY);
    if (!saved) return DEFAULT_PROMPTS.map((p) => ({ ...p }));
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PROMPTS.map((p) => ({ ...p }));
    return parsed;
  } catch {
    return DEFAULT_PROMPTS.map((p) => ({ ...p }));
  }
}

export function savePrompts(prompts) {
  localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
}

export function isLLMReady(config) {
  return Boolean(config?.baseUrl && config?.apiKey && config?.model);
}

export async function runPrompt(promptContent, content, config) {
  if (!isLLMReady(config)) {
    throw new Error("请先在设置中配置大模型");
  }
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const endpoint = baseUrl.endsWith("/chat/completions")
    ? baseUrl
    : `${baseUrl}${baseUrl.endsWith("/v1") ? "" : "/v1"}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: promptContent + content }],
      stream: false
    })
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`请求失败 ${response.status}：${text.slice(0, 200)}`);
  }
  const data = await response.json();
  const result = data.choices?.[0]?.message?.content?.trim();
  if (!result) throw new Error("模型未返回内容");
  return result;
}
