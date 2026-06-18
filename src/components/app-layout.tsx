import React, { KeyboardEvent, useEffect, useState } from "react";
import {
  Archive,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Grid3X3,
  Heart,
  KeyRound,
  List,
  LogOut,
  MoreVertical,
  PanelLeft,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { TYPE_META } from "@/app/meta";
import type { AppUser, FavoriteItem, FavoriteType, PromptConfig } from "@/app/types";
import { categoryLabel, formatDetailDate, formatListDate, isSystemTag, renderMarkdown, truncate } from "@/app/utils";

export function LoginScreen({ onSignIn }: { onSignIn: (provider: string) => void }) {
  return (
    <main className="grid min-h-full place-items-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardContent className="grid gap-6 p-6">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground"><Archive /></div>
          <div>
            <h1 className="text-lg font-semibold">个人收藏中心</h1>
            <p className="text-sm text-muted-foreground">登录后同步你的资料、图片和账号保险箱</p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onSignIn("github")}>GitHub 登录</Button>
        </div>
        </CardContent>
      </Card>
    </main>
  );
}

export function Topbar(props: {
  user: AppUser;
  query: string;
  hasVault: boolean;
  installPromptEvent: any;
  isInstalledPwa: boolean;
  onQuery: (value: string) => void;
  onCreate: () => void;
  onOpenVault: () => void;
  onRefresh: () => void;
  onShare: () => void;
  onSettings: () => void;
  onMenu: () => void;
  onPromptInstall: () => void;
  onSignOut: () => void;
}) {
  const subtitle = props.user.email || "本地演示模式";
  return (
    <header className="relative z-20 border-b bg-background/90 backdrop-blur">
      <div className="grid h-16 grid-cols-[minmax(150px,clamp(160px,18vw,240px))_minmax(220px,clamp(260px,30vw,420px))_minmax(0,1fr)] items-center gap-3 px-4 max-md:grid-cols-[minmax(120px,1fr)_auto] max-md:px-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><Archive /></div>
          <div>
            <h1 className="truncate text-sm font-semibold">个人收藏夹</h1>
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <InputGroup className="h-9 w-full rounded-xl bg-background max-md:hidden">
          <InputGroupAddon>
            <Search className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="搜索收藏内容、标签、URL"
            className="h-9 truncate"
            placeholder="搜索收藏内容、标签、URL"
            value={props.query}
            onChange={(event) => props.onQuery(event.target.value)}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label="清空搜索"
              disabled={!props.query}
              size="icon-xs"
              title="清空搜索"
              onClick={() => props.onQuery("")}
            >
              <X />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <div className="flex min-w-0 items-center justify-end gap-2 max-md:gap-1">
          <Button onClick={props.onCreate}><Plus /> 收藏</Button>
          <IconButtonWithTooltip label="AI 智能整理" variant="secondary" onClick={props.onSettings}><Sparkles /></IconButtonWithTooltip>
          <IconButtonWithTooltip label="刷新同步" onClick={props.onRefresh}><RefreshCw /></IconButtonWithTooltip>
          <IconButtonWithTooltip label="保险箱" variant={props.hasVault ? "secondary" : "ghost"} onClick={props.onOpenVault}><ShieldCheck /></IconButtonWithTooltip>
          <IconButtonWithTooltip
            label={props.isInstalledPwa ? "应用已安装" : "安装应用"}
            variant={props.installPromptEvent ? "secondary" : "ghost"}
            disabled={props.isInstalledPwa}
            onClick={props.onPromptInstall}
          >
            <Download />
          </IconButtonWithTooltip>
          <ThemeToggle />
          <Badge variant="secondary" className="grid size-8 place-items-center rounded-full p-0" title={subtitle}>{(props.user.name || props.user.email || "用").slice(0, 1)}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="更多操作" />}>
              <MoreVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={props.onShare}><Upload /> 分享当前收藏</DropdownMenuItem>
              <DropdownMenuItem onClick={props.onMenu}><Grid3X3 /> 快捷操作</DropdownMenuItem>
              <DropdownMenuItem onClick={props.onSignOut}><LogOut /> 退出登录</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

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
  onOverview: () => void;
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
  const activeOverview = !props.specialFilter && props.typeFilter === "all" && !props.favoriteOnly && !props.tagFilter;
  return (
    <aside className="min-h-0 border-r bg-card">
      <ScrollArea className="h-full">
        <Card className="grid gap-4 rounded-none border-0 bg-transparent p-3 shadow-none">
        <div className="grid gap-1">
          <Button variant={activeOverview ? "secondary" : "ghost"} className="justify-start" onClick={props.onOverview}><HomeIcon /><span>概览</span></Button>
        </div>
        <Separator />
        <div className="grid gap-2">
          <p className="px-2 text-xs font-medium text-muted-foreground">收藏管理</p>
          <Button variant={props.typeFilter === "all" && !props.favoriteOnly && !props.specialFilter ? "secondary" : "ghost"} className="justify-between" onClick={() => props.onType("all")}><span className="inline-flex min-w-0 items-center gap-2 truncate"><Sparkles />全部收藏</span><Badge variant="outline">{props.items.length}</Badge></Button>
          <Button variant={props.specialFilter === "recent" ? "secondary" : "ghost"} className="justify-between" onClick={props.onRecent}><span className="inline-flex min-w-0 items-center gap-2 truncate"><Clock />最近使用</span><Badge variant="outline">{recentCount}</Badge></Button>
          <Button variant={props.favoriteOnly ? "secondary" : "ghost"} className="justify-between" onClick={props.onFavorite}><span className="inline-flex min-w-0 items-center gap-2 truncate"><Star />星标收藏</span><Badge variant="outline">{favoriteCount}</Badge></Button>
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
                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={props.onManageTags}>
                  管理
                </Button>
              ) : null}
              {props.tags.length > 8 ? (
                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={props.onToggleTags}>
                  {props.showAllTags ? "收起" : "更多"}
                </Button>
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

export function ItemCard({ item, selected, onSelect }: { item: FavoriteItem; selected: boolean; onSelect: () => void }) {
  const Icon = TYPE_META[item.type]?.icon || FileText;
  return (
    <Button variant="ghost" className="h-auto w-full min-w-0 whitespace-normal p-0 text-left" onClick={onSelect}>
      <Card className={selected ? "w-full min-w-0 overflow-hidden border-primary ring-1 ring-primary" : "w-full min-w-0 overflow-hidden"}>
      <CardContent className="grid min-w-0 gap-1 px-1 py-1">
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
      </CardContent>
      </Card>
    </Button>
  );
}

export function DetailPanel(props: {
  item: FavoriteItem | null;
  contentEditing: boolean;
  aiLoading: boolean;
  prompts: PromptConfig[];
  aiSummary?: string;
  aiSummaryVisible: boolean;
  aiSummaryExpanded: boolean;
  passwordVisible: boolean;
  revealedSecret: { password?: string } | null;
  onCreate: () => void;
  onFavorite: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onTitle: (value: string) => void;
  onType: (type: FavoriteType) => void;
  onAddTag: (value: string) => void;
  onRemoveTag: (tag: string) => void;
  onContentDraft: (value: string) => void;
  onContentCommit: (value: string) => void;
  onToggleEdit: () => void;
  onRefreshAiSummary: () => void;
  onRunAI: (promptId: string) => void;
  onCloseAiSummary: () => void;
  onCopyAiSummary: () => void;
  onApplyAiSummary: () => void;
  onToggleAiSummary: () => void;
  onTogglePassword: () => void;
  onCopyUsername: () => void;
  onCopyPassword: () => void;
  onOpen: (url: string, copyBeforeOpen?: string) => void;
}) {
  const [titleDraft, setTitleDraft] = useState(props.item?.title || "");

  useEffect(() => {
    setTitleDraft(props.item?.title || "");
  }, [props.item?.id, props.item?.title]);

  function commitTitle() {
    if (!props.item) return;
    const nextTitle = titleDraft.trim() || props.item.title;
    setTitleDraft(nextTitle);
    if (nextTitle !== props.item.title) props.onTitle(nextTitle);
  }

  if (!props.item) {
    return (
      <aside className="min-h-0 bg-background">
        <ScrollArea className="h-full">
          <Card className="m-4 grid min-h-[320px] place-items-center gap-4 p-6 text-center">
            <Eye className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">选择一条收藏查看详情</p>
            <Button onClick={props.onCreate}><FileText /> 创建收藏</Button>
          </Card>
        </ScrollArea>
      </aside>
    );
  }
  const item = props.item;
  if (item.type === "account") {
    return (
      <aside className="min-h-0 bg-background">
        <ScrollArea className="h-full">
          <Card className="m-4 p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <KeyRound /> {item.title}
              <Button variant="ghost" size="icon" className="ml-auto" onClick={props.onFavorite}><Heart fill={item.favorite ? "currentColor" : "none"} /></Button>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="删除" onClick={props.onDelete}><Trash2 /></Button>
            </div>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>网址</Label>
                <div className="grid grid-cols-[minmax(0,1fr)_36px] gap-2">
                  <Input value={item.source_url || ""} readOnly />
                  <Button variant="outline" size="icon" disabled={!item.source_url} title="打开链接并复制用户名" onClick={() => item.source_url && props.onOpen(item.source_url, item.content)}><ExternalLink /></Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>用户名</Label>
                <div className="grid grid-cols-[minmax(0,1fr)_36px] gap-2">
                  <Input value={item.content} readOnly />
                  <Button variant="outline" size="icon" disabled={!item.content} title="复制用户名" onClick={props.onCopyUsername}><Copy /></Button>
                </div>
              </div>
              {item.encrypted_secret ? (
                <div className="grid gap-2">
                  <Label>密码</Label>
                  <div className="grid grid-cols-[minmax(0,1fr)_36px_36px] gap-2">
                    <Input type={props.passwordVisible ? "text" : "password"} value={props.revealedSecret?.password || "••••••••"} readOnly />
                    <Button variant="ghost" size="icon" title={props.passwordVisible ? "隐藏密码" : "显示密码"} onClick={props.onTogglePassword}>{props.passwordVisible ? <EyeOff /> : <Eye />}</Button>
                    <Button variant="outline" size="icon" title="复制密码" onClick={props.onCopyPassword}><Copy /></Button>
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        </ScrollArea>
      </aside>
    );
  }
  return (
    <aside className="min-h-0 bg-background">
      <ScrollArea className="h-full">
        <div className="grid gap-3 p-4">
        <div className="grid min-w-0 grid-cols-[minmax(160px,1fr)_auto] items-center gap-3 rounded-lg border bg-card px-3 py-2">
          <Input
            className="h-8 min-w-0 border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0"
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "Enter") {
                event.preventDefault();
                commitTitle();
              }
              if (event.key === "Escape") setTitleDraft(item.title);
            }}
            aria-label="标题"
          />
          <div className="flex min-w-0 items-center gap-1.5">
            <Badge variant="outline" className="shrink-0">{TYPE_META[item.type].label}</Badge>
            {item.tags.filter((tag) => !isSystemTag(tag)).slice(0, 2).map((tag) => (
              <Badge variant="secondary" className="max-w-[92px] gap-1 truncate" key={tag}>
                {tag}
                <Button variant="ghost" size="icon-xs" className="size-4" type="button" title={`移除标签 ${tag}`} onClick={() => props.onRemoveTag(tag)}>×</Button>
              </Badge>
            ))}
            {item.tags.filter((tag) => !isSystemTag(tag)).length > 2 ? <Badge variant="outline">+{item.tags.filter((tag) => !isSystemTag(tag)).length - 2}</Badge> : null}
            <Input
              className="h-7 w-24"
              placeholder="+ 标签"
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "," || event.key === "，") {
                  event.preventDefault();
                  props.onAddTag(event.currentTarget.value);
                  event.currentTarget.value = "";
                }
              }}
              onBlur={(event) => {
                props.onAddTag(event.currentTarget.value);
                event.currentTarget.value = "";
              }}
            />
            <Button variant="outline" onClick={props.onToggleEdit}><Eye /> {props.contentEditing ? "预览" : "编辑"}</Button>
            <Button variant="outline" size="icon" title="复制内容" onClick={props.onCopy}><Copy /></Button>
            {item.type !== "image" ? (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" className="gap-1.5" />}>
                  <Sparkles />
                  <span>AI</span>
                  <ChevronDown className="size-3.5 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-40 max-w-64">
                  <DropdownMenuItem className="whitespace-nowrap" onClick={props.onRefreshAiSummary} disabled={props.aiLoading}>
                    <Sparkles className="shrink-0" /> <span className="truncate">AI 总结{props.aiLoading ? "…" : ""}</span>
                  </DropdownMenuItem>
                  {props.prompts.map((prompt) => (
                    <DropdownMenuItem className="whitespace-nowrap" key={prompt.id} onClick={() => props.onRunAI(prompt.id)} disabled={props.aiLoading} title={prompt.name}>
                      <Sparkles className="shrink-0" /> <span className="truncate">{prompt.name}{props.aiLoading ? "…" : ""}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <Button variant="outline" size="icon" title={item.favorite ? "取消收藏" : "收藏"} onClick={props.onFavorite}><Star fill={item.favorite ? "currentColor" : "none"} /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
                <MoreVertical />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Tag /> 修改类型
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {(["link", "text", "image", "code", "json"] as FavoriteType[]).map((type) => (
                      <DropdownMenuItem key={type} onClick={() => props.onType(type)}>
                        {item.type === type ? <Check /> : <span className="size-3.5" />}
                        {TYPE_META[type].label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                {item.source_url ? <DropdownMenuItem onClick={() => props.onOpen(item.source_url || "")}><ExternalLink /> 打开链接</DropdownMenuItem> : null}
                <DropdownMenuItem onClick={props.onDuplicate}><Copy /> 复制为新收藏</DropdownMenuItem>
                <DropdownMenuItem onClick={props.onExport}><ExternalLink /> 导出文本</DropdownMenuItem>
                <DropdownMenuItem onClick={props.onDelete} className="text-destructive"><Trash2 /> 删除</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1"><FileText className="size-3" /> 创建于 {formatDetailDate(item.created_at)}</span>
            <span className="inline-flex items-center gap-1"><Clock className="size-3" /> 更新于 {formatDetailDate(item.updated_at || item.created_at)}</span>
          </div>
          <span className="shrink-0">共 {String(item.content || "").trim().length} 字</span>
        </div>
        {item.type === "image" ? (
          <Card className="grid min-h-[280px] place-items-center overflow-hidden bg-muted p-3"><img className="max-h-[420px] max-w-full object-contain" src={item.content} alt={item.title} /></Card>
        ) : props.contentEditing ? (
          <Card className="p-3">
            <Textarea className="min-h-[420px] border-0 font-mono shadow-none focus-visible:ring-0" value={item.content} onChange={(event) => props.onContentDraft(event.target.value)} onBlur={(event) => props.onContentCommit(event.target.value)} />
          </Card>
        ) : (
          <Card className="p-5">
            <article className="grid gap-3 whitespace-pre-wrap text-sm leading-7 text-foreground [&_a]:text-primary [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3" dangerouslySetInnerHTML={{ __html: renderMarkdown(item.content) }} />
          </Card>
        )}
        <div className="flex items-center justify-end text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Check className="size-3" /> 自动保存成功</span>
        </div>
        {props.aiSummaryVisible && props.aiSummary ? (
          <Card className="grid gap-3 p-4">
            <div className="flex items-center gap-2">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold"><Sparkles /> AI 总结</h3>
              <Button variant="ghost" size="icon" title="关闭 AI 总结" onClick={props.onCloseAiSummary}>×</Button>
            </div>
            <p className="text-sm text-muted-foreground">{props.aiSummaryExpanded ? props.aiSummary : truncate(props.aiSummary, 120)}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">由 AI 生成，可能不完全准确</span>
              <Button variant="ghost" size="sm" onClick={props.onApplyAiSummary}><Check /> 应用覆盖</Button>
              <Button variant="ghost" size="sm" onClick={props.onCopyAiSummary}><Copy /> 复制</Button>
              <Button variant="ghost" size="sm" onClick={props.onToggleAiSummary}><List /> {props.aiSummaryExpanded ? "收起" : "展开"}</Button>
              <Button variant="ghost" size="sm" onClick={props.onRefreshAiSummary}><RefreshCw /> 重新生成</Button>
            </div>
          </Card>
        ) : null}
        </div>
      </ScrollArea>
    </aside>
  );
}


function HomeIcon() {
  return <Archive />;
}
