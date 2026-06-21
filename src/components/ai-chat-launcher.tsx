import { lazy, PointerEvent as ReactPointerEvent, Suspense, useEffect, useRef, useState } from "react";
import { Bot } from "lucide-react";
import type { ChatMessage, FavoriteItem, LLMConfig } from "@/app/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const AIChatPanel = lazy(() => import("@/components/ai-chat-panel").then((module) => ({ default: module.AIChatPanel })));

export function AIChatLauncher({
  open,
  minimized,
  messages,
  models,
  activeModelId,
  selectedItem,
  busy,
  modelReady,
  onMinimized,
  onOpen,
  onClose,
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
  open: boolean;
  minimized: boolean;
  messages: ChatMessage[];
  models: LLMConfig[];
  activeModelId: string;
  selectedItem: FavoriteItem | null;
  busy: boolean;
  modelReady: boolean;
  onMinimized: (value: boolean) => void;
  onOpen: () => void;
  onClose: () => void;
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
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;
    const currentPosition = position;
    function keepInViewport() {
      const rect = popupRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition(clampPosition(currentPosition.x, currentPosition.y, rect.width, rect.height));
    }

    window.addEventListener("resize", keepInViewport);
    return () => window.removeEventListener("resize", keepInViewport);
  }, [position]);

  function dragPopup(event: ReactPointerEvent<HTMLButtonElement>) {
    const popup = popupRef.current;
    if (event.button !== 0 || !popup) return;
    event.preventDefault();
    const rect = popup.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "move";
    document.body.style.userSelect = "none";

    function move(pointerEvent: PointerEvent) {
      setPosition(clampPosition(pointerEvent.clientX - offsetX, pointerEvent.clientY - offsetY, rect.width, rect.height));
    }

    function stop() {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    }

    setPosition(clampPosition(rect.left, rect.top, rect.width, rect.height));
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  }

  if (!open || minimized) {
    return (
      <Button
        type="button"
        className="fixed bottom-4 right-4 z-50 h-10 gap-2 rounded-full px-4 shadow-lg"
        aria-label={open ? "展开 AI 对话" : "打开 AI 对话"}
        title={open ? "展开 AI 对话" : "打开 AI 对话"}
        onClick={() => {
          if (!open) onOpen();
          onMinimized(false);
        }}
      >
        <Bot className="size-4" /> AI 对话
      </Button>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 h-[min(720px,calc(100vh-6rem))] w-[min(460px,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-background shadow-2xl"
      ref={popupRef}
      style={position ? { left: position.x, top: position.y, right: "auto", bottom: "auto" } : undefined}
    >
      <button
        type="button"
        aria-label="拖动 AI 对话窗口"
        title="拖动 AI 对话窗口"
        className="absolute left-1/2 top-1 z-10 grid h-4 w-16 -translate-x-1/2 cursor-move place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        onPointerDown={dragPopup}
      >
        <span className="block h-1 w-8 rounded-full bg-current opacity-35" />
      </button>
      <Suspense fallback={<Card className="grid h-full place-items-center rounded-none border-0 text-sm text-muted-foreground shadow-none">正在加载 AI 对话</Card>}>
        <AIChatPanel
          className="h-full"
          messages={messages}
          models={models}
          activeModelId={activeModelId}
          selectedItem={selectedItem}
          busy={busy}
          modelReady={modelReady}
          onModel={onModel}
          onSend={onSend}
          onStop={onStop}
          onClear={onClear}
          onCopy={onCopy}
          onApplyContent={onApplyContent}
          onAppendNote={onAppendNote}
          onUseAsTitle={onUseAsTitle}
          onAddTags={onAddTags}
          onOpenSettings={onOpenSettings}
          onMinimize={() => onMinimized(true)}
          onClose={onClose}
        />
      </Suspense>
    </div>
  );
}

function clampPosition(nextX: number, nextY: number, width: number, height: number) {
  const margin = 8;
  const maxX = Math.max(margin, window.innerWidth - width - margin);
  const maxY = Math.max(margin, window.innerHeight - height - margin);
  return {
    x: Math.min(Math.max(margin, nextX), maxX),
    y: Math.min(Math.max(margin, nextY), maxY)
  };
}
