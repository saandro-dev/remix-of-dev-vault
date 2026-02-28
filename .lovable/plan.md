

## Plano: Fase 3 — Semantic Search com pgvector (Hybrid Search)

### Contexto

A busca atual usa **full-text search bilateral** (PT + EN via tsvector) com fallback ILIKE. A Fase 3 adiciona **busca semântica por embeddings** usando OpenAI `text-embedding-3-small` (1536 dims) + `pgvector`, combinando ambas num **Hybrid Search** com scoring ponderado.

---

### Análise de Soluções

#### Solução A: Embedding gerado na Edge Function dedicada + Hybrid Search via RPC único
- Manutenibilidade: 10/10 — embedding isolado num helper reutilizável, hybrid search encapsulado numa única RPC
- Zero DT: 10/10 — coluna nullable, backfill assíncrono, zero breaking changes
- Arquitetura: 10/10 — SRP (helper de embedding separado), RPC única combina full-text + vector, pesos configuráveis
- Escalabilidade: 9/10 — HNSW index para vector search, RPC parametrizada
- Segurança: 10/10 — OPENAI_API_KEY no Supabase secrets, SECURITY DEFINER na RPC
- **NOTA FINAL: 9.85/10**

#### Solução B: Embedding inline no ingest/update + busca vector-only (sem hybrid)
- Manutenibilidade: 6/10 — lógica de embedding duplicada em ingest e update
- Zero DT: 7/10 — perde a busca full-text existente
- Arquitetura: 5/10 — viola SRP, não reutilizável
- Escalabilidade: 8/10 — vector-only funciona mas perde matches exatos
- Segurança: 10/10
- **NOTA FINAL: 6.85/10**

#### Solução C: pgvector + embedding via database trigger (PL/Python)
- Manutenibilidade: 7/10 — difícil debugar triggers com chamadas HTTP
- Zero DT: 8/10 — trigger pode falhar silenciosamente
- Arquitetura: 6/10 — HTTP call dentro de trigger é anti-pattern no Supabase
- Escalabilidade: 6/10 — trigger bloqueia INSERT/UPDATE
- Segurança: 9/10 — key no banco em vez de secrets
- **NOTA FINAL: 7.05/10**

### DECISÃO: Solução A (Nota 9.85)
Embedding isolado num shared helper, hybrid search numa RPC parametrizada. As outras soluções violam SRP ou perdem capacidades existentes.

---

### Implementação (7 etapas)

#### Etapa 1: SQL Migration — pgvector + coluna + índice
```sql
-- Habilitar pgvector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Adicionar coluna de embedding (nullable para backfill gradual)
ALTER TABLE public.vault_modules
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Índice HNSW para busca por similaridade coseno
CREATE INDEX IF NOT EXISTS idx_vault_modules_embedding
  ON public.vault_modules
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

#### Etapa 2: SQL Migration — RPC `hybrid_search_vault_modules`
Nova função SQL que combina full-text score + vector similarity com pesos configuráveis:
- Parâmetros: `p_query_text`, `p_query_embedding vector(1536)`, `p_match_count`, `p_full_text_weight` (default 0.3), `p_semantic_weight` (default 0.7), filtros existentes (domain, module_type, tags)
- Lógica: calcula `full_text_rank` via `ts_rank` + `semantic_score` via `1 - (embedding <=> p_query_embedding)`, combina com pesos, ordena por score combinado
- Fallback: se embedding for NULL num módulo, usa apenas full-text score

#### Etapa 3: Shared helper — `_shared/embedding-client.ts`
Novo arquivo responsável por chamar a OpenAI Embeddings API:
- Função `generateEmbedding(text: string): Promise<number[]>`
- Usa `Deno.env.get("OPENAI_API_KEY")`
- Modelo: `text-embedding-3-small` (1536 dims)
- Concatena campos relevantes: `title + description + why_it_matters + tags + solves_problems + usage_hint`
- Função helper `buildEmbeddingInput(module: Record<string, unknown>): string` para montar o texto

#### Etapa 4: Atualizar `ingest.ts`
Após inserir o módulo, chamar `generateEmbedding()` e fazer `UPDATE` da coluna `embedding` no registro recém-criado. Operação fire-and-forget (não bloqueia a resposta se falhar, mas loga warning).

#### Etapa 5: Atualizar `update.ts`
Quando campos que afetam o embedding forem atualizados (title, description, why_it_matters, tags, solves_problems, usage_hint, code), regenerar o embedding. Mesma lógica fire-and-forget.

#### Etapa 6: Atualizar `search.ts` + `diagnose.ts` + `vault-query/index.ts`
- `search.ts`: quando `params.query` existir, gerar embedding da query via `generateEmbedding()`, chamar nova RPC `hybrid_search_vault_modules` em vez de `query_vault_modules`
- `diagnose.ts`: na Strategy 4 (fallback), usar hybrid search em vez de full-text only
- `vault-query/index.ts`: na action `search`, usar hybrid search

#### Etapa 7: Edge Function de backfill — `vault-backfill-embeddings`
Nova Edge Function one-shot para gerar embeddings dos módulos existentes:
- Busca módulos com `embedding IS NULL` e `visibility = 'global'`
- Processa em batches de 20 (rate limit da OpenAI)
- Loga progresso
- Será chamada manualmente uma vez

### Atualização de Documentação
- `.lovable/plan.md`: adicionar seção Phase 3 como "Complete", documentar hybrid search, nova RPC, novo shared helper, nova Edge Function
- `EDGE_FUNCTIONS_REGISTRY.md`: adicionar `vault-backfill-embeddings`
- `VAULT_CONTENT_STANDARDS.md`: documentar campo `embedding`

### Árvore de arquivos (novos/modificados)

```text
supabase/
├── migrations/
│   └── XXXXXX_phase3_pgvector_hybrid_search.sql  [NEW]
├── functions/
│   ├── _shared/
│   │   └── embedding-client.ts                    [NEW]
│   ├── vault-backfill-embeddings/
│   │   └── index.ts                               [NEW]
│   └── devvault-mcp/  (unchanged)
│
│   _shared/mcp-tools/
│   ├── search.ts                                  [MODIFIED]
│   ├── ingest.ts                                  [MODIFIED]
│   ├── update.ts                                  [MODIFIED]
│   └── diagnose.ts                                [MODIFIED]
│
│   vault-query/
│   └── index.ts                                   [MODIFIED]
│
├── config.toml                                    [MODIFIED - add backfill function]
docs/
├── VAULT_CONTENT_STANDARDS.md                     [MODIFIED]
├── EDGE_FUNCTIONS_REGISTRY.md                     [MODIFIED]
.lovable/plan.md                                   [MODIFIED]
```

