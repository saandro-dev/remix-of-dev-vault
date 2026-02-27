
# DevVault — Project State (Updated 2026-02-27)

## Architecture Overview

DevVault is a SaaS "second brain" for developers. The backend runs entirely on Supabase Edge Functions (zero direct DB access from frontend).

## Implemented Features

### MCP Server (`devvault-mcp`)
- Universal MCP endpoint for AI agents via Streamable HTTP + mcp-lite
- 6 tools: `devvault_bootstrap`, `devvault_search`, `devvault_get`, `devvault_list`, `devvault_domains`, `devvault_ingest`
- Authentication: `X-DevVault-Key` header → `validateApiKey()` from `api-key-guard.ts`
- Rate limiting: 120 req/min via `checkRateLimit()` from `rate-limit-guard.ts`
- HATEOAS dependency enrichment via `enrichModuleDependencies()` from `dependency-helpers.ts`

### Public API (`vault-query`)
- Read-only query endpoint for external consumers
- Actions: `search`, `get`, `list`, `list_domains`, `bootstrap`
- Same auth pattern as MCP (`X-DevVault-Key`)

### Write API (`vault-ingest`)
- Write endpoint for AI agents
- Actions: `ingest` (batch up to 50), `update`, `delete`
- Same auth pattern as MCP (`X-DevVault-Key`)

### Internal CRUD (`vault-crud`)
- JWT-authenticated CRUD for the frontend
- Actions: `list`, `get`, `create`, `update`, `delete`, `search`, `get_playbook`, `share`, `unshare`, `list_shares`, `add_dependency`, `remove_dependency`, `list_dependencies`

### Shared Modules (`_shared/`)
- `api-key-guard.ts` — `validateApiKey(client, rawKey)` + `requireApiKeyAuth(req)`
- `rate-limit-guard.ts` — `checkRateLimit(identifier, action, config?)` → `{ blocked, retryAfterSeconds? }`
- `dependency-helpers.ts` — `enrichModuleDependencies`, `handleAddDependency`, `handleRemoveDependency`, `handleListDependencies`
- `logger.ts` — `createLogger(fnName)` → `{ debug, info, warn, error }`
- `cors-v2.ts`, `auth.ts`, `sentry.ts`, `supabase-client.ts`, `api-helpers.ts`, `api-audit-logger.ts`, `role-validator.ts`

## Bug Fixes Applied (2026-02-27)
1. `vault-crud`: Replaced broken `import { log }` with `createLogger("vault-crud")`
2. `vault-query`: Fixed `checkRateLimit` signature to use `RateLimitConfig` object
3. `vault-query`: Fixed `rateLimit.allowed` → `rateLimit.blocked`
4. `vault-query`: Replaced inline dependency logic with `enrichModuleDependencies()`
5. `vault-ingest`: Removed non-existent `RATE_LIMIT_CONFIGS` import
6. `vault-ingest`: Fixed `checkRateLimit` signature to use `RateLimitConfig` object
7. `vault-ingest`: Fixed `rateLimit.allowed` → `rateLimit.blocked`
8. `vault-ingest`: Fixed `keyValidation.user_id` → `keyValidation.userId`
