

# Audit Report: 3-Layer Visibility System

## Status: NOT A TOTAL SUCCESS -- 4 Violations Found

---

## What PASSED

| Component | Status |
|---|---|
| Migration: enum, column, shares table, 6 SQL functions, RPC, RLS, drop is_public | PASS |
| `vault-crud`: list (RPC), get (access control), create/update/delete (visibility), share/unshare/list_shares | PASS |
| `vault-ingest`: visibility field, backward compat (is_public → global) | PASS |
| `global-search`: uses `domain` (not `category`), visibility filter | PASS |
| Frontend types: `VisibilityLevel`, `VaultScope`, no `is_public`, no `VaultCategory` | PASS |
| `useVaultModules`: scope param, RPC-based listing | PASS |
| `useModuleShares`: share/unshare/list hooks | PASS |
| Navigation: 3 vault items (My Modules, Shared with Me, Global Vault) | PASS |
| Routes: `/vault`, `/vault/shared`, `/vault/global` | PASS |
| CreateModuleDialog: RadioGroup with 3 visibility options | PASS |
| EditModuleSheet: RadioGroup visibility control | PASS |
| VaultListPage: scope derived from route, visibility badges | PASS |
| VaultDetailPage: visibility badge, owner-only controls | PASS |
| i18n: visibility keys in en.json + pt-BR.json | PASS |
| Rule 5.5: zero `supabase.from()` in frontend | PASS |
| Rule 5.4: all comments in English | PASS |
| `constants.ts`: cleaned, no dead code | PASS |

---

## What FAILED

### CRITICAL 1: Missing RPC `get_user_id_by_email`

**File:** `vault-crud/index.ts` line 206

The `share` action calls `client.rpc("get_user_id_by_email", { p_email: email })` but this function **does not exist** in the database. The DB functions list confirms no such RPC. Sharing will fail with a 500 error at runtime.

**Fix:** Create a `SECURITY DEFINER` function `get_user_id_by_email(p_email text)` that queries `auth.users` and returns the user `id`. This must be a SQL migration.

### CRITICAL 2: Missing `ShareModuleDialog` Component

The plan listed `CREATE src/modules/vault/components/ShareModuleDialog.tsx` but the file was **never created**. The `VaultDetailPage` has no "Share" button. The sharing UI is incomplete -- hooks exist (`useModuleShares`, `useShareModule`, `useUnshareModule`) but no UI consumes them.

**Fix:** Create `ShareModuleDialog.tsx` and integrate it into `VaultDetailPage` with a "Share" button visible only to module owners.

### MEDIUM 1: `apiReference.ts` Still References `is_public` and `category`

**File:** `src/modules/docs/constants/apiReference.ts`
- Line 108: param `is_public` (boolean) -- should be `visibility` (string enum)
- Line 77: param `category` -- should be `domain`
- Line 127: response body shows `category: "frontend"` -- should be `domain`
- Line 220-223: cURL example uses `"category": "frontend"` and `"is_public": false`
- All 3 code examples use `category` instead of `domain`

**Fix:** Replace all `is_public` references with `visibility` param, replace all `category` with `domain`, update response bodies and code examples.

### LOW 1: `.lovable/plan.md` Not Updated for Implementation Results

The plan still shows the **pre-implementation** audit. Should be updated to reflect the actual completed implementation status.

**Fix:** Update `.lovable/plan.md` to document the completed 3-layer visibility system.

---

## Remediation Plan

### Step 1: SQL Migration -- Create `get_user_id_by_email` RPC
```sql
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
  RETURNS uuid
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth'
AS $$
  SELECT id FROM auth.users WHERE email = lower(p_email) LIMIT 1;
$$;
```

### Step 2: Create `ShareModuleDialog.tsx`
- Email input + "Share" button
- List of current shares with "Remove" button for each
- Uses `useModuleShares`, `useShareModule`, `useUnshareModule`
- Add i18n keys: `share.title`, `share.emailPlaceholder`, `share.shareButton`, `share.noShares`, `share.remove`

### Step 3: Integrate Share button into `VaultDetailPage`
- Add "Share" button next to Edit/Delete (owner-only)
- Open `ShareModuleDialog` on click

### Step 4: Update `apiReference.ts`
- Replace `is_public` param with `visibility` (type `string`, constraints `"private" | "shared" | "global"`)
- Replace all `category` references with `domain`
- Update response bodies and code examples

### Step 5: Update `.lovable/plan.md`
- Document completed 3-layer visibility system

### Files to modify/create:
```text
CREATE  supabase/migrations/XXXX_get_user_id_by_email.sql
CREATE  src/modules/vault/components/ShareModuleDialog.tsx
MODIFY  src/modules/vault/pages/VaultDetailPage.tsx
MODIFY  src/modules/docs/constants/apiReference.ts
MODIFY  src/i18n/locales/en.json
MODIFY  src/i18n/locales/pt-BR.json
MODIFY  .lovable/plan.md
```

