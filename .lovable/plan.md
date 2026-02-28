

## DevVault MCP Server — v4.1.0

### Status: ✅ Complete (Audit v4.1 passed)

### Architecture

- **Edge Function:** `devvault-mcp` (Hono + mcp-lite)
- **Auth:** API key via `X-DevVault-Key` header → `validate_devvault_api_key` RPC
- **DB access:** `service_role` client (bypasses RLS)
- **Tools:** 16 total

### Tool Registry (16 tools)

| # | Tool | File | Description |
|---|------|------|-------------|
| 1 | `devvault_bootstrap` | `bootstrap.ts` | Full vault context for agent onboarding |
| 2 | `devvault_search` | `search.ts` | Bilingual full-text search (PT + EN) |
| 3 | `devvault_get` | `get.ts` | Get module by UUID or slug (includes changelog + completeness) |
| 4 | `devvault_list` | `list.ts` | List modules with filters |
| 5 | `devvault_domains` | `domains.ts` | List available domains |
| 6 | `devvault_ingest` | `ingest.ts` | Create new modules (single or batch) |
| 7 | `devvault_update` | `update.ts` | Update existing module fields |
| 8 | `devvault_get_group` | `get-group.ts` | Get all modules in a group with deps |
| 9 | `devvault_validate` | `validate.ts` | Change validation_status |
| 10 | `devvault_delete` | `delete.ts` | Delete a module |
| 11 | `devvault_diagnose` | `diagnose.ts` | Problem-based search via solves_problems |
| 12 | `devvault_report_bug` | `report-bug.ts` | Report knowledge gap |
| 13 | `devvault_resolve_bug` | `resolve-bug.ts` | Resolve knowledge gap |
| 14 | `devvault_report_success` | `report-success.ts` | Record successful implementation |
| 15 | `devvault_export_tree` | `export-tree.ts` | Export module group as dependency tree |
| 16 | `devvault_check_updates` | `check-updates.ts` | Check if project modules are outdated |

### File Structure

```
supabase/functions/devvault-mcp/
├── index.ts              # Hono router + MCP wiring
└── deno.json             # mcp-lite dependency

supabase/functions/_shared/mcp-tools/
├── types.ts              # AuthContext, McpServerLike, ToolRegistrar
├── register.ts           # Central wiring (16 tools)
├── usage-tracker.ts      # Fire-and-forget analytics (11 event types)
├── completeness.ts       # Completeness score helper
├── bootstrap.ts
├── search.ts
├── get.ts
├── list.ts
├── domains.ts
├── ingest.ts
├── update.ts
├── get-group.ts
├── validate.ts
├── delete.ts
├── diagnose.ts
├── report-bug.ts
├── resolve-bug.ts
├── report-success.ts
├── export-tree.ts
└── check-updates.ts
```

### Key DB Features

| Feature | Implementation |
|---------|---------------|
| Full-text search | `search_vector` (PT) + `search_vector_en` (EN) via triggers |
| Completeness score | `vault_module_completeness(p_id)` RPC — 4 bonus fields |
| Slug generation | `generate_vault_module_slug()` trigger |
| Changelog | `vault_module_changelog` table |
| Dependencies | `vault_module_dependencies` N:N table |
| Knowledge gaps | `vault_knowledge_gaps` table |
| Usage analytics | `vault_usage_events` table (11 event types) |
| Module versioning | `version` column (default `v1`) |
| Database schema | `database_schema` column for DDL storage |

### Usage Event Types (11)

`search`, `get`, `list`, `get_group`, `diagnose`, `search_miss`, `bug_reported`, `bug_resolved`, `success_reported`, `export_tree`, `check_updates`

### Phase 3 — Semantic Search (Next)

- **Provider:** OpenAI `text-embedding-3-small` (1536 dims)
- **Secret:** `OPENAI_API_KEY` (Supabase secret)
- **Extension:** `pgvector` + `embedding` column on `vault_modules`
- **Hybrid search:** Full-text (existing) + vector similarity (new)
