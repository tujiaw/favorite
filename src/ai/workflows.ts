import type { FavoriteItem, InlineAISelection, LLMConfig, PromptConfig } from "@/app/types";
import { makeLocalSummary } from "@/app/utils";
import { makePreview } from "@/utils.js";
import { isLLMReady, runPrompt } from "./client";

const SUMMARY_PROMPT = "请为下面的收藏内容生成 120 字以内的中文摘要，突出用途、关键信息和下一步动作：\n\n";

function clampSelection(selection: InlineAISelection, content: string) {
  const start = Math.max(0, Math.min(selection.start, content.length));
  const end = Math.max(start, Math.min(selection.end, content.length));
  return { start, end, hasSelection: start !== end };
}

export async function generateFavoriteSummary(item: FavoriteItem, config: LLMConfig) {
  if (!isLLMReady(config)) return makeLocalSummary(item);
  return runPrompt(SUMMARY_PROMPT, item.content, config);
}

export async function applySavedPrompt(item: FavoriteItem, prompt: PromptConfig, config: LLMConfig) {
  const content = await runPrompt(prompt.content, item.content, config);
  return {
    content,
    preview: makePreview(content)
  };
}

export async function applyInlineAIEdit({
  item,
  selection,
  userPrompt,
  config
}: {
  item: FavoriteItem;
  selection: InlineAISelection;
  userPrompt: string;
  config: LLMConfig;
}) {
  const content = item.content || "";
  const { start, end, hasSelection } = clampSelection(selection, content);
  const prompt = hasSelection
    ? `你正在帮助编辑一篇收藏内容。请根据用户指令处理 <selected>...</selected> 中的选中文字，并参考全文上下文。只输出可直接替换选中文字的最终内容，不要解释、不要添加引言。\n\n用户指令：${userPrompt}\n\n上下文：\n`
    : `你正在帮助编辑一篇收藏内容。请根据用户指令生成一段可直接插入到光标处的内容，只输出要插入的最终内容，不要解释、不要添加引言。\n\n用户指令：${userPrompt}\n\n当前全文上下文：\n`;
  const context = hasSelection
    ? `${content.slice(0, start)}<selected>${content.slice(start, end)}</selected>${content.slice(end)}`
    : content;
  const result = await runPrompt(prompt, context, config);
  const nextContent = `${content.slice(0, start)}${result}${content.slice(end)}`;

  return {
    content: nextContent,
    preview: makePreview(nextContent),
    hasSelection
  };
}
