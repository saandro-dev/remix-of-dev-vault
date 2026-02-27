

# Audit: Manus Admin Panel v2 Plan

## Verdict: PLAN WITH STRUCTURAL FLAWS — Requires Corrections

---

## Flaws Identified

### CRITICAL 1: `dashboard-stats` Already Exists (Different Purpose)
The plan proposes creating `supabase/functions/dashboard-stats/index.ts` for admin health metrics. This file **already exists** and serves the **user's personal dashboard** (projects count, modules count, etc.). Overwriting it would break the existing user dashboard.

**Fix:** Add an `admin-stats` action to `admin-crud/index.ts` instead. All admin operations belong in one Edge Function.

### CRITICAL 2: No CORS Handling
The proposed `dashboard-stats` code returns raw `new Response(...)` without using the established `handleCorsV2`, `createSuccessResponse`, and `createErrorResponse` helpers. This would cause CORS failures in the browser.

**Fix:** Moot — we use `admin-crud` which already has CORS.

### MEDIUM 1: Hardcoded Portuguese Strings
The frontend examples use hardcoded PT strings ("Total de Usuarios", "Carregando..."). The project uses i18n throughout.

**Fix:** All strings via `t()` with proper i18n keys.

### MEDIUM 2: Foreign Key Join on `profiles` Won't Work
The `list-api-keys` action uses `.select("..., profiles ( id, display_name )")` on `devvault_api_keys`. There is **no foreign key** from `devvault_api_keys.user_id` to `profiles.id` — the schema confirms this. The join will fail silently or error.

**Fix:** Fetch profiles separately and merge via Map (same pattern as `list-users`).

### LOW 1: `revoke-api-key` Already Exists as Standalone Function
`supabase/functions/revoke-api-key/index.ts` already exists. Adding a duplicate `revoke-api-key` action in `admin-crud` creates confusion.

**Fix:** The admin version should be a distinct action name (`admin-revoke-api-key`) with explicit admin/owner role check, separate from the user's own revoke flow.

---

## Corrected Implementation Plan

### Architecture: Everything in `admin-crud`

All 5 new actions go into `admin-crud/index.ts`:

| Action | Role Required | Description |
|--------|--------------|-------------|
| `admin-stats` | admin | System health metrics (counts across all tables) |
| `list-api-keys` | admin | All API keys with owner info |
| `admin-revoke-api-key` | owner | Force-revoke any user's API key |
| `list-global-modules` | admin | All modules with `visibility = 'global'` |
| `unpublish-module` | admin | Set module visibility back to `private` |

### Step 1: Backend — Add 5 actions to `admin-crud/index.ts`

**`admin-stats`:** Parallel count queries for profiles, vault_modules, vault_modules (global), devvault_api_keys (active), devvault_api_audit_log (24h), bugs (open), projects, vault_module_shares.

**`list-api-keys`:** Fetch all devvault_api_keys + fetch all profiles, merge via Map (no FK join).

**`admin-revoke-api-key`:** Owner-only. Update `revoked_at` on target key.

**`list-global-modules`:** Fetch vault_modules where visibility = 'global', fetch profiles, merge.

**`unpublish-module`:** Admin+. Update visibility to 'private' on target module.

### Step 2: Frontend — 3 New Tab Components

**`SystemHealthTab.tsx`:** Grid of stat cards using recharts-style cards. Fetches `admin-stats` action. 8 metric cards.

**`ApiMonitorTab.tsx`:** Table of all API keys with owner name, prefix, status badge (active/revoked), created date, last used. Owner-only "Revoke" action button.

**`GlobalModerationTab.tsx`:** Table of global modules with title (link to module), author, domain badge, created date. Admin "Unpublish" action with confirmation dialog.

### Step 3: Frontend — Refactor `AdminPage.tsx`

Replace flat layout with `Tabs` component:
- Tab 1: "Users & Roles" (existing `UsersTable` + `RoleChangeDialog` inside `AdminProvider`)
- Tab 2: "System Health" (`SystemHealthTab`)
- Tab 3: "API Monitor" (`ApiMonitorTab`)
- Tab 4: "Global Moderation" (`GlobalModerationTab`)

### Step 4: i18n — Add Keys

Add all new keys under `admin.*` namespace in both `en.json` and `pt-BR.json`.

### Files

```text
MODIFY  supabase/functions/admin-crud/index.ts  (5 new actions)
CREATE  src/modules/admin/components/SystemHealthTab.tsx
CREATE  src/modules/admin/components/ApiMonitorTab.tsx
CREATE  src/modules/admin/components/GlobalModerationTab.tsx
MODIFY  src/modules/admin/pages/AdminPage.tsx  (Tabs layout)
MODIFY  src/i18n/locales/en.json
MODIFY  src/i18n/locales/pt-BR.json
```

