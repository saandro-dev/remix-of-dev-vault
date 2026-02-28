# DevVault — Post-Deployment State (v4.0 Knowledge Flywheel)

## Status: DEPLOYED ✅

---

## Architecture Overview

The DevVault MCP Server is a universal AI-agent interface exposing 14 tools
via the Model Context Protocol over Streamable HTTP. All tool logic resides
in `supabase/functions/_shared/mcp-tools/` (one file per tool).

### Knowledge Flywheel Cycle

```text
Agent has bug → devvault_diagnose → found? → use solution
                                   → NOT found? → devvault_report_bug (gap registered)
                                                 → agent solves it
                                                 → devvault_resolve_bug (solution → module)

Agent builds feature → success → devvault_report_success (pattern → module)
```

---

## MCP Tools (14)

| # | Tool | File | Purpose |
|---|------|------|---------|
| 1 | `devvault_bootstrap` | `bootstrap.ts` | Full vault context for agent onboarding |
| 2 | `devvault_search` | `search.ts` | Full-text + filtered search across modules |
| 3 | `devvault_get` | `get.ts` | Fetch single module by id or slug |
| 4 | `devvault_list` | `list.ts` | Paginated module listing with filters |
| 5 | `devvault_domains` | `domains.ts` | List all domains with counts |
| 6 | `devvault_ingest` | `ingest.ts` | Create new vault module |
| 7 | `devvault_update` | `update.ts` | Update existing module fields |
| 8 | `devvault_get_group` | `get-group.ts` | Fetch modules by group name |
| 9 | `devvault_validate` | `validate.ts` | Set validation_status on a module |
| 10 | `devvault_delete` | `delete.ts` | Soft/hard delete a module |
| 11 | `devvault_diagnose` | `diagnose.ts` | 4-strategy diagnostic (common_errors, solves_problems, resolved_gaps, text_search) |
| 12 | `devvault_report_bug` | `report-bug.ts` | Register knowledge gap with dedup (hit_count) |
| 13 | `devvault_resolve_bug` | `resolve-bug.ts` | Resolve gap + optional promote to module |
| 14 | `devvault_report_success` | `report-success.ts` | Ingest successful pattern with smart defaults |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `vault_modules` | Core knowledge modules |
| `vault_knowledge_gaps` | Bug/gap lifecycle tracking (open → resolved → promoted) |
| `vault_usage_events` | Analytics (9 event types incl. bug_reported, bug_resolved, success_reported) |
| `vault_module_dependencies` | Module dependency graph |
| `vault_module_changelog` | Version history per module |
| `vault_module_shares` | Module sharing between users |

---

## File Structure (Edge Functions)

```
supabase/functions/
├── devvault-mcp/
│   ├── index.ts          # Hono router, CORS, auth, MCP transport (v4.0)
│   └── deno.json         # Deno config
└── _shared/
    └── mcp-tools/
        ├── auth.ts           # API key + JWT authentication
        ├── bootstrap.ts      # devvault_bootstrap
        ├── completeness.ts   # Module completeness scorer
        ├── delete.ts         # devvault_delete
        ├── diagnose.ts       # devvault_diagnose (4 strategies)
        ├── domains.ts        # devvault_domains
        ├── get.ts            # devvault_get
        ├── get-group.ts      # devvault_get_group
        ├── ingest.ts         # devvault_ingest
        ├── list.ts           # devvault_list
        ├── register.ts       # Tool registration hub (14 tools)
        ├── report-bug.ts     # devvault_report_bug
        ├── report-success.ts # devvault_report_success
        ├── resolve-bug.ts    # devvault_resolve_bug
        ├── search.ts         # devvault_search
        ├── types.ts          # AuthContext, ToolRegistrar
        ├── update.ts         # devvault_update
        ├── usage-tracker.ts  # Analytics event tracker (9 types)
        └── validate.ts       # devvault_validate
```

---

## Quality Checklist ✅

- [x] 14 tools registered and deployed
- [x] Zero dead code, zero unused imports
- [x] All files under 300 lines
- [x] Technical English naming throughout
- [x] Protocol §5.5 enforced (zero frontend DB access)
- [x] Knowledge Flywheel cycle operational
- [x] Documentation updated (EDGE_FUNCTIONS_REGISTRY.md)
- [x] Version consistent: header v4.0, McpServer 4.0.0
