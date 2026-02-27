
# MCP v2.2 — Implemented ✅

## Changes Applied

### 1. CRITICAL BUG FIX: `devvault_get` auto-detects UUID vs slug
- `get.ts` now validates if `params.id` matches UUID format
- If not a UUID, automatically treats it as `params.slug`
- Agents can now pass slugs from bootstrap directly to devvault_get

### 2. Search ILIKE fallback in `query_vault_modules`
- First tries tsvector full-text search (PT + EN)
- If zero results, falls back to ILIKE on title, description, why_it_matters, usage_hint, and tags
- "evolution API integration" now returns results via ILIKE

### 3. `usage_hint` field added everywhere
- Column `usage_hint TEXT` added to `vault_modules`
- Included in search vector triggers (PT + EN)
- Returned by: `query_vault_modules`, `get_vault_module`, `bootstrap_vault_context`, `get_visible_modules`
- Added to `vault_module_completeness` (now 11 fields, was 10)
- MCP tools updated: `devvault_ingest` (input + warning), `devvault_update` (allowed field), `devvault_search` (description)

### 4. Bootstrap ordering improved
- `top_modules` now ordered by `saas_phase NULLS LAST, updated_at DESC`
- `playbook_phases` and `top_modules` include `usage_hint`

### 5. MCP version bumped to 2.2.0

## File Changes
- `supabase/functions/_shared/mcp-tools/get.ts` — UUID auto-detection
- `supabase/functions/_shared/mcp-tools/search.ts` — Updated description
- `supabase/functions/_shared/mcp-tools/ingest.ts` — usage_hint field + warning
- `supabase/functions/_shared/mcp-tools/update.ts` — usage_hint in allowed fields
- `supabase/functions/devvault-mcp/index.ts` — Version 2.2.0
- DB: 8 functions updated, 1 column added
