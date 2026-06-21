import { ChevronDown, Grid3X3, List } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LLM_CONFIG_SETTING_KEY, PROMPTS_SETTING_KEY, TYPE_META } from "@/app/meta";
import type { AppUser, ChatMessage, FavoriteItem, FavoriteType, InlineAISelection, LLMConfig, ModalTab, PromptConfig, SortMode } from "@/app/types";
import {
  addTag,
  clearVaultPasswordCache,
  compareItems,
  countTypes,
  isRunningAsPwa,
  isSystemTag,
  loadVaultPassword,
  normalizeLLMConfig,
  normalizeLLMConfigs,
  normalizePrompts,
  safeFilename,
  saveVaultPassword,
  sortLabel,
  tagCounts,
  waitForPaint
} from "@/app/utils";
import { prepareBitwardenImport } from "@/app/bitwarden";
import {
  addLLMConfigRow as appendLLMConfigRow,
  addPromptRow as appendPromptRow,
  applyInlineAIEdit,
  applySavedPrompt,
  deleteLLMConfigRow as removeLLMConfigRow,
  deletePromptRow as removePromptRow,
  generateFavoriteSummary,
  isLLMReady,
  loadLLMConfig,
  loadLLMConfigs,
  loadPrompts,
  mergeLocalLLMApiKeys,
  readLLMConfigsFromForm,
  readPromptsFromForm,
  saveLLMConfigs,
  savePrompts,
  streamChat,
  withoutLLMApiKeys
} from "@/ai/index";
import { availableChatModels as buildAvailableChatModels, CHAT_MESSAGES_KEY, CHAT_MODEL_KEY, chatModelId as getChatModelId, loadChatMessages, saveChatMessages, selectedItemContextMessage, tagsFromChatContent, titleFromChatContent } from "@/ai/chat";
import { AIChatLauncher } from "@/components/ai-chat-launcher";
import { DetailPanel, ItemCard, LoginScreen, Sidebar, Topbar } from "@/components/app-layout";
import { ConfirmModal, CreateModal, InlineAIModal, SettingsModal, TagManagerModal, VaultModal } from "@/components/app-modals";
import { decryptSecret, encryptSecret } from "./crypto.js";
import { createBaseItem, deleteFavoriteFor, listFavoritesFor, loadSettingFor, saveFavoriteFor, saveSettingFor, uploadImageFor } from "./data.js";
import { localUser, setSessionUser, state as legacyState } from "./state.js";
import { classifyContent, domainFromUrl, makePreview, titleFromContent, withTimeout } from "./utils.js";

const LIST_BATCH_SIZE = 80;

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
  const [listVisibleCount, setListVisibleCount] = useState(LIST_BATCH_SIZE);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [favoritesListWidth, setFavoritesListWidth] = useState(420);
  const [activeWorkspace, setActiveWorkspace] = useState<"favorites" | "chat">("favorites");
  const [chatPopupOpen, setChatPopupOpen] = useState(false);
  const [chatPopupMinimized, setChatPopupMinimized] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const favoritesListScrollRef = useRef<HTMLDivElement>(null);
  const [status, setStatusValue] = useState("");
  const [toastStatus, setToastStatus] = useState("");
  const [quickInput, setQuickInput] = useState("");
  const [quickTitleDraft, setQuickTitleDraft] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
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
  const [accountSecretErrors, setAccountSecretErrors] = useState<Record<string, string>>({});
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatModelId, setChatModelId] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [isInstalledPwa, setIsInstalledPwa] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bitwardenFileInputRef = useRef<HTMLInputElement>(null);
  const statusToastTimer = useRef<number | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);

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

  useEffect(() => {
    if (!booted || !chatModelId) return;
    localStorage.setItem(CHAT_MODEL_KEY, chatModelId);
  }, [booted, chatModelId]);

  useEffect(() => {
    const models = buildAvailableChatModels(llmConfig, llmConfigs);
    if (!models.length) return;
    const activeIds = new Set(models.map(getChatModelId));
    if (!chatModelId || !activeIds.has(chatModelId)) {
      setChatModelId(getChatModelId(models[0]));
    }
  }, [chatModelId, llmConfig, llmConfigs]);

  useEffect(() => {
    setListVisibleCount(LIST_BATCH_SIZE);
    favoritesListScrollRef.current?.scrollTo({ top: 0 });
  }, [favoriteOnly, query, sortDesc, sortMode, specialFilter, tagFilter, typeFilter, viewMode]);

  useEffect(() => {
    function openChatWithShortcut(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || !event.shiftKey || event.key.toLowerCase() !== "j") return;
      event.preventDefault();
      openChatPopup();
    }

    window.addEventListener("keydown", openChatWithShortcut);
    return () => window.removeEventListener("keydown", openChatWithShortcut);
  }, []);

  function openChatPopup() {
    setActiveWorkspace("chat");
    setChatPopupOpen(true);
    setChatPopupMinimized(false);
  }

  async function boot() {
    setIsInstalledPwa(isRunningAsPwa());
    const savedVault = loadVaultPassword();
    const savedConfigSetting = loadLLMConfigs();
    const savedConfig = savedConfigSetting.items.find((item) => item.id === savedConfigSetting.activeId) || loadLLMConfig();
    const savedPrompts = loadPrompts();
    const savedChatModelId = localStorage.getItem(CHAT_MODEL_KEY) || savedConfig.id || savedConfig.model || "";
    const savedChatMessages = loadChatMessages();
    setVaultPasswordState(savedVault.password);
    setVaultExpiresAt(savedVault.expiresAt);
    setLlmConfig(savedConfig);
    setLlmConfigs(savedConfigSetting.items);
    setPrompts(savedPrompts);
    setChatModelId(savedChatModelId);
    setChatMessages(savedChatMessages);
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
      const nextConfigSetting = mergeLocalLLMApiKeys(normalizeLLMConfigs(await loadSettingFor(nextContext, LLM_CONFIG_SETTING_KEY, fallbackConfig)));
      const nextConfig = nextConfigSetting.items.find((item) => item.id === nextConfigSetting.activeId) || nextConfigSetting.items[0] || normalizeLLMConfig(fallbackConfig);
      const nextPrompts = normalizePrompts(await loadSettingFor(nextContext, PROMPTS_SETTING_KEY, fallbackPrompts));
      setLlmConfig(nextConfig);
      setLlmConfigs(nextConfigSetting.items);
      setPrompts(nextPrompts);
      saveLLMConfigs(nextConfigSetting);
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
  const gridVisibleItems = filteredItems.slice(0, listVisibleCount);
  const hasMoreGridItems = viewMode === "grid" && gridVisibleItems.length < filteredItems.length;
  const listVirtualizer = useVirtualizer({
    count: viewMode === "list" ? filteredItems.length : 0,
    getScrollElement: () => favoritesListScrollRef.current,
    estimateSize: () => 78,
    overscan: 8
  });
  const selectedAccountSecretError = selectedItem ? accountSecretErrors[selectedItem.id] || "" : "";
  const tags = useMemo(() => tagCounts(items), [items]);
  const typeCounts = useMemo(() => countTypes(items), [items]);
  const availableChatModels = useMemo(() => buildAvailableChatModels(llmConfig, llmConfigs), [llmConfig, llmConfigs]);
  const activeChatModel = availableChatModels.find((model) => getChatModelId(model) === chatModelId) || availableChatModels[0] || llmConfig;
  const quickInputPreview = useMemo(() => {
    const content = quickInput.trim();
    if (!content) return null;
    const type = classifyContent(content) as FavoriteType;
    return {
      type,
      typeLabel: TYPE_META[type].label,
      title: titleFromContent(content, type),
      domain: type === "link" ? domainFromUrl(content) || "" : "",
      preview: makePreview(content)
    };
  }, [quickInput]);
  const hasActiveFilters = Boolean(query.trim() || typeFilter !== "all" || favoriteOnly || tagFilter || specialFilter);

  function clearListFilters() {
    setQuery("");
    setTypeFilter("all");
    setFavoriteOnly(false);
    setTagFilter(null);
    setSpecialFilter(null);
  }

  function setAccountSecretError(itemId: string, message: string) {
    setAccountSecretErrors((current) => {
      const next = { ...current };
      if (message) next[itemId] = message;
      else delete next[itemId];
      return next;
    });
  }

  async function selectFavoriteItem(item: FavoriteItem) {
    setActiveWorkspace("favorites");
    setSelectedId(item.id);
    void markItemUsed(item);
    setPasswordVisible(false);
    setContentEditing(false);
    if (item.type === "account" && item.encrypted_secret && vaultPassword) {
      try {
        setRevealedSecret(await decryptSecret(vaultPassword, item.encrypted_secret));
        setAccountSecretError(item.id, "");
      } catch {
        setRevealedSecret(null);
        setAccountSecretError(item.id, "解密失败，主密码可能不匹配，或这条账号数据已损坏。请重新解锁保险箱后再试；如果仍失败，建议删除后重新创建或重新导入该账号。");
      }
    } else {
      setRevealedSecret(null);
    }
  }

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
    if (!content || quickSaving) return;
    setQuickSaving(true);
    try {
      const type = classifyContent(content) as FavoriteType;
      const item = createBaseItem({
        type,
        title: quickTitleDraft.trim() || titleFromContent(content, type),
        content,
        preview: makePreview(content),
        source_url: type === "link" ? content : null,
        domain: type === "link" ? domainFromUrl(content) : null
      }) as FavoriteItem;
      item.user_id = user.id;
      await saveFavoriteFor(context, item);
      setQuickInput("");
      setQuickTitleDraft("");
      setCreateModal(false);
      setModalTab("favorite");
      setStatus(`已保存为${TYPE_META[type].label}`);
      await refreshItems(context, item.id);
    } catch (error: any) {
      setStatus(`保存失败：${error.message}`);
    } finally {
      setQuickSaving(false);
    }
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
      const fileText = await file.text();

      setStatus("正在导入 Bitwarden，正在分析文件");
      await waitForPaint();

      const importResult = await prepareBitwardenImport({
        existingItems: items,
        fileText,
        userId: user.id,
        vaultPassword,
        onProgress: async ({ imported, processed, totalLoginItems }) => {
          setStatus(`正在导入 Bitwarden：${processed}/${totalLoginItems}，已新增 ${imported} 条`);
          await waitForPaint();
        }
      });

      let saved = 0;
      for (const importedItem of importResult.items) {
        await saveFavoriteFor(context, importedItem);
        saved += 1;
        if (saved === 1 || saved % 5 === 0 || saved === importResult.items.length) {
          setStatus(`正在保存 Bitwarden：${saved}/${importResult.items.length}`);
          await waitForPaint();
        }
      }

      setModalTab("favorite");
      setStatus(`Bitwarden 导入完成：新增 ${importResult.imported} 条，跳过 ${importResult.skipped} 条`);
      await refreshItems(context, importResult.firstImportedId || selectedId);
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
      if (selectedItem?.id) setAccountSecretError(selectedItem.id, "保险箱未解锁或主密码已过期，请重新输入主密码后再查看或复制密码。");
      return;
    }
    try {
      const secret = revealedSecret?.password ? revealedSecret : await decryptSecret(vaultPassword, selectedItem.encrypted_secret);
      if (!secret?.password) {
        setStatus("当前账号没有可复制的密码");
        return;
      }
      setRevealedSecret(secret);
      setAccountSecretError(selectedItem.id, "");
      await copyText(secret.password);
      await markItemUsed(selectedItem);
    } catch {
      setStatus("解密失败，请检查保险箱主密码");
      setAccountSecretError(selectedItem.id, "解密失败，主密码可能不匹配，或这条账号数据已损坏。请重新解锁保险箱后再试；如果仍失败，建议删除后重新创建或重新导入该账号。");
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
    if (selectedItem.encrypted_secret && !vaultPassword) {
      setAccountSecretError(selectedItem.id, "保险箱未解锁或主密码已过期，请重新输入主密码后再查看密码。");
      setVaultModal(true);
      setStatus("请先解锁保险箱");
      return;
    }
    if (!revealedSecret && selectedItem.encrypted_secret && vaultPassword) {
      try {
        setRevealedSecret(await decryptSecret(vaultPassword, selectedItem.encrypted_secret));
        setAccountSecretError(selectedItem.id, "");
      } catch {
        setStatus("解密失败，请检查保险箱主密码");
        setAccountSecretError(selectedItem.id, "解密失败，主密码可能不匹配，或这条账号数据已损坏。请重新解锁保险箱后再试；如果仍失败，建议删除后重新创建或重新导入该账号。");
        return;
      }
    }
    setPasswordVisible((value) => !value);
    await markItemUsed(selectedItem);
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setStatus("已复制到剪贴板");
  }

  async function sendChat(prompt: string, options: { includeSelectedItem: boolean }) {
    if (!isLLMReady(activeChatModel)) {
      setStatus("请先在设置中配置大模型");
      setSettingsModal(true);
      return;
    }

    const userMessage: ChatMessage = {
      id: `chat-${crypto.randomUUID()}`,
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString()
    };
    const assistantMessage: ChatMessage = {
      id: `chat-${crypto.randomUUID()}`,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString()
    };
    chatAbortRef.current?.abort("replace");
    const abortController = new AbortController();
    chatAbortRef.current = abortController;
    const startedMessages = [...chatMessages, userMessage, assistantMessage];
    setChatMessages(startedMessages);
    saveChatMessages(startedMessages);
    setChatLoading(true);
    setStatus("AI 正在回复");
    let assistantContent = "";
    let assistantFrame: number | null = null;

    function flushAssistantContent() {
      if (assistantFrame != null) {
        window.cancelAnimationFrame(assistantFrame);
        assistantFrame = null;
      }
      const nextContent = assistantContent;
      setChatMessages((current) => current.map((message) => (
        message.id === assistantMessage.id ? { ...message, content: nextContent } : message
      )));
    }

    function scheduleAssistantContent() {
      if (assistantFrame != null) return;
      assistantFrame = window.requestAnimationFrame(() => {
        assistantFrame = null;
        flushAssistantContent();
      });
    }

    const contextMessage = options.includeSelectedItem ? selectedItemContextMessage(selectedItem) : [];

    try {
      const history = [...chatMessages, userMessage].map((message) => ({ role: message.role, content: message.content }));
      await streamChat([...contextMessage, ...history], activeChatModel, (delta) => {
        assistantContent += delta;
        scheduleAssistantContent();
      }, abortController.signal);
      flushAssistantContent();
      saveChatMessages(startedMessages.map((message) => (
        message.id === assistantMessage.id ? { ...message, content: assistantContent.trim() || assistantContent } : message
      )));
      setStatus("AI 回复完成");
    } catch (error: any) {
      if (abortController.signal.aborted) {
        if (abortController.signal.reason === "clear") {
          return;
        }
        flushAssistantContent();
        saveChatMessages(startedMessages.map((message) => (
          message.id === assistantMessage.id ? { ...message, content: assistantContent } : message
        )));
        setStatus("AI 回复已停止");
        return;
      }
      const failedMessages = startedMessages.map((message) => (
        message.id === assistantMessage.id
          ? { ...message, content: assistantContent || `请求失败: ${error.message}` }
          : message
      ));
      if (assistantFrame != null) window.cancelAnimationFrame(assistantFrame);
      setChatMessages(failedMessages);
      saveChatMessages(failedMessages);
      setStatus(`AI 对话失败: ${error.message}`);
    } finally {
      if (assistantFrame != null) window.cancelAnimationFrame(assistantFrame);
      if (chatAbortRef.current === abortController) chatAbortRef.current = null;
      setChatLoading(false);
    }
  }

  function stopChat() {
    chatAbortRef.current?.abort("stop");
  }

  function clearChat() {
    chatAbortRef.current?.abort("clear");
    setChatMessages([]);
    localStorage.removeItem(CHAT_MESSAGES_KEY);
  }

  async function applyChatContent(content: string) {
    if (!selectedItem || !content.trim()) return;
    await updateSelected({ content: content.trim(), preview: makePreview(content) });
    setStatus("AI 结果已替换当前收藏内容");
  }

  async function appendChatNote(content: string) {
    if (!selectedItem || !content.trim()) return;
    const nextNote = [selectedItem.note || "", content.trim()].filter(Boolean).join("\n\n");
    await updateSelected({ note: nextNote });
    setStatus("AI 结果已追加到备注");
  }

  async function useChatAsTitle(content: string) {
    if (!selectedItem || !content.trim()) return;
    const title = titleFromChatContent(content);
    if (!title) return;
    await updateSelected({ title });
    setStatus("AI 结果已设为标题");
  }

  async function addTagsFromChat(content: string) {
    if (!selectedItem || !content.trim()) return;
    const candidates = tagsFromChatContent(content);
    const nextTags = candidates.reduce((tags, tag) => addTag(tags, tag), selectedItem.tags);
    await updateSelected({ tags: nextTags });
    setStatus(`已添加 ${Math.max(0, nextTags.length - selectedItem.tags.length)} 个标签`);
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
    saveVaultPassword(password, expiresAt);
    setVaultPasswordState(password);
    setVaultExpiresAt(expiresAt);
    setAccountSecretErrors({});
    setVaultModal(false);
    setStatus(`保险箱主密码已设置${expireTime === -1 ? "（本次会话不过期）" : ""}`);
  }

  function clearVaultPassword() {
    clearVaultPasswordCache();
    setVaultPasswordState("");
    setVaultExpiresAt(null);
    setRevealedSecret(null);
    setAccountSecretErrors({});
    setPasswordVisible(false);
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
    const nextConfigSetting = readLLMConfigsFromForm(form, llmConfigs, llmConfig);
    const nextConfigs = nextConfigSetting.items;
    const activeId = nextConfigSetting.activeId || nextConfigs[0]?.id || "";
    const nextConfig = nextConfigs.find((config) => config.id === activeId) || nextConfigs[0] || { id: "default", name: "默认模型", baseUrl: "", apiKey: "", model: "" };
    const nextPrompts = readPromptsFromForm(form, prompts);
    setLlmConfig(nextConfig);
    setLlmConfigs(nextConfigs);
    setPrompts(nextPrompts);
    saveLLMConfigs({ activeId: nextConfig.id, items: nextConfigs });
    savePrompts(nextPrompts);
    try {
      const syncConfigSetting = { activeId: nextConfig.id, items: nextConfigs.length ? nextConfigs : [nextConfig] };
      await saveSettingFor(context, LLM_CONFIG_SETTING_KEY, supabaseReady ? withoutLLMApiKeys(syncConfigSetting) : syncConfigSetting);
      await saveSettingFor(context, PROMPTS_SETTING_KEY, nextPrompts);
      setSettingsModal(false);
      setStatus(supabaseReady ? "设置已保存到 Supabase，API Key 仅保存在本地" : "设置已保存到本地");
    } catch (error: any) {
      setStatus(`设置保存失败：${error.message}`);
    }
  }

  function addLLMConfigRow() {
    setLlmConfigs((current) => appendLLMConfigRow(current, llmConfig));
  }

  function deleteLLMConfigRow(id?: string) {
    setLlmConfigs((current) => removeLLMConfigRow(current, llmConfig, id));
  }

  function addPromptRow() {
    setPrompts((current) => appendPromptRow(current));
  }

  function deletePromptRow(id: string) {
    setPrompts((current) => removePromptRow(current, id));
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
          setQuickTitleDraft("");
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
          activeWorkspace={activeWorkspace}
          onToggle={() => setSidebarCollapsed((value) => !value)}
          onChat={openChatPopup}
          onType={(type) => {
            setActiveWorkspace("favorites");
            setTypeFilter(type);
            setFavoriteOnly(false);
            setTagFilter(null);
            setSpecialFilter(null);
          }}
          onRecent={() => {
            setActiveWorkspace("favorites");
            setSpecialFilter("recent");
            setTypeFilter("all");
            setFavoriteOnly(false);
            setTagFilter(null);
          }}
          onFavorite={() => {
            setActiveWorkspace("favorites");
            setFavoriteOnly((value) => !value);
            setSpecialFilter(null);
          }}
          onTag={(tag) => {
            setActiveWorkspace("favorites");
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
            <ScrollArea viewportRef={favoritesListScrollRef} className="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]]:pr-1">
              {filteredItems.length ? (
                viewMode === "list" ? (
                  <div className="relative p-1" style={{ height: `${listVirtualizer.getTotalSize()}px` }}>
                    {listVirtualizer.getVirtualItems().map((virtualRow) => {
                      const item = filteredItems[virtualRow.index];
                      if (!item) return null;
                      return (
                        <div
                          key={item.id}
                          data-index={virtualRow.index}
                          ref={listVirtualizer.measureElement}
                          className="absolute left-0 top-0 w-full px-1 pb-0.5"
                          style={{ transform: `translateY(${virtualRow.start}px)` }}
                        >
                          <ItemCard
                            item={item}
                            selected={selectedItem?.id === item.id}
                            onSelect={() => void selectFavoriteItem(item)}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid gap-1 p-1 sm:grid-cols-2">
                    {gridVisibleItems.map((item) => (
                      <ItemCard
                        item={item}
                        key={item.id}
                        selected={selectedItem?.id === item.id}
                        onSelect={() => void selectFavoriteItem(item)}
                      />
                    ))}
                    {hasMoreGridItems ? (
                      <div className="grid gap-2 p-2 text-center text-xs text-muted-foreground sm:col-span-2">
                        <span>已显示 {gridVisibleItems.length} / {filteredItems.length}</span>
                        <Button variant="outline" size="sm" className="mx-auto" onClick={() => setListVisibleCount((count) => count + LIST_BATCH_SIZE)}>
                          加载更多
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )
              ) : (
                <div className="p-1">
                  <Card className="grid gap-3 p-6 text-center text-sm text-muted-foreground">
                    <span>{hasActiveFilters ? "没有匹配的收藏，试试清除筛选或换个关键词" : "还没有收藏，点击“创建”开始"}</span>
                    {hasActiveFilters ? (
                      <Button variant="outline" size="sm" className="mx-auto" onClick={clearListFilters}>清除筛选</Button>
                    ) : null}
                  </Card>
                </div>
              )}
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
            accountSecretError={selectedAccountSecretError}
            prompts={prompts}
            aiLoading={aiLoading}
            aiSummary={selectedItem ? aiSummaryById[selectedItem.id] : ""}
            aiSummaryVisible={aiSummaryVisible}
            aiSummaryExpanded={aiSummaryExpanded}
            inlineAISelection={inlineAISelection}
            onCreate={() => {
              setQuickTitleDraft("");
              setCreateModal(true);
            }}
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
            onOpenVault={() => setVaultModal(true)}
            onOpen={async (url, copyBeforeOpen) => {
              if (copyBeforeOpen) await copyText(copyBeforeOpen);
              if (selectedItem) await markItemUsed(selectedItem);
              window.open(url, "_blank", "noreferrer");
            }}
          />
      </div>
      <AIChatLauncher
        open={chatPopupOpen}
        minimized={chatPopupMinimized}
        messages={chatMessages}
        models={availableChatModels}
        activeModelId={chatModelId}
        selectedItem={selectedItem}
        busy={chatLoading}
        modelReady={isLLMReady(activeChatModel)}
        onMinimized={setChatPopupMinimized}
        onOpen={openChatPopup}
        onModel={setChatModelId}
        onSend={sendChat}
        onStop={stopChat}
        onClear={clearChat}
        onCopy={copyText}
        onApplyContent={applyChatContent}
        onAppendNote={appendChatNote}
        onUseAsTitle={useChatAsTitle}
        onAddTags={addTagsFromChat}
        onOpenSettings={() => setSettingsModal(true)}
        onClose={() => {
          setChatPopupOpen(false);
          setActiveWorkspace("favorites");
          setChatPopupMinimized(false);
        }}
      />
      {createModal ? (
        <CreateModal
          modalTab={modalTab}
          quickInput={quickInput}
          quickTitleDraft={quickTitleDraft}
          quickSaving={quickSaving}
          quickInputPreview={quickInputPreview}
          status={status}
          hasVaultPassword={Boolean(vaultPassword)}
          fileInputRef={fileInputRef}
          bitwardenFileInputRef={bitwardenFileInputRef}
          onTab={setModalTab}
          onQuickInput={setQuickInput}
          onQuickTitle={setQuickTitleDraft}
          onClose={() => {
            setCreateModal(false);
            setModalTab("favorite");
            setQuickTitleDraft("");
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
          configs={llmConfigs.length ? llmConfigs : [{ ...llmConfig, id: llmConfig.id || "default", name: llmConfig.name || "默认模型" }]}
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
      {toastStatus ? <Card className="fixed bottom-3 left-1/2 z-50 max-w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 px-3 py-2 text-xs text-muted-foreground shadow-md">{toastStatus}</Card> : null}
    </main>
    </TooltipProvider>
  );
}


