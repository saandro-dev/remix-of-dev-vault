

# Audit Report: MCP v2.2 Implementation

## Verdict: INCOMPLETE — 6 of 8 DB functions were NOT updated

The `plan.md` states "DB: 8 functions updated, 1 column added" but cross-referencing the actual DB function definitions against the plan reveals that **only `query_vault_modules` was successfully updated**. The remaining functions still lack `usage_hint` and the bootstrap ordering fix was never applied.

---

## Critical Findings

### 1. DB Functions NOT Updated (6 functions)

| Function | What's Missing |
|---|---|
| `update_vault_module_search_vector` (PT) | `usage_hint` not in tsvector concatenation |
| `update_vault_module_search_vector_en` (EN) | `usage_hint` not in tsvector concatenation |
| `bootstrap_vault_context` | `usage_hint` not in playbook_phases or top_modules SELECT; top_modules still `ORDER BY vm.updated_at DESC` instead of `saas_phase NULLS LAST, updated_at DESC` |
| `get_vault_module` | `usage_hint` not in SELECT columns |
| `vault_module_completeness` | Still checks 10 fields, no `usage_hint` check (plan says 11) |
| `get_visible_modules` | `usage_hint` not in SELECT columns |

### 2. Frontend Type Missing `usage_hint`

`src/modules/vault/types.ts` — `VaultModule` interface does NOT include `usage_hint`. The DB column exists but the frontend type is outdated. Also missing: `slug`, `module_group`, `implementation_order`.

### 3. `plan.md` Documentation is Inaccurate

Claims all 8 functions were updated. Only 1 (`query_vault_modules`) was. This violates the protocol's documentation accuracy requirements.

---

## What IS Correct (Confirmed Working)

| Component | Status |
|---|---|
| `usage_hint` column in `vault_modules` | EXISTS in DB schema |
| `query_vault_modules` with ILIKE fallback + `usage_hint` | CORRECT |
| `get.ts` UUID auto-detection | CORRECT — regex guard works |
| `ingest.ts` with `usage_hint` field + warning | CORRECT |
| `update.ts` with `usage_hint` in ALLOWED_UPDATE_FIELDS | CORRECT |
| `search.ts` description updated | CORRECT |
| `devvault-mcp/index.ts` version 2.2.0 | CORRECT |
| `config.toml` with all verify_jwt = false | CORRECT |
| All MCP tool files under 300 lines | CORRECT |
| No dead code in MCP tools | CORRECT |
| No legacy/temporary patterns | CORRECT |
| Comments and docstrings accurate per file | CORRECT |

---

## Code Quality (No Issues Found)

- All 10 MCP tool files follow Single Responsibility
- `register.ts` central wiring is clean
- `types.ts` shared interface is minimal and correct
- `dependency-helpers.ts` is well-structured
- `auth.ts` middleware pattern is solid
- No try-catch suppression, no workarounds, no band-aids
- Structured logging consistent across all tools

---

## Required Fix: DB Migration

A new migration must update the 6 remaining DB functions to:

1. **Search triggers (PT + EN)**: Add `coalesce(NEW.usage_hint, '')` to tsvector
2. **`bootstrap_vault_context`**: Add `vm.usage_hint` to playbook_phases and top_modules SELECTs; change top_modules ORDER to `saas_phase NULLS LAST, updated_at DESC`
3. **`get_vault_module`**: Add `vm.usage_hint` to SELECT
4. **`vault_module_completeness`**: Add `usage_hint` check (total becomes 11)
5. **`get_visible_modules`**: Add `vm.usage_hint` to SELECT

Then update:
- `src/modules/vault/types.ts`: Add `usage_hint`, `slug`, `module_group`, `implementation_order` to `VaultModule`
- `.lovable/plan.md`: Correct documentation to reflect actual state

### File Tree

```text
NEW     DB migration: fix 6 remaining functions
MODIFY  src/modules/vault/types.ts          — add missing fields
MODIFY  .lovable/plan.md                    — accurate documentation
```

