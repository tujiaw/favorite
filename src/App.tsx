import { ChevronDown, Grid3X3, List } from "lucide-react";
import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LLM_CONFIG_SETTING_KEY, PROMPTS_SETTING_KEY, TYPE_META } from "@/app/meta";
import type { AppUser, FavoriteItem, FavoriteType, InlineAISelection, LLMConfig, ModalTab, PromptConfig, SortMode } from "@/app/types";
import {
  accountFingerprint,
  addTag,
  buildBitwardenImportNote,
  compareItems,
  countTypes,
  isBitwardenLoginItem,
  isRunningAsPwa,
  isSystemTag,
  loadVaultPassword,
  normalizeLLMConfig,
  normalizeLLMConfigs,
  normalizePrompts,
  parseBitwardenExport,
  safeFilename,
  sortLabel,
  stringValue,
  tagCounts,
  validDateString,
  waitForPaint
} from "@/app/utils";
import { applyInlineAIEdit, applySavedPrompt, generateFavoriteSummary, isLLMReady, loadLLMConfig, loadLLMConfigs, loadPrompts, saveLLMConfigs, savePrompts } from "@/ai/index";
import { DetailPanel, ItemCard, LoginScreen, Sidebar, Topbar } from "@/components/app-layout";
import { ConfirmModal, CreateModal, InlineAIModal, SettingsModal, TagManagerModal, VaultModal } from "@/components/app-modals";
import { decryptSecret, encryptSecret } from "./crypto.js";
import { createBaseItem, deleteFavoriteFor, listFavoritesFor, loadSettingFor, saveFavoriteFor, saveSettingFor, uploadImageFor } from "./data.js";
import { localUser, setSessionUser, state as legacyState } from "./state.js";
import { classifyContent, domainFromUrl, makePreview, titleFromContent, withTimeout } from "./utils.js";

export function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<FavoriteType | "all">("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [specialFilter, setSpecialFilter] = useState<"recent" | null>(null);
  const [showAllTags, setShowAllTags] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [favoritesListWidth, setFavoritesListWidth] = useState(420);
  const workspaceRef = useRef<HTMLDivElement>(null);
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
  const [tagManagerModal, setTagManagerModal] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({ baseUrl: "", apiKey: "", model: "" });
  const [llmConfigs, setLlmConfigs] = useState<LLMConfig[]>([]);
  const [prompts, setPrompts] = useState<PromptConfig[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummaryVisible, setAiSummaryVisible] = useState(false);
  const [aiSummaryExpanded, setAiSummaryExpanded] = useState(false);
  const [aiSummaryById, setAiSummaryById] = useState<Record<string, string>>({});
  const [inlineAISelection, setInlineAISelection] = useState<InlineAISelection | null>(null);
  const [inlineAILoading, setInlineAILoading] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [isInstalledPwa, setIsInstalledPwa] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bitwardenFileInputRef = useRef<HTMLInputElement>(null);
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
    bridgeState.llmConfigs = llmConfigs;
    bridgeState.prompts = prompts;
  }, [items, llmConfig, llmConfigs, prompts, selectedId, supabase, supabaseReady, user, vaultExpiresAt, vaultPassword]);

  async function boot() {
    setIsInstalledPwa(isRunningAsPwa());
    const savedVault = loadVaultPassword();
    const savedConfigSetting = loadLLMConfigs();
    const savedConfig = savedConfigSetting.items.find((item) => item.id === savedConfigSetting.activeId) || loadLLMConfig();
    const savedPrompts = loadPrompts();
    setVaultPasswordState(savedVault.password);
    setVaultExpiresAt(savedVault.expiresAt);
    setLlmConfig(savedConfig);
    setLlmConfigs(savedConfigSetting.items);
    setPrompts(savedPrompts);
    const bridgeState = legacyState as any;
    bridgeState.llmConfig = savedConfig;
    bridgeState.llmConfigs = savedConfigSetting.items;
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
      const nextConfigSetting = normalizeLLMConfigs(await loadSettingFor(nextContext, LLM_CONFIG_SETTING_KEY, fallbackConfig));
      const nextConfig = nextConfigSetting.items.find((item) => item.id === nextConfigSetting.activeId) || nextConfigSetting.items[0] || normalizeLLMConfig(fallbackConfig);
      const nextPrompts = normalizePrompts(await loadSettingFor(nextContext, PROMPTS_SETTING_KEY, fallbackPrompts));
      setLlmConfig(nextConfig);
      setLlmConfigs(nextConfigSetting.items);
      setPrompts(nextPrompts);
      const bridgeState = legacyState as any;
      bridgeState.llmConfig = nextConfig;
      bridgeState.llmConfigs = nextConfigSetting.items;
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

  async function uploadEditorImage(file: File) {
    if (!user || !selectedItem) throw new Error("请先选择一条收藏");
    setStatus("正在上传图片");
    try {
      const imageId = crypto.randomUUID();
      const uploaded = await uploadImageFor(context, user.id, `${selectedItem.id}/${imageId}`, file);
      setStatus("图片已插入正文");
      return uploaded.publicUrl as string;
    } catch (error: any) {
      setStatus(`图片插入失败：${error.message}`);
      throw error;
    }
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

  async function markItemUsed(item: FavoriteItem) {
    const now = new Date().toISOString();
    const next = {
      ...item,
      last_used_at: now,
      use_count: (item.use_count || 0) + 1,
      updated_at: item.updated_at || now
    };
    setItems((current) => current.map((candidate) => (candidate.id === item.id ? next : candidate)));
    await saveFavoriteFor(context, next);
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

  async function renameTagEverywhere(oldTag: string, nextRaw: string) {
    const nextTag = nextRaw.trim();
    if (!oldTag || !nextTag || oldTag === nextTag) return;
    const now = new Date().toISOString();
    const changed = items
      .filter((item) => item.tags.includes(oldTag))
      .map((item) => ({
        ...item,
        tags: item.tags.reduce<string[]>((tags, tag) => addTag(tags, tag === oldTag ? nextTag : tag), []),
        updated_at: now
      }));
    if (!changed.length) return;
    setItems((current) => current.map((item) => changed.find((candidate) => candidate.id === item.id) || item));
    await Promise.all(changed.map((item) => saveFavoriteFor(context, item)));
    if (tagFilter === oldTag) setTagFilter(nextTag);
    setStatus(`已将标签“${oldTag}”重命名为“${nextTag}”`);
  }

  async function deleteTagEverywhere(tag: string) {
    if (!tag) return;
    const now = new Date().toISOString();
    const changed = items
      .filter((item) => item.tags.includes(tag))
      .map((item) => ({
        ...item,
        tags: item.tags.filter((candidate) => candidate !== tag),
        updated_at: now
      }));
    if (!changed.length) return;
    setItems((current) => current.map((item) => changed.find((candidate) => candidate.id === item.id) || item));
    await Promise.all(changed.map((item) => saveFavoriteFor(context, item)));
    if (tagFilter === tag) setTagFilter(null);
    setStatus(`已删除标签“${tag}”`);
  }

  function updateContentDraft(_value: string) {
    // Typing stays local to CodeMirror. Save is explicit via toolbar or Ctrl/Cmd+S.
  }

  async function commitContentDraft(value: string) {
    if (!selectedItem) return;
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
      await markItemUsed(selectedItem);
    } catch {
      setStatus("解密失败，请检查保险箱主密码");
    }
  }

  async function copyAccountUsername() {
    if (!selectedItem?.content) {
      setStatus("当前账号没有可复制的用户名");
      return;
    }
    await copyText(selectedItem.content);
    await markItemUsed(selectedItem);
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
    void markItemUsed(selectedItem);
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
    await markItemUsed(selectedItem);
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
    const nextConfigs = llmConfigs.map((config) => ({
      id: config.id || `llm-${crypto.randomUUID()}`,
      name: String(form.get(`llm-name-${config.id}`) || "").trim() || "未命名模型",
      baseUrl: String(form.get(`llm-baseUrl-${config.id}`) || "").trim(),
      apiKey: String(form.get(`llm-apiKey-${config.id}`) || "").trim(),
      model: String(form.get(`llm-model-${config.id}`) || "").trim()
    }));
    const activeId = String(form.get("activeLlmId") || nextConfigs[0]?.id || "");
    const nextConfig = nextConfigs.find((config) => config.id === activeId) || nextConfigs[0] || { id: "default", name: "默认模型", baseUrl: "", apiKey: "", model: "" };
    const nextPrompts = prompts.map((prompt) => ({
      id: prompt.id,
      name: String(form.get(`prompt-name-${prompt.id}`) || "").trim() || "未命名",
      content: String(form.get(`prompt-content-${prompt.id}`) || "").trim()
    }));
    setLlmConfig(nextConfig);
    setLlmConfigs(nextConfigs);
    setPrompts(nextPrompts);
    saveLLMConfigs({ activeId: nextConfig.id, items: nextConfigs });
    savePrompts(nextPrompts);
    try {
      await saveSettingFor(context, LLM_CONFIG_SETTING_KEY, { activeId: nextConfig.id, items: nextConfigs });
      await saveSettingFor(context, PROMPTS_SETTING_KEY, nextPrompts);
      setSettingsModal(false);
      setStatus(supabaseReady ? "设置已保存到 Supabase" : "设置已保存到本地");
    } catch (error: any) {
      setStatus(`设置保存失败：${error.message}`);
    }
  }

  function addLLMConfigRow() {
    setLlmConfigs((current) => [...current, { id: `llm-${crypto.randomUUID()}`, name: "新模型", baseUrl: "", apiKey: "", model: "" }]);
  }

  function deleteLLMConfigRow(id?: string) {
    if (!id) return;
    setLlmConfigs((current) => {
      const next = current.filter((config) => config.id !== id);
      return next.length ? next : [{ id: `llm-${crypto.randomUUID()}`, name: "默认模型", baseUrl: "", apiKey: "", model: "" }];
    });
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
      const summary = await generateFavoriteSummary(selectedItem, llmConfig);
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
    if (!isLLMReady(llmConfig)) {
      setStatus("请先在设置中配置大模型");
      setSettingsModal(true);
      return;
    }
    setAiLoading(true);
    setStatus(`正在执行：${prompt.name}`);
    try {
      await updateSelected(await applySavedPrompt(selectedItem, prompt, llmConfig));
      setStatus(`已应用：${prompt.name}`);
    } catch (error: any) {
      setStatus(`AI 处理失败：${error.message}`);
    } finally {
      setAiLoading(false);
    }
  }

  async function runInlineAI(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedItem || !inlineAISelection || selectedItem.id !== inlineAISelection.itemId) {
      setInlineAISelection(null);
      return;
    }
    if (!isLLMReady(llmConfig)) {
      setStatus("请先在设置中配置大模型");
      setSettingsModal(true);
      return;
    }
    const form = new FormData(event.currentTarget);
    const userPrompt = String(form.get("prompt") || "").trim();
    if (!userPrompt) return;
    setInlineAILoading(true);
    setStatus(inlineAISelection.selectedText ? "AI 正在替换选中文字" : "AI 正在生成插入内容");
    try {
      const result = await applyInlineAIEdit({
        item: selectedItem,
        selection: inlineAISelection,
        userPrompt,
        config: llmConfig
      });
      await updateSelected({ content: result.content, preview: result.preview });
      setInlineAISelection(null);
      setStatus(result.hasSelection ? "AI 已替换选中文字" : "AI 已插入到光标处");
    } catch (error: any) {
      setStatus(`AI 写入失败：${error.message}`);
    } finally {
      setInlineAILoading(false);
    }
  }

  if (!booted || isLoadingAuth) {
    return <main className="grid min-h-full place-items-center bg-background text-muted-foreground">正在连接 GitHub 登录...</main>;
  }

  if (!user) {
    return <LoginScreen onSignIn={signIn} />;
  }

  function resizeFavoritesList(event: ReactPointerEvent<HTMLButtonElement>) {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    event.preventDefault();
    const firstColumn = workspace.firstElementChild as HTMLElement | null;
    const workspaceBounds = workspace.getBoundingClientRect();
    const firstColumnWidth = firstColumn && getComputedStyle(firstColumn).display !== "none"
      ? firstColumn.getBoundingClientRect().width
      : 0;
    const handleWidth = 6;
    const minListWidth = 280;
    const maxListWidth = Math.max(minListWidth, workspaceBounds.width - firstColumnWidth - handleWidth - 320);
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function applyWidth(clientX: number) {
      const rawWidth = clientX - workspaceBounds.left - firstColumnWidth;
      setFavoritesListWidth(Math.max(minListWidth, Math.min(rawWidth, maxListWidth)));
    }

    function move(pointerEvent: PointerEvent) {
      applyWidth(pointerEvent.clientX);
    }

    function stop() {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    }

    applyWidth(event.clientX);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  }

  const workspaceGridClass = sidebarCollapsed
    ? "grid min-h-0 overflow-hidden grid-cols-[72px_var(--favorites-list-width)_6px_minmax(360px,1fr)] max-lg:grid-cols-[72px_var(--favorites-list-width)_6px_minmax(320px,1fr)] max-md:grid-cols-1 max-md:overflow-auto max-md:[&>aside:first-child]:hidden"
    : "grid min-h-0 overflow-hidden grid-cols-[clamp(220px,18vw,280px)_var(--favorites-list-width)_6px_minmax(360px,1fr)] max-xl:grid-cols-[clamp(200px,20vw,240px)_var(--favorites-list-width)_6px_minmax(320px,1fr)] max-lg:grid-cols-[var(--favorites-list-width)_6px_minmax(320px,1fr)] max-lg:[&>aside:first-child]:hidden max-md:grid-cols-1 max-md:overflow-auto";

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
      <div
        className={workspaceGridClass}
        ref={workspaceRef}
        style={{ "--favorites-list-width": `${favoritesListWidth}px` } as any}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          items={items}
          tags={tags}
          typeCounts={typeCounts}
          typeFilter={typeFilter}
          favoriteOnly={favoriteOnly}
          tagFilter={tagFilter}
          specialFilter={specialFilter}
          showAllTags={showAllTags}
          onToggle={() => setSidebarCollapsed((value) => !value)}
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
          onToggleTags={() => setShowAllTags((value) => !value)}
          onManageTags={() => setTagManagerModal(true)}
        />
        <section className="min-h-0 min-w-0 bg-background">
          <Card className="flex h-full flex-col rounded-none border-0 bg-card shadow-none">
            <CardHeader className="!flex flex-nowrap items-center justify-between gap-1 space-y-0 border-b px-1.5 py-0.5">
              <CardTitle className="shrink-0 whitespace-nowrap text-xs">全部收藏 <span className="text-xs text-muted-foreground">{filteredItems.length}</span></CardTitle>
              <div className="flex shrink-0 items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="h-6 gap-1 px-1.5 text-xs" />}>
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
                <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="size-6" title="列表视图" onClick={() => setViewMode("list")}><List className="size-3.5" /></Button>
                <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="size-6" title="网格视图" onClick={() => setViewMode("grid")}><Grid3X3 className="size-3.5" /></Button>
              </div>
            </CardHeader>
            <ScrollArea className="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]]:pr-1">
              <div className={viewMode === "grid" ? "grid gap-1 p-1 sm:grid-cols-2" : "grid gap-0.5 p-1"}>
                {filteredItems.length ? filteredItems.map((item) => (
                  <ItemCard
                    item={item}
                    key={item.id}
                    selected={selectedItem?.id === item.id}
                    onSelect={async () => {
                      setSelectedId(item.id);
                      void markItemUsed(item);
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
        <button
          type="button"
          className="group relative z-10 h-full min-h-0 cursor-col-resize touch-none bg-transparent outline-none max-md:hidden"
          aria-label="调整收藏列表宽度"
          title="拖动调整宽度"
          onPointerDown={resizeFavoritesList}
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors group-hover:bg-primary group-focus-visible:bg-primary" />
        </button>
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
          inlineAISelection={inlineAISelection}
          onCreate={() => setCreateModal(true)}
          onFavorite={() => selectedItem && updateSelected({ favorite: !selectedItem.favorite })}
          onCopy={async () => {
            if (!selectedItem) return;
            await copyText(selectedItem.content);
            await markItemUsed(selectedItem);
          }}
          onDelete={() => setDeleteConfirm(true)}
          onDuplicate={duplicateSelected}
          onExport={exportSelected}
          onTitle={(title) => updateSelected({ title })}
          onType={(type) => updateSelected({ type })}
          onAddTag={addTagToSelected}
          onRemoveTag={removeTagFromSelected}
          onContentDraft={updateContentDraft}
          onContentCommit={commitContentDraft}
          onInsertImage={uploadEditorImage}
          onToggleEdit={() => setContentEditing((value) => !value)}
          onRefreshAiSummary={refreshAiSummary}
          onRunAI={runAI}
          onOpenInlineAI={setInlineAISelection}
          onCloseAiSummary={() => setAiSummaryVisible(false)}
          onCopyAiSummary={() => selectedItem && copyText(aiSummaryById[selectedItem.id] || "")}
          onApplyAiSummary={() => selectedItem && aiSummaryById[selectedItem.id] && updateSelected({ content: aiSummaryById[selectedItem.id], preview: makePreview(aiSummaryById[selectedItem.id]) })}
          onToggleAiSummary={() => setAiSummaryExpanded((value) => !value)}
          onTogglePassword={togglePassword}
          onCopyUsername={copyAccountUsername}
          onCopyPassword={copyAccountPassword}
          onOpen={async (url, copyBeforeOpen) => {
            if (copyBeforeOpen) await copyText(copyBeforeOpen);
            if (selectedItem) await markItemUsed(selectedItem);
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
      {inlineAISelection ? (
        <InlineAIModal
          busy={inlineAILoading}
          hasSelection={inlineAISelection.start !== inlineAISelection.end}
          x={inlineAISelection.popupX}
          y={inlineAISelection.popupY}
          onClose={() => setInlineAISelection(null)}
          onSubmit={runInlineAI}
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
          configs={llmConfigs}
          prompts={prompts}
          status={status}
          onClose={() => setSettingsModal(false)}
          onSubmit={saveSettings}
          onAddConfig={addLLMConfigRow}
          onDeleteConfig={deleteLLMConfigRow}
          onAddPrompt={addPromptRow}
          onDeletePrompt={deletePromptRow}
        />
      ) : null}
      {tagManagerModal ? (
        <TagManagerModal
          tags={tags}
          onClose={() => setTagManagerModal(false)}
          onRename={renameTagEverywhere}
          onDelete={deleteTagEverywhere}
        />
      ) : null}
      {toastStatus ? <Card className="fixed bottom-3 right-4 z-50 px-3 py-2 text-xs text-muted-foreground shadow-md">{toastStatus}</Card> : null}
    </main>
    </TooltipProvider>
  );
}


