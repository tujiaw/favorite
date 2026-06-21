import React, { KeyboardEvent, lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Archive,
  Bold,
  Check,
  ChevronDown,
  Clock,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Grid3X3,
  Heading1,
  Heart,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  LogOut,
  MoreVertical,
  Plus,
  Quote,
  RefreshCw,
  Search,
  Settings,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountDetailPanel } from "@/components/account-detail-panel";
import { CodeEditor, type CodeEditorHandle, type MarkdownAction } from "@/components/code-editor";
import { TYPE_META } from "@/app/meta";
import type { AppUser, FavoriteItem, FavoriteType, InlineAISelection, PromptConfig } from "@/app/types";
import { formatDetailDate, isSystemTag, truncate } from "@/app/utils";

export { ItemCard } from "@/components/item-card";
export { Sidebar } from "@/components/sidebar";

const MarkdownPreview = lazy(() => import("@/components/markdown-preview").then((module) => ({ default: module.MarkdownPreview })));

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
          <IconButtonWithTooltip label="设置" variant="secondary" onClick={props.onSettings}><Settings /></IconButtonWithTooltip>
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

export function DetailPanel(props: {
  item: FavoriteItem | null;
  contentEditing: boolean;
  aiLoading: boolean;
  prompts: PromptConfig[];
  aiSummary?: string;
  aiSummaryVisible: boolean;
  aiSummaryExpanded: boolean;
  inlineAISelection: InlineAISelection | null;
  passwordVisible: boolean;
  revealedSecret: { password?: string } | null;
  accountSecretError?: string;
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
  onInsertImage: (file: File) => Promise<string>;
  onToggleEdit: () => void;
  onRefreshAiSummary: () => void;
  onRunAI: (promptId: string) => void;
  onOpenInlineAI: (selection: InlineAISelection) => void;
  onCloseAiSummary: () => void;
  onCopyAiSummary: () => void;
  onApplyAiSummary: () => void;
  onToggleAiSummary: () => void;
  onTogglePassword: () => void;
  onCopyUsername: () => void;
  onCopyPassword: () => void;
  onOpenVault: () => void;
  onOpen: (url: string, copyBeforeOpen?: string) => void;
}) {
  const [titleDraft, setTitleDraft] = useState(props.item?.title || "");
  const codeEditorRef = useRef<CodeEditorHandle>(null);
  const editorImageInputRef = useRef<HTMLInputElement>(null);
  const markdownTools: { action?: MarkdownAction; label: string; icon: React.ReactNode; onClick?: () => void }[] = [
    { action: "heading", label: "标题", icon: <Heading1 className="size-3.5" /> },
    { action: "bold", label: "加粗", icon: <Bold className="size-3.5" /> },
    { action: "italic", label: "斜体", icon: <Italic className="size-3.5" /> },
    { action: "link", label: "链接", icon: <LinkIcon className="size-3.5" /> },
    { action: "quote", label: "引用", icon: <Quote className="size-3.5" /> },
    { action: "bulletList", label: "无序列表", icon: <List className="size-3.5" /> },
    { action: "orderedList", label: "有序列表", icon: <ListOrdered className="size-3.5" /> },
    { action: "inlineCode", label: "行内代码", icon: <Code2 className="size-3.5" /> },
    { action: "codeBlock", label: "代码块", icon: <Code2 className="size-3.5" /> },
    { label: "图片", icon: <ImageIcon className="size-3.5" />, onClick: () => editorImageInputRef.current?.click() }
  ];

  useEffect(() => {
    setTitleDraft(props.item?.title || "");
  }, [props.item?.id, props.item?.title]);

  function commitTitle() {
    if (!props.item) return;
    const nextTitle = titleDraft.trim() || props.item.title;
    setTitleDraft(nextTitle);
    if (nextTitle !== props.item.title) props.onTitle(nextTitle);
  }

  function openInlineAI() {
    codeEditorRef.current?.openInlineAI();
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
      <AccountDetailPanel
        item={item}
        passwordVisible={props.passwordVisible}
        revealedSecret={props.revealedSecret}
        accountSecretError={props.accountSecretError}
        onFavorite={props.onFavorite}
        onDelete={props.onDelete}
        onOpen={props.onOpen}
        onCopyUsername={props.onCopyUsername}
        onTogglePassword={props.onTogglePassword}
        onCopyPassword={props.onCopyPassword}
        onOpenVault={props.onOpenVault}
      />
    );
  }
  return (
    <aside className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] bg-background">
      <div className="grid gap-3 border-b bg-background p-4 pb-3">
        <div className="grid min-w-0 grid-cols-1 items-center gap-2 rounded-lg border bg-card px-3 py-2 xl:grid-cols-[minmax(160px,1fr)_auto] xl:gap-3">
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
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 xl:justify-end">
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
      </div>
      <ScrollArea className="min-h-0 min-w-0 [&>[data-slot=scroll-area-viewport]]:h-full">
        <div className={props.contentEditing ? "flex min-h-full min-w-0 flex-col gap-3 p-4" : "grid gap-3 p-4"}>
        {props.aiSummaryVisible && props.aiSummary ? (
          <Card className="grid gap-3 p-4">
            <div className="flex items-center gap-2">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold"><Sparkles /> AI 总结</h3>
              <Button className="ml-auto" variant="ghost" size="icon" title="关闭 AI 总结" onClick={props.onCloseAiSummary}>×</Button>
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
        {props.contentEditing && item.type !== "image" ? (
          <div className="sticky top-0 z-30 min-w-0 rounded-md border bg-background/95 p-1 shadow-sm backdrop-blur">
            <input
              className="hidden"
              type="file"
              accept="image/*"
              ref={editorImageInputRef}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) void codeEditorRef.current?.insertImage(file);
              }}
            />
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
              {markdownTools.map((tool) => (
                <Tooltip key={tool.label}>
                  <TooltipTrigger render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      aria-label={tool.label}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={tool.onClick ?? (() => tool.action && codeEditorRef.current?.applyMarkdown(tool.action))}
                    />
                  }>
                    {tool.icon}
                  </TooltipTrigger>
                  <TooltipContent>{tool.label}</TooltipContent>
                </Tooltip>
              ))}
              <Tooltip>
                <TooltipTrigger render={
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="ml-1 h-7 shrink-0 gap-1.5 px-2 text-xs"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => codeEditorRef.current?.save()}
                  />
                }>
                  <Check className="size-3.5" /> 保存
                </TooltipTrigger>
                <TooltipContent>保存 Ctrl/Cmd+S</TooltipContent>
              </Tooltip>
            </div>
          </div>
        ) : null}
        {item.type === "image" ? (
          <Card className="grid min-h-[280px] place-items-center overflow-hidden bg-muted p-3"><img className="max-h-[420px] max-w-full object-contain" src={item.content} alt={item.title} /></Card>
        ) : props.contentEditing ? (
          <Card className="relative min-h-0 min-w-0 flex-1 overflow-hidden p-3 pb-16 ring-0">
            <CodeEditor
              ref={codeEditorRef}
              item={item}
              value={item.content}
              inlineAISelection={props.inlineAISelection}
              onChange={props.onContentDraft}
              onCommit={props.onContentCommit}
              onInsertImage={props.onInsertImage}
              onOpenInlineAI={props.onOpenInlineAI}
            />
            <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex items-center justify-between gap-2">
              <span />
              <div className="pointer-events-none inline-flex items-center gap-1 rounded-md border bg-background/95 px-2.5 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur">
                <Check className="size-3" /> Ctrl/Cmd+S 保存
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-5 ring-0">
            <Suspense fallback={<div className="text-sm text-muted-foreground">正在加载预览</div>}>
              <MarkdownPreview content={item.content} />
            </Suspense>
          </Card>
        )}
        </div>
      </ScrollArea>
    </aside>
  );
}

