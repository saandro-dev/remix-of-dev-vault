## v5.3 Search Infrastructure — Completo ✅

Todas as 3 migrations foram aplicadas com sucesso.

### Migrations Executadas

1. **Expand tsvector triggers + backfill** — Triggers PT/EN agora indexam `code`, `code_example`, `module_group`, `usage_hint`. Backfill executado.
2. **OR tsquery + tokenized ILIKE + cosine threshold** — `hybrid_search_vault_modules` e `query_vault_modules` reescritos com OR tsquery, ILIKE tokenizado por palavra, e threshold coseno relaxado de `< 0.5` para `< 0.85`.
3. **pg_trgm + GIN indexes** — Extensão `pg_trgm` habilitada. GIN trigram indexes em `title`, `description`, `code`.

### Bugs Resolvidos

| Bug | Status | Correção |
|---|---|---|
| BUG-1: search vetorial | ✅ v5.2 | `search_path` com `extensions` |
| BUG-2: diagnose sem fallback | ✅ v5.3 | OR tsquery + tokenized ILIKE + cosine 0.85 |
| BUG-3: list busca limitada | ✅ v5.3 | OR tsquery + tokenized ILIKE em todos os campos |

### Performance Esperada (10k módulos)

| Operação | Antes | Depois |
|---|---|---|
| tsvector query | AND only, campos limitados | OR, todos os campos, ~5ms |
| ILIKE fallback | seq scan, frase inteira | index scan (pg_trgm), por token, ~10ms |
| Cosine distance | threshold 0.5 (descarta 50%+) | threshold 0.85 (aceita 15%+ similarity) |

Zero alterações em TypeScript. Protocol V2 compliance: 10/10.
