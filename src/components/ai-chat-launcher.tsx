import { lazy, PointerEvent as ReactPointerEvent, Suspense, useEffect, useRef, useState } from "react";
import { Bot, Grip, Minus, X } from "lucide-react";
import type { ChatMessage, FavoriteItem, LLMConfig } from "@/app/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const AIChatPanel = lazy(() => import("@/components/ai-chat-panel").then((module) => ({ default: module.AIChatPanel })));

const DEFAULT_POPUP_SIZE = { width: 460, height: 720 };

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
  const [size, setSize] = useState(DEFAULT_POPUP_SIZE);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function keepInViewport() {
      setSize((current) => clampSize(current.width, current.height));
      setPosition((current) => {
        if (!current) return current;
        const rect = popupRef.current?.getBoundingClientRect();
        if (!rect) return current;
        return clampPosition(current.x, current.y, rect.width, rect.height);
      });
    }

    window.addEventListener("resize", keepInViewport);
    keepInViewport();
    return () => window.removeEventListener("resize", keepInViewport);
  }, []);

  useEffect(() => {
    if (!open || minimized) return;
    const nextSize = clampSize(size.width, size.height);
    setSize(nextSize);
    setPosition((current) => current
      ? clampPosition(current.x, current.y, nextSize.width, nextSize.height)
      : defaultPosition(nextSize.width, nextSize.height));
  }, [open, minimized]);

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

  function resizePopup(event: ReactPointerEvent<HTMLButtonElement>) {
    const popup = popupRef.current;
    if (event.button !== 0 || !popup) return;
    event.preventDefault();
    const rect = popup.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = rect.width;
    const startHeight = rect.height;
    const basePosition = clampPosition(rect.left, rect.top, rect.width, rect.height);
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "nwse-resize";
    document.body.style.userSelect = "none";
    setPosition(basePosition);

    function move(pointerEvent: PointerEvent) {
      const nextSize = clampSize(
        startWidth + pointerEvent.clientX - startX,
        startHeight + pointerEvent.clientY - startY
      );
      setSize(nextSize);
      setPosition((current) => clampPosition(current?.x ?? basePosition.x, current?.y ?? basePosition.y, nextSize.width, nextSize.height));
    }

    function stop() {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    }

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

  const popupPosition = position ?? defaultPosition(size.width, size.height);

  return (
    <div
      className="fixed z-50 grid min-h-0 grid-rows-[36px_minmax(0,1fr)] overflow-hidden rounded-lg border bg-background shadow-2xl"
      ref={popupRef}
      style={{
        width: size.width,
        height: size.height,
        left: popupPosition.x,
        top: popupPosition.y,
        right: "auto",
        bottom: "auto"
      }}
    >
      <div className="flex min-w-0 items-center gap-2 border-b bg-muted/35 px-2">
        <button
          type="button"
          aria-label="拖动 AI 对话窗口"
          title="拖动 AI 对话窗口"
          className="flex min-w-0 flex-1 cursor-move items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          onPointerDown={dragPopup}
        >
          <Grip className="size-3.5 shrink-0" />
          <span className="truncate font-medium">AI 对话窗口</span>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="最小化 AI 对话"
          title="最小化 AI 对话"
          onClick={() => onMinimized(true)}
        >
          <Minus />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="关闭 AI 对话"
          title="关闭 AI 对话"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
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
        />
      </Suspense>
      <button
        type="button"
        aria-label="拉伸 AI 对话窗口"
        title="拉伸 AI 对话窗口"
        className="absolute bottom-0 right-0 z-20 grid size-5 cursor-nwse-resize place-items-end rounded-tl-md text-muted-foreground hover:bg-muted hover:text-foreground"
        onPointerDown={resizePopup}
      >
        <span className="mb-1 mr-1 block size-2 border-b-2 border-r-2 border-current" />
      </button>
    </div>
  );
}

function clampSize(width: number, height: number) {
  const margin = 16;
  const maxWidth = Math.max(320, window.innerWidth - margin);
  const maxHeight = Math.max(360, window.innerHeight - margin);
  const minWidth = Math.min(360, maxWidth);
  const minHeight = Math.min(420, maxHeight);
  return {
    width: Math.min(Math.max(minWidth, width), maxWidth),
    height: Math.min(Math.max(minHeight, height), maxHeight)
  };
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

function defaultPosition(width: number, height: number) {
  const margin = 16;
  return clampPosition(window.innerWidth - width - margin, window.innerHeight - height - margin, width, height);
}
