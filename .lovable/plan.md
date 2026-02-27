

# Plano: DevVault MCP Server — Servidor Universal para Agentes de IA

## Investigacao Profunda

Ao auditar o codigo existente, identifiquei **2 inconsistencias criticas** que devem ser corrigidas antes (ou junto com) a implementacao do MCP:

1. **`api-key-guard.ts`**: Exporta apenas `requireApiKeyAuth(req)`, mas `vault-query` e `vault-ingest` importam `validateApiKey(supabase, key)` — funcao inexistente no arquivo. O arquivo precisa exportar ambas as funcoes, ou a funcao foi atualizada e o contexto mostrado esta desatualizado. O MCP server precisa usar a mesma funcao de validacao.

2. **`dependency-helpers.ts`**: Importa `log` de `./logger.ts`, mas o logger exporta `createLogger` (que retorna um objeto com `.info()`, `.warn()`, etc.), nao uma funcao `log`. Isso causaria erro em runtime.

Essas inconsistencias serao corrigidas como parte da implementacao.

---

## Arquitetura do MCP Server

```text
┌──────────────────────────────────────────────────────────────┐
│  Agente IA (Lovable / Cursor / Cline / Manus)               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ MCP Client → SSE/HTTP Transport                       │  │
│  │ URL: https://bskfnthw...supabase.co/functions/v1/     │  │
│  │      devvault-mcp                                     │  │
│  │ Header: X-DevVault-Key: dvlt_xxxxx                    │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Edge Function: devvault-mcp/index.ts                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Hono Router  │→ │ Auth Guard   │→ │ MCP Server       │   │
│  │ (all /*)     │  │ (X-DevVault  │  │ (mcp-lite)       │   │
│  │              │  │  -Key)       │  │                  │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                                        │                     │
│                    ┌───────────────────┼──────────────┐      │
│                    │                   │              │      │
│              devvault_bootstrap  devvault_search  devvault_get│
│              devvault_list       devvault_domains devvault_ingest│
│                    │                   │              │      │
│                    ▼                   ▼              ▼      │
│              Supabase RPCs (bootstrap_vault_context,         │
│              query_vault_modules, get_vault_module, etc.)    │
└──────────────────────────────────────────────────────────────┘
```

---

## Arquivos

```text
CREATE   supabase/functions/devvault-mcp/index.ts       (MCP Server Edge Function)
CREATE   supabase/functions/devvault-mcp/deno.json       (mcp-lite + hono deps)
MODIFY   supabase/functions/_shared/api-key-guard.ts     (add validateApiKey export)
MODIFY   supabase/functions/_shared/dependency-helpers.ts (fix logger import)
MODIFY   supabase/config.toml                            (register devvault-mcp)
```

---

## Implementacao

### 1. Fix `api-key-guard.ts` — Adicionar `validateApiKey`

Adicionar funcao `validateApiKey(client, rawKey)` que recebe um SupabaseClient e a chave raw, retornando `{ valid: boolean, user_id?: string, key_id?: string }`. Manter `requireApiKeyAuth` para backward compatibility.

### 2. Fix `dependency-helpers.ts` — Corrigir import do logger

Substituir `import { log } from "./logger.ts"` por `import { createLogger } from "./logger.ts"` e usar `const logger = createLogger("dependency-helpers")` com chamadas `logger.info(...)`.

### 3. `supabase/functions/devvault-mcp/deno.json`

Declarar dependencias:
- `"mcp-lite": "npm:mcp-lite@^0.10.0"`
- `"hono": "https://deno.land/x/hono@v4.4.0/mod.ts"`

### 4. `supabase/functions/devvault-mcp/index.ts`

Edge Function com Hono + mcp-lite expondo 6 tools:

| Tool | Descricao para o LLM | Input Schema |
|------|----------------------|-------------|
| `devvault_bootstrap` | "ALWAYS call this first. Returns the full index of the DevVault Knowledge Graph: domains, playbook phases, and top validated modules. Use this to understand what knowledge is available before searching." | `{}` (no params) |
| `devvault_search` | "Search the Knowledge Graph by intent. Returns modules matching your query with relevance scoring. Use filters to narrow by domain or type." | `{ query?, domain?, module_type?, tags?, limit? }` |
| `devvault_get` | "Fetch a specific module by ID or slug. Returns full code, context, and a dependencies array. CRITICAL: If any dependency has dependency_type='required', you MUST call devvault_get for each required dependency BEFORE implementing this module." | `{ id?, slug? }` |
| `devvault_list` | "List modules with optional filters. No text search — use devvault_search for that." | `{ domain?, module_type?, limit?, offset? }` |
| `devvault_domains` | "List all available knowledge domains with module counts and types." | `{}` |
| `devvault_ingest` | "Save new knowledge modules to the vault. Use after successfully implementing a pattern worth preserving." | `{ title, code, domain?, module_type?, tags?, ... }` |

Fluxo de autenticacao:
1. Extrair `X-DevVault-Key` do header do request HTTP
2. Validar via `validateApiKey`
3. Se invalido, retornar erro MCP antes de processar qualquer tool call
4. Se valido, processar tool calls usando `getSupabaseClient("general")`

Rate limiting: Reutilizar `checkRateLimit` com config especifica para MCP (120 req/min dado que agentes fazem chamadas encadeadas).

### 5. `supabase/config.toml`

Adicionar:
```toml
[functions.devvault-mcp]
verify_jwt = false
```

---

## Descricoes das Tools (System Prompt Dinamico)

As descricoes das tools sao o "system prompt" para o agente consumidor. Cada descricao instrui explicitamente o LLM sobre:
- **Ordem de chamada**: bootstrap primeiro, depois search/get
- **Navegacao HATEOAS**: quando `devvault_get` retorna dependencias `required`, o LLM DEVE buscar cada uma antes de implementar
- **Contexto de uso**: quando usar cada tool

---

## Exemplo de Conexao no Cliente

URL: `https://bskfnthwewhpfrldbhqx.supabase.co/functions/v1/devvault-mcp`
Transport: Streamable HTTP (mcp-lite default)
Header: `X-DevVault-Key: dvlt_xxxxxxxx...`

