import type { ChatMessage, LLMConfig } from "@/app/types";

type ChatPayloadMessage = Pick<ChatMessage, "role" | "content">;

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
    throw new Error(`请求失败 ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content?.trim();
  if (!result) throw new Error("模型未返回内容");
  return result as string;
}

export async function streamChat(
  messages: ChatPayloadMessage[],
  config: LLMConfig,
  onDelta: (delta: string) => void,
  signal?: AbortSignal
) {
  if (!isLLMReady(config)) {
    throw new Error("请先在设置中配置大模型");
  }

  const response = await fetch(chatCompletionsEndpoint(config.baseUrl), {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
      stream: true
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`请求失败 ${response.status}: ${text.slice(0, 200)}`);
  }
  if (!response.body) {
    throw new Error("当前浏览器不支持流式响应");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = "";

  function consumeEvent(rawEvent: string) {
    const lines = rawEvent.split(/\r?\n/);
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const data = JSON.parse(payload);
        const delta = data.choices?.[0]?.delta?.content ?? data.choices?.[0]?.message?.content ?? "";
        if (delta) {
          result += delta;
          onDelta(delta);
        }
      } catch {
        // Some OpenAI-compatible providers send comments or keep-alive chunks.
      }
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";
    events.forEach(consumeEvent);
  }

  buffer += decoder.decode();
  if (buffer.trim()) consumeEvent(buffer);
  if (!result.trim()) throw new Error("模型未返回内容");
  return result.trim();
}
