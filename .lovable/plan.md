# DevVault MCP v2.1 — Implementation Plan

## Status: COMPLETE

## Architecture

The MCP server follows a modular architecture where each tool is a standalone
module in `supabase/functions/_shared/mcp-tools/`. The entry point
(`devvault-mcp/index.ts`) is a thin Hono shell (~48 lines) responsible only
for CORS, authentication, and transport binding.

### File Structure

```text
supabase/functions/
├── devvault-mcp/
│   ├── index.ts           (48 lines — Hono router, CORS, auth, transport)
│   └── deno.json          (mcp-lite + hono imports)
└── _shared/
    └── mcp-tools/
        ├── types.ts       (28 lines — AuthContext, McpServerLike, ToolRegistrar)
        ├── auth.ts        (60 lines — API key validation + rate limiting)
        ├── completeness.ts(24 lines — vault_module_completeness RPC wrapper)
        ├── register.ts    (32 lines — registerAllTools wiring)
        ├── bootstrap.ts   (28 lines — devvault_bootstrap tool)
        ├── search.ts      (68 lines — devvault_search tool)
        ├── get.ts         (92 lines — devvault_get tool)
        ├── list.ts        (80 lines — devvault_list tool)
        ├── domains.ts     (24 lines — devvault_domains tool)
        ├── ingest.ts      (106 lines — devvault_ingest tool)
        ├── update.ts      (92 lines — devvault_update tool)
        └── get-group.ts   (64 lines — devvault_get_group tool)
```

### Tools (8 total)

| Tool | Purpose |
|---|---|
| `devvault_bootstrap` | Full Knowledge Graph index (domains, phases, top modules) |
| `devvault_search` | Full-text search with relevance scoring (PT + EN) |
| `devvault_get` | Fetch module by ID/slug with deps, completeness, group metadata |
| `devvault_list` | List modules with filters (query, domain, type, tags, group) |
| `devvault_domains` | List available domains with counts |
| `devvault_ingest` | Create new module with deps, group, completeness warnings |
| `devvault_update` | Partial update by ID/slug with completeness response |
| `devvault_get_group` | Fetch entire group in implementation order with deps |

### Database Functions

| Function | Purpose |
|---|---|
| `generate_vault_module_slug()` | Trigger: auto-generates slug from title on INSERT/UPDATE |
| `vault_module_completeness(p_id)` | Returns score (0-100) and missing_fields array |
| `bootstrap_vault_context()` | Full Knowledge Graph index as JSON |
| `query_vault_modules(...)` | Full-text search with dual tsvector (PT + EN) |
| `list_vault_domains()` | Domain summary with counts and module_types |
| `get_vault_module(p_id, p_slug)` | Single module fetch by ID or slug |

### Schema Extensions

| Column | Table | Purpose |
|---|---|---|
| `module_group` | vault_modules | Groups related modules (e.g. 'whatsapp-integration') |
| `implementation_order` | vault_modules | Sequence within group (1-based) |

### Validation Checklist

- [x] 8 tools registered and functional
- [x] `devvault_search` properly registered (was reported missing by agent)
- [x] `devvault_update` enables agent self-healing of data gaps
- [x] `devvault_get_group` returns ordered modules with dependencies
- [x] `devvault_get` includes completeness score and group metadata
- [x] `devvault_ingest` warns on missing why_it_matters / code_example
- [x] Auto-slug trigger active on vault_modules
- [x] Completeness function checks 10 fields including dependencies
- [x] All files under 300-line limit (max file: ~106 lines)
- [x] SRP enforced: one file = one tool = one responsibility
- [x] Adding a new tool = one file + one line in register.ts
- [x] Zero behavior change from v2.0 — pure structural refactor

### Module Groups (pre-configured)

| Group | Modules | Description |
|---|---|---|
| `whatsapp-integration` | 7 | WhatsApp via Evolution API v2 |
| `saas-playbook` | 5 | SaaS development phases |

### Protocol Compliance

- [x] Protocol 5.4: All files under 300 lines (max: ~106 lines)
- [x] Protocol 5.3: SOLID / SRP — each tool is a single-responsibility module
- [x] Protocol 5.5: No direct DB access from frontend
- [x] Protocol 4: Zero band-aids, zero workarounds
- [x] All comments and documentation in English
