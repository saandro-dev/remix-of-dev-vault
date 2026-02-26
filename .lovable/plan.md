

# Validacao do Sistema de API — Diagnostico Completo

## Resultado dos Testes

Todas as 5 Edge Functions estao deployadas e respondendo. Os testes de rejeicao (sem credenciais) passaram corretamente:

| Endpoint | Teste | Resultado |
|---|---|---|
| `vault-ingest` POST sem API key | 401 INVALID_API_KEY | CORRETO |
| `vault-ingest` GET | 405 Only POST allowed | CORRETO |
| `create-api-key` POST sem JWT | 401 Missing authorization | CORRETO |
| `revoke-api-key` POST sem JWT | 401 Missing authorization | CORRETO |
| `global-search` POST sem JWT | 401 Missing authorization | CORRETO |

## Bugs Criticos Encontrados

### Bug 1: `auth.getClaims()` nao existe no supabase-js v2

Os arquivos `create-api-key/index.ts` e `revoke-api-key/index.ts` usam `userClient.auth.getClaims(token)` — esse metodo **nao existe** no supabase-js v2. Isso significa que criar e revogar chaves vai falhar com erro 500 quando um usuario autenticado tentar usar.

**Correcao**: Substituir por `auth.getUser(token)` (mesmo padrao ja usado corretamente no `global-search/index.ts`).

### Bug 2: Nomenclatura de secrets inconsistente

Os mesmos dois arquivos usam `Deno.env.get("SUPABASE_ANON_KEY")` enquanto o padrao do projeto (e o `global-search`) usa `SUPABASE_PUBLISHABLE_KEY`. Ambos secrets existem no Supabase, entao nao vai dar erro de runtime, mas viola o padrao unico do projeto.

**Correcao**: Trocar `SUPABASE_ANON_KEY` por `SUPABASE_PUBLISHABLE_KEY` nos dois arquivos.

## O Que Esta Correto

- Tabelas `devvault_api_keys`, `devvault_api_audit_log`, `devvault_api_rate_limits` — criadas com RLS correto
- Funcoes SQL `create_devvault_api_key`, `validate_devvault_api_key`, `revoke_devvault_api_key` — usando Supabase Vault corretamente
- `api-helpers.ts`, `api-key-guard.ts`, `api-audit-logger.ts`, `rate-limit-guard.ts` — implementados
- `vault-ingest` — validacao Zod correta, schema mapeado para campos reais
- `ApiKeysPage.tsx` — frontend completo com criacao, listagem, revogacao e reveal unico
- `supabase/config.toml` — 4 functions registradas com `verify_jwt = false`
- Rotas e navegacao — `/settings/api-keys` registrada e linkada

## Plano de Correcao (2 arquivos)

### 1. `supabase/functions/create-api-key/index.ts`
- Linha 34: `SUPABASE_ANON_KEY` → `SUPABASE_PUBLISHABLE_KEY`
- Linhas 42-48: Substituir bloco `getClaims` por `auth.getUser(token)`, extrair `user.id`

### 2. `supabase/functions/revoke-api-key/index.ts`
- Linha 24: `SUPABASE_ANON_KEY` → `SUPABASE_PUBLISHABLE_KEY`
- Linhas 31-37: Substituir bloco `getClaims` por `auth.getUser(token)`, extrair `user.id`

