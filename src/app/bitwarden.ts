import type { FavoriteItem } from "@/app/types";
import { encryptSecret } from "../crypto.js";
import { createBaseItem } from "../data.js";
import { domainFromUrl } from "../utils.js";
import {
  accountFingerprint,
  buildBitwardenImportNote,
  isBitwardenLoginItem,
  parseBitwardenExport,
  stringValue,
  validDateString
} from "./utils";

export type BitwardenImportProgress = {
  imported: number;
  processed: number;
  skipped: number;
  totalLoginItems: number;
};

export type BitwardenImportResult = BitwardenImportProgress & {
  firstImportedId: string | null;
  items: FavoriteItem[];
  totalItems: number;
};

export async function prepareBitwardenImport({
  existingItems,
  fileText,
  userId,
  vaultPassword,
  onProgress
}: {
  existingItems: FavoriteItem[];
  fileText: string;
  userId: string;
  vaultPassword: string;
  onProgress?: (progress: BitwardenImportProgress) => Promise<void> | void;
}): Promise<BitwardenImportResult> {
  const exportData = parseBitwardenExport(fileText);
  const totalItems = exportData.items?.length || 0;
  const loginItems = (exportData.items || []).filter(isBitwardenLoginItem);
  const folderNames = new Map(
    (exportData.folders || []).map((folder) => [stringValue(folder.id), stringValue(folder.name)] as const)
  );
  const existingKeys = new Set(
    existingItems.filter((item) => item.type === "account").map((item) => accountFingerprint(item))
  );
  const items: FavoriteItem[] = [];
  let imported = 0;
  let skipped = totalItems - loginItems.length;
  let processed = 0;
  let firstImportedId: string | null = null;

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

    importedItem.user_id = userId;
    importedItem.favorite = Boolean(bitwardenItem.favorite);
    importedItem.tags = ["Bitwarden", folderName].filter(Boolean);
    importedItem.note = buildBitwardenImportNote(uris, folderName);
    importedItem.created_at = validDateString(bitwardenItem.creationDate) || importedItem.created_at;
    importedItem.updated_at = validDateString(bitwardenItem.revisionDate) || importedItem.updated_at;

    existingKeys.add(duplicateKey);
    items.push(importedItem);
    imported += 1;
    if (!firstImportedId) firstImportedId = importedItem.id;

    if (processed === 1 || processed % 5 === 0 || processed === loginItems.length) {
      await onProgress?.({ imported, processed, skipped, totalLoginItems: loginItems.length });
    }
  }

  return {
    firstImportedId,
    imported,
    items,
    processed,
    skipped,
    totalItems,
    totalLoginItems: loginItems.length
  };
}
