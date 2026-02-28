

## Auditoria da Implementação `ai_metadata` — Problemas Encontrados

Após investigação profunda de todos os arquivos afetados, identifiquei **3 problemas reais** que precisam de correção:

---

### Problema 1: Query redundante em `devvault_get` (get.ts)

**Linhas 97-103** fazem uma query separada para buscar `ai_metadata`:
```typescript
const { data: fullRow } = await client
  .from("vault_modules")
  .select("ai_metadata")
  .eq("id", moduleId)
  .single();
```

Mas a RPC `get_vault_module` **já retorna `ai_metadata`** (confirmado no SQL). O campo `mod.ai_metadata` já contém o dado. Esta query extra é código morto — uma chamada desnecessária ao banco que degrada performance.

**Correção:** Remover a query extra e usar `mod.ai_metadata` diretamente.

---

### Problema 2: RPCs de listagem/busca não retornam `ai_metadata`

As seguintes RPCs **não incluem** `ai_metadata` no retorno:
- `query_vault_modules` — usada por `devvault_list` e `devvault_search`
- `hybrid_search_vault_modules` — usada por `devvault_search`
- `get_visible_modules` — usada por `vault-crud` action `list`

Isso significa que o campo `ai_metadata` **nunca aparece** nos resultados de listagem/busca — nem no frontend, nem no MCP. O plano original previa "Fase 6: Atualizar RPCs" mas isso não foi executado.

**Correção:** Migration SQL para adicionar `ai_metadata` ao retorno das 3 RPCs.

---

### Problema 3: `database_schema` não retornado pela RPC `get_vault_module`

O campo `database_schema` **já está** no retorno da RPC (confirmado). Este não é um problema — apenas validação.

---

## Plano de Correção

### 1. Remover query redundante em `get.ts`
- Eliminar linhas 97-103 (fetch separado de `ai_metadata`)
- Usar `mod.ai_metadata` diretamente para construir `envInstructions`

### 2. Migration: Atualizar 3 RPCs para incluir `ai_metadata`
- `query_vault_modules` — adicionar `vm.ai_metadata` ao SELECT e ao retorno
- `hybrid_search_vault_modules` — adicionar `vm.ai_metadata` ao SELECT e ao retorno
- `get_visible_modules` — adicionar `vm.ai_metadata` ao SELECT e ao retorno

### Arquivos Afetados

```text
supabase/migrations/XXXXXX_add_ai_metadata_to_rpcs.sql   [NEW]
supabase/functions/_shared/mcp-tools/get.ts               [EDIT]
```

