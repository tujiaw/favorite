# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev      # Start local dev server on port 3000 with hot reload
npm run build    # Verify static app and build to dist/
```

The dev server generates `/config.js` on-the-fly from `.env.local` (or environment variables) and watches `index.html`, `app.js`, `styles.css`, `src/`, `manifest.webmanifest`, and `icon.svg` for live reload.

Build copies static files to `dist/` and embeds Supabase config into `dist/config.js`. Verification checks for required files, OAuth/crypto/upload behavior markers, and RLS policies in the schema.

## Architecture

This is a **zero-build static PWA** using ES modules directly in the browser — no bundlers, no npm install. The browser fetches `@supabase/supabase-js@2` from esm.sh at runtime.

**Entry points:**
- `app.js` - Installs icon support and starts the app
- `src/controller.js` - App boot, render loop, event binding, user actions
- `src/state.js` - Global runtime state (user, items, filters, modals, vault)

**Data layer (`src/data.js`):**
- `listFavorites()` / `saveFavorite()` / `deleteFavorite()` - Abstract over Supabase or localStorage
- `createBaseItem(input)` - Factory for new items with timestamps
- `uploadImage(userId, itemId, file)` - Supabase Storage or base64 data URL

**Security (`src/crypto.js`):**
- `encryptSecret(password, payload)` - AES-GCM encryption with PBKDF2 key derivation (210k iterations)
- `decryptSecret(password, encrypted)` - Decrypt vault secrets
- Used only for account record sensitive fields (password, recovery codes, private notes)

**Templates (`src/templates.js`):**
- Pure function templates returning HTML strings
- All user input goes through `escapeHtml()` / `escapeAttr()` before rendering

**Utilities (`src/utils.js`):**
- `classifyContent(value)` - Auto-detects link/json/code/text types
- `domainFromUrl()`, `makePreview()`, `titleFromContent()`
- `escapeHtml()`, `escapeAttr()` - XSS protection

## Content Types

Six item types defined in `src/constants.js`:
- `link` - URLs (detected by `https?://` prefix)
- `text` - Plain text notes
- `image` - Images uploaded to Supabase Storage (`favorite-images` bucket) or base64
- `code` - Code snippets (detected by common patterns: `function`, `const`, `class`, etc.)
- `json` - JSON content (detected by `JSON.parse()`)
- `account` - Encrypted vault records

## Schema (Supabase)

`favorites` table stores all item types. Key fields:
- `encrypted_secret` (jsonb) - Stores encrypted vault data for accounts
- `storage_path` - Supabase Storage path for images
- RLS policies restrict all operations to `auth.uid() = user_id`
- Storage policies use foldername isolation: `{user_id}/{item_id}/image.ext`

Execute `supabase/schema.sql` to set up tables, RLS, storage bucket, and policies.

## Local Demo Mode

When Supabase is not configured (or via `?demo=1` query param), the app runs in local mode with:
- `localStorage` persistence instead of Supabase
- Mock user object from `localUser()`
- Base64 images instead of storage uploads

## Vault Encryption Flow

Account records use a master password set by the user:
1. User creates account record → sets master password
2. `crypto.deriveKey(password, salt)` with 210k PBKDF2 iterations
3. Sensitive fields encrypted client-side with AES-GCM
4. Ciphertext stored in `encrypted_secret` column
5. On view, user re-enters password to decrypt

Master password is never sent to Supabase — only the encrypted blob.
