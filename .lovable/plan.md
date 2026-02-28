

## Diagnóstico Completo — 3 Bugs Críticos + 2 Melhorias de Design

O relatório é preciso e de alta qualidade. Confirmei cada bug lendo o código-fonte. Aqui está a causa-raiz de cada um e o plano de correção.

---

### BUG-1: `hybrid_search_vault_modules` — Operador vetorial quebrado (P0)

**Causa-raiz confirmada**: A função SQL usa `SET search_path TO 'public'`, mas o operador `<=>` do pgvector vive no schema `extensions`. O Postgres não encontra o operador porque `extensions` não está no search_path.

**Correção**: Migration SQL — recriar `hybrid_search_vault_modules` com `SET search_path TO 'public', 'extensions'`.

---

### BUG-2: `devvault_diagnose` — Zero resultados para erros reais (P0)

**Causa-raiz confirmada**: As 4 estratégias falham em cascata:
1. `common_errors` — vazio na maioria dos módulos (problema de conteúdo)
2. `solves_problems` — match por substring exato, falha com erros longos
3. `resolved_gaps` — ILIKE com substring de 100 chars, muito restritivo
4. `hybrid_search` — depende de BUG-1 (operador quebrado)

**Correção**: 
- Corrigir BUG-1 (desbloqueia estratégia 4)
- Adicionar **Strategy 5: tag-based fallback** em `diagnose-troubleshoot.ts` — extrair palavras-chave do erro e buscar por tags com overlap
- Melhorar Strategy 2: tokenizar o erro em palavras e fazer match parcial contra cada `solves_problems` entry

---

### BUG-3: `devvault_list` — Busca textual limitada (P1)

**Causa-raiz confirmada**: A RPC `query_vault_modules` faz ILIKE em `title`, `description`, `why_it_matters`, `usage_hint`, `tags` e `solves_problems`. Mas **não busca** em `code`, `code_example`, `context_markdown`. Termos como "redirect" ou "https" que aparecem no código não são encontrados.

**Correção**: Migration SQL — adicionar `code` e `code_example` ao ILIKE fallback da RPC `query_vault_modules`. Também adicionar `module_group` ao ILIKE (permite buscar "whatsapp-integration").

---

### DESIGN-1: `load_context` — Descoberta limitada a `source_project` (P2)

**Causa-raiz confirmada**: O discovery mode lista apenas por `source_project`. Módulos sobre Evolution API estão em `source_project: "risecheckout"`, invisíveis para quem não conhece esse nome.

**Correção em `load-context.ts`**: Adicionar parâmetro `tags` ao discovery mode. Se tags forem fornecidas, buscar módulos por overlap de tags independente do `source_project`. Adicionar `_hint` sugerindo busca por tags.

---

### DESIGN-2: Bootstrap — Regra de debugging ausente (P2)

**Causa-raiz**: O `AGENT_GUIDE` não instrui explicitamente o agente a consultar o vault durante debugging de erros.

**Correção em `bootstrap.ts`**: Adicionar regra comportamental: "When debugging errors in Edge Functions or external APIs, ALWAYS call devvault_diagnose with the error message BEFORE attempting manual fixes."

---

## Arquivos Afetados

```text
supabase/migrations/XXXX_fix_hybrid_search_path.sql              [NEW — Migration]
supabase/migrations/XXXX_expand_query_vault_ilike.sql             [NEW — Migration]  
supabase/functions/_shared/mcp-tools/diagnose-troubleshoot.ts     [EDIT — +Strategy 5 tag fallback + improve Strategy 2]
supabase/functions/_shared/mcp-tools/load-context.ts              [EDIT — +tags discovery]
supabase/functions/_shared/mcp-tools/bootstrap.ts                 [EDIT — +debugging rule]
docs/EDGE_FUNCTIONS_REGISTRY.md                                   [EDIT — document fixes]
```

### Ordem de Execução

1. **Migration BUG-1** — Fix search_path (desbloqueia search e diagnose)
2. **Migration BUG-3** — Expand ILIKE fields
3. **diagnose-troubleshoot.ts** — Tag fallback + tokenized matching
4. **load-context.ts** — Tag-based discovery
5. **bootstrap.ts** — Debugging behavioral rule
6. **EDGE_FUNCTIONS_REGISTRY.md** — Document changes

