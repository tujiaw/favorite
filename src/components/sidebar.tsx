import { Clock, PanelLeft, Search, Sparkles, Star, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TYPE_META } from "@/app/meta";
import type { FavoriteItem, FavoriteType } from "@/app/types";
import { categoryLabel } from "@/app/utils";

function IconButtonWithTooltip({
  label,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button size="icon" variant="ghost" aria-label={label} {...props} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar(props: {
  collapsed: boolean;
  items: FavoriteItem[];
  tags: [string, number][];
  typeCounts: Record<string, number>;
  typeFilter: FavoriteType | "all";
  favoriteOnly: boolean;
  tagFilter: string | null;
  specialFilter: "recent" | null;
  showAllTags: boolean;
  onToggle: () => void;
  onType: (type: FavoriteType | "all") => void;
  onRecent: () => void;
  onFavorite: () => void;
  onTag: (tag: string | null) => void;
  onToggleTags: () => void;
  onManageTags: () => void;
}) {
  if (props.collapsed) {
    return (
      <aside className="min-h-0 border-r bg-card p-3">
        <Card className="flex h-full flex-col items-center gap-2 border-0 bg-transparent shadow-none">
          <IconButtonWithTooltip label="展开侧栏" onClick={props.onToggle}><PanelLeft /></IconButtonWithTooltip>
          <IconButtonWithTooltip label="搜索" onClick={props.onToggle}><Search /></IconButtonWithTooltip>
          <IconButtonWithTooltip label="类型" onClick={props.onToggle}><Sparkles /></IconButtonWithTooltip>
        </Card>
      </aside>
    );
  }

  const favoriteCount = props.items.filter((item) => item.favorite).length;
  const recentCount = props.items.filter((item) => item.last_used_at).length;
  const visibleTags = props.showAllTags ? props.tags : props.tags.slice(0, 8);

  return (
    <aside className="min-h-0 border-r bg-card">
      <ScrollArea className="min-h-0">
        <Card className="grid gap-4 rounded-none border-0 bg-transparent p-3 shadow-none">
          <div className="grid gap-2">
            <p className="px-2 text-xs font-medium text-muted-foreground">收藏管理</p>
            <Button variant={props.typeFilter === "all" && !props.favoriteOnly && !props.specialFilter ? "secondary" : "ghost"} className="justify-between" onClick={() => props.onType("all")}>
              <span className="inline-flex min-w-0 items-center gap-2 truncate"><Sparkles />全部收藏</span><Badge variant="outline">{props.items.length}</Badge>
            </Button>
            <Button variant={props.specialFilter === "recent" ? "secondary" : "ghost"} className="justify-between" onClick={props.onRecent}>
              <span className="inline-flex min-w-0 items-center gap-2 truncate"><Clock />最近使用</span><Badge variant="outline">{recentCount}</Badge>
            </Button>
            <Button variant={props.favoriteOnly ? "secondary" : "ghost"} className="justify-between" onClick={props.onFavorite}>
              <span className="inline-flex min-w-0 items-center gap-2 truncate"><Star />星标收藏</span><Badge variant="outline">{favoriteCount}</Badge>
            </Button>
          </div>
          <div className="grid gap-2">
            <p className="px-2 text-xs font-medium text-muted-foreground">类型</p>
            {(["link", "text", "image", "code", "json", "account"] as FavoriteType[]).map((type) => {
              const Icon = type === "link" ? Tag : TYPE_META[type].icon;
              return (
                <Button variant={props.typeFilter === type ? "secondary" : "ghost"} className="justify-between" key={type} onClick={() => props.onType(type)}>
                  <span className="inline-flex min-w-0 items-center gap-2 truncate"><Icon />{categoryLabel(type)}</span><Badge variant="outline">{props.typeCounts[type] || 0}</Badge>
                </Button>
              );
            })}
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2 px-2">
              <p className="text-xs font-medium text-muted-foreground">标签</p>
              <div className="flex items-center gap-1">
                {props.tags.length ? (
                  <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={props.onManageTags}>管理</Button>
                ) : null}
                {props.tags.length > 8 ? (
                  <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={props.onToggleTags}>{props.showAllTags ? "收起" : "更多"}</Button>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleTags.length ? visibleTags.map(([tag, count]) => (
                <Button variant={props.tagFilter === tag ? "default" : "secondary"} size="sm" key={tag} onClick={() => props.onTag(tag)}>
                  <span className="max-w-[92px] truncate">{tag}</span><Badge variant="outline">{count}</Badge>
                </Button>
              )) : <Badge variant="outline">暂无标签</Badge>}
              {props.tagFilter ? <Button variant="ghost" size="sm" onClick={() => props.onTag(null)}>清除</Button> : null}
            </div>
          </div>
        </Card>
      </ScrollArea>
    </aside>
  );
}
