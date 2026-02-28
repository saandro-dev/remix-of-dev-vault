

# Plano: Melhorias no MCP Server baseadas em Feedback de Agente IA

## Análise do Feedback

O feedback reporta 6 categorias de problemas. Após investigação do código, aqui está a análise:

### 1. Bugs nas Funções do Banco (Alta Prioridade)

**1a. `devvault_search` — erro de operador vector `<=>` **
- **Causa raiz:** A RPC `hybrid_search_vault_modules` recebe `p_query_embedding` como tipo `extensions.vector`, mas o Supabase JS client envia o embedding como string `"[0.1,0.2,...]"`. O cast implícito de `text` → `extensions.vector` pode falhar dependendo do search_path.
- **Correção:** Alterar a assinatura da RPC para aceitar `text` e fazer `CAST` interno para `vector`, ou garantir que o `search_path` inclua `extensions`.

**1b. `devvault_list` — conflito de assinatura `query_vault_modules`**
- **Causa raiz:** Existem DUAS versões da função `query_vault_modules` — uma com `p_group` e outra sem. O PostgreSQL não consegue resolver qual chamar quando `p_group` não é passado.
- **Correção:** Dropar a versão antiga (sem `p_group`) e manter apenas a versão completa.

**1c. `devvault_validate` e `devvault_export_tree` falham sem slug**
- **Causa raiz:** Ambas exigem `id` como required. O agente quer poder chamá-las sem parâmetro para operar em batch (validar todos / exportar tudo).
- **Correção:** Tornar `id` opcional. Sem `id`: `validate` retorna score de todos os módulos; `export_tree` retorna árvore completa ou os módulos raiz.

### 2. Parâmetros obrigatórios vs opcionais
- `devvault_diagnose`: adicionar modo "health check" sem `error_message` (retorna gaps abertos, módulos com score baixo).
- `devvault_validate`: modo batch já coberto em 1c.

### 3. Nova ferramenta: `devvault_load_context`
- Carregar todos os módulos filtrados por `source_project`.
- A coluna `source_project` já existe em `vault_modules`.

### 4. Nova ferramenta: `devvault_quickstart`
- Retornar os N módulos mais importantes/usados de um domínio.
- Usar `vault_usage_events` para ranking por uso + `validation_status = 'validated'` como fallback.

### 5. Relacionamentos entre módulos
- **Já existem:** `vault_module_dependencies` (tabela N:N) e `related_modules` (uuid[]). O agente provavelmente não vê esses dados porque `devvault_get` e `devvault_list` não os retornam nos resultados.
- **Correção:** Incluir `dependencies` e `related_modules` nas respostas das ferramentas `get`, `list`, `search`.

### 6. Versionamento de módulos
- **Já existe:** A tabela `vault_module_changelog` guarda `version` + `changes[]` por módulo.
- **Correção:** Expor via nova ferramenta `devvault_changelog` ou incluir no retorno de `devvault_get`.

---

## Solution Analysis

### Solution A: Correções Pontuais (patch individual por bug)
- Maintainability: 6/10
- Zero TD: 5/10
- Architecture: 5/10
- Scalability: 6/10
- Security: 8/10
- **FINAL SCORE: 5.8/10**

### Solution B: Refatoração Completa das RPCs + Novas Tools MCP
- Corrigir as 2 RPCs com bugs (dropar duplicata, fix vector cast)
- Refatorar as 4 tools existentes (validate, export-tree, diagnose, search) para aceitar parâmetros opcionais e batch mode
- Criar 3 novas tools (load_context, quickstart, changelog)
- Enriquecer respostas de get/list/search com dependencies e related_modules
- Maintainability: 9/10
- Zero TD: 9/10
- Architecture: 9/10
- Scalability: 9/10
- Security: 9/10
- **FINAL SCORE: 9.0/10**

### DECISION: Solution B (Score 9.0)
Solution A deixaria inconsistências entre tools e não resolveria os problemas de UX do agente.

---

## Plano de Implementação

### Fase 1 — Correções de Banco (SQL Migrations)

1. **Dropar a versão antiga de `query_vault_modules`** (sem `p_group`) para eliminar conflito de assinatura
2. **Corrigir `hybrid_search_vault_modules`** — alterar `p_query_embedding` de `extensions.vector` para `text`, com cast interno `p_query_embedding::vector`

### Fase 2 — Refatorar Tools Existentes

3. **`devvault_validate`** — tornar `id` opcional; sem `id` retorna batch com score de todos os módulos globais (limit 50)
4. **`devvault_export_tree`** — tornar `id` opcional; sem `id` retorna lista de módulos raiz (que têm dependentes mas não dependem de ninguém)
5. **`devvault_diagnose`** — tornar `error_message` opcional; sem parâmetro retorna health check (gaps abertos + módulos com score < 60)
6. **`devvault_get`** — incluir `module_dependencies` e `related_modules` resolvidos (com títulos/slugs) na resposta
7. **`devvault_search` e `devvault_list`** — incluir `related_modules` count e `has_dependencies` flag nos resultados

### Fase 3 — Novas Tools MCP

8. **`devvault_load_context`** — nova tool que aceita `project` (source_project) e retorna todos os módulos associados com code completo
9. **`devvault_quickstart`** — nova tool que aceita `domain` e retorna os top 5-10 módulos mais relevantes (por usage count + validated first)
10. **`devvault_changelog`** — nova tool que aceita `id` (módulo) e retorna histórico de versões da tabela `vault_module_changelog`

### Fase 4 — Registro e Deploy

11. **Atualizar `register.ts`** — adicionar as 3 novas tools
12. **Atualizar `devvault-mcp/index.ts`** — bump versão para 5.0.0, atualizar contagem de tools (16 → 19)

### Árvore de Arquivos

```text
supabase/
├── migrations/
│   ├── XXXX_drop_old_query_vault_modules.sql      (Fase 1)
│   └── XXXX_fix_hybrid_search_vector_param.sql     (Fase 1)
└── functions/
    └── _shared/mcp-tools/
        ├── validate.ts          (refatorado — batch mode)
        ├── export-tree.ts       (refatorado — optional id)
        ├── diagnose.ts          (refatorado — health check mode)
        ├── get.ts               (refatorado — include deps)
        ├── search.ts            (refatorado — include relations)
        ├── list.ts              (refatorado — include relations)
        ├── load-context.ts      (NOVO)
        ├── quickstart.ts        (NOVO)
        ├── changelog.ts         (NOVO)
        └── register.ts          (atualizado)
```

