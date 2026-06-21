"use client";

import { cjk } from "@streamdown/cjk";
import type { ComponentProps } from "react";
import { memo } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

const streamdownPlugins = { cjk };

export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => (
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

MessageResponse.displayName = "MessageResponse";
