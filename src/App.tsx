import {
  Archive,
  Check,
  Clock,
  Code,
  Copy,
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
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Upload
} from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { loadLLMConfig, loadPrompts, runPrompt, saveLLMConfig, savePrompts } from "./ai.js";
import { decryptSecret, encryptSecret } from "./crypto.js";
import { createBaseItem, deleteFavoriteFor, listFavoritesFor, saveFavoriteFor, uploadImageFor } from "./data.js";
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

const TYPE_META: Record<FavoriteType | "all", { label: string; icon: typeof Sparkles }> = {
  all: { label: "全部", icon: Sparkles },
  link: { label: "链接", icon: Globe },
  text: { label: "文本", icon: FileText },
  image: { label: "图片", icon: Image },
  code: { label: "代码", icon: Code },
  json: { label: "JSON", icon: Code },
  account: { label: "账号", icon: KeyRound }
};

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
  const [status, setStatus] = useState("");
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
  const [sortMenu, setSortMenu] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("updated_at");
  const [sortDesc, setSortDesc] = useState(true);
  const [contentEditing, setContentEditing] = useState(false);
  const [moreMenu, setMoreMenu] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({ baseUrl: "", apiKey: "", model: "" });
  const [prompts, setPrompts] = useState<PromptConfig[]>([]);
  const [aiMenu, setAiMenu] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummaryVisible, setAiSummaryVisible] = useState(false);
  const [aiSummaryExpanded, setAiSummaryExpanded] = useState(false);
  const [aiSummaryById, setAiSummaryById] = useState<Record<string, string>>({});
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftTimers = useRef(new Map<string, number>());

  const context = useMemo(() => ({ supabaseReady, supabase, user }), [supabaseReady, supabase, user]);

  useEffect(() => {
    boot();
    window.addEventListener("beforeinstallprompt", captureInstallPrompt as EventListener);
    window.addEventListener("appinstalled", clearInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", clearInstallPrompt);
      draftTimers.current.forEach((timer) => window.clearTimeout(timer));
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
      setUser(local);
      setSupabaseReady(false);
      setBooted(true);
      setIsLoadingAuth(false);
      await refreshItems({ supabaseReady: false, supabase: null, user: local }, null);
      return;
    }

    const supabaseConfig = window.FAVORITE_SUPABASE;
    const ready = Boolean(supabaseConfig?.url && supabaseConfig?.anonKey);
    setSupabaseReady(ready);
    if (!ready) {
      const local = localUser();
      setUser(local);
      setBooted(true);
      setIsLoadingAuth(false);
      await refreshItems({ supabaseReady: false, supabase: null, user: local }, null);
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
        if (nextUser) await refreshItems({ supabaseReady: true, supabase: client, user: nextUser }, null);
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
      if (nextUser) await refreshItems({ supabaseReady: true, supabase: client, user: nextUser }, null);
    } catch (error) {
      console.error("Supabase SDK 加载失败:", error);
      const local = localUser();
      setSupabaseReady(false);
      setUser(local);
      setStatus("Supabase SDK 加载失败，已切换到本地模式");
      await refreshItems({ supabaseReady: false, supabase: null, user: local }, null);
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
    setMoreMenu(false);
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
    setMoreMenu(false);
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
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
    if (outcome !== "accepted") setStatus("已取消安装");
  }

  function saveSettings(event: FormEvent<HTMLFormElement>) {
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
    setSettingsModal(false);
    setStatus("设置已保存");
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
      setAiMenu(false);
    }
  }

  if (!booted || isLoadingAuth) {
    return <main className="login-screen"><p className="status">正在连接 GitHub 登录...</p></main>;
  }

  if (!user) {
    return <LoginScreen onSignIn={signIn} />;
  }

  return (
    <main className="app-shell">
      <Topbar
        user={user}
        query={query}
        hasVault={Boolean(vaultPassword)}
        installPromptEvent={installPromptEvent}
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
      <div className={`workspace ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
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
        <section className="content">
          <div className="conversation-panel">
            <div className="conversation-head">
              <h2>全部收藏 <span>{filteredItems.length}</span></h2>
              <div className="conversation-tools">
                <button className="sort-trigger" onClick={() => setSortMenu((value) => !value)}>{sortLabel(sortMode)} <Chevron /></button>
                <button className={`icon-button ${viewMode === "list" ? "active" : ""}`} title="列表视图" onClick={() => setViewMode("list")}><List /></button>
                <button className={`icon-button ${viewMode === "grid" ? "active" : ""}`} title="网格视图" onClick={() => setViewMode("grid")}><Grid3X3 /></button>
              </div>
              {sortMenu ? (
                <div className="sort-menu">
                  {(["updated_at", "use_count", "title"] as SortMode[]).map((mode) => (
                    <button key={mode} className={`sort-option ${sortMode === mode ? "active" : ""}`} onClick={() => {
                      if (sortMode === mode) setSortDesc((value) => !value);
                      else {
                        setSortMode(mode);
                        setSortDesc(true);
                      }
                      setSortMenu(false);
                    }}>
                      {sortMode === mode && sortDesc ? "↓" : "↑"} 按{sortLabel(mode)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="conversation-body">
              <div className={`item-list ${viewMode === "grid" ? "item-grid" : ""}`}>
                {filteredItems.length ? filteredItems.map((item) => (
                  <ItemCard
                    item={item}
                    key={item.id}
                    selected={selectedItem?.id === item.id}
                    onSelect={async () => {
                      setSelectedId(item.id);
                      setPasswordVisible(false);
                      setContentEditing(false);
                      setMoreMenu(false);
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
                )) : <div className="empty-list">{query.trim() ? "没有匹配的收藏，试试换个关键词" : "还没有收藏，点击“创建”开始"}</div>}
              </div>
            </div>
          </div>
        </section>
        <DetailPanel
          item={selectedItem}
          contentEditing={contentEditing}
          moreMenu={moreMenu}
          passwordVisible={passwordVisible}
          revealedSecret={revealedSecret}
          prompts={prompts}
          aiMenu={aiMenu}
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
          onToggleMore={() => setMoreMenu((value) => !value)}
          onToggleAiMenu={() => setAiMenu((value) => !value)}
          onRefreshAiSummary={refreshAiSummary}
          onRunAI={runAI}
          onCloseAiSummary={() => setAiSummaryVisible(false)}
          onCopyAiSummary={() => selectedItem && copyText(aiSummaryById[selectedItem.id] || "")}
          onApplyAiSummary={() => selectedItem && aiSummaryById[selectedItem.id] && updateSelected({ content: aiSummaryById[selectedItem.id], preview: makePreview(aiSummaryById[selectedItem.id]) })}
          onToggleAiSummary={() => setAiSummaryExpanded((value) => !value)}
          onTogglePassword={togglePassword}
          onOpen={(url) => window.open(url, "_blank", "noreferrer")}
        />
      </div>
      <p className="notebook-note">收藏中心提供的内容仅供个人整理与复用，敏感字段会在浏览器端加密。</p>
      {createModal ? (
        <CreateModal
          modalTab={modalTab}
          quickInput={quickInput}
          status={status}
          hasVaultPassword={Boolean(vaultPassword)}
          fileInputRef={fileInputRef}
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
      {status ? <p className="status-toast">{status}</p> : null}
    </main>
  );
}

function LoginScreen({ onSignIn }: { onSignIn: (provider: string) => void }) {
  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="brand">
          <div className="brand-mark"><Archive /></div>
          <div>
            <h1 className="brand-title">个人收藏中心</h1>
            <p className="brand-subtitle">登录后同步你的资料、图片和账号保险箱</p>
          </div>
        </div>
        <div className="login-actions">
          <button className="outline-button" onClick={() => onSignIn("github")}>GitHub 登录</button>
        </div>
      </section>
    </main>
  );
}

function Topbar(props: {
  user: AppUser;
  query: string;
  hasVault: boolean;
  installPromptEvent: any;
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
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <div className="brand-mark"><Archive /></div>
          <div>
            <h1 className="brand-title">个人收藏夹</h1>
            <p className="brand-subtitle">{subtitle}</p>
          </div>
        </div>
        <label className="global-search">
          <Search />
          <input placeholder="搜索收藏内容、标签、URL" value={props.query} onChange={(event) => props.onQuery(event.target.value)} />
          <kbd>⌘ K</kbd>
        </label>
        <div className="topbar-actions">
          <button className="create-notebook" onClick={props.onCreate}><Plus /> 收藏 <span className="button-divider"></span><Chevron /></button>
          {props.installPromptEvent ? <button className="install-button" onClick={props.onPromptInstall} title="安装到本地"><Grid3X3 /> 安装</button> : null}
          <button className="ai-top-button" onClick={props.onSettings}><Sparkles /> AI 智能整理</button>
          <button className="icon-button" title="刷新同步" onClick={props.onRefresh}><RefreshCw /></button>
          <button className={`icon-button ${props.hasVault ? "vault-active" : ""}`} title="保险箱" onClick={props.onOpenVault}><ShieldCheck /></button>
          <button className="icon-button" title="分享当前收藏" onClick={props.onShare}><Upload /></button>
          <button className="icon-button" title="快捷操作" onClick={props.onMenu}><Grid3X3 /></button>
          <span className="avatar" title={subtitle}>{(props.user.name || props.user.email || "用").slice(0, 1)}</span>
        </div>
        <button className="icon-button" title="退出登录" onClick={props.onSignOut}><LogOut /></button>
      </div>
    </header>
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
      <aside className="sidebar sidebar-collapsed">
        <section className="sources-panel collapsed-panel">
          <button className="icon-button compact" title="展开分类" onClick={props.onToggle}><PanelLeft /></button>
          <button className="icon-button compact" title="搜索" onClick={props.onToggle}><Search /></button>
          <button className="icon-button compact" title="分类" onClick={props.onToggle}><Sparkles /></button>
        </section>
      </aside>
    );
  }
  const favoriteCount = props.items.filter((item) => item.favorite).length;
  const recentCount = props.items.filter((item) => item.last_used_at).length;
  const activeOverview = !props.specialFilter && props.typeFilter === "all" && !props.favoriteOnly && !props.tagFilter;
  return (
    <aside className="sidebar">
      <section className="sources-panel">
        <div className="nav-list">
          <button className={`nav-button overview-button ${activeOverview ? "active" : ""}`} onClick={props.onOverview}><HomeIcon /><span>概览</span></button>
        </div>
        <div className="section-label">收藏管理</div>
        <div className="nav-list">
          <button className={`nav-button ${props.typeFilter === "all" && !props.favoriteOnly && !props.specialFilter ? "active" : ""}`} onClick={() => props.onType("all")}><Sparkles /><span>全部收藏</span><strong>{props.items.length}</strong></button>
          <button className={`nav-button ${props.specialFilter === "recent" ? "active" : ""}`} onClick={props.onRecent}><Clock /><span>最近使用</span><strong>{recentCount}</strong></button>
          <button className={`nav-button ${props.favoriteOnly ? "active" : ""}`} onClick={props.onFavorite}><Star /><span>星标收藏</span><strong>{favoriteCount}</strong></button>
        </div>
        <div className="section-label">分类</div>
        <div className="nav-list">
          {(["link", "text", "image", "code", "json"] as FavoriteType[]).map((type) => {
            const Icon = type === "link" ? Tag : TYPE_META[type].icon;
            return (
              <button className={`nav-button ${props.typeFilter === type ? "active" : ""}`} key={type} onClick={() => props.onType(type)}>
                <Icon /><span>{categoryLabel(type)}</span><strong>{props.typeCounts[type] || 0}</strong>
              </button>
            );
          })}
          <button className="nav-button nav-action" onClick={() => window.alert("新分类将在下一阶段迁移为可编辑标签管理")}><Plus /><span>新建分类</span></button>
        </div>
        <div className="section-label">标签</div>
        <div className="tag-cloud">
          {props.tags.length ? props.tags.slice(0, 8).map(([tag, count]) => (
            <button className={`tag-chip ${props.tagFilter === tag ? "active" : ""}`} key={tag} onClick={() => props.onTag(tag)}>{tag} <strong>{count}</strong></button>
          )) : <span className="muted-chip">暂无标签</span>}
          {props.tagFilter ? <button className="tag-chip clear" onClick={() => props.onTag(null)}>清除</button> : null}
        </div>
      </section>
    </aside>
  );
}

function ItemCard({ item, selected, onSelect }: { item: FavoriteItem; selected: boolean; onSelect: () => void }) {
  const Icon = TYPE_META[item.type]?.icon || FileText;
  return (
    <button className={`item-card ${selected ? "selected" : ""}`} onClick={onSelect}>
      <div className="item-main">
        <div className="item-title-row">
          <span className={`type-badge type-${item.type}`}><Icon /></span>
          <div className="min-w-0">
            <h2 className="item-title">{item.title} <span className="inline-type">{TYPE_META[item.type].label}</span></h2>
            <p className="item-preview">{item.preview || item.content}</p>
          </div>
        </div>
        {item.favorite ? <span className="favorite-star"><Star fill="currentColor" /></span> : null}
      </div>
      <div className="meta-row">
        {item.domain ? <span>{item.domain}</span> : null}
        {item.tags.filter((tag) => !isSystemTag(tag)).map((tag) => <span className="meta-tag" key={tag}>{tag}</span>)}
        <span>{formatListDate(item.last_used_at || item.created_at)}</span>
      </div>
    </button>
  );
}

function DetailPanel(props: {
  item: FavoriteItem | null;
  contentEditing: boolean;
  moreMenu: boolean;
  aiMenu: boolean;
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
  onToggleMore: () => void;
  onToggleAiMenu: () => void;
  onRefreshAiSummary: () => void;
  onRunAI: (promptId: string) => void;
  onCloseAiSummary: () => void;
  onCopyAiSummary: () => void;
  onApplyAiSummary: () => void;
  onToggleAiSummary: () => void;
  onTogglePassword: () => void;
  onOpen: (url: string) => void;
}) {
  if (!props.item) {
    return (
      <aside className="detail-panel">
        <div className="detail-scroll">
          <button className="add-note-button" onClick={props.onCreate}><FileText /> 创建收藏</button>
          <div className="detail-empty"><Eye /><p>选择一条收藏查看详情</p></div>
        </div>
      </aside>
    );
  }
  const item = props.item;
  if (item.type === "account") {
    return (
      <aside className="detail-panel">
        <div className="detail-scroll">
          <section className="vault-box">
            <div className="vault-title">
              <KeyRound /> {item.title}
              <button className="icon-button" style={{ marginLeft: "auto" }} onClick={props.onFavorite}><Heart fill={item.favorite ? "currentColor" : "none"} /></button>
            </div>
            <div className="account-fields">
              <div className="account-field account-url-field">
                <label className="field-label">网址</label>
                <div className="account-url-control">
                  <input className="field-value-input" value={item.source_url || ""} readOnly />
                  <button className="icon-button compact account-open-link" disabled={!item.source_url} onClick={() => item.source_url && props.onOpen(item.source_url)}><ExternalLink /></button>
                </div>
              </div>
              <div className="account-field">
                <label className="field-label">用户名</label>
                <input className="field-value-input" value={item.content} readOnly />
              </div>
              {item.encrypted_secret ? (
                <div className="account-field">
                  <label className="field-label">密码</label>
                  <div className="password-field">
                    <input className="password-input" type={props.passwordVisible ? "text" : "password"} value={props.revealedSecret?.password || "••••••••"} readOnly />
                    <button className="icon-button" onClick={props.onTogglePassword}>{props.passwordVisible ? <EyeOff /> : <Eye />}</button>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </aside>
    );
  }
  return (
    <aside className="detail-panel">
      <div className="detail-scroll">
        <div className="document-head">
          <div className="document-title-wrap">
            <input className="document-title-input" value={item.title} onChange={(event) => props.onTitle(event.target.value)} aria-label="标题" />
          </div>
          <div className="more-wrap">
            <button className="doc-head-button" onClick={props.onFavorite}><Star fill={item.favorite ? "currentColor" : "none"} /> 收藏</button>
            <button className="doc-head-icon" onClick={props.onToggleMore}><MoreVertical /></button>
            {props.moreMenu ? (
              <div className="more-menu">
                <button onClick={props.onDuplicate}><Copy /> 复制为新收藏</button>
                <button onClick={props.onExport}><ExternalLink /> 导出文本</button>
                <button onClick={props.onDelete}><Trash2 /> 删除</button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="document-tags-row">
          <select className="detail-type-select" value={item.type} onChange={(event) => props.onType(event.target.value as FavoriteType)} aria-label="类型">
            {(["link", "text", "image", "code", "json"] as FavoriteType[]).map((type) => (
              <option value={type} key={type}>{TYPE_META[type].label}</option>
            ))}
          </select>
          <div className="editable-tags">
            {item.tags.filter((tag) => !isSystemTag(tag)).map((tag) => (
              <span className="meta-pill tag-edit-chip" key={tag}>
                {tag}
                <button type="button" title={`移除标签 ${tag}`} onClick={() => props.onRemoveTag(tag)}>×</button>
              </span>
            ))}
            <input
              placeholder="+ 添加标签"
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
          </div>
          <div className="detail-toolbar document-tag-actions">
            <button className="toolbar-button" onClick={props.onToggleEdit}><Eye /> {props.contentEditing ? "预览" : "编辑"}</button>
            <button className="toolbar-button" onClick={props.onCopy}><Copy /> 复制</button>
            {item.type !== "image" ? (
              <div className="editor-ai-menu">
                <button className={`toolbar-button ai-button ${props.aiMenu ? "active" : ""}`} onClick={props.onToggleAiMenu}><Sparkles /> AI <Chevron /></button>
                {props.aiMenu ? (
                  <div className="ai-popover">
                    <button onClick={props.onRefreshAiSummary} disabled={props.aiLoading}>
                      <Sparkles /> AI 总结{props.aiLoading ? "…" : ""}
                    </button>
                    {props.prompts.map((prompt) => (
                      <button key={prompt.id} onClick={() => props.onRunAI(prompt.id)} disabled={props.aiLoading} title={prompt.name}>
                        <Sparkles /> {prompt.name}{props.aiLoading ? "…" : ""}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {item.source_url ? <a className="toolbar-button" href={item.source_url} target="_blank" rel="noreferrer"><ExternalLink /> 打开</a> : null}
          </div>
        </div>
        <div className="document-meta-row">
          <span><FileText /> 创建于 {formatDetailDate(item.created_at)}</span>
          <span><Clock /> 更新于 {formatDetailDate(item.updated_at || item.created_at)}</span>
          <span><ShieldCheck /> {item.encrypted_secret ? "已加密" : "未加密"}</span>
        </div>
        {item.type === "image" ? (
          <div className="image-preview"><img src={item.content} alt={item.title} /></div>
        ) : props.contentEditing ? (
          <div className="editor-card">
            <textarea className="textarea" value={item.content} onChange={(event) => props.onContentDraft(event.target.value)} onBlur={(event) => props.onContentCommit(event.target.value)} />
          </div>
        ) : (
          <div className="document-preview-card">
            <article className="markdown-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(item.content) }} />
          </div>
        )}
        <div className="document-footer">
          <span>共 {String(item.content || "").trim().length} 字</span>
          <span><Check /> 自动保存成功</span>
        </div>
        {props.aiSummaryVisible && props.aiSummary ? (
          <section className="ai-summary-card">
            <div className="ai-summary-head">
              <h3><Sparkles /> AI 总结</h3>
              <button className="icon-button compact" title="关闭 AI 总结" onClick={props.onCloseAiSummary}>×</button>
            </div>
            <p>{props.aiSummaryExpanded ? props.aiSummary : truncate(props.aiSummary, 120)}</p>
            <div>
              <span>由 AI 生成，可能不完全准确</span>
              <button className="ghost-button" onClick={props.onApplyAiSummary}><Check /> 应用覆盖</button>
              <button className="ghost-button" onClick={props.onCopyAiSummary}><Copy /> 复制</button>
              <button className="ghost-button" onClick={props.onToggleAiSummary}><List /> {props.aiSummaryExpanded ? "收起" : "展开"}</button>
              <button className="ghost-button" onClick={props.onRefreshAiSummary}><RefreshCw /> 重新生成</button>
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}

function CreateModal(props: {
  modalTab: ModalTab;
  quickInput: string;
  status: string;
  hasVaultPassword: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onTab: (tab: ModalTab) => void;
  onQuickInput: (value: string) => void;
  onClose: () => void;
  onSaveQuick: () => void;
  onPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onImage: (file?: File) => void;
  onOpenVault: () => void;
  onCreateAccount: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const isFavorite = props.modalTab === "favorite";
  return (
    <div className="modal-backdrop">
      <section className="create-modal modal-card">
        <div className="modal-header">
          <div className="tab-tabs">
            <button className={`tab-tab ${isFavorite ? "active" : ""}`} onClick={() => props.onTab("favorite")}><FileText /> 收藏</button>
            <button className={`tab-tab ${!isFavorite ? "active" : ""}`} onClick={() => props.onTab("account")}><KeyRound /> 账号</button>
          </div>
          <button className="icon-button" type="button" onClick={props.onClose}>×</button>
        </div>
        {isFavorite ? (
          <>
            <textarea
              className="textarea quick-input"
              placeholder="粘贴 URL、文本、代码、JSON，或直接粘贴图片。按 Ctrl/⌘ + Enter 保存。"
              value={props.quickInput}
              onChange={(event) => props.onQuickInput(event.target.value)}
              onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") props.onSaveQuick();
              }}
              onPaste={props.onPaste}
            />
            <div className="composer-actions source-modal-actions">
              <p className="status">{props.status}</p>
              <input className="hidden" type="file" accept="image/*" ref={props.fileInputRef} onChange={(event) => props.onImage(event.target.files?.[0])} />
              <button className="icon-button" title="添加图片" onClick={() => props.fileInputRef.current?.click()}><Image /></button>
              <button className="primary-button" onClick={props.onSaveQuick}><Plus /> 保存</button>
            </div>
          </>
        ) : !props.hasVaultPassword ? (
          <div className="vault-notice">
            <p>请先在右上角设置保险箱主密码</p>
            <button className="icon-button" onClick={props.onOpenVault}><ShieldCheck /></button>
          </div>
        ) : (
          <form onSubmit={props.onCreateAccount}>
            <div className="account-form">
              <input className="input" name="url" placeholder="URL" />
              <input className="input" name="username" placeholder="用户名" />
              <input className="input" name="password" placeholder="密码" type="password" required />
              <textarea className="textarea" name="note" placeholder="备注，可选" rows={2}></textarea>
            </div>
            <div className="modal-actions">
              <span className="status">敏感字段加密保存</span>
              <button type="submit" className="primary-button"><ShieldCheck /> 加密保存</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function VaultModal({ expiresAt, onClose, onSubmit, onClear }: {
  expiresAt: number | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <form className="modal-card vault-modal" onSubmit={onSubmit}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">保险箱设置</h2>
            <p className="modal-subtitle">设置主密码后，账号密码将被加密保存</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose}>×</button>
        </div>
        {expiresAt ? (
          <div className="vault-status">
            <div className="vault-status-icon"><ShieldCheck /></div>
            <div className="vault-status-copy">
              <strong>保险箱已启用</strong>
              <span>有效期至 {new Date(expiresAt).toLocaleString("zh-CN")}</span>
            </div>
            <button className="ghost-button danger-ghost" type="button" onClick={onClear}><Trash2 /> 清除</button>
          </div>
        ) : (
          <div className="vault-form">
            <input className="input" name="vaultPassword" placeholder="设置主密码，至少 8 位" type="password" required minLength={8} />
            <input className="input" name="confirmPassword" placeholder="确认主密码" type="password" required minLength={8} />
            <select className="input" name="expireTime">
              <option value="3600000">1小时后过期</option>
              <option value="86400000">1天后过期</option>
              <option value="604800000">7天后过期</option>
              <option value="2592000000">30天后过期</option>
              <option value="-1">永不过期</option>
            </select>
          </div>
        )}
        <div className="modal-actions">
          <span className="status">主密码仅保存在浏览器本地</span>
          {expiresAt ? <button className="outline-button" type="button" onClick={onClose}>关闭</button> : <button type="submit" className="primary-button"><Check /> 确认设置</button>}
        </div>
      </form>
    </div>
  );
}

function ConfirmModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card confirm-modal">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">确认删除</h2>
            <p className="modal-subtitle">此操作无法撤销</p>
          </div>
        </div>
        <div className="confirm-content"><p>确定要删除这条收藏吗？</p></div>
        <div className="modal-actions">
          <button className="outline-button" onClick={onCancel}>取消</button>
          <button className="danger-button" onClick={onConfirm}><Trash2 /> 确认删除</button>
        </div>
      </div>
    </div>
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
    <div className="modal-backdrop">
      <form className="modal-card settings-modal" onSubmit={onSubmit}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">设置</h2>
            <p className="modal-subtitle">配置大模型与提示词，所有信息仅保存在浏览器本地</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose}>×</button>
        </div>
        <div className="settings-section">
          <h3 className="settings-section-title">大模型配置</h3>
          <div className="settings-grid">
            <label className="settings-field span-2">
              <span>Base URL</span>
              <input className="input" name="baseUrl" placeholder="https://api.openai.com/v1" defaultValue={config.baseUrl} />
            </label>
            <label className="settings-field">
              <span>模型</span>
              <input className="input" name="model" placeholder="gpt-4o-mini" defaultValue={config.model} />
            </label>
            <label className="settings-field span-2">
              <span>API Key</span>
              <input className="input" name="apiKey" type="password" placeholder="sk-..." defaultValue={config.apiKey} />
            </label>
          </div>
          <p className="settings-hint">兼容 OpenAI 接口格式，自动拼接 <code>/chat/completions</code>。</p>
        </div>
        <div className="settings-section">
          <div className="settings-section-head">
            <h3 className="settings-section-title">提示词</h3>
            <button className="outline-button compact-button" type="button" onClick={onAddPrompt}><Plus /> 新增</button>
          </div>
          <div className="prompt-list">
            {prompts.map((prompt) => (
              <div className="prompt-item" key={prompt.id}>
                <div className="prompt-item-head">
                  <input className="input" name={`prompt-name-${prompt.id}`} defaultValue={prompt.name} placeholder="提示词名称" />
                  <button className="icon-button" type="button" onClick={() => onDeletePrompt(prompt.id)} title="删除"><Trash2 /></button>
                </div>
                <textarea className="textarea" name={`prompt-content-${prompt.id}`} defaultValue={prompt.content} placeholder="提示词内容，将拼接到正文之前"></textarea>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <span className="status">{status}</span>
          <button type="button" className="ghost-button" onClick={onClose}>取消</button>
          <button type="submit" className="primary-button"><Check /> 保存</button>
        </div>
      </form>
    </div>
  );
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

function Chevron() {
  return <span aria-hidden="true">⌄</span>;
}

function HomeIcon() {
  return <Archive />;
}
