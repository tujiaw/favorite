import React from "react";
import { FileText, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TYPE_META } from "@/app/meta";
import type { FavoriteItem } from "@/app/types";
import { formatListDate, isSystemTag } from "@/app/utils";
import { cn } from "@/lib/utils";

export const ItemCard = React.memo(function ItemCard({
  item,
  selected,
  variant = "list",
  onSelect
}: {
  item: FavoriteItem;
  selected: boolean;
  variant?: "list" | "grid";
  onSelect: () => void;
}) {
  const Icon = TYPE_META[item.type]?.icon || FileText;

  return (
    <Button
      variant="ghost"
      className={cn(
        "h-auto w-full min-w-0 whitespace-normal rounded-none p-0 text-left hover:bg-accent/50",
        variant === "list" && "border-b border-border/40",
        selected && "bg-accent hover:bg-accent"
      )}
      onClick={onSelect}
    >
      <div className="grid w-full min-w-0 gap-1 px-2 py-2">
        <div className="flex w-full min-w-0 items-start justify-between gap-1">
          <div className="flex min-w-0 flex-1 gap-1">
            <Badge variant="secondary" className="grid size-5 shrink-0 place-items-center p-0"><Icon className="size-3" /></Badge>
            <div className="min-w-0 flex-1">
              <h2 className="flex min-w-0 items-center gap-1 text-sm font-medium">
                <span className="min-w-0 truncate">{item.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{TYPE_META[item.type].label}</span>
              </h2>
              <p className="mt-0.5 line-clamp-1 break-all text-xs leading-4 text-muted-foreground">{item.preview || item.content}</p>
            </div>
          </div>
          {item.favorite ? <Star className="size-3 shrink-0 text-primary" fill="currentColor" /> : null}
        </div>
        <div className="flex min-w-0 items-center gap-1 overflow-hidden text-xs text-muted-foreground">
          {item.tags.filter((tag) => !isSystemTag(tag)).slice(0, 2).map((tag) => <Badge variant="outline" className="max-w-[96px] shrink-0 truncate px-1.5 py-0" key={tag}>{tag}</Badge>)}
          <span className="shrink-0">{formatListDate(item.last_used_at || item.created_at)}</span>
        </div>
      </div>
    </Button>
  );
});
