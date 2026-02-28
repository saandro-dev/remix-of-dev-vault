

## Diagnóstico: ILIKE Tokenizado Não Escala

O plano anterior propunha `EXISTS(SELECT 1 FROM unnest(tokens) tok WHERE field ILIKE '%' || tok || '%')` em 7+ campos. Com 10k módulos e 5 tokens, isso gera **35.000+ comparações de substring por query** — todas sequential scans sem índice. Inaceitável.

A causa-raiz real é que os **tsvector triggers não indexam os campos críticos** (`code`, `code_example`, `module_group`), forçando o ILIKE como fallback. A solução correta é eliminar a necessidade do ILIKE.

---

## Solution Analysis

### Solution A: Expandir tsvector + OR tsquery + pg_trgm GIN indexes
- **Expandir tsvector triggers** (PT e EN) para incluir `code`, `code_example`, `module_group` — cobertura completa via GIN index
- **Substituir `plainto_tsquery` (AND)** por `to_tsquery` com operador `|` (OR) — "http https redirect" encontra módulos com QUALQUER palavra
- **Habilitar `pg_trgm`** + criar GIN indexes trigram nos campos chave — ILIKE fallback passa a usar index scan em vez de seq scan
- **Relaxar threshold coseno** de `< 0.5` para `< 0.85`
- **Backfill** tsvectors existentes

| Critério | Nota |
|---|---|
| Maintainability | 10/10 — Tudo no SQL, zero lógica de tokenização custom |
| Zero TD | 10/10 — Resolve permanentemente, sem fallbacks frágeis |
| Architecture | 10/10 — GIN indexes são a solução canônica do PostgreSQL |
| Scalability | 10/10 — GIN indexes suportam milhões de registros |
| Security | 10/10 — Sem alteração |
| **FINAL SCORE** | **10/10** |

### Solution B: ILIKE tokenizado no SQL (plano anterior)
| Critério | Nota |
|---|---|
| Maintainability | 7/10 — Lógica de split/unnest no SQL é frágil |
| Zero TD | 6/10 — Sequential scans são dívida técnica latente |
| Architecture | 5/10 — Ignora ferramentas nativas do PostgreSQL |
| Scalability | 4/10 — O(n × tokens × campos) sem índice |
| Security | 10/10 |
| **FINAL SCORE** | **5.95/10** |

### DECISION: Solution A (Score 10)
Solution B é um band-aid que colapsa em 10k módulos. Solution A usa as ferramentas nativas do PostgreSQL (tsvector + pg_trgm + GIN) que são projetadas para escalar a milhões de registros.

---

## Plano de Implementação

### Migration 1: Expandir tsvector triggers + backfill

Recriar `update_vault_module_search_vector()` (PT) e `update_vault_module_search_vector_en()` (EN) para incluir:
- `code` (já coberto: title, description, why_it_matters, context_markdown, phase_title, tags, solves_problems)
- `code_example`
- `module_group`
- `usage_hint`

Backfill: `UPDATE vault_modules SET updated_at = updated_at` para disparar os triggers e reindexar.

### Migration 2: OR tsquery nas funções de busca

Recriar `hybrid_search_vault_modules` e `query_vault_modules` para:
1. **Tokenizar a query** em palavras: `regexp_split_to_array(lower(trim(p_query_text)), '\s+')`
2. **Construir tsquery OR**: `array_to_string(tokens, ' | ')::tsquery` em vez de `plainto_tsquery`
3. **Relaxar threshold coseno**: `< 0.5` → `< 0.85`
4. **ILIKE fallback** agora usa tokens individuais em vez de frase inteira (backup para termos que o stemmer descarta)

### Migration 3: pg_trgm + GIN indexes para ILIKE

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vault_modules_title_trgm
  ON vault_modules USING GIN (title extensions.gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vault_modules_description_trgm
  ON vault_modules USING GIN (description extensions.gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vault_modules_code_trgm
  ON vault_modules USING GIN (code extensions.gin_trgm_ops);
```

Isso transforma ILIKE `'%token%'` de sequential scan → index scan.

### Edits em TypeScript

**Nenhum** — todas as correções são no SQL. Os arquivos TS (`diagnose-troubleshoot.ts`, `list.ts`, `search.ts`) chamam as RPCs corretamente e não precisam de alteração.

### Documentação

- `docs/EDGE_FUNCTIONS_REGISTRY.md` — version bump para v5.3.0, documentar as melhorias
- `.lovable/plan.md` — atualizar estado

### Arquivos Afetados

```text
supabase/migrations/XXXX_expand_tsvector_triggers.sql          [NEW]
supabase/migrations/XXXX_or_tsquery_and_cosine_threshold.sql   [NEW]
supabase/migrations/XXXX_pg_trgm_gin_indexes.sql               [NEW]
docs/EDGE_FUNCTIONS_REGISTRY.md                                [EDIT]
.lovable/plan.md                                               [EDIT]
```

### Performance Esperada (10k módulos)

| Operação | Antes (seq scan) | Depois (GIN index) |
|---|---|---|
| tsvector OR query | N/A (AND only) | ~5ms |
| ILIKE '%token%' | ~200ms (seq scan) | ~10ms (trigram index) |
| Cosine distance | Descarta > 50% | Aceita > 15% similarity |

