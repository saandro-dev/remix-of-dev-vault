

## Diagnóstico

A pergunta é excelente e a resposta é: **não precisa de documentação externa** (markdown, README, etc.). IAs não leem arquivos `.md` — elas leem **tool schemas** e **respostas estruturadas**.

### O que já existe (e funciona bem)

O protocolo MCP já fornece **auto-descoberta automática**:

1. **`tools/list`** — Quando um agente conecta, recebe automaticamente todas as 21 tools com `name`, `description` e `inputSchema`
2. **Tool descriptions** — Cada tool já tem descrições ricas (ex: `devvault_bootstrap` diz "ALWAYS call this first")
3. **Response `_hint` fields** — Respostas guiam o próximo passo (ex: "Use devvault_get to fetch full code")
4. **`_instructions` fields** — `devvault_get` já avisa sobre dependências obrigatórias

### O que está faltando

O `devvault_bootstrap` — a tool que "ALWAYS call first" — retorna apenas dados brutos do knowledge graph (domínios, módulos). Ele **não inclui um guia de workflow** explicando ao agente como usar as 21 tools de forma coordenada. Isso é o equivalente a dar a um agente um dicionário sem gramática.

---

## Solution Analysis

### Solution A: Documentação externa (markdown/README)
- Maintainability: 4/10 — Desincroniza do código inevitavelmente
- Zero TD: 3/10 — Documentação desatualizada É dívida técnica
- Architecture: 3/10 — IAs não leem arquivos estáticos — lêem tool responses
- Scalability: 4/10 — Cada nova tool requer atualização manual do doc
- Security: 10/10 — Sem impacto
- **FINAL SCORE: 4.4/10**

### Solution B: Enriquecer `devvault_bootstrap` com workflow guide inline
- Maintainability: 10/10 — Guia vive junto ao código, impossível desincronizar
- Zero TD: 10/10 — Atualização do guia = atualizar o mesmo arquivo da tool
- Architecture: 10/10 — Usa o mecanismo nativo do MCP (tool response). O agente já chama bootstrap primeiro
- Scalability: 9/10 — Novas tools = adicionar uma linha ao guia no mesmo arquivo
- Security: 10/10 — Sem impacto
- **FINAL SCORE: 9.8/10**

### DECISION: Solution B (Score 9.8)
Solution A viola o princípio fundamental: IAs consomem respostas de tools, não arquivos markdown. O bootstrap já é o ponto de entrada obrigatório — é o lugar natural para o guia.

---

## Plano de Implementação

### 1. `supabase/functions/_shared/mcp-tools/bootstrap.ts` [EDIT]

Adicionar um campo `_agent_guide` à resposta do bootstrap contendo:

- **Workflow recomendado** (bootstrap → search/list → get → implement)
- **Catálogo de tools por categoria** (Discovery, CRUD, Diagnostics, Bug Diary) com descrição de 1 linha cada
- **Regras comportamentais** (ex: "ALWAYS fetch required dependencies before implementing", "Use diary_bug to document problems encountered")
- **Anti-patterns** (ex: "Do NOT ingest without why_it_matters and code_example")

O guia será uma string estruturada dentro do JSON de resposta — exatamente como `_hint` e `_instructions` já funcionam nas outras tools.

### 2. `supabase/functions/devvault-mcp/index.ts` [EDIT]

Atualizar comentário de "Tools (19)" para "Tools (21)" — problema residual de documentação identificado.

### Arquivos Afetados

```text
supabase/functions/_shared/mcp-tools/bootstrap.ts    [EDIT]
supabase/functions/devvault-mcp/index.ts              [EDIT]
```

