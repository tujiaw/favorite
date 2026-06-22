import { FormEvent, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Check, Copy, FilePenLine, MessageSquare, Plus, Send, Settings, Sparkles, Square, Tags } from "lucide-react";
import type { ChatMessage, FavoriteItem, LLMConfig } from "@/app/types";
import { TYPE_META } from "@/app/meta";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton
} from "@/components/ai-elements/conversation";
import { Message, MessageAction, MessageActions, MessageContent } from "@/components/ai-elements/message";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorName,
  ModelSelectorTrigger
} from "@/components/ai-elements/model-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  {
    label: "总结",
    prompt: "请基于当前收藏内容，总结核心要点、适用场景和后续需要关注的事项。"
  },
  {
    label: "整理",
    prompt: "请把当前收藏内容整理成结构清晰的 Markdown 文档，保留关键信息，去掉重复和噪音。"
  },
  {
    label: "标题标签",
    prompt: "请为当前收藏生成一个更准确的标题，并给出 3 到 6 个短标签。输出格式：标题：...；标签：..."
  },
  {
    label: "待办",
    prompt: "请从当前收藏中提取可执行的待办事项，按优先级列出。"
  }
];

const MessageResponse = lazy(() => import("@/components/ai-elements/message-response").then((module) => ({ default: module.MessageResponse })));
const MessageResponseMath = lazy(() => import("@/components/ai-elements/message-response-math").then((module) => ({ default: module.MessageResponseMath })));
const MessageResponseMermaid = lazy(() => import("@/components/ai-elements/message-response-mermaid").then((module) => ({ default: module.MessageResponseMermaid })));
const MessageResponseRich = lazy(() => import("@/components/ai-elements/message-response-rich").then((module) => ({ default: module.MessageResponseRich })));

type ResponseRenderer = "plain" | "math" | "mermaid" | "rich";

const CODE_RESPONSE_PATTERN = /```|~~~/;
const MATH_RESPONSE_PATTERN = /\$\$|\\\(|\\\[/;
const MERMAID_FENCE_PATTERN = /```(?:mermaid|mmd)\s*[\s\S]*?```/gi;
const MERMAID_RESPONSE_PATTERN = /```(?:mermaid|mmd)\b|(^|\n)\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|journey|pie|mindmap|timeline)\b/;

function getResponseRenderer(content: string): ResponseRenderer {
  const hasCode = CODE_RESPONSE_PATTERN.test(content.replace(MERMAID_FENCE_PATTERN, ""));
  const hasMath = MATH_RESPONSE_PATTERN.test(content);
  const hasMermaid = MERMAID_RESPONSE_PATTERN.test(content);
  const richFeatureCount = Number(hasMath) + Number(hasMermaid);

  if (richFeatureCount > 1) return "rich";
  if (hasMermaid) return "mermaid";
  if (hasMath) return "math";
  if (hasCode) return "plain";
  return "plain";
}

function renderAssistantMessage(content: string, busy: boolean) {
  const renderer = getResponseRenderer(content);
  if (renderer === "rich") return <MessageResponseRich isAnimating={busy}>{content}</MessageResponseRich>;
  if (renderer === "mermaid") return <MessageResponseMermaid isAnimating={busy}>{content}</MessageResponseMermaid>;
  if (renderer === "math") return <MessageResponseMath isAnimating={busy}>{content}</MessageResponseMath>;
  return <MessageResponse isAnimating={busy}>{content}</MessageResponse>;
}

export function AIChatPanel({
  messages,
  models,
  activeModelId,
  selectedItem,
  busy,
  modelReady,
  className,
  onModel,
  onSend,
  onStop,
  onClear,
  onCopy,
  onApplyContent,
  onAppendNote,
  onUseAsTitle,
  onAddTags,
  onOpenSettings
}: {
  messages: ChatMessage[];
  models: LLMConfig[];
  activeModelId: string;
  selectedItem: FavoriteItem | null;
  busy: boolean;
  modelReady: boolean;
  className?: string;
  onModel: (modelId: string) => void;
  onSend: (prompt: string, options: { includeSelectedItem: boolean }) => void;
  onStop: () => void;
  onClear: () => void;
  onCopy: (content: string) => void;
  onApplyContent: (content: string) => void;
  onAppendNote: (content: string) => void;
  onUseAsTitle: (content: string) => void;
  onAddTags: (content: string) => void;
  onOpenSettings: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [includeSelectedItem, setIncludeSelectedItem] = useState(true);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const visibleMessages = messages.filter((message) => message.role !== "system");
  const activeModel = useMemo(
    () => models.find((model) => modelId(model) === activeModelId) || models[0],
    [activeModelId, models]
  );
  const lastAssistantContent = [...visibleMessages].reverse().find((message) => message.role === "assistant" && message.content.trim())?.content.trim() || "";

  useEffect(() => {
    promptRef.current?.focus();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = prompt.trim();
    if (!value || busy) return;
    onSend(value, { includeSelectedItem: includeSelectedItem && Boolean(selectedItem) });
    setPrompt("");
  }

  function runQuickAction(actionPrompt: string) {
    if (!selectedItem || busy) return;
    onSend(actionPrompt, { includeSelectedItem: true });
  }

  return (
    <aside className={cn("grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-background", className)}>
      <div className="border-b bg-background px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <Bot className="size-3.5" />
          </div>
          <div className="min-w-[120px] flex-1">
            <h2 className="truncate text-sm font-semibold">AI 对话</h2>
            <p className="truncate text-xs text-muted-foreground">随时问，结果可写回当前收藏</p>
          </div>
          <div className="ml-auto flex min-w-0 shrink items-center gap-1">
            <ModelSelector open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
              <ModelSelectorTrigger
                render={
                  <Button type="button" variant="outline" size="sm" className="min-w-0 max-w-[150px] justify-start" />
                }
              >
                <MessageSquare className="size-3" />
                <span className="truncate">{modelLabel(activeModel)}</span>
              </ModelSelectorTrigger>
              <ModelSelectorContent title="选择模型" className="max-w-md">
                <ModelSelectorInput placeholder="搜索模型" />
                <ModelSelectorList>
                  <ModelSelectorEmpty>没有可用模型</ModelSelectorEmpty>
                  <ModelSelectorGroup heading="大模型">
                    {models.map((model) => {
                      const id = modelId(model);
                      return (
                        <ModelSelectorItem
                          key={id}
                          value={`${modelLabel(model)} ${model.model} ${id}`}
                          onSelect={() => {
                            onModel(id);
                            setModelSelectorOpen(false);
                          }}
                        >
                          <ModelSelectorName>{modelLabel(model)}</ModelSelectorName>
                          <span className="max-w-[180px] truncate text-xs text-muted-foreground">{model.model}</span>
                          {id === activeModelId ? <Check className="ml-auto size-3.5" /> : null}
                        </ModelSelectorItem>
                      );
                    })}
                  </ModelSelectorGroup>
                </ModelSelectorList>
              </ModelSelectorContent>
            </ModelSelector>
            <Button variant="ghost" size="icon-sm" type="button" title="新对话" onClick={onClear} disabled={!visibleMessages.length || busy}>
              <Plus />
            </Button>
            <Button variant="ghost" size="icon-sm" type="button" title="AI 设置" onClick={onOpenSettings}>
              <Settings />
            </Button>
          </div>
        </div>

        <div className="mt-2 flex min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-md bg-muted/40 px-2 py-1.5">
          {selectedItem ? (
            <>
              <Badge variant="secondary" className="shrink-0">{TYPE_META[selectedItem.type].label}</Badge>
              <span className="shrink-0 text-xs text-muted-foreground">当前收藏</span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium" title={selectedItem.title}>{selectedItem.title}</span>
              <Button
                type="button"
                variant={includeSelectedItem ? "secondary" : "outline"}
                size="xs"
                className="shrink-0"
                onClick={() => setIncludeSelectedItem((value) => !value)}
              >
                {includeSelectedItem ? "引用中" : "未引用"}
              </Button>
            </>
          ) : (
            <span className="truncate text-xs text-muted-foreground">选择一条收藏后，AI 会自动获得当前内容上下文</span>
          )}
        </div>

        {selectedItem ? (
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs"
                disabled={busy}
                onClick={() => runQuickAction(action.prompt)}
              >
                <Sparkles className="size-3" /> {action.label}
              </Button>
            ))}
          </div>
        ) : null}

        {!modelReady ? (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-700 dark:text-amber-300">
            <span className="min-w-0 flex-1 truncate">当前模型还不能使用，请先配置 API Key 和模型名。</span>
            <Button type="button" variant="outline" size="xs" onClick={onOpenSettings}>
              <Settings className="size-3" /> 设置
            </Button>
          </div>
        ) : null}
      </div>

      <Conversation className="min-h-0 overflow-x-hidden">
        <ConversationContent className="gap-3 p-3">
          {visibleMessages.length ? visibleMessages.map((message) => (
            <Message from={message.role} key={message.id}>
              <div className={cn("group/message relative min-w-0 max-w-full overflow-hidden", message.role === "user" ? "ml-auto" : "")}>
                <MessageContent className="break-words pr-8 [overflow-wrap:anywhere]">
                  {message.role === "assistant" ? (
                    <Suspense fallback={<p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>}>
                      {renderAssistantMessage(message.content, busy)}
                    </Suspense>
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
                  )}
                </MessageContent>
                <MessageActions className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover/message:opacity-100 group-focus-within/message:opacity-100">
                  <MessageAction tooltip="复制" className="size-7 bg-background/80 shadow-sm backdrop-blur hover:bg-background" onClick={() => onCopy(message.content)}>
                    <Copy className="size-3.5" />
                  </MessageAction>
                </MessageActions>
              </div>
            </Message>
          )) : (
            <ConversationEmptyState
              icon={<Bot className="size-8" />}
              title="开始一段对话"
              description="可以直接提问，也可以先选择收藏并使用上方快捷动作。"
            />
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <form className="grid gap-2 border-t bg-background p-3" onSubmit={submit}>
        {lastAssistantContent && selectedItem ? (
          <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto rounded-md bg-muted/40 p-1.5">
            <span className="shrink-0 px-1 text-xs text-muted-foreground">应用上条回复</span>
            <Button type="button" variant="secondary" size="xs" disabled={busy} onClick={() => onApplyContent(lastAssistantContent)}>
              <FilePenLine className="size-3" /> 替换内容
            </Button>
            <Button type="button" variant="outline" size="xs" disabled={busy} onClick={() => onAppendNote(lastAssistantContent)}>
              追加备注
            </Button>
            <Button type="button" variant="outline" size="xs" disabled={busy} onClick={() => onUseAsTitle(lastAssistantContent)}>
              设为标题
            </Button>
            <Button type="button" variant="outline" size="xs" disabled={busy} onClick={() => onAddTags(lastAssistantContent)}>
              <Tags className="size-3" /> 标签
            </Button>
          </div>
        ) : null}
        <Textarea
          ref={promptRef}
          className="h-24 max-h-24 min-h-24 resize-none overflow-y-auto field-sizing-fixed"
          placeholder="输入问题，Enter 发送，Shift+Enter 换行"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{visibleMessages.length} 条历史消息</span>
          {busy ? (
            <Button type="button" variant="outline" onClick={onStop}>
              <Square /> 停止
            </Button>
          ) : !modelReady ? (
            <Button type="button" onClick={onOpenSettings}>
              <Settings /> 配置模型
            </Button>
          ) : (
            <Button type="submit" disabled={!prompt.trim()}>
              <Send /> 发送
            </Button>
          )}
        </div>
      </form>
    </aside>
  );
}

function modelId(model: LLMConfig | undefined) {
  return model?.id || model?.model || "default";
}

function modelLabel(model: LLMConfig | undefined) {
  if (!model) return "未配置模型";
  return model.name?.trim() || model.model?.trim() || "默认模型";
}
