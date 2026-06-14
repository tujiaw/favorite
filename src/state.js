export const state = {
  user: null,
  items: [],
  selectedId: null,
  query: "",
  typeFilter: "all",
  favoriteOnly: false,
  tagFilter: null,
  sidebarCollapsed: false,
  status: "准备收藏你的下一段资料",
  quickInput: "",
  sourceModal: false,
  accountModal: false,
  vaultPassword: "",
  vaultExpiresAt: null,
  revealedSecret: null,
  passwordVisible: false,
  supabase: null,
  supabaseReady: false,
  isLoadingAuth: true,
  booted: false,
  authSubscription: null,
  createModal: false,
  modalTab: "favorite",
  vaultModal: false,
  deleteConfirm: false
};

export function setSessionUser(user) {
  state.user = user
    ? {
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.name || user.email || "已登录用户"
      }
    : null;
}

export function localUser() {
  return { id: "local-user", email: "local@favorite.app", name: "本地模式" };
}
