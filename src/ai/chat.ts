import type { ChatMessage, FavoriteItem, LLMConfig } from "@/app/types";

export const CHAT_MESSAGES_KEY = "favorite-ai-chat-messages";
export const CHAT_MODEL_KEY = "favorite-ai-chat-model";

export function loadChatMessages() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHAT_MESSAGES_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((message): message is ChatMessage => (
      message &&
      typeof message.id === "string" &&
      ["user", "assistant", "system"].includes(message.role) &&
      typeof message.content === "string" &&
      typeof message.createdAt === "string"
    ));
  } catch {
    return [];
  }
}

export function saveChatMessages(messages: ChatMessage[]) {
  localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(messages));
}

export function chatModelId(model: LLMConfig | undefined) {
  return model?.id || model?.model || "default";
}

export function availableChatModels(llmConfig: LLMConfig, llmConfigs: LLMConfig[]) {
  const models = llmConfigs.length ? llmConfigs : [{ ...llmConfig, id: llmConfig.id || "default", name: llmConfig.name || "默认模型" }];
  const seen = new Set<string>();
  return models.filter((model) => {
    const id = chatModelId(model);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function selectedItemContextMessage(selectedItem: FavoriteItem | null) {
  if (!selectedItem) return [];
  return [{
    role: "system" as const,
    content: [
      "你正在帮助用户处理当前选中的收藏。请把下面内容作为上下文，但不要在回答里机械复述。",
      "如果用户让你整理、总结、生成标题或标签，请输出能直接写回收藏的数据，语言简洁明确。",
      `标题: ${selectedItem.title}`,
      `类型: ${selectedItem.type}`,
      selectedItem.source_url ? `来源: ${selectedItem.source_url}` : "",
      selectedItem.tags.length ? `标签: ${selectedItem.tags.join(", ")}` : "",
      `内容:\n${selectedItem.content}`
    ].filter(Boolean).join("\n")
  }];
}

export function titleFromChatContent(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.replace(/^#+\s*/, "").replace(/^标题[:：]\s*/, "").trim())
    .find(Boolean)
    ?.slice(0, 80) || "";
}

export function tagsFromChatContent(content: string) {
  return content
    .replace(/标签[:：]/g, ",")
    .replace(/[`*_#>\[\]()]/g, " ")
    .split(/[,，、\n;；]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length >= 2 && tag.length <= 18)
    .slice(0, 8);
}
