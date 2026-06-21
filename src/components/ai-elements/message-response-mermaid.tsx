"use client";

import { cjk } from "@streamdown/cjk";
import { mermaid } from "@streamdown/mermaid";
import type { ComponentProps } from "react";
import { memo } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

export type MessageResponseMermaidProps = ComponentProps<typeof Streamdown>;

const streamdownPlugins = { cjk, mermaid };

export const MessageResponseMermaid = memo(
  ({ className, ...props }: MessageResponseMermaidProps) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      plugins={streamdownPlugins}
      {...props}
    />
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    nextProps.isAnimating === prevProps.isAnimating
);

MessageResponseMermaid.displayName = "MessageResponseMermaid";
