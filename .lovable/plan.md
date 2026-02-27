

# Audit Report — DevVault MCP v2

## Findings

### CRITICAL VIOLATION: File Size (Protocol 5.4)

`supabase/functions/devvault-mcp/index.ts` is **646 lines** — more than double the 300-line limit. This is a "God Object" per the protocol and must be refactored immediately.

### Documentation Issues

1. `.lovable/plan.md` has **mixed PT/EN** (section headers in English, content descriptions in English, but some context is ambiguous). Should be fully EN per protocol.
2. `.lovable/plan.md` validation checklist items are still unchecked `[ ]` despite the MCP being confirmed working by the agent.
3. `vault-query/index.ts` comment block still says "list_domains" action but this is correct — no issue.

### No Dead Code Found

- `vault-query` and `vault-ingest` are legitimate REST API endpoints documented in the API docs page — they serve external HTTP consumers (cURL, fetch, Python). The MCP server is a separate transport. Both coexist correctly.
- `dependency-helpers.ts` exports are all consumed: `enrichModuleDependencies` by both `vault-query` and `devvault-mcp`, `batchInsertDependencies` by `devvault-mcp`.
- `api-key-guard.ts` exports `validateApiKey` (used by all 3 functions) and `requireApiKeyAuth` (used by vault-query/vault-ingest pattern).

### Architecture Assessment

The MCP server creates a new `McpServer` instance per request (line 639). This is correct for stateless Edge Functions — no issue.

---

## Análise de Soluções

### Solução A: Only update plan.md checklist
- Manutenibilidade: 6/10 (646-line file remains)
- Zero DT: 5/10 (God Object persists)
- Arquitetura: 5/10 (violates SRP)
- Escalabilidade: 7/10
- Segurança: 9/10
- **NOTA FINAL: 6.2/10**

### Solução B: Refactor MCP into modular files + update documentation
- Manutenibilidade: 10/10
- Zero DT: 10/10
- Arquitetura: 10/10 (each tool is its own module, SRP enforced)
- Escalabilidade: 10/10 (adding new tools = adding a file)
- Segurança: 9.5/10
- **NOTA FINAL: 9.9/10**

### DECISÃO: Solução B (Nota 9.9)

---

## Implementation Plan

### Problem
`devvault-mcp/index.ts` (646 lines) violates the 300-line limit. All 8 tool handlers, auth, completeness helper, CORS, and routing live in one file.

### Constraint
Edge Functions require all code in `index.ts` — no subfolder imports allowed. However, we CAN import from `_shared/`.

### Solution: Extract tool handlers to `_shared/mcp-tools/`

```text
MODIFY   supabase/functions/_shared/mcp-tools/auth.ts          (~40 lines) — authenticateRequest + AuthContext
MODIFY   supabase/functions/_shared/mcp-tools/completeness.ts   (~15 lines) — getCompleteness helper
MODIFY   supabase/functions/_shared/mcp-tools/bootstrap.ts      (~20 lines) — devvault_bootstrap handler
MODIFY   supabase/functions/_shared/mcp-tools/search.ts         (~55 lines) — devvault_search handler
MODIFY   supabase/functions/_shared/mcp-tools/get.ts            (~75 lines) — devvault_get handler
MODIFY   supabase/functions/_shared/mcp-tools/list.ts           (~50 lines) — devvault_list handler
MODIFY   supabase/functions/_shared/mcp-tools/domains.ts        (~15 lines) — devvault_domains handler
MODIFY   supabase/functions/_shared/mcp-tools/ingest.ts         (~75 lines) — devvault_ingest handler
MODIFY   supabase/functions/_shared/mcp-tools/update.ts         (~65 lines) — devvault_update handler
MODIFY   supabase/functions/_shared/mcp-tools/get-group.ts      (~50 lines) — devvault_get_group handler
MODIFY   supabase/functions/_shared/mcp-tools/register.ts       (~40 lines) — registerAllTools(server, auth) wiring
MODIFY   supabase/functions/devvault-mcp/index.ts               (~50 lines) — Hono + transport + CORS only
MODIFY   .lovable/plan.md                                       — update checklist, full EN, document refactor
```

Each tool file exports a single function: `registerXxxTool(server, client, auth)`. The `register.ts` file calls all of them. The `index.ts` becomes a thin shell (~50 lines): Hono router, CORS, auth middleware, `createMcpServer` that calls `registerAllTools`.

This ensures:
- Every file under 100 lines (well within 300)
- SRP: one file = one tool = one responsibility
- Adding tool 9 = creating one new file + one line in register.ts
- Zero behavior change — pure structural refactor

