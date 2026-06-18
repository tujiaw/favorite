import { state } from "./state.js";
import { fileToDataUrl } from "./utils.js";

const STORAGE_KEY = "favorite-center-items";
const SETTINGS_STORAGE_KEY = "favorite-app-settings";

export function createBaseItem(input) {
  const now = new Date().toISOString();
  return {
    id: input.id || crypto.randomUUID(),
    user_id: state.user.id,
    type: input.type,
    title: input.title,
    content: input.content || "",
    source_url: input.source_url || null,
    domain: input.domain || null,
    preview: input.preview || "",
    tags: [],
    note: "",
    favorite: false,
    storage_path: input.storage_path || null,
    encrypted_secret: input.encrypted_secret || null,
    created_at: now,
    updated_at: now,
    last_used_at: null,
    use_count: 0
  };
}

export async function listFavorites() {
  return listFavoritesFor({
    supabaseReady: state.supabaseReady,
    supabase: state.supabase,
    user: state.user
  });
}

export async function listFavoritesFor(context) {
  if (context.supabaseReady) {
    const { data, error } = await context.supabase
      .from("favorites")
      .select("*")
      .eq("user_id", context.user.id)
      .order("updated_at", { ascending: false });
    if (error) {
      state.status = error.message;
      return [];
    }
    return data || [];
  }
  return readLocal()
    .filter((item) => item.user_id === context.user.id)
    .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
}

export async function saveFavorite(item) {
  return saveFavoriteFor({
    supabaseReady: state.supabaseReady,
    supabase: state.supabase
  }, item);
}

export async function saveFavoriteFor(context, item) {
  if (context.supabaseReady) {
    const { error } = await context.supabase.from("favorites").upsert(item);
    if (error) throw error;
    return;
  }
  const items = readLocal();
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index >= 0) items[index] = item;
  else items.unshift(item);
  writeLocal(items);
}

export async function deleteFavorite(id) {
  return deleteFavoriteFor({
    supabaseReady: state.supabaseReady,
    supabase: state.supabase
  }, id);
}

export async function deleteFavoriteFor(context, id) {
  if (context.supabaseReady) {
    const { error } = await context.supabase.from("favorites").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  writeLocal(readLocal().filter((item) => item.id !== id));
}

export async function uploadImage(userId, itemId, file) {
  return uploadImageFor({
    supabaseReady: state.supabaseReady,
    supabase: state.supabase
  }, userId, itemId, file);
}

export async function uploadImageFor(context, userId, itemId, file) {
  const extension = file.name.split(".").pop() || "png";
  const path = `${userId}/${itemId}/image.${extension}`;
  if (context.supabaseReady) {
    const { error } = await context.supabase.storage.from("favorite-images").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = context.supabase.storage.from("favorite-images").getPublicUrl(path);
    return { path, publicUrl: data.publicUrl };
  }
  return {
    path,
    publicUrl: await fileToDataUrl(file)
  };
}

/**
 * @param {any} context
 * @param {string} key
 * @param {any} fallback
 */
export async function loadSettingFor(context, key, fallback = null) {
  if (context.supabaseReady) {
    const { data, error } = await context.supabase
      .from("app_settings")
      .select("value")
      .eq("user_id", context.user.id)
      .eq("setting_key", key)
      .maybeSingle();
    if (error) throw error;
    return data?.value ?? fallback;
  }
  return readLocalSettings()[key] ?? fallback;
}

/**
 * @param {any} context
 * @param {string} key
 * @param {any} value
 */
export async function saveSettingFor(context, key, value) {
  if (context.supabaseReady) {
    const { error } = await context.supabase.from("app_settings").upsert({
      user_id: context.user.id,
      setting_key: key,
      value,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    return;
  }
  const settings = readLocalSettings();
  settings[key] = value;
  writeLocalSettings(settings);
}

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocal(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function readLocalSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeLocalSettings(settings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
