import {
  Archive,
  Check,
  ChevronDown,
  Clock,
  Code,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Grid3X3,
  Heart,
  Image,
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
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { loadLLMConfig, loadPrompts, runPrompt, saveLLMConfig, savePrompts } from "./ai.js";
import { decryptSecret, encryptSecret } from "./crypto.js";
import { createBaseItem, deleteFavoriteFor, listFavoritesFor, loadSettingFor, saveFavoriteFor, saveSettingFor, uploadImageFor } from "./data.js";
import { localUser, setSessionUser, state as legacyState } from "./state.js";
import { classifyContent, domainFromUrl, makePreview, titleFromContent, withTimeout } from "./utils.js";

type FavoriteType = "link" | "text" | "image" | "code" | "json" | "account";
type FavoriteItem = {
  id: string;
  user_id: string;
  type: FavoriteType;
  title: string;
  content: string;
  source_url?: string | null;
  domain?: string | null;
  preview?: string;
  tags: string[];
  note?: string;
  favorite: boolean;
  storage_path?: string | null;
  encrypted_secret?: string | null;
  created_at: string;
  updated_at: string;
  last_used_at?: string | null;
  use_count?: number;
};
type AppUser = { id: string; email: string; name: string };
type SortMode = "updated_at" | "use_count" | "title";
type ModalTab = "favorite" | "account";
type LLMConfig = { baseUrl: string; apiKey: string; model: string };
type PromptConfig = { id: string; name: string; content: string };
type BitwardenExport = {
  encrypted?: boolean;
  folders?: { id?: unknown; name?: unknown }[];
  items?: BitwardenItem[];
};
type BitwardenItem = {
  type?: unknown;
  name?: unknown;
  favorite?: unknown;
  id?: unknown;
  folderId?: unknown;
  fields?: unknown;
  notes?: unknown;
  creationDate?: unknown;
  revisionDate?: unknown;
  login?: {
    uris?: { uri?: unknown }[];
    username?: unknown;
    password?: unknown;
    totp?: unknown;
  };
};

const TYPE_META: Record<FavoriteType | "all", { label: string; icon: typeof Sparkles }> = {
  all: { label: "全部", icon: Sparkles },
  link: { label: "链接", icon: Globe },
  text: { label: "文本", icon: FileText },
  image: { label: "图片", icon: Image },
  code: { label: "代码", icon: Code },
  json: { label: "JSON", icon: Code },
  account: { label: "账号", icon: KeyRound }
};
const LLM_CONFIG_SETTING_KEY = "llm-config";
const PROMPTS_SETTING_KEY = "prompts";

export function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<FavoriteType | "all">("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [specialFilter, setSpecialFilter] = useState<"recent" | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [status, setStatusValue] = useState("");
  const [toastStatus, setToastStatus] = useState("");
  const [quickInput, setQuickInput] = useState("");
  const [booted, setBooted] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [supabase, setSupabase] = useState<any>(null);
  const [createModal, setCreateModal] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>("favorite");
  const [vaultModal, setVaultModal] = useState(false);
  const [vaultPassword, setVaultPasswordState] = useState("");
  const [vaultExpiresAt, setVaultExpiresAt] = useState<number | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<{ password?: string } | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("updated_at");
  const [sortDesc, setSortDesc] = useState(true);
  const [contentEditing, setContentEditing] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({ baseUrl: "", apiKey: "", model: "" });
  const [prompts, setPrompts] = useState<PromptConfig[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummaryVisible, setAiSummaryVisible] = useState(false);
  const [aiSummaryExpanded, setAiSummaryExpanded] = useState(false);
  const [aiSummaryById, setAiSummaryById] = useState<Record<string, string>>({});
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [isInstalledPwa, setIsInstalledPwa] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bitwardenFileInputRef = useRef<HTMLInputElement>(null);
  const draftTimers = useRef(new Map<string, number>());
  const statusToastTimer = useRef<number | null>(null);

  const context = useMemo(() => ({ supabaseReady, supabase, user }), [supabaseReady, supabase, user]);

  function setStatus(nextStatus: string) {
    setStatusValue(nextStatus);
    setToastStatus(nextStatus);
    if (statusToastTimer.current) window.clearTimeout(statusToastTimer.current);
    if (!nextStatus) {
      statusToastTimer.current = null;
      return;
    }
    statusToastTimer.current = window.setTimeout(() => {
      setToastStatus("");
      statusToastTimer.current = null;
    }, 3500);
  }

  useEffect(() => {
    boot();
    window.addEventListener("beforeinstallprompt", captureInstallPrompt as EventListener);
    window.addEventListener("appinstalled", clearInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", clearInstallPrompt);
      draftTimers.current.forEach((timer) => window.clearTimeout(timer));
      if (statusToastTimer.current) window.clearTimeout(statusToastTimer.current);
    };
  }, []);

  useEffect(() => {
    const bridgeState = legacyState as any;
    bridgeState.user = user;
    bridgeState.items = items;
    bridgeState.selectedId = selectedId;
    bridgeState.supabaseReady = supabaseReady;
    bridgeState.supabase = supabase;
    bridgeState.vaultPassword = vaultPassword;
    bridgeState.vaultExpiresAt = vaultExpiresAt;
    bridgeState.llmConfig = llmConfig;
    bridgeState.prompts = prompts;
  }, [items, llmConfig, prompts, selectedId, supabase, supabaseReady, user, vaultExpiresAt, vaultPassword]);

  async function boot() {
    setIsInstalledPwa(isRunningAsPwa());
    const savedVault = loadVaultPassword();
    const savedConfig = loadLLMConfig();
    const savedPrompts = loadPrompts();
    setVaultPasswordState(savedVault.password);
    setVaultExpiresAt(savedVault.expiresAt);
    setLlmConfig(savedConfig);
    setPrompts(savedPrompts);
    const bridgeState = legacyState as any;
    bridgeState.llmConfig = savedConfig;
    bridgeState.prompts = savedPrompts;

    if (new URLSearchParams(window.location.search).get("demo") === "1") {
      const local = localUser();
      const nextContext = { supabaseReady: false, supabase: null, user: local };
      setUser(local);
      setSupabaseReady(false);
      setBooted(true);
      setIsLoadingAuth(false);
      await refreshSettings(nextContext, savedConfig, savedPrompts);
      await refreshItems(nextContext, null);
      return;
    }

    const supabaseConfig = window.FAVORITE_SUPABASE;
    const ready = Boolean(supabaseConfig?.url && supabaseConfig?.anonKey);
    setSupabaseReady(ready);
    if (!ready) {
      const local = localUser();
      const nextContext = { supabaseReady: false, supabase: null, user: local };
      setUser(local);
      setBooted(true);
      setIsLoadingAuth(false);
      await refreshSettings(nextContext, savedConfig, savedPrompts);
      await refreshItems(nextContext, null);
      return;
    }

    try {
      const supabaseSdkUrl = "https://esm.sh/@supabase/supabase-js@2";
      const { createClient } = await import(/* @vite-ignore */ supabaseSdkUrl);
      const client = createClient(supabaseConfig!.url, supabaseConfig!.anonKey);
      setSupabase(client);
      const {
        data: { subscription }
      } = client.auth.onAuthStateChange(async (_event: string, session: any) => {
        setSessionUser(session?.user ?? null);
        const nextUser = legacyState.user as AppUser | null;
        setUser(nextUser);
        setIsLoadingAuth(false);
        if (nextUser) {
          const nextContext = { supabaseReady: true, supabase: client, user: nextUser };
          await refreshSettings(nextContext, savedConfig, savedPrompts);
          await refreshItems(nextContext, null);
        }
      });
      legacyState.authSubscription = subscription;
      const {
        data: { user: authUser },
        error
      } = await withTimeout(client.auth.getUser(), 5000, {
        data: { user: null },
        error: new Error("Supabase getUser timed out")
      });
      if (error) console.error("Error fetching user:", error);
      setSessionUser(authUser ?? null);
      const nextUser = legacyState.user as AppUser | null;
      setUser(nextUser);
      if (nextUser) {
        const nextContext = { supabaseReady: true, supabase: client, user: nextUser };
        await refreshSettings(nextContext, savedConfig, savedPrompts);
        await refreshItems(nextContext, null);
      }
    } catch (error) {
      console.error("Supabase SDK 加载失败:", error);
      const local = localUser();
      const nextContext = { supabaseReady: false, supabase: null, user: local };
      setSupabaseReady(false);
      setUser(local);
      setStatus("Supabase SDK 加载失败，已切换到本地模式");
      await refreshSettings(nextContext, savedConfig, savedPrompts);
      await refreshItems(nextContext, null);
    } finally {
      setBooted(true);
      setIsLoadingAuth(false);
    }
  }

  function captureInstallPrompt(event: Event) {
    event.preventDefault();
    setInstallPromptEvent(event);
  }

  function clearInstallPrompt() {
    setInstallPromptEvent(null);
    setIsInstalledPwa(true);
    setStatus("应用已安装");
  }

  async function refreshItems(nextContext = context, preferredId: string | null = selectedId) {
    if (!nextContext.user) return;
    const nextItems = (await listFavoritesFor(nextContext)) as FavoriteItem[];
    setItems(nextItems);
    setSelectedId((current) => {
      const target = preferredId || current;
      if (target && nextItems.some((item) => item.id === target)) return target;
      return nextItems[0]?.id || null;
    });
  }

  async function refreshSettings(
    nextContext = context,
    fallbackConfig: LLMConfig = loadLLMConfig(),
    fallbackPrompts: PromptConfig[] = loadPrompts()
  ) {
    if (!nextContext.user) return;
    try {
      const nextConfig = normalizeLLMConfig(await loadSettingFor(nextContext, LLM_CONFIG_SETTING_KEY, fallbackConfig));
      const nextPrompts = normalizePrompts(await loadSettingFor(nextContext, PROMPTS_SETTING_KEY, fallbackPrompts));
      setLlmConfig(nextConfig);
      setPrompts(nextPrompts);
      const bridgeState = legacyState as any;
      bridgeState.llmConfig = nextConfig;
      bridgeState.prompts = nextPrompts;
    } catch (error: any) {
      setStatus(`配置加载失败：${error.message}`);
    }
  }

  const filteredItems = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();
    return [...items]
      .filter((item) => {
        if (specialFilter === "recent" && !item.last_used_at) return false;
        const matchesType = typeFilter === "all" || item.type === typeFilter;
        const matchesFavorite = !favoriteOnly || item.favorite;
        const matchesTag = !tagFilter || item.tags.includes(tagFilter);
        const haystack = [item.title, item.content, item.source_url, item.domain, item.note, item.tags.join(" ")]
          .join(" ")
          .toLowerCase();
        return matchesType && matchesFavorite && matchesTag && (!lowerQuery || haystack.includes(lowerQuery));
      })
      .sort((a, b) => compareItems(a, b, sortMode, sortDesc));
  }, [favoriteOnly, items, query, sortDesc, sortMode, specialFilter, tagFilter, typeFilter]);

  const selectedItem = filteredItems.find((item) => item.id === selectedId) || filteredItems[0] || null;
  const tags = useMemo(() => tagCounts(items), [items]);
  const typeCounts = useMemo(() => countTypes(items), [items]);

  async function signIn(provider: string) {
    if (!supabaseReady) {
      const local = localUser();
      setUser(local);
      setStatus("当前是本地演示模式；配置 Supabase 后将使用真实 OAuth");
      await refreshItems({ supabaseReady: false, supabase: null, user: local }, null);
      return;
    }
    setIsLoadingAuth(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` }
    });
    if (error) {
      setStatus(`登录失败：${error.message}`);
      setIsLoadingAuth(false);
    }
  }

  async function signOut() {
    setIsLoadingAuth(true);
    if (supabaseReady) await supabase.auth.signOut();
    const nextUser = supabaseReady ? null : localUser();
    setUser(nextUser);
    setItems([]);
    setSelectedId(null);
    setRevealedSecret(null);
    setIsLoadingAuth(false);
    if (nextUser) await refreshItems({ supabaseReady: false, supabase: null, user: nextUser }, null);
  }

  async function saveQuickInput() {
    if (!user) return;
    const content = quickInput.trim();
    if (!content) return;
    const type = classifyContent(content) as FavoriteType;
    const item = createBaseItem({
      type,
      title: titleFromContent(content, type),
      content,
      preview: makePreview(content),
      source_url: type === "link" ? content : null,
      domain: type === "link" ? domainFromUrl(content) : null
    }) as FavoriteItem;
    item.user_id = user.id;
    await saveFavoriteFor(context, item);
    setQuickInput("");
    setCreateModal(false);
    setModalTab("favorite");
    setStatus(`已保存为${TYPE_META[type].label}`);
    await refreshItems(context, item.id);
  }

  async function addImage(file: File) {
    if (!user) return;
    const id = crypto.randomUUID();
    const uploaded = await uploadImageFor(context, user.id, id, file);
    const item = createBaseItem({
      id,
      type: "image",
      title: file.name || "图片收藏",
      content: uploaded.publicUrl,
      preview: file.name || "图片收藏",
      storage_path: uploaded.path
    }) as FavoriteItem;
    item.user_id = user.id;
    await saveFavoriteFor(context, item);
    setCreateModal(false);
    setModalTab("favorite");
    setStatus("图片已保存");
    await refreshItems(context, item.id);
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !vaultPassword) return;
    const form = new FormData(event.currentTarget);
    const url = String(form.get("url") || "");
    const encrypted = await encryptSecret(vaultPassword, {
      password: String(form.get("password") || "")
    });
    const item = createBaseItem({
      type: "account",
      title: domainFromUrl(url) || "账号记录",
      content: String(form.get("username") || ""),
      source_url: url || null,
      domain: domainFromUrl(url),
      preview: "敏感字段已端到端加密",
      note: String(form.get("note") || ""),
      encrypted_secret: encrypted
    }) as FavoriteItem;
    item.user_id = user.id;
    await saveFavoriteFor(context, item);
    setCreateModal(false);
    setModalTab("favorite");
    setRevealedSecret(null);
    setStatus("账号记录已加密保存");
    await refreshItems(context, item.id);
  }

  async function importBitwardenExport(file?: File) {
    if (!file || !user) return;
    if (!vaultPassword) {
      setCreateModal(false);
      setVaultModal(true);
      setStatus("请先设置保险箱主密码，再导入 Bitwarden");
      return;
    }
    try {
      setCreateModal(false);
      setStatus(`正在读取 Bitwarden 文件：${file.name}`);
      await waitForPaint();
      const exportData = parseBitwardenExport(await file.text());
      const total = exportData.items?.length || 0;
      const loginItems = (exportData.items || []).filter(isBitwardenLoginItem);
      const folderNames = new Map(
        (exportData.folders || []).map((folder) => [stringValue(folder.id), stringValue(folder.name)] as const)
      );
      const existingKeys = new Set(
        items.filter((item) => item.type === "account").map((item) => accountFingerprint(item))
      );
      let imported = 0;
      let skipped = total - loginItems.length;
      let processed = 0;
      let firstImportedId: string | null = null;

      setStatus(`正在导入 Bitwarden：0/${loginItems.length}`);
      await waitForPaint();

      for (const bitwardenItem of loginItems) {
        processed += 1;
        const login = bitwardenItem.login;
        const uris = Array.isArray(login.uris)
          ? login.uris.map((uri) => stringValue(uri?.uri)).filter(Boolean)
          : [];
        const sourceUrl = uris[0] || "";
        const username = stringValue(login.username);
        const password = stringValue(login.password);
        const title = stringValue(bitwardenItem.name) || domainFromUrl(sourceUrl) || username || "Bitwarden account";

        if (!sourceUrl && !username && !password) {
          skipped += 1;
          continue;
        }

        const duplicateKey = accountFingerprint({ title, content: username, source_url: sourceUrl });
        if (existingKeys.has(duplicateKey)) {
          skipped += 1;
          continue;
        }

        const folderName = folderNames.get(stringValue(bitwardenItem.folderId)) || "";
        const encrypted = await encryptSecret(vaultPassword, {
          password,
          totp: stringValue(login.totp),
          notes: stringValue(bitwardenItem.notes),
          fields: Array.isArray(bitwardenItem.fields) ? bitwardenItem.fields : [],
          bitwardenId: stringValue(bitwardenItem.id)
        });
        const importedItem = createBaseItem({
          type: "account",
          title,
          content: username,
          source_url: sourceUrl || null,
          domain: domainFromUrl(sourceUrl),
          preview: "Imported from Bitwarden",
          encrypted_secret: encrypted
        }) as FavoriteItem;

        importedItem.user_id = user.id;
        importedItem.favorite = Boolean(bitwardenItem.favorite);
        importedItem.tags = ["Bitwarden", folderName].filter(Boolean);
        importedItem.note = buildBitwardenImportNote(uris, folderName);
        importedItem.created_at = validDateString(bitwardenItem.creationDate) || importedItem.created_at;
        importedItem.updated_at = validDateString(bitwardenItem.revisionDate) || importedItem.updated_at;

        await saveFavoriteFor(context, importedItem);
        existingKeys.add(duplicateKey);
        imported += 1;
        firstImportedId ||= importedItem.id;

        if (processed === 1 || processed % 5 === 0 || processed === loginItems.length) {
          setStatus(`正在导入 Bitwarden：${processed}/${loginItems.length}，已新增 ${imported} 条`);
          await waitForPaint();
        }
      }

      setModalTab("favorite");
      setStatus(`Bitwarden 导入完成：新增 ${imported} 条，跳过 ${skipped} 条`);
      await refreshItems(context, firstImportedId || selectedId);
    } catch (error: any) {
      setStatus(`Bitwarden 导入失败：${error.message || "文件格式不正确"}`);
    }
  }

  async function updateSelected(patch: Partial<FavoriteItem>) {
    if (!selectedItem) return;
    const next = { ...selectedItem, ...patch, updated_at: new Date().toISOString() };
    await saveFavoriteFor(context, next);
    await refreshItems(context, next.id);
  }

  async function addTagToSelected(raw: string) {
    if (!selectedItem || !raw.trim()) return;
    const nextTags = raw
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .reduce((tags, tag) => addTag(tags, tag), selectedItem.tags);
    await updateSelected({ tags: nextTags });
  }

  async function removeTagFromSelected(tag: string) {
    if (!selectedItem) return;
    await updateSelected({ tags: selectedItem.tags.filter((candidate) => candidate !== tag) });
  }

  function updateContentDraft(value: string) {
    if (!selectedItem) return;
    const next = { ...selectedItem, content: value, preview: makePreview(value), updated_at: new Date().toISOString() };
    setItems((current) => current.map((item) => (item.id === next.id ? next : item)));
    window.clearTimeout(draftTimers.current.get(next.id));
    draftTimers.current.set(
      next.id,
      window.setTimeout(async () => {
        await saveFavoriteFor(context, next);
        draftTimers.current.delete(next.id);
      }, 500)
    );
  }

  async function commitContentDraft(value: string) {
    if (!selectedItem) return;
    window.clearTimeout(draftTimers.current.get(selectedItem.id));
    draftTimers.current.delete(selectedItem.id);
    await updateSelected({ content: value, preview: makePreview(value) });
    setStatus("内容已保存");
  }

  async function deleteSelected() {
    if (!selectedItem) return;
    await deleteFavoriteFor(context, selectedItem.id);
    setDeleteConfirm(false);
    setSelectedId(null);
    setStatus("已删除收藏");
    await refreshItems(context, null);
  }

  async function copyAccountPassword() {
    if (!selectedItem?.encrypted_secret || !vaultPassword) {
      setStatus("请先设置保险箱主密码");
      return;
    }
    try {
      const secret = revealedSecret?.password ? revealedSecret : await decryptSecret(vaultPassword, selectedItem.encrypted_secret);
      if (!secret?.password) {
        setStatus("当前账号没有可复制的密码");
        return;
      }
      setRevealedSecret(secret);
      await copyText(secret.password);
    } catch {
      setStatus("解密失败，请检查保险箱主密码");
    }
  }

  async function duplicateSelected() {
    if (!selectedItem || !user) return;
    const clone = createBaseItem({
      type: selectedItem.type,
      title: `${selectedItem.title} 副本`,
      content: selectedItem.content,
      source_url: selectedItem.source_url,
      domain: selectedItem.domain,
      preview: selectedItem.preview,
      storage_path: selectedItem.storage_path,
      encrypted_secret: selectedItem.encrypted_secret
    }) as FavoriteItem;
    clone.user_id = user.id;
    clone.tags = selectedItem.tags.filter((tag) => !isSystemTag(tag));
    clone.note = selectedItem.note;
    clone.favorite = selectedItem.favorite;
    await saveFavoriteFor(context, clone);
    setStatus("已复制为新收藏");
    await refreshItems(context, clone.id);
  }

  function exportSelected() {
    if (!selectedItem) return;
    const content = [
      `# ${selectedItem.title}`,
      "",
      selectedItem.source_url ? `URL: ${selectedItem.source_url}` : "",
      selectedItem.tags.filter((tag) => !isSystemTag(tag)).length ? `标签: ${selectedItem.tags.filter((tag) => !isSystemTag(tag)).join(", ")}` : "",
      selectedItem.note ? `备注: ${selectedItem.note}` : "",
      "",
      selectedItem.content
    ].filter((line, index) => line || index < 2).join("\n");
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFilename(selectedItem.title)}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("已导出 Markdown 文件");
  }

  async function togglePassword() {
    if (!selectedItem) return;
    if (!revealedSecret && selectedItem.encrypted_secret && vaultPassword) {
      try {
        setRevealedSecret(await decryptSecret(vaultPassword, selectedItem.encrypted_secret));
      } catch {
        setStatus("解密失败，请检查保险箱主密码");
      }
    }
    setPasswordVisible((value) => !value);
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setStatus("已复制到剪贴板");
  }

  async function setVaultPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("vaultPassword") || "");
    const confirm = String(form.get("confirmPassword") || "");
    const expireTime = Number(form.get("expireTime") || "3600000");
    if (password.length < 8) return setStatus("主密码至少需要 8 位");
    if (password !== confirm) return setStatus("两次输入的密码不一致");
    const expiresAt = expireTime === -1 ? null : Date.now() + expireTime;
    localStorage.setItem("favorite-vault", JSON.stringify({ password: btoa(password), expiresAt }));
    setVaultPasswordState(password);
    setVaultExpiresAt(expiresAt);
    setVaultModal(false);
    setStatus(`保险箱主密码已设置${expireTime === -1 ? "（永不过期）" : ""}`);
  }

  function clearVaultPassword() {
    localStorage.removeItem("favorite-vault");
    setVaultPasswordState("");
    setVaultExpiresAt(null);
    setStatus("保险箱主密码已清除");
  }

  async function promptInstall() {
    if (isInstalledPwa) {
      setStatus("应用已安装");
      return;
    }
    if (!installPromptEvent) {
      setStatus("当前浏览器暂未提供安装入口，可通过浏览器菜单安装此应用");
      return;
    }
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
    if (outcome === "accepted") {
      setIsInstalledPwa(true);
      setStatus("应用安装已开始");
    } else {
      setStatus("已取消安装");
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextConfig = {
      baseUrl: String(form.get("baseUrl") || "").trim(),
      apiKey: String(form.get("apiKey") || "").trim(),
      model: String(form.get("model") || "").trim()
    };
    const nextPrompts = prompts.map((prompt) => ({
      id: prompt.id,
      name: String(form.get(`prompt-name-${prompt.id}`) || "").trim() || "未命名",
      content: String(form.get(`prompt-content-${prompt.id}`) || "").trim()
    }));
    setLlmConfig(nextConfig);
    setPrompts(nextPrompts);
    saveLLMConfig(nextConfig);
    savePrompts(nextPrompts);
    try {
      await saveSettingFor(context, LLM_CONFIG_SETTING_KEY, nextConfig);
      await saveSettingFor(context, PROMPTS_SETTING_KEY, nextPrompts);
      setSettingsModal(false);
      setStatus(supabaseReady ? "设置已保存到 Supabase" : "设置已保存到本地");
    } catch (error: any) {
      setStatus(`设置保存失败：${error.message}`);
    }
  }

  function addPromptRow() {
    setPrompts((current) => [...current, { id: `prompt-${Date.now()}`, name: "新提示词", content: "" }]);
  }

  function deletePromptRow(id: string) {
    setPrompts((current) => current.filter((prompt) => prompt.id !== id));
  }

  async function refreshAiSummary() {
    if (!selectedItem || selectedItem.type === "image" || selectedItem.type === "account") return;
    setAiLoading(true);
    setStatus("正在生成 AI 总结");
    try {
      const summary = llmConfig.baseUrl && llmConfig.apiKey && llmConfig.model
        ? await runPrompt("请为下面的收藏内容生成 120 字以内的中文摘要，突出用途、关键信息和下一步动作：\n\n", selectedItem.content, llmConfig)
        : makeLocalSummary(selectedItem);
      setAiSummaryById((current) => ({ ...current, [selectedItem.id]: summary }));
      setAiSummaryVisible(true);
      setAiSummaryExpanded(false);
      setStatus("AI 总结已生成");
    } catch (error: any) {
      setStatus(`AI 总结失败：${error.message}`);
    } finally {
      setAiLoading(false);
    }
  }

  async function runAI(promptId: string) {
    if (!selectedItem || selectedItem.type === "image" || selectedItem.type === "account") return;
    const prompt = prompts.find((candidate) => candidate.id === promptId);
    if (!prompt) return;
    if (!llmConfig.baseUrl || !llmConfig.apiKey || !llmConfig.model) {
      setStatus("请先在设置中配置大模型");
      setSettingsModal(true);
      return;
    }
    setAiLoading(true);
    setStatus(`正在执行：${prompt.name}`);
    try {
      const result = await runPrompt(prompt.content, selectedItem.content, llmConfig);
      await updateSelected({ content: result, preview: makePreview(result) });
      setStatus(`已应用：${prompt.name}`);
    } catch (error: any) {
      setStatus(`AI 处理失败：${error.message}`);
    } finally {
      setAiLoading(false);
    }
  }

  if (!booted || isLoadingAuth) {
    return <main className="grid min-h-full place-items-center bg-background text-muted-foreground">正在连接 GitHub 登录...</main>;
  }

  if (!user) {
    return <LoginScreen onSignIn={signIn} />;
  }

  const workspaceGridClass = sidebarCollapsed
    ? "grid min-h-0 overflow-hidden grid-cols-[72px_minmax(320px,clamp(360px,36vw,560px))_minmax(360px,1fr)] max-lg:grid-cols-[72px_minmax(300px,0.95fr)_minmax(320px,1.2fr)] max-md:grid-cols-1 max-md:overflow-auto max-md:[&>aside:first-child]:hidden"
    : "grid min-h-0 overflow-hidden grid-cols-[clamp(220px,18vw,280px)_minmax(320px,clamp(340px,32vw,520px))_minmax(360px,1fr)] max-xl:grid-cols-[clamp(200px,20vw,240px)_minmax(300px,clamp(320px,34vw,440px))_minmax(320px,1fr)] max-lg:grid-cols-[minmax(280px,0.95fr)_minmax(320px,1.2fr)] max-lg:[&>aside:first-child]:hidden max-md:grid-cols-1 max-md:overflow-auto";

  return (
    <TooltipProvider>
    <main className="grid h-full grid-rows-[64px_minmax(0,1fr)] bg-background text-foreground">
      <Topbar
        user={user}
        query={query}
        hasVault={Boolean(vaultPassword)}
        installPromptEvent={installPromptEvent}
        isInstalledPwa={isInstalledPwa}
        onQuery={setQuery}
        onCreate={() => {
          setCreateModal(true);
          setModalTab("favorite");
        }}
        onOpenVault={() => setVaultModal(true)}
        onRefresh={async () => {
          await refreshItems(context, selectedId);
          setStatus("收藏列表已刷新");
        }}
        onShare={() => selectedItem ? copyText(`${selectedItem.title}\n${selectedItem.source_url || selectedItem.content}`) : setStatus("请先选择一条收藏")}
        onSettings={() => setSettingsModal(true)}
        onMenu={() => setStatus("快捷操作：使用顶部搜索、创建收藏、保险箱来管理收藏。")}
        onPromptInstall={promptInstall}
        onSignOut={signOut}
      />
      <div className={workspaceGridClass}>
        <Sidebar
          collapsed={sidebarCollapsed}
          items={items}
          tags={tags}
          typeCounts={typeCounts}
          typeFilter={typeFilter}
          favoriteOnly={favoriteOnly}
          tagFilter={tagFilter}
          specialFilter={specialFilter}
          onToggle={() => setSidebarCollapsed((value) => !value)}
          onOverview={() => {
            setTypeFilter("all");
            setFavoriteOnly(false);
            setTagFilter(null);
            setSpecialFilter(null);
          }}
          onType={(type) => {
            setTypeFilter(type);
            setFavoriteOnly(false);
            setTagFilter(null);
            setSpecialFilter(null);
          }}
          onRecent={() => {
            setSpecialFilter("recent");
            setTypeFilter("all");
            setFavoriteOnly(false);
            setTagFilter(null);
          }}
          onFavorite={() => {
            setFavoriteOnly((value) => !value);
            setSpecialFilter(null);
          }}
          onTag={(tag) => {
            setTagFilter(tag);
            setSpecialFilter(null);
          }}
        />
        <section className="min-h-0 min-w-0 border-r bg-background">
          <Card className="flex h-full flex-col rounded-none border-0 border-r bg-card shadow-none">
            <CardHeader className="!flex flex-nowrap items-center justify-between gap-2 space-y-0 border-b p-4">
              <CardTitle className="shrink-0 whitespace-nowrap text-base">全部收藏 <span className="text-sm text-muted-foreground">{filteredItems.length}</span></CardTitle>
              <div className="flex shrink-0 items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
                    <span>{sortLabel(sortMode)}</span>
                    <ChevronDown className="size-3.5 opacity-70" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(["updated_at", "use_count", "title"] as SortMode[]).map((mode) => (
                      <DropdownMenuItem key={mode} onClick={() => {
                        if (sortMode === mode) setSortDesc((value) => !value);
                        else {
                          setSortMode(mode);
                          setSortDesc(true);
                        }
                      }}>
                        {sortMode === mode && sortDesc ? "↓" : "↑"} 按{sortLabel(mode)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" title="列表视图" onClick={() => setViewMode("list")}><List /></Button>
                <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" title="网格视图" onClick={() => setViewMode("grid")}><Grid3X3 /></Button>
              </div>
            </CardHeader>
            <ScrollArea className="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]]:pr-3">
              <div className={viewMode === "grid" ? "grid gap-3 p-3 sm:grid-cols-2" : "grid gap-2 p-3"}>
                {filteredItems.length ? filteredItems.map((item) => (
                  <ItemCard
                    item={item}
                    key={item.id}
                    selected={selectedItem?.id === item.id}
                    onSelect={async () => {
                      setSelectedId(item.id);
                      setPasswordVisible(false);
                      setContentEditing(false);
                      if (item.type === "account" && item.encrypted_secret && vaultPassword) {
                        try {
                          setRevealedSecret(await decryptSecret(vaultPassword, item.encrypted_secret));
                        } catch {
                          setRevealedSecret(null);
                        }
                      } else {
                        setRevealedSecret(null);
                      }
                    }}
                  />
                )) : <Card className="p-6 text-center text-sm text-muted-foreground">{query.trim() ? "没有匹配的收藏，试试换个关键词" : "还没有收藏，点击“创建”开始"}</Card>}
              </div>
            </ScrollArea>
          </Card>
        </section>
        <DetailPanel
          item={selectedItem}
          contentEditing={contentEditing}
          passwordVisible={passwordVisible}
          revealedSecret={revealedSecret}
          prompts={prompts}
          aiLoading={aiLoading}
          aiSummary={selectedItem ? aiSummaryById[selectedItem.id] : ""}
          aiSummaryVisible={aiSummaryVisible}
          aiSummaryExpanded={aiSummaryExpanded}
          onCreate={() => setCreateModal(true)}
          onFavorite={() => selectedItem && updateSelected({ favorite: !selectedItem.favorite })}
          onCopy={() => selectedItem && copyText(selectedItem.content)}
          onDelete={() => setDeleteConfirm(true)}
          onDuplicate={duplicateSelected}
          onExport={exportSelected}
          onTitle={(title) => updateSelected({ title })}
          onType={(type) => updateSelected({ type })}
          onAddTag={addTagToSelected}
          onRemoveTag={removeTagFromSelected}
          onContentDraft={updateContentDraft}
          onContentCommit={commitContentDraft}
          onToggleEdit={() => setContentEditing((value) => !value)}
          onRefreshAiSummary={refreshAiSummary}
          onRunAI={runAI}
          onCloseAiSummary={() => setAiSummaryVisible(false)}
          onCopyAiSummary={() => selectedItem && copyText(aiSummaryById[selectedItem.id] || "")}
          onApplyAiSummary={() => selectedItem && aiSummaryById[selectedItem.id] && updateSelected({ content: aiSummaryById[selectedItem.id], preview: makePreview(aiSummaryById[selectedItem.id]) })}
          onToggleAiSummary={() => setAiSummaryExpanded((value) => !value)}
          onTogglePassword={togglePassword}
          onCopyPassword={copyAccountPassword}
          onOpen={async (url, copyBeforeOpen) => {
            if (copyBeforeOpen) await copyText(copyBeforeOpen);
            window.open(url, "_blank", "noreferrer");
          }}
        />
      </div>
      {createModal ? (
        <CreateModal
          modalTab={modalTab}
          quickInput={quickInput}
          status={status}
          hasVaultPassword={Boolean(vaultPassword)}
          fileInputRef={fileInputRef}
          bitwardenFileInputRef={bitwardenFileInputRef}
          onTab={setModalTab}
          onQuickInput={setQuickInput}
          onClose={() => {
            setCreateModal(false);
            setModalTab("favorite");
          }}
          onSaveQuick={saveQuickInput}
          onPaste={async (event) => {
            const image = Array.from(event.clipboardData.files).find((file) => file.type.startsWith("image/"));
            if (!image) return;
            event.preventDefault();
            await addImage(image);
          }}
          onImage={(file) => file && addImage(file)}
          onOpenVault={() => {
            setVaultModal(true);
            setCreateModal(false);
          }}
          onCreateAccount={createAccount}
          onBitwardenFile={importBitwardenExport}
        />
      ) : null}
      {vaultModal ? (
        <VaultModal
          expiresAt={vaultExpiresAt}
          onClose={() => setVaultModal(false)}
          onSubmit={setVaultPassword}
          onClear={clearVaultPassword}
        />
      ) : null}
      {deleteConfirm ? (
        <ConfirmModal
          onCancel={() => setDeleteConfirm(false)}
          onConfirm={deleteSelected}
        />
      ) : null}
      {settingsModal ? (
        <SettingsModal
          config={llmConfig}
          prompts={prompts}
          status={status}
          onClose={() => setSettingsModal(false)}
          onSubmit={saveSettings}
          onAddPrompt={addPromptRow}
          onDeletePrompt={deletePromptRow}
        />
      ) : null}
      {toastStatus ? <Card className="fixed bottom-3 right-4 z-50 px-3 py-2 text-xs text-muted-foreground shadow-md">{toastStatus}</Card> : null}
    </main>
    </TooltipProvider>
  );
}

function LoginScreen({ onSignIn }: { onSignIn: (provider: string) => void }) {
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

function Topbar(props: {
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

function Sidebar(props: {
  collapsed: boolean;
  items: FavoriteItem[];
  tags: [string, number][];
  typeCounts: Record<string, number>;
  typeFilter: FavoriteType | "all";
  favoriteOnly: boolean;
  tagFilter: string | null;
  specialFilter: "recent" | null;
  onToggle: () => void;
  onOverview: () => void;
  onType: (type: FavoriteType | "all") => void;
  onRecent: () => void;
  onFavorite: () => void;
  onTag: (tag: string | null) => void;
}) {
  if (props.collapsed) {
    return (
      <aside className="min-h-0 border-r bg-card p-3">
        <Card className="flex h-full flex-col items-center gap-2 border-0 bg-transparent shadow-none">
          <IconButtonWithTooltip label="展开分类" onClick={props.onToggle}><PanelLeft /></IconButtonWithTooltip>
          <IconButtonWithTooltip label="搜索" onClick={props.onToggle}><Search /></IconButtonWithTooltip>
          <IconButtonWithTooltip label="分类" onClick={props.onToggle}><Sparkles /></IconButtonWithTooltip>
        </Card>
      </aside>
    );
  }
  const favoriteCount = props.items.filter((item) => item.favorite).length;
  const recentCount = props.items.filter((item) => item.last_used_at).length;
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
          <p className="px-2 text-xs font-medium text-muted-foreground">分类</p>
          {(["link", "text", "image", "code", "json"] as FavoriteType[]).map((type) => {
            const Icon = type === "link" ? Tag : TYPE_META[type].icon;
            return (
              <Button variant={props.typeFilter === type ? "secondary" : "ghost"} className="justify-between" key={type} onClick={() => props.onType(type)}>
                <span className="inline-flex min-w-0 items-center gap-2 truncate"><Icon />{categoryLabel(type)}</span><Badge variant="outline">{props.typeCounts[type] || 0}</Badge>
              </Button>
            );
          })}
          <Button variant="ghost" className="justify-start" onClick={() => window.alert("新分类将在下一阶段迁移为可编辑标签管理")}><Plus /><span>新建分类</span></Button>
        </div>
        <div className="grid gap-2">
          <p className="px-2 text-xs font-medium text-muted-foreground">标签</p>
          <div className="flex flex-wrap gap-2">
          {props.tags.length ? props.tags.slice(0, 8).map(([tag, count]) => (
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

function ItemCard({ item, selected, onSelect }: { item: FavoriteItem; selected: boolean; onSelect: () => void }) {
  const Icon = TYPE_META[item.type]?.icon || FileText;
  return (
    <Button variant="ghost" className="h-auto w-full min-w-0 whitespace-normal p-0 text-left" onClick={onSelect}>
      <Card className={selected ? "w-full min-w-0 overflow-hidden border-primary ring-1 ring-primary" : "w-full min-w-0 overflow-hidden"}>
      <CardContent className="grid min-w-0 gap-3 p-3">
      <div className="flex w-full min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <Badge variant="secondary" className="grid size-8 shrink-0 place-items-center p-0"><Icon /></Badge>
          <div className="min-w-0 flex-1">
            <h2 className="flex min-w-0 items-center gap-1 text-sm font-medium">
              <span className="min-w-0 truncate">{item.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{TYPE_META[item.type].label}</span>
            </h2>
            <p className="mt-1 line-clamp-2 break-all text-xs leading-5 text-muted-foreground">{item.preview || item.content}</p>
          </div>
        </div>
        {item.favorite ? <Star className="size-4 shrink-0 text-primary" fill="currentColor" /> : null}
      </div>
      <div className="flex min-w-0 items-center gap-2 overflow-hidden text-xs text-muted-foreground">
        {item.tags.filter((tag) => !isSystemTag(tag)).slice(0, 2).map((tag) => <Badge variant="outline" className="max-w-[96px] shrink-0 truncate" key={tag}>{tag}</Badge>)}
        <span className="shrink-0">{formatListDate(item.last_used_at || item.created_at)}</span>
      </div>
      </CardContent>
      </Card>
    </Button>
  );
}

function DetailPanel(props: {
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
                <Input value={item.content} readOnly />
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
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={props.onRefreshAiSummary} disabled={props.aiLoading}>
                    <Sparkles /> AI 总结{props.aiLoading ? "…" : ""}
                  </DropdownMenuItem>
                  {props.prompts.map((prompt) => (
                    <DropdownMenuItem key={prompt.id} onClick={() => props.onRunAI(prompt.id)} disabled={props.aiLoading} title={prompt.name}>
                      <Sparkles /> {prompt.name}{props.aiLoading ? "…" : ""}
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
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><FileText className="size-3" /> 创建于 {formatDetailDate(item.created_at)}</span>
          <span className="inline-flex items-center gap-1"><Clock className="size-3" /> 更新于 {formatDetailDate(item.updated_at || item.created_at)}</span>
          <span className="inline-flex items-center gap-1"><ShieldCheck className="size-3" /> {item.encrypted_secret ? "已加密" : "未加密"}</span>
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
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>共 {String(item.content || "").trim().length} 字</span>
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

function CreateModal(props: {
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
              value={props.quickInput}
              onChange={(event) => props.onQuickInput(event.target.value)}
              onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") props.onSaveQuick();
              }}
              onPaste={props.onPaste}
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{props.status}</p>
              <Input className="hidden" type="file" accept="image/*" ref={props.fileInputRef} onChange={(event) => props.onImage(event.target.files?.[0])} />
              <Button variant="ghost" size="icon" title="添加图片" onClick={() => props.fileInputRef.current?.click()}><Image /></Button>
              <Button onClick={props.onSaveQuick}><Plus /> 保存</Button>
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

function VaultModal({ expiresAt, onClose, onSubmit, onClear }: {
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

function ConfirmModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
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

function SettingsModal({ config, prompts, status, onClose, onSubmit, onAddPrompt, onDeletePrompt }: {
  config: LLMConfig;
  prompts: PromptConfig[];
  status: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAddPrompt: () => void;
  onDeletePrompt: (id: string) => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>配置大模型与提示词，登录后同步到 Supabase，本地模式保存在当前浏览器</DialogDescription>
        </DialogHeader>
      <form onSubmit={onSubmit}>
        <div className="grid gap-3">
          <h3 className="text-sm font-semibold">大模型配置</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Label className="grid gap-2 sm:col-span-2">
              <span>Base URL</span>
              <Input name="baseUrl" placeholder="https://api.openai.com/v1" defaultValue={config.baseUrl} />
            </Label>
            <Label className="grid gap-2">
              <span>模型</span>
              <Input name="model" placeholder="gpt-4o-mini" defaultValue={config.model} />
            </Label>
            <Label className="grid gap-2 sm:col-span-2">
              <span>API Key</span>
              <Input name="apiKey" type="password" placeholder="sk-..." defaultValue={config.apiKey} />
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">兼容 OpenAI 接口格式，自动拼接 <code>/chat/completions</code>。</p>
        </div>
        <Separator className="my-4" />
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">提示词</h3>
            <Button variant="outline" size="sm" type="button" onClick={onAddPrompt}><Plus /> 新增</Button>
          </div>
          <div className="grid max-h-[320px] gap-3 overflow-auto pr-1">
            {prompts.map((prompt) => (
              <Card className="grid gap-3 p-3" key={prompt.id}>
                <div className="grid grid-cols-[minmax(0,1fr)_36px] gap-2">
                  <Input name={`prompt-name-${prompt.id}`} defaultValue={prompt.name} placeholder="提示词名称" />
                  <Button variant="ghost" size="icon" type="button" onClick={() => onDeletePrompt(prompt.id)} title="删除"><Trash2 /></Button>
                </div>
                <Textarea name={`prompt-content-${prompt.id}`} defaultValue={prompt.content} placeholder="提示词内容，将拼接到正文之前" />
              </Card>
            ))}
          </div>
        </div>
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

function parseBitwardenExport(value: string): BitwardenExport {
  const parsed = JSON.parse(value) as BitwardenExport;
  if (parsed.encrypted) throw new Error("请选择 Bitwarden 未加密 JSON 导出文件");
  if (!Array.isArray(parsed.items)) throw new Error("未找到 Bitwarden items 列表");
  return parsed;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isBitwardenLoginItem(item: BitwardenItem): item is BitwardenItem & { login: NonNullable<BitwardenItem["login"]> } {
  return Number(item.type) === 1 && Boolean(item.login);
}

function accountFingerprint(item: Pick<FavoriteItem, "title" | "content"> & { source_url?: string | null }) {
  return [item.source_url || "", item.content || "", item.title || ""]
    .map((part) => String(part).trim().toLowerCase())
    .join("|");
}

function validDateString(value: unknown) {
  if (typeof value !== "string") return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function buildBitwardenImportNote(uris: string[], folderName: string) {
  const lines = ["Imported from Bitwarden"];
  if (folderName) lines.push(`Folder: ${folderName}`);
  if (uris.length > 1) {
    lines.push("Additional URLs:");
    lines.push(...uris.slice(1));
  }
  return lines.join("\n");
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });
}

function loadVaultPassword() {
  try {
    const saved = localStorage.getItem("favorite-vault");
    if (!saved) return { password: "", expiresAt: null };
    const vaultData = JSON.parse(saved);
    if (vaultData.expiresAt && Date.now() > vaultData.expiresAt) {
      localStorage.removeItem("favorite-vault");
      return { password: "", expiresAt: null };
    }
    return { password: atob(vaultData.password), expiresAt: vaultData.expiresAt };
  } catch {
    localStorage.removeItem("favorite-vault");
    return { password: "", expiresAt: null };
  }
}

function compareItems(a: FavoriteItem, b: FavoriteItem, sortMode: SortMode, desc: boolean) {
  let aVal: string | number;
  let bVal: string | number;
  if (sortMode === "use_count") {
    aVal = a.use_count || 0;
    bVal = b.use_count || 0;
  } else if (sortMode === "title") {
    aVal = a.title.toLowerCase();
    bVal = b.title.toLowerCase();
  } else {
    aVal = new Date(a.updated_at || a.created_at).getTime();
    bVal = new Date(b.updated_at || b.created_at).getTime();
  }
  if (aVal === bVal) return 0;
  return desc ? (aVal > bVal ? -1 : 1) : (aVal < bVal ? -1 : 1);
}

function countTypes(items: FavoriteItem[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});
}

function tagCounts(items: FavoriteItem[]): [string, number][] {
  const map = new Map<string, number>();
  items.forEach((item) => item.tags.filter((tag) => !isSystemTag(tag)).forEach((tag) => map.set(tag, (map.get(tag) || 0) + 1)));
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"));
}

function categoryLabel(type: FavoriteType) {
  const labels: Partial<Record<FavoriteType, string>> = {
    link: "远程办公",
    text: "学习资料",
    image: "工作",
    code: "工具",
    json: "数据文档",
    account: "账号保险箱"
  };
  return labels[type] || TYPE_META[type].label;
}

function sortLabel(mode: SortMode) {
  if (mode === "use_count") return "使用次数";
  if (mode === "title") return "名称";
  return "更新时间";
}

function formatListDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDetailDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function isSystemTag(tag: string) {
  return tag === "__read_later" || tag === "__trash";
}

function isRunningAsPwa() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function normalizeLLMConfig(value: unknown): LLMConfig {
  if (!value || typeof value !== "object") return loadLLMConfig();
  const candidate = value as Partial<LLMConfig>;
  return {
    baseUrl: typeof candidate.baseUrl === "string" ? candidate.baseUrl : "",
    apiKey: typeof candidate.apiKey === "string" ? candidate.apiKey : "",
    model: typeof candidate.model === "string" ? candidate.model : ""
  };
}

function normalizePrompts(value: unknown): PromptConfig[] {
  if (!Array.isArray(value) || value.length === 0) return loadPrompts();
  return value
    .filter((prompt) => prompt && typeof prompt === "object")
    .map((prompt) => {
      const candidate = prompt as Partial<PromptConfig>;
      return {
        id: typeof candidate.id === "string" && candidate.id ? candidate.id : `prompt-${crypto.randomUUID()}`,
        name: typeof candidate.name === "string" && candidate.name.trim() ? candidate.name : "未命名",
        content: typeof candidate.content === "string" ? candidate.content : ""
      };
    });
}

function addTag(tags: string[], tag: string) {
  return Array.from(new Set([...(tags || []), tag].filter(Boolean)));
}

function safeFilename(value: string) {
  return String(value || "favorite").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
}

function makeLocalSummary(item: FavoriteItem) {
  const plain = [item.title, item.note, item.preview, item.content]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "这条收藏暂无可总结内容。";
  const firstSentence = plain.split(/[。！？.!?]/).find(Boolean) || plain;
  return truncate(firstSentence, 160);
}

function truncate(value: string, size: number) {
  return value.length > size ? `${value.slice(0, size)}...` : value;
}

function renderMarkdown(value: string) {
  const escaped = escapeHtml(value || "");
  const lines = escaped.split(/\r?\n/);
  const html: string[] = [];
  let inCode = false;
  let list: "ul" | "ol" | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!list) return;
    html.push(`</${list}>`);
    list = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^```/.test(line.trim())) {
      flushParagraph();
      closeList();
      html.push(inCode ? "</code></pre>" : "<pre><code>");
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      html.push(`${line}\n`);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      html.push(`<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`);
      continue;
    }
    const task = line.match(/^-\s+\[( |x)\]\s+(.+)$/i);
    if (task) {
      flushParagraph();
      if (list !== "ul") {
        closeList();
        list = "ul";
        html.push("<ul>");
      }
      html.push(`<li><input type="checkbox" disabled ${task[1].toLowerCase() === "x" ? "checked" : ""}> ${inlineMarkdown(task[2])}</li>`);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      if (list !== "ul") {
        closeList();
        list = "ul";
        html.push("<ul>");
      }
      html.push(`<li>${inlineMarkdown(bullet[1])}</li>`);
      continue;
    }
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (list !== "ol") {
        closeList();
        list = "ol";
        html.push("<ol>");
      }
      html.push(`<li>${inlineMarkdown(ordered[1])}</li>`);
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  closeList();
  if (inCode) html.push("</code></pre>");
  return html.join("");
}

function escapeHtml(value: string) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function inlineMarkdown(value: string) {
  return value
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function HomeIcon() {
  return <Archive />;
}
