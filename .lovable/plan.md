

## Diagnóstico: Lacuna Crítica no Fluxo Bug → Solução

O fluxo atual tem um **gap arquitetural grave**:

```text
Sessão 1 (IA encontra bug):
  devvault_diary_bug({ title, symptom }) → retorna { bug_id: "abc-123" }
  ✅ Bug criado como "open"

Sessão 2 (IA descobre solução dias depois):
  devvault_diary_resolve({ bug_id: ???, solution }) → ❌ COMO ENCONTRAR O bug_id?
```

O `devvault_diary_resolve` exige `bug_id`, mas **não existe nenhuma tool para a IA consultar bugs existentes**. Em sessões diferentes (ou agentes diferentes), o `bug_id` é desconhecido. A IA fica cega — tem um diário que só permite escrever, não ler.

Além disso, sem uma tool de listagem, a IA **não pode evitar duplicatas** — pode criar o mesmo bug 10 vezes sem saber.

---

## Solution Analysis

### Solution A: Criar `devvault_diary_list` (tool de consulta)
- Maintainability: 10/10 — Tool isolada, Single Responsibility
- Zero TD: 10/10 — Resolve o gap permanentemente
- Architecture: 10/10 — Completa o CRUD (Create + Resolve já existem, falta Read)
- Scalability: 10/10 — Filtros por status/tags permitem queries eficientes
- Security: 10/10 — Filtra por `user_id` do auth context
- **FINAL SCORE: 10/10**

### Solution B: Retornar todos os bugs no bootstrap
- Maintainability: 5/10 — Polui o bootstrap com dados dinâmicos pesados
- Zero TD: 6/10 — Não escala (100+ bugs no bootstrap = resposta gigante)
- Architecture: 4/10 — Viola SRP do bootstrap (índice de conhecimento ≠ dados pessoais)
- Scalability: 3/10 — Cresce linearmente com bugs
- Security: 10/10
- **FINAL SCORE: 5.2/10**

### DECISION: Solution A (Score 10)
Solution B polui o bootstrap e não escala. Uma tool dedicada com filtros é a solução correta.

---

## Plano de Implementação

### 1. `supabase/functions/_shared/mcp-tools/diary-list.ts` [NEW]

Tool `devvault_diary_list` com:
- **Filtros**: `status` (open/resolved), `tags`, `project_id`, `search` (busca em title+symptom)
- **Paginação**: `limit` (default 20), `offset`
- **Ordenação**: `created_at desc` por padrão
- **Response**: Lista de bugs com `id`, `title`, `symptom`, `status`, `cause_code`, `solution`, `tags`, `created_at`
- **`_hint`**: Guia o agente para `devvault_diary_resolve` nos bugs `open`

### 2. `supabase/functions/_shared/mcp-tools/register.ts` [EDIT]

Importar e registrar `registerDiaryListTool`. Total: **22 tools**.

### 3. `supabase/functions/_shared/mcp-tools/bootstrap.ts` [EDIT]

- Atualizar `_purpose` de "21" para "22"
- Adicionar `devvault_diary_list` ao `tool_catalog.bug_diary`
- Atualizar `behavioral_rules` com: "ALWAYS search existing bugs with devvault_diary_list before creating new ones to avoid duplicates"

### 4. `supabase/functions/devvault-mcp/index.ts` [EDIT]

Atualizar comentário para "22 tools".

### 5. `docs/EDGE_FUNCTIONS_REGISTRY.md` [EDIT]

Atualizar contagem e adicionar `devvault_diary_list` à lista.

### 6. `devvault_diary_bug` response hint [EDIT in `diary-bug.ts`]

Adicionar `_hint` na resposta: "Use devvault_diary_list to find this bug later, or save the bug_id to resolve it with devvault_diary_resolve."

### Arquivos Afetados

```text
supabase/functions/_shared/mcp-tools/diary-list.ts     [NEW]
supabase/functions/_shared/mcp-tools/diary-bug.ts      [EDIT — add _hint]
supabase/functions/_shared/mcp-tools/register.ts       [EDIT — +1 tool]
supabase/functions/_shared/mcp-tools/bootstrap.ts      [EDIT — update guide]
supabase/functions/devvault-mcp/index.ts               [EDIT — comment]
docs/EDGE_FUNCTIONS_REGISTRY.md                        [EDIT — +1 tool]
```

