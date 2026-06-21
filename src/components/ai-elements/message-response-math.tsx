"use client";

import { cjk } from "@streamdown/cjk";
import { math } from "@streamdown/math";
import type { ComponentProps } from "react";
import { memo } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

export type MessageResponseMathProps = ComponentProps<typeof Streamdown>;

const streamdownPlugins = { cjk, math };

export const MessageResponseMath = memo(
  ({ className, ...props }: MessageResponseMathProps) => (
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

MessageResponseMath.displayName = "MessageResponseMath";
