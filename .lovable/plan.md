

## Knowledge Flywheel — Sistema de Debugging Auto-Evolutivo

### Conceito

Transformar o DevVault de uma biblioteca passiva em um **sistema auto-evolutivo** onde cada interacao de um agente de IA alimenta o grafo de conhecimento. O ciclo completo:

```text
Agent has bug → devvault_diagnose → found? → use solution
                                   → NOT found? → devvault_report_bug (gap registered)
                                                 → agent solves it
                                                 → devvault_resolve_bug (solution → module)

Agent builds feature → success → devvault_report_success (pattern → module)
```

---

### Arquitetura: 3 Novas MCP Tools + 1 Tabela SQL

**Nova tabela: `vault_knowledge_gaps`** — registra bugs nao resolvidos, lacunas de conhecimento, e o pipeline bug→resolucao→modulo.

| Coluna | Tipo | Descricao |
|---|---|---|
| id | UUID PK | |
| status | TEXT | `open`, `investigating`, `resolved`, `promoted_to_module` |
| error_message | TEXT | Mensagem de erro original |
| context | TEXT | Stack trace, projeto, situacao |
| domain | TEXT | security, backend, frontend, etc |
| tags | TEXT[] | Tags para busca |
| resolution | TEXT | Como foi resolvido (preenchido em resolve) |
| resolution_code | TEXT | Codigo da solucao |
| promoted_module_id | UUID | FK para vault_modules (quando vira modulo) |
| reported_by | UUID | user_id do agente que reportou |
| resolved_by | UUID | user_id do agente que resolveu |
| created_at | TIMESTAMPTZ | |
| resolved_at | TIMESTAMPTZ | |

**RLS:** Service role full access + admin can view all + users can view/manage own.

---

### Tool 1: `devvault_report_bug`

Registra um bug/gap que o agente encontrou e nao conseguiu resolver via `devvault_diagnose`.

```
Input: { error_message, context?, domain?, tags?, stack_trace? }
Output: { gap_id, status: "open", _hint: "When you solve this, call devvault_resolve_bug" }
```

Logica:
- Antes de criar, verifica se ja existe um gap `open` com error_message similar (dedup)
- Se ja existe, incrementa um `hit_count` e retorna o gap existente
- Registra analytics event_type = `bug_reported`

---

### Tool 2: `devvault_resolve_bug`

O agente resolveu o bug e documenta a solucao. Se a solucao for reutilizavel, promove automaticamente a modulo.

```
Input: { gap_id, resolution, resolution_code?, promote_to_module?: boolean,
         module_title?, module_domain?, module_tags? }
Output: { gap updated, module_created?: { id, slug }, _hint }
```

Logica:
- Atualiza gap: status = `resolved`, resolution, resolution_code, resolved_at
- Se `promote_to_module = true`: cria modulo via INSERT em vault_modules com:
  - `solves_problems` = [error_message original]
  - `common_errors` = [{error: error_message, cause: context, fix: resolution}]
  - `code` = resolution_code
  - Status do gap muda para `promoted_to_module`, promoted_module_id = novo modulo
- Registra analytics event_type = `bug_resolved`

---

### Tool 3: `devvault_report_success`

O agente implementou algo com sucesso e quer documentar o padrao.

```
Input: { title, code, description?, domain?, tags?, source_project?,
         why_it_matters?, common_errors?, solves_problems? }
Output: { module: { id, slug }, _completeness, _hint }
```

Logica:
- Wrapper inteligente sobre `devvault_ingest` com defaults otimizados:
  - `validation_status = "draft"`
  - `visibility = "global"`
  - Gera `usage_hint` automaticamente se nao fornecido: "Successfully used in {source_project}"
- Registra analytics event_type = `success_reported`

---

### Melhoria no `devvault_diagnose` existente

Quando nao encontra resultados (search_miss), o _hint muda para:

```
"No solution found. Use devvault_report_bug to register this gap.
When you solve it, call devvault_resolve_bug to document the solution
and optionally promote it to a reusable module."
```

Tambem busca na nova tabela `vault_knowledge_gaps` por gaps resolvidos que ainda nao foram promovidos a modulo.

---

### Resumo de Mudancas

| Arquivo | Acao |
|---|---|
| **SQL Migration** | Criar tabela `vault_knowledge_gaps` + RLS + indice em error_message |
| **NOVO** `report-bug.ts` | Tool `devvault_report_bug` |
| **NOVO** `resolve-bug.ts` | Tool `devvault_resolve_bug` |
| **NOVO** `report-success.ts` | Tool `devvault_report_success` |
| `diagnose.ts` | Adicionar busca em gaps resolvidos + hint atualizado |
| `usage-tracker.ts` | Adicionar novos event_types: `bug_reported`, `bug_resolved`, `success_reported` |
| `register.ts` | Registrar 3 novas tools (total: 14) |
| `types.ts` | Sem mudanca (ToolRegistrar ja suporta) |
| `devvault-mcp/index.ts` | Atualizar header para "Tools (14)" |
| `EDGE_FUNCTIONS_REGISTRY.md` | Documentar 14 tools e a tabela vault_knowledge_gaps |
| `.lovable/plan.md` | Atualizar estado do projeto |

---

### Resultado Final

Com estas 3 tools, o DevVault fecha o **Knowledge Flywheel**:

```text
Dia 1: Agente encontra erro X → diagnose retorna vazio → report_bug
Dia 2: Agente resolve erro X → resolve_bug + promote_to_module
Dia 3: Outro agente encontra erro X → diagnose retorna solucao completa

Ciclo infinito de crescimento organico.
```

