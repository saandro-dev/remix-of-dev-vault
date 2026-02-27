

# Plan: MCP v2.2 — Fix Critical Bug + Search Enhancement + usage_hint Field

## Findings from Agent Feedback

Three categories: a critical bug, a search weakness, and a missing metadata field.

### 1. CRITICAL BUG: `devvault_get` fails on slug input

**Root cause analysis:** The `get_vault_module` RPC declares `p_id uuid DEFAULT NULL`. When the agent passes a slug string as the `id` parameter (which is natural — bootstrap returns slugs), PostgreSQL rejects it with "invalid input syntax for type uuid". The MCP code in `get.ts` does separate `id` from `slug` correctly, but there is no guard: if the agent sends `{id: "edge-function-pipeline"}`, it passes that string directly to `p_id` which expects a UUID.

**Fix:** In `get.ts`, detect whether the `id` param is a valid UUID. If not, treat it as a slug automatically. This is the architecturally correct solution because it makes the tool resilient to how agents naturally use it.

### 2. Search returns 0 for valid queries like "evolution API integration"

**Root cause analysis:** The `query_vault_modules` RPC uses `plainto_tsquery()` which tokenizes strictly. "evolution API integration" becomes three separate tsvector tokens that must ALL match. If the module title is "Evolution API Client" and description uses different words, tsvector won't match. The search has zero ILIKE fallback.

**Fix:** Modify the `query_vault_modules` DB function to add an ILIKE fallback when tsvector returns no results. The ILIKE searches title, description, why_it_matters, and tags. This gives fuzzy coverage without external dependencies.

### 3. Missing `usage_hint` field

**Root cause:** The schema lacks a field that tells agents WHEN to use a module. `description` says WHAT it does, `why_it_matters` says WHY, but nothing says WHEN.

**Fix:** Add `usage_hint TEXT` column to `vault_modules`. Include it in tsvector triggers, all RPC functions, and MCP tools (ingest, update, get, search responses).

---

## Analise de Solucoes

### Solucao A: Fix only the slug bug in get.ts
- Manutenibilidade: 7/10
- Zero DT: 5/10 (search weakness and missing field remain)
- Arquitetura: 6/10
- Escalabilidade: 6/10
- Seguranca: 9/10
- **NOTA FINAL: 6.5/10**

### Solucao B: Fix slug bug + improve search RPC + add usage_hint field + update all tools
- Manutenibilidade: 10/10
- Zero DT: 10/10
- Arquitetura: 10/10
- Escalabilidade: 10/10
- Seguranca: 9.5/10
- **NOTA FINAL: 9.9/10**

### DECISAO: Solucao B (Nota 9.9)
Solucao A leaves known deficiencies in place. The protocol demands the best solution, not the fastest.

---

## Implementation Steps

### Step 1: Database Migration

Add `usage_hint` column and update all relevant DB functions:

```sql
-- 1. Add usage_hint column
ALTER TABLE vault_modules ADD COLUMN IF NOT EXISTS usage_hint TEXT;

-- 2. Update search vector triggers to include usage_hint
-- 3. Update query_vault_modules to add ILIKE fallback + return usage_hint
-- 4. Update get_vault_module to return usage_hint
-- 5. Update bootstrap_vault_context to order top_modules by saas_phase then updated_at
-- 6. Update get_visible_modules to return usage_hint
```

The `query_vault_modules` will be rewritten to:
- First try tsvector match (existing behavior)
- If zero results AND query is not null, fallback to ILIKE on title, description, why_it_matters, usage_hint, and tags
- Return `usage_hint` in all result sets

### Step 2: Fix `get.ts` — Auto-detect UUID vs Slug

```text
MODIFY  supabase/functions/_shared/mcp-tools/get.ts
```

Add UUID format validation. If `params.id` is provided but is not a valid UUID, automatically treat it as `params.slug`. This makes the tool resilient regardless of how agents call it.

### Step 3: Update `search.ts` — Include `usage_hint` in response hint

```text
MODIFY  supabase/functions/_shared/mcp-tools/search.ts
```

No logic change needed — the RPC already returns all columns. Just update the description to mention ILIKE fallback.

### Step 4: Update `ingest.ts` — Add `usage_hint` field

```text
MODIFY  supabase/functions/_shared/mcp-tools/ingest.ts
```

Add `usage_hint` to input schema, optional fields list, and add a warning if missing.

### Step 5: Update `update.ts` — Add `usage_hint` to allowed fields

```text
MODIFY  supabase/functions/_shared/mcp-tools/update.ts
```

Add `usage_hint` to `ALLOWED_UPDATE_FIELDS` and input schema.

### Step 6: Update `plan.md` — Document v2.2 changes

```text
MODIFY  .lovable/plan.md
```

Document the new column, the ILIKE fallback, the UUID auto-detection, and updated checklist.

### File Tree

```text
MODIFY  supabase/functions/_shared/mcp-tools/get.ts        (~95 lines)
MODIFY  supabase/functions/_shared/mcp-tools/search.ts      (~70 lines)
MODIFY  supabase/functions/_shared/mcp-tools/ingest.ts      (~125 lines)
MODIFY  supabase/functions/_shared/mcp-tools/update.ts      (~105 lines)
MODIFY  .lovable/plan.md
NEW     DB migration: add usage_hint + update RPCs
```

All files remain well under the 300-line limit.

