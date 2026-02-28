

## Plano: Correcao de Qualidade de Dados do MCP + Restauracao do config.toml

### Contexto

O relatorio do agente identificou 6 problemas. Alem disso, a reconexao do Supabase removeu as configuracoes de `verify_jwt = false` do `config.toml`, o que quebrara TODAS as Edge Functions em producao.

### Problema Critico (Pre-requisito)

O diff mostra que `supabase/config.toml` perdeu todas as 15 entradas `[functions.*] verify_jwt = false`. Sem isso, as Edge Functions rejeitam requests sem JWT valido, quebrando o MCP e o frontend inteiro. Isso precisa ser restaurado ANTES de qualquer correcao de dados.

### Estrutura de Execucao

```text
1. RESTAURAR config.toml          (codigo — config perdido na reconexao)
2. UPDATE usage_hint               (dados — 33 modulos)
3. UPDATE why_it_matters           (dados — ~13 modulos vazios)
4. INSERT dependencies             (dados — 7 modulos whatsapp)
5. UPDATE titulos para ingles      (dados — ~19 modulos em portugues)
6. UPDATE code_example             (dados — ~12 modulos sem exemplo)
```

### Detalhamento

**Passo 1 — Restaurar `supabase/config.toml`**
Reescrever o arquivo com todas as 15 Edge Functions configuradas com `verify_jwt = false`. Funcoes: `global-search`, `vault-ingest`, `create-api-key`, `revoke-api-key`, `vault-crud`, `projects-crud`, `folders-crud`, `project-api-keys-crud`, `bugs-crud`, `dashboard-stats`, `list-devvault-keys`, `profiles-crud`, `vault-query`, `admin-crud`, `devvault-mcp`.

**Passo 2 — Preencher `usage_hint` em todos os 33 modulos**
Executar UPDATE SQL em lote. Formato padrao: `"Use when [situacao especifica]"`. Exemplos:
- `evolution-api-v2-client` → `"Use when integrating with Evolution API v2 for WhatsApp automation"`
- `rate-limit-guard` → `"Use when adding rate limiting to Edge Functions to prevent abuse"`
- `saas-playbook-phase-1` → `"Use when starting a new SaaS project to set up the foundation correctly"`

**Passo 3 — Preencher `why_it_matters` nos ~13 modulos vazios**
Foco nos 7 modulos do grupo `whatsapp-integration` + outros sem o campo. Formato: 1-2 frases sobre consequencia de NAO usar.

**Passo 4 — Inserir dependencias no grupo `whatsapp-integration`**
INSERT na tabela `vault_module_dependencies` com a estrutura de dependencias real:
- Modulo 2 (types) depende de 1 (client) — required
- Modulo 4 (webhook) depende de 1, 2 — required
- Modulo 5 (template) depende de 2 — required
- Modulo 6 (dispatcher) depende de 1, 2, 5 — required
- Modulo 7 (hooks) depende de 2 — required

**Passo 5 — Traduzir titulos/descricoes para ingles**
UPDATE nos ~19 modulos com titulos em portugues. Exemplos:
- `"Schema SQL para Automacao de WhatsApp"` → `"SQL Schema for WhatsApp Automation"`
- `"Padrão de Respostas de API"` → `"API Response Helpers Pattern"`

**Passo 6 — Adicionar `code_example` nos modulos sem**
Foco nos 7 modulos do `whatsapp-integration` e outros sem exemplo. Requer leitura do `code` de cada modulo para gerar exemplos de uso coerentes.

### Estimativa

- Passo 1: 1 arquivo de codigo
- Passos 2-6: ~8-10 blocos de SQL UPDATE/INSERT executados via ferramenta de dados
- Nenhuma alteracao de schema necessaria (todas as colunas ja existem)

