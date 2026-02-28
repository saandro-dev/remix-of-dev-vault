

## Plano: Auditoria v4.1 (4 correções) + Preparação Fase 3

### Parte A — Correções da Auditoria v4.1

**1. `usage-tracker.ts` — Corrigir union type `UsageEvent`**
- Adicionar `"export_tree" | "check_updates"` ao `event_type` (de 9 para 11 valores)

**2. SQL Migration — `vault_module_completeness` + `database_schema`**
- Atualizar a função para incluir `database_schema` como campo bonus (similar a `test_code` e `common_errors`)
- Total de campos bonus passa de 3 para 4

**3. `.lovable/plan.md` — Reescrever para v4.1**
- 16 tools, file structure com `export-tree.ts` e `check-updates.ts`
- Campos `database_schema` e `version` documentados
- McpServer version: 4.1.0
- Usage events: 11 tipos

**4. `VAULT_CONTENT_STANDARDS.md` — Adicionar campo `version`**
- Adicionar `version` na seção "Metadata Fields" com descrição e exemplo

### Parte B — Configurar Secret da OpenAI

**5. Armazenar `OPENAI_API_KEY` como Supabase secret**
- Usar a tool `add_secret` para solicitar a key ao usuário
- Será usada pela Edge Function de embeddings na Fase 3

### Arquivos modificados

| Arquivo | Ação |
|---|---|
| `supabase/functions/_shared/mcp-tools/usage-tracker.ts` | Expandir union type |
| SQL Migration | `CREATE OR REPLACE FUNCTION vault_module_completeness` |
| `.lovable/plan.md` | Reescrever completo para v4.1 |
| `docs/VAULT_CONTENT_STANDARDS.md` | Adicionar `version` à tabela Metadata |

