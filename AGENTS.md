# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev      # Start local dev server on port 3000 with hot reload
npm run typecheck # Run TypeScript checks
npm run build    # Verify static app and build to dist/
```

The dev server is Vite. It serves `/config.js` from the project root for local runtime Supabase config and serves PWA assets from `public/`.

Build runs the project verifier, uses Vite to create `dist/`, then writes environment-derived Supabase config into `dist/config.js`. Verification checks for required files, OAuth/crypto/upload behavior markers, and RLS policies in the schema.

## Architecture

This is a **Vite + React + TypeScript + Tailwind CSS + shadcn/ui static PWA**. The browser still fetches `@supabase/supabase-js@2` from esm.sh at runtime so Supabase remains environment-configurable.

**Entry points:**
- `src/main.tsx` - React browser entry, style import, service worker registration
- `src/App.tsx` - App boot, state management, React components, user actions
- `src/state.js` - Global runtime state (user, items, filters, modals, vault)

**Data layer (`src/data.js`):**
- `listFavorites()` / `saveFavorite()` / `deleteFavorite()` - Abstract over Supabase or localStorage
- `createBaseItem(input)` - Factory for new items with timestamps
- `uploadImage(userId, itemId, file)` - Supabase Storage or base64 data URL

**Security (`src/crypto.js`):**
- `encryptSecret(password, payload)` - AES-GCM encryption with PBKDF2 key derivation (210k iterations)
- `decryptSecret(password, encrypted)` - Decrypt vault secrets
- Used only for account record sensitive fields (password, recovery codes, private notes)

**UI (`src/App.tsx` + `src/styles.css`):**
- React components own layout, modals, filters, vault, item detail, and AI settings
- Prefer shadcn/ui primitives from `src/components/ui/` for alert dialogs, badges, buttons, button groups, cards, command palettes, dialogs, dropdown menus, inputs, input groups, labels, scroll areas, selects, separators, tabs, textareas, and tooltips
- Theme support lives in `src/components/theme-provider.tsx` and `src/components/theme-toggle.tsx`, with light/dark tokens in `src/styles.css`
- Avoid app-specific CSS files and custom control classes; use shadcn/ui primitives first and Tailwind utility classes only for business layout.

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
