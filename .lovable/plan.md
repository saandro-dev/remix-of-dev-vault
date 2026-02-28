

## Diagnóstico

Existem **dois sistemas separados** que não se comunicam:

| Sistema | Tabela | Acesso MCP | Visível no Frontend |
|---------|--------|------------|---------------------|
| Knowledge Gaps (global) | `vault_knowledge_gaps` | `devvault_report_bug` / `devvault_resolve_bug` | Não (apenas admin via health check) |
| Bug Diary (pessoal) | `bugs` | Nenhum | Sim (página Bug Diary) |

A IA **já pode** reportar problemas via `devvault_report_bug`, mas esses registros vão para `vault_knowledge_gaps` — uma tabela global de lacunas de conhecimento que **não aparece** na aba Bug Diary do frontend. O Bug Diary (`bugs` table) é completamente inacessível via MCP.

## Plano: Criar 2 novas MCP tools para o Bug Diary

### Solution Analysis

#### Solution A: Criar tools MCP separadas para `bugs` table
- Maintainability: 10/10 — Cada sistema tem suas tools dedicadas, responsabilidade clara
- Zero TD: 10/10 — Sem acoplamento entre sistemas distintos
- Architecture: 10/10 — Single Responsibility: knowledge gaps ≠ bug diary pessoal
- Scalability: 9/10 — Escala independentemente
- Security: 10/10 — Respeita ownership via `user_id` do auth context
- **FINAL SCORE: 9.8/10**

#### Solution B: Unificar `bugs` e `vault_knowledge_gaps` numa só tabela
- Maintainability: 5/10 — Mistura conceitos distintos (pessoal vs global)
- Zero TD: 3/10 — Requer migration destrutiva e rewrite de toda a UI
- Architecture: 4/10 — Viola Single Responsibility
- Scalability: 6/10 — Tabela monolítica com concerns mistos
- Security: 5/10 — RLS complexo para pessoal vs global
- **FINAL SCORE: 4.6/10**

### DECISION: Solution A (Score 9.8)
Solution B viola SRP ao misturar um diário pessoal com um sistema global de knowledge gaps. São domínios semânticos distintos.

---

### Implementação

#### 1. `supabase/functions/_shared/mcp-tools/diary-bug.ts` [NEW]
Tool `devvault_diary_bug` — Cria um bug no diário pessoal do usuário (`bugs` table). Inputs: `title` (required), `symptom` (required), `cause_code`, `solution`, `project_id`, `vault_module_id`, `tags`. Se `solution` for fornecida, status = `resolved`, senão `open`.

#### 2. `supabase/functions/_shared/mcp-tools/diary-resolve.ts` [NEW]
Tool `devvault_diary_resolve` — Atualiza um bug existente no diário com a solução. Inputs: `bug_id` (required), `cause_code`, `solution` (required). Seta status para `resolved`.

#### 3. `supabase/functions/_shared/mcp-tools/register.ts` [EDIT]
Registrar as 2 novas tools. Total tools: 21.

#### 4. `supabase/functions/_shared/mcp-tools/types.ts` [NO CHANGE]
Tipos existentes são suficientes.

### Arquivos Afetados

```text
supabase/functions/_shared/mcp-tools/diary-bug.ts      [NEW]
supabase/functions/_shared/mcp-tools/diary-resolve.ts   [NEW]
supabase/functions/_shared/mcp-tools/register.ts        [EDIT]
```

