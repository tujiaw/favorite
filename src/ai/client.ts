import type { LLMConfig } from "@/app/types";

export function isLLMReady(config: LLMConfig | null | undefined) {
  return Boolean(config?.baseUrl && config.apiKey && config.model);
}

function chatCompletionsEndpoint(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}${normalized.endsWith("/v1") ? "" : "/v1"}/chat/completions`;
}

export async function runPrompt(promptContent: string, content: string, config: LLMConfig) {
  if (!isLLMReady(config)) {
    throw new Error("请先在设置中配置大模型");
  }

  const response = await fetch(chatCompletionsEndpoint(config.baseUrl), {
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
  return result as string;
}
