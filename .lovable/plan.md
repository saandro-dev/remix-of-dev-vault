

## Diagnóstico

A observação da IA está **100% correta** e conecta-se diretamente ao relatório anterior. São dois problemas distintos:

### Problema A: Código — 3 bugs aprovados ainda não implementados

Os 3 problemas do plano aprovado continuam presentes no código:

1. **`update.ts` linha 15-21:** `ai_metadata` ausente do `ALLOWED_UPDATE_FIELDS` — agentes não conseguem atualizar metadados AI após ingestão
2. **`list.ts` linha 109:** `total_results: modules.length` — retorna count da página, não o total real (RPC `query_vault_modules` sem `COUNT(*) OVER()`)
3. **`search.ts` linha 130:** Mesmo problema no modo list — `total_results: modules.length`

### Problema B: Dados — Módulos sem dependências declaradas

A infraestrutura de dependências está **completa no código** (ingest, get, export_tree, enrichment). O problema é de **conteúdo**: os módulos foram ingeridos sem declarar `dependencies`. Isso não é um bug de código — é uma lacuna de dados que precisa ser preenchida por agentes via `devvault_update` + `add_dependency`.

Porém, o Problema A bloqueia parcialmente o B: sem `ai_metadata` no `ALLOWED_UPDATE_FIELDS`, agentes não conseguem enriquecer módulos existentes com metadados.

---

## Plano de Implementação

### 1. Migration: `query_vault_modules` com `total_count`
Recriar a RPC adicionando `COUNT(*) OVER()::BIGINT AS total_count` nos 3 branches de `RETURN QUERY`.

### 2. `update.ts` — Adicionar `ai_metadata` ao ALLOWED_UPDATE_FIELDS e inputSchema
Linha 21: adicionar `"ai_metadata"` ao array. Adicionar propriedade `ai_metadata` ao `inputSchema.properties`.

### 3. `list.ts` — Extrair `total_count` real
Linha 109: extrair `total_count` da primeira row em vez de usar `modules.length`.

### 4. `search.ts` — Extrair `total_count` real no modo list
Linha 130: mesmo padrão — extrair `total_count` quando usa `query_vault_modules`.

### 5. `src/integrations/supabase/types.ts` — Atualizar tipos da RPC

### Arquivos Afetados

```text
supabase/migrations/XXXXXX_query_vault_modules_total_count.sql  [NEW]
supabase/functions/_shared/mcp-tools/update.ts                   [EDIT]
supabase/functions/_shared/mcp-tools/list.ts                     [EDIT]
supabase/functions/_shared/mcp-tools/search.ts                   [EDIT]
src/integrations/supabase/types.ts                               [EDIT]
```

