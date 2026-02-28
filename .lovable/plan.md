

## Analise do Feedback — Triagem: Ja Implementado vs Pendente

### Itens que o agente reportou como faltantes mas JA EXISTEM

| Item do feedback | Estado real |
|---|---|
| 2.3 — common_errors, solves_problems, test_code, difficulty, estimated_minutes, prerequisites | ✅ Todos existem no DB e nos MCP tools (ingest, update, get) |
| 2.6 — devvault_validate nao registrada | ✅ Existe em validate.ts, registrada em register.ts |
| 2.2 — query_vault_modules nao retorna usage_hint | ✅ FALSO — a RPC retorna usage_hint no SELECT e no RETURNS TABLE |
| Item 1 prioridade — implementar campos que faltam | ✅ Ja implementado na Fase 1 anterior |

O agente analisou uma versao anterior do codigo. Dos 5 itens prioritarios dele, 2 ja estao feitos.

---

### Itens reais a implementar (3 melhorias + 2 novas tools)

**1. Mover filtro `group` para a RPC SQL (eliminar round-trip em memoria no list.ts)**

O `list.ts` faz 2 queries: uma para `query_vault_modules` e outra para filtrar por `module_group` em memoria. Isso viola o protocolo §4.4 (codigo deve ser um ativo). Solucao: adicionar `p_group` a funcao SQL `query_vault_modules`.

**2. Aceitar slug nas dependencias (alem de UUID)**

O `ingest.ts` exige `depends_on_id` (UUID). Agentes descobrem modulos por slug. Solucao: aceitar campo `depends_on` (slug ou UUID) no `batchInsertDependencies`, resolver slug→UUID internamente.

**3. Nova tool: `devvault_delete`**

Nao existe forma de deletar modulo via MCP. Solucao: soft delete (validation_status = 'deprecated') com opcao de hard delete.

**4. Nova tool: `devvault_diagnose`**

Busca por mensagem de erro → modulos que resolvem. Busca em `common_errors[].error`, `solves_problems[]`, e fallback ILIKE em `usage_hint`/`why_it_matters`.

**5. Tabela `vault_usage_events` para analytics**

Rastrear buscas, acessos, e "search misses" para curadoria orientada por dados.

---

### Itens adiados para fase futura (escopo excessivo para uma iteracao)

| Item | Justificativa |
|---|---|
| devvault_diff | Requer versionamento completo (changelog existe mas sem diff semantico) |
| devvault_related | get.ts ja resolve related_modules — valor marginal |
| devvault_plan | Requer logica de planejamento com IA generativa — escopo de projeto separado |
| Module DNA / Composable Modules | Requer AST parsing — fora do escopo de Edge Functions |
| Smart Prompts (agent_prompt) | Bom campo, mas sem infraestrutura para validar qualidade |
| Ecosystem Maps | Visualizacao — feature de frontend, nao de MCP |

---

## Analise de Solucoes

### Solucao A: Implementacao incremental (5 itens acima)
- Manutenibilidade: 10/10
- Zero DT: 10/10
- Arquitetura: 10/10
- Escalabilidade: 9/10
- Seguranca: 10/10
- **NOTA FINAL: 9.8/10**

### Solucao B: Implementar tudo incluindo diff/plan/DNA
- Manutenibilidade: 7/10 (escopo enorme, dificil manter qualidade)
- Zero DT: 6/10 (features half-baked sem IA generativa)
- Arquitetura: 7/10 (AST parsing em Edge Functions e anti-pattern)
- Escalabilidade: 8/10
- Seguranca: 9/10
- **NOTA FINAL: 7.2/10**

### DECISAO: Solucao A (9.8) — 5 itens de alto impacto, zero divida tecnica

---

## Plano de Execucao

### Fase 1 — SQL Migration

```sql
-- 1. Add p_group to query_vault_modules
-- 2. Create vault_usage_events table with RLS
```

### Fase 2 — MCP Tools (6 arquivos)

| Arquivo | Mudanca |
|---|---|
| `list.ts` | Remover filtro group em memoria, passar p_group ao RPC |
| `dependency-helpers.ts` | `batchInsertDependencies` aceitar slug, resolver internamente |
| `ingest.ts` | Atualizar schema de dependencies para aceitar `depends_on` (slug ou UUID) |
| **NOVO** `delete.ts` | Tool `devvault_delete` (soft/hard delete) |
| **NOVO** `diagnose.ts` | Tool `devvault_diagnose` (busca por erro) |
| `register.ts` | Registrar 2 novas tools (total: 11) |

### Fase 3 — Analytics Integration

Todos os handlers de tools (search, get, list, get_group, diagnose) registram eventos em `vault_usage_events` de forma assincrona (fire-and-forget, sem bloquear resposta).

### Fase 4 — Documentacao e Redeploy

Atualizar `EDGE_FUNCTIONS_REGISTRY.md`, `VAULT_CONTENT_STANDARDS.md`, `.lovable/plan.md`, e header do `index.ts` (Tools: 11).

