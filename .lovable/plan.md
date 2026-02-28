

## Auditoria do MCP v5.0.0 — Problemas Encontrados

Após leitura completa de todos os arquivos modificados/criados, identifiquei **3 problemas críticos** e **1 violação de protocolo**:

---

### PROBLEMA CRÍTICO 1: Duas versões de `hybrid_search_vault_modules` no banco

A migration usou `CREATE OR REPLACE`, mas como o tipo do parâmetro `p_query_embedding` mudou de `extensions.vector` para `text`, o PostgreSQL **criou uma SEGUNDA overload** em vez de substituir a primeira. A listagem de db-functions confirma: existem **duas funções com o mesmo nome** — uma com `extensions.vector` e outra com `text`.

Isso pode causar ambiguidade na chamada RPC. A versão antiga (com `extensions.vector`) precisa ser **dropada explicitamente**.

**Correção:** Nova migration para `DROP FUNCTION public.hybrid_search_vault_modules(text, extensions.vector, text, text, text[], integer, double precision, double precision);`

---

### PROBLEMA CRÍTICO 2: `diagnose.ts` tem 302 linhas (limite é 300)

Violação direta do §5.4 do protocolo: *"Limite de 300 Linhas: Arquivos maiores são God Objects — refatore imediatamente."*

**Correção:** Extrair `handleTroubleshooting` para um arquivo separado `diagnose-troubleshoot.ts` (~165 linhas), mantendo `diagnose.ts` como orquestrador (~140 linhas).

---

### PROBLEMA CRÍTICO 3: `EDGE_FUNCTIONS_REGISTRY.md` desatualizado

O documento ainda referencia:
- MCP Server **v4.1** (deveria ser **v5.0**)
- **16 tools** (deveria ser **19 tools**)
- Não menciona as 3 novas tools: `devvault_load_context`, `devvault_quickstart`, `devvault_changelog`
- Não menciona as melhorias (batch mode, health check, relation enrichment)

**Correção:** Atualizar badge, contagem, descrição do `devvault-mcp` na tabela de registro.

---

### PROBLEMA 4: `plan.md` contém plano já executado

O arquivo `.lovable/plan.md` ainda contém o plano da implementação que já foi concluída. Deveria ser limpo ou marcado como "EXECUTED".

**Correção:** Limpar o arquivo.

---

## Plano de Correção

1. **Drop da overload antiga de `hybrid_search_vault_modules`** — migration SQL
2. **Refatorar `diagnose.ts`** — extrair `handleTroubleshooting` para `diagnose-troubleshoot.ts`
3. **Atualizar `EDGE_FUNCTIONS_REGISTRY.md`** — v5.0, 19 tools, novas tools documentadas
4. **Limpar `.lovable/plan.md`**

