export type FavoriteType = "link" | "text" | "image" | "code" | "json" | "account";
export type FavoriteItem = {
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
export type AppUser = { id: string; email: string; name: string };
export type SortMode = "updated_at" | "use_count" | "title";
export type ModalTab = "favorite" | "account";
export type LLMConfig = { baseUrl: string; apiKey: string; model: string };
export type PromptConfig = { id: string; name: string; content: string };
export type InlineAISelection = {
  itemId: string;
  start: number;
  end: number;
  selectedText: string;
  popupX?: number;
  popupY?: number;
};
export type BitwardenExport = {
  encrypted?: boolean;
  folders?: { id?: unknown; name?: unknown }[];
  items?: BitwardenItem[];
};
export type BitwardenItem = {
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

