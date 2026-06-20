import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import { Check, FileText, Image, KeyRound, Plus, Search, ShieldCheck, Sparkles, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { LLMConfig, ModalTab, PromptConfig } from "@/app/types";

export function InlineAIModal({ busy, hasSelection, x, y, onClose, onSubmit }: {
  busy: boolean;
  hasSelection: boolean;
  x?: number;
  y?: number;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const clampPosition = (left: number, top: number) => ({
    left: Math.max(12, Math.min(left, window.innerWidth - 492)),
    top: Math.max(12, Math.min(top, window.innerHeight - 260))
  });
  const [position, setPosition] = useState(() => clampPosition(x ?? window.innerWidth - 500, y ?? 80));
  const [drag, setDrag] = useState<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    if (!drag) return;
    const activeDrag = drag;
    function move(event: PointerEvent) {
      if (event.pointerId !== activeDrag.pointerId) return;
      setPosition(clampPosition(event.clientX - activeDrag.offsetX, event.clientY - activeDrag.offsetY));
    }
    function end(event: PointerEvent) {
      if (event.pointerId === activeDrag.pointerId) setDrag(null);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [drag]);

  return (
    <div className="fixed z-50 w-[min(calc(100vw-2rem),30rem)]" style={{ left: position.left, top: position.top }}>
      <Card className="grid gap-3 p-3 shadow-xl">
        <div
          className="flex cursor-move select-none items-center justify-between gap-3"
          onPointerDown={(event) => {
            const bounds = event.currentTarget.closest(".fixed")?.getBoundingClientRect();
            if (!bounds) return;
            setDrag({ pointerId: event.pointerId, offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top });
          }}
        >
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="size-4" /> AI {hasSelection ? "替换选中文字" : "插入到光标处"}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">输入指令，结果会直接写入正文。</p>
          </div>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onClose}>关闭</Button>
        </div>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <Textarea
            name="prompt"
            className="min-h-24"
            placeholder={hasSelection ? "例如：改写得更简洁，保留原意" : "例如：生成一段后续说明"}
            autoFocus
            required
            onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
              if (event.key === "Escape") onClose();
            }}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>取消</Button>
            <Button type="submit" disabled={busy}><Sparkles /> {busy ? "生成中..." : "生成并写入"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export function CreateModal(props: {
  modalTab: ModalTab;
  quickInput: string;
  status: string;
  hasVaultPassword: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  bitwardenFileInputRef: React.RefObject<HTMLInputElement | null>;
  onTab: (tab: ModalTab) => void;
  onQuickInput: (value: string) => void;
  onClose: () => void;
  onSaveQuick: () => void;
  onPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onImage: (file?: File) => void;
  onOpenVault: () => void;
  onCreateAccount: (event: FormEvent<HTMLFormElement>) => void;
  onBitwardenFile: (file?: File) => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] !max-w-[48rem] overflow-y-auto sm:!max-w-[48rem]">
        <Tabs value={props.modalTab} onValueChange={(value) => props.onTab(value as ModalTab)}>
          <DialogHeader>
            <TabsList>
              <TabsTrigger value="favorite"><FileText /> 收藏</TabsTrigger>
              <TabsTrigger value="account"><KeyRound /> 账号</TabsTrigger>
            </TabsList>
          </DialogHeader>
          <TabsContent value="favorite">
            <Textarea
              className="!h-[320px] min-h-[320px] max-h-[320px] ![field-sizing:fixed] overflow-y-auto"
              placeholder="粘贴 URL、文本、代码、JSON，或直接粘贴图片。按 Ctrl/⌘ + Enter 保存。"
              autoFocus
              value={props.quickInput}
              onChange={(event) => props.onQuickInput(event.target.value)}
              onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") props.onSaveQuick();
              }}
              onPaste={props.onPaste}
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{props.status}</p>
              <Input className="hidden" type="file" accept="image/*" ref={props.fileInputRef} onChange={(event) => props.onImage(event.target.files?.[0])} />
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="icon" title="添加图片" onClick={() => props.fileInputRef.current?.click()}><Image /></Button>
                <Button onClick={props.onSaveQuick}><Plus /> 保存</Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="account">
            {!props.hasVaultPassword ? (
              <Card className="flex items-center justify-between gap-3 p-4">
                <p>请先在右上角设置保险箱主密码</p>
                <Button variant="outline" size="icon" onClick={props.onOpenVault}><ShieldCheck /></Button>
              </Card>
            ) : (
              <form onSubmit={props.onCreateAccount}>
                <div className="mb-3 flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
                  <div className="grid gap-1">
                    <span className="text-sm font-medium">Bitwarden</span>
                    <span className="text-xs text-muted-foreground">导入未加密 JSON 导出的登录项</span>
                  </div>
                  <Input
                    className="hidden"
                    type="file"
                    accept=".json,application/json"
                    ref={props.bitwardenFileInputRef}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      props.onBitwardenFile(file);
                    }}
                  />
                  <Button type="button" variant="outline" onClick={() => props.bitwardenFileInputRef.current?.click()}>
                    <Upload /> 导入
                  </Button>
                </div>
                <div className="grid gap-3">
                  <Input name="url" placeholder="URL" />
                  <Input name="username" placeholder="用户名" />
                  <Input name="password" placeholder="密码" type="password" required />
                  <Textarea name="note" placeholder="备注，可选" rows={2} />
                </div>
                <DialogFooter className="mt-4">
                  <span className="mr-auto text-sm text-muted-foreground">敏感字段加密保存</span>
                  <Button type="submit"><ShieldCheck /> 加密保存</Button>
                </DialogFooter>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function VaultModal({ expiresAt, onClose, onSubmit, onClear }: {
  expiresAt: number | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>保险箱设置</DialogTitle>
          <DialogDescription>设置主密码后，账号密码将被加密保存</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
        {expiresAt ? (
          <Card className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 p-3">
            <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary"><ShieldCheck /></div>
            <div className="grid gap-1">
              <CardTitle className="text-sm">保险箱已启用</CardTitle>
              <span className="text-sm text-muted-foreground">有效期至 {new Date(expiresAt).toLocaleString("zh-CN")}</span>
            </div>
            <Button variant="destructive" type="button" onClick={onClear}><Trash2 /> 清除</Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            <Input name="vaultPassword" placeholder="设置主密码，至少 8 位" type="password" required minLength={8} />
            <Input name="confirmPassword" placeholder="确认主密码" type="password" required minLength={8} />
            <Select name="expireTime" defaultValue="3600000">
              <SelectTrigger>
                <SelectValue placeholder="选择过期时间" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3600000">1小时后过期</SelectItem>
                <SelectItem value="86400000">1天后过期</SelectItem>
                <SelectItem value="604800000">7天后过期</SelectItem>
                <SelectItem value="2592000000">30天后过期</SelectItem>
                <SelectItem value="-1">永不过期</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <DialogFooter className="mt-4">
          <span className="mr-auto text-sm text-muted-foreground">主密码仅保存在浏览器本地</span>
          {expiresAt ? <Button variant="outline" type="button" onClick={onClose}>关闭</Button> : <Button type="submit"><Check /> 确认设置</Button>}
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>此操作无法撤销。确定要删除这条收藏吗？</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>取消</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onConfirm}>
            <Trash2 /> 确认删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TagManagerModal({ tags, onClose, onRename, onDelete }: {
  tags: [string, number][];
  onClose: () => void;
  onRename: (oldTag: string, nextTag: string) => Promise<void>;
  onDelete: (tag: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyTag, setBusyTag] = useState<string | null>(null);
  const filteredTags = tags.filter(([tag]) => tag.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current };
      tags.forEach(([tag]) => {
        next[tag] ??= tag;
      });
      return next;
    });
  }, [tags]);

  async function rename(tag: string) {
    setBusyTag(tag);
    try {
      await onRename(tag, drafts[tag] || tag);
    } finally {
      setBusyTag(null);
    }
  }

  async function remove(tag: string) {
    setBusyTag(tag);
    try {
      await onDelete(tag);
    } finally {
      setBusyTag(null);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100vh-2rem)] !max-w-2xl overflow-y-auto sm:!max-w-2xl">
        <DialogHeader>
          <DialogTitle>标签管理</DialogTitle>
          <DialogDescription>重命名或删除标签会批量更新已使用该标签的收藏。</DialogDescription>
        </DialogHeader>
        <InputGroup className="h-9 rounded-xl bg-background">
          <InputGroupAddon><Search className="size-4" /></InputGroupAddon>
          <InputGroupInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标签" />
        </InputGroup>
        <div className="grid max-h-[420px] gap-2 overflow-auto pr-1">
          {filteredTags.length ? filteredTags.map(([tag, count]) => (
            <Card className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2 p-2" key={tag}>
              <Input
                className="h-8"
                value={drafts[tag] ?? tag}
                onChange={(event) => setDrafts((current) => ({ ...current, [tag]: event.target.value }))}
                onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                  if (event.nativeEvent.isComposing) return;
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void rename(tag);
                  }
                }}
              />
              <Badge variant="outline">{count}</Badge>
              <Button type="button" variant="outline" size="sm" disabled={busyTag === tag || !drafts[tag]?.trim() || drafts[tag] === tag} onClick={() => rename(tag)}>
                <Check /> 重命名
              </Button>
              <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={busyTag === tag} title={`删除标签 ${tag}`} onClick={() => remove(tag)}>
                <Trash2 />
              </Button>
            </Card>
          )) : (
            <Card className="p-6 text-center text-sm text-muted-foreground">没有匹配的标签</Card>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SettingsModal({ config, configs, prompts, status, onClose, onSubmit, onAddConfig, onDeleteConfig, onAddPrompt, onDeletePrompt }: {
  config: LLMConfig;
  configs: LLMConfig[];
  prompts: PromptConfig[];
  status: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAddConfig: () => void;
  onDeleteConfig: (id?: string) => void;
  onAddPrompt: () => void;
  onDeletePrompt: (id: string) => void;
}) {
  const initialConfigs = configs.length ? configs : [{ id: "default", name: "默认模型", baseUrl: "", apiKey: "", model: "" }];
  const [draftConfigs, setDraftConfigs] = useState<LLMConfig[]>(initialConfigs);
  const [activeConfigId, setActiveConfigId] = useState(config.id || initialConfigs[0]?.id || "default");
  const [draftPrompts, setDraftPrompts] = useState<PromptConfig[]>(prompts);

  useEffect(() => {
    const nextConfigs = configs.length ? configs : [{ id: "default", name: "默认模型", baseUrl: "", apiKey: "", model: "" }];
    setDraftConfigs(nextConfigs);
    setActiveConfigId(config.id || nextConfigs[0]?.id || "default");
    setDraftPrompts(prompts);
  }, [config, configs, prompts]);

  function updateDraftConfig(id: string | undefined, patch: Partial<LLMConfig>) {
    if (!id) return;
    setDraftConfigs((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addDraftConfig() {
    const nextConfig = { id: `llm-${crypto.randomUUID()}`, name: "新模型", baseUrl: "", apiKey: "", model: "" };
    setDraftConfigs((current) => [...current, nextConfig]);
    setActiveConfigId(nextConfig.id);
  }

  function deleteDraftConfig(id?: string) {
    if (!id) return;
    setDraftConfigs((current) => {
      const next = current.filter((item) => item.id !== id);
      if (next.length) {
        if (activeConfigId === id) setActiveConfigId(next[0].id || "default");
        return next;
      }
      const fallback = { id: `llm-${crypto.randomUUID()}`, name: "默认模型", baseUrl: "", apiKey: "", model: "" };
      setActiveConfigId(fallback.id);
      return [fallback];
    });
  }

  function updateDraftPrompt(id: string, patch: Partial<PromptConfig>) {
    setDraftPrompts((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addDraftPrompt() {
    setDraftPrompts((current) => [...current, { id: `prompt-${crypto.randomUUID()}`, name: "新提示词", content: "" }]);
  }

  function deleteDraftPrompt(id: string) {
    setDraftPrompts((current) => current.filter((item) => item.id !== id));
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] !max-w-5xl overflow-hidden sm:!max-w-5xl">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>配置大模型与提示词，登录后同步到 Supabase，本地模式保存在当前浏览器</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <input type="hidden" name="llmIds" value={draftConfigs.map((item) => item.id).join(",")} />
          <input type="hidden" name="activeLlmId" value={activeConfigId} />
          {draftConfigs.map((modelConfig) => (
            <div className="hidden" key={`hidden-${modelConfig.id}`}>
              <input name={`llm-name-${modelConfig.id}`} value={modelConfig.name || ""} readOnly />
              <input name={`llm-model-${modelConfig.id}`} value={modelConfig.model || ""} readOnly />
              <input name={`llm-baseUrl-${modelConfig.id}`} value={modelConfig.baseUrl || ""} readOnly />
              <input name={`llm-apiKey-${modelConfig.id}`} value={modelConfig.apiKey || ""} readOnly />
            </div>
          ))}
          <input type="hidden" name="promptIds" value={draftPrompts.map((item) => item.id).join(",")} />
          {draftPrompts.map((prompt) => (
            <div className="hidden" key={`hidden-${prompt.id}`}>
              <input name={`prompt-name-${prompt.id}`} value={prompt.name || ""} readOnly />
              <textarea name={`prompt-content-${prompt.id}`} value={prompt.content || ""} readOnly />
            </div>
          ))}
          <Tabs defaultValue="llm" orientation="vertical" className="grid min-h-[520px] grid-cols-[160px_minmax(0,1fr)] gap-4 max-md:grid-cols-1">
            <TabsList className="w-full items-stretch justify-start">
              <TabsTrigger value="llm">大模型</TabsTrigger>
              <TabsTrigger value="prompts">提示词</TabsTrigger>
            </TabsList>
            <TabsContent value="llm" className="min-w-0">
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">大模型</h3>
                    <p className="text-xs text-muted-foreground">兼容 OpenAI 接口格式，自动拼接 <code>/chat/completions</code>。</p>
                  </div>
                  <Button variant="outline" size="sm" type="button" onClick={addDraftConfig}><Plus /> 新增</Button>
                </div>
                <ScrollArea className="h-[440px] rounded-md border bg-card [&>[data-slot=scroll-area-viewport]]:p-2">
                  <div className="grid gap-2" role="list">
                    {draftConfigs.map((modelConfig, index) => (
                      <Card className="grid gap-2 p-2" size="sm" key={modelConfig.id || index} role="listitem">
                        <div className="grid min-w-0 grid-cols-[56px_minmax(140px,0.8fr)_minmax(140px,0.8fr)_36px] items-center gap-2 max-lg:grid-cols-[56px_minmax(0,1fr)_minmax(0,1fr)_36px]">
                          <Label className="inline-flex w-14 shrink-0 items-center gap-1.5 whitespace-nowrap text-xs">
                            <input
                              className="shrink-0"
                              name="activeLlmId"
                              type="radio"
                              value={modelConfig.id}
                              checked={modelConfig.id === activeConfigId || (!activeConfigId && index === 0)}
                              onChange={() => modelConfig.id && setActiveConfigId(modelConfig.id)}
                            />
                            使用
                          </Label>
                          <Input className="h-7 min-w-0" value={modelConfig.name || ""} placeholder="配置名称" onChange={(event) => updateDraftConfig(modelConfig.id, { name: event.target.value })} />
                          <Input className="h-7 min-w-0" placeholder="模型" value={modelConfig.model} onChange={(event) => updateDraftConfig(modelConfig.id, { model: event.target.value })} />
                          <Button variant="ghost" size="icon" type="button" onClick={() => deleteDraftConfig(modelConfig.id)} title="删除"><Trash2 /></Button>
                        </div>
                        <div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(160px,0.8fr)]">
                          <Label className="grid gap-1">
                            <span className="text-[11px] text-muted-foreground">Base URL</span>
                            <Input className="h-7 min-w-0" placeholder="https://api.openai.com/v1" value={modelConfig.baseUrl} onChange={(event) => updateDraftConfig(modelConfig.id, { baseUrl: event.target.value })} />
                          </Label>
                          <Label className="grid gap-1">
                            <span className="text-[11px] text-muted-foreground">API Key</span>
                            <Input className="h-7 min-w-0" type="password" placeholder="sk-..." value={modelConfig.apiKey} onChange={(event) => updateDraftConfig(modelConfig.id, { apiKey: event.target.value })} />
                          </Label>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
            <TabsContent value="prompts" className="min-w-0">
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">提示词</h3>
                    <p className="text-xs text-muted-foreground">每条提示词会作为 AI 下拉菜单的一项。</p>
                  </div>
                  <Button variant="outline" size="sm" type="button" onClick={addDraftPrompt}><Plus /> 新增</Button>
                </div>
                <ScrollArea className="h-[440px] rounded-md border bg-card [&>[data-slot=scroll-area-viewport]]:p-2">
                  <div className="grid gap-2" role="list">
                    {draftPrompts.map((prompt) => (
                      <Card className="grid gap-2 p-2" size="sm" key={prompt.id} role="listitem">
                        <div className="grid grid-cols-[minmax(0,1fr)_36px] gap-2">
                          <Input className="h-7" value={prompt.name} placeholder="提示词名称" onChange={(event) => updateDraftPrompt(prompt.id, { name: event.target.value })} />
                          <Button variant="ghost" size="icon" type="button" onClick={() => deleteDraftPrompt(prompt.id)} title="删除"><Trash2 /></Button>
                        </div>
                        <Textarea className="min-h-20" value={prompt.content} placeholder="提示词内容，将拼接到正文之前" onChange={(event) => updateDraftPrompt(prompt.id, { content: event.target.value })} />
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-4">
            <span className="mr-auto text-sm text-muted-foreground">{status}</span>
            <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
            <Button type="submit"><Check /> 保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

