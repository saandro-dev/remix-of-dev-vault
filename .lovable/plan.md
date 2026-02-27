

# Relatório de Validação Final — Remediação RBAC + CORS

## Veredicto: NÃO FOI SUCESSO TOTAL — Restam Violações da Regra 5.4

---

## O que PASSOU ✅

| Verificação | Status |
|---|---|
| Dead code (`corsHeaders` wildcard, `handleCors()`, `DOMAIN_LABELS`, etc.) | REMOVIDO |
| Todas as 14 Edge Functions usando `handleCorsV2` + `createSuccessResponse(req, ...)` | OK |
| `auth.ts` propagando `req` para CORS seguro | OK |
| Regra 5.5 — Zero `supabase.from()` ou `supabase.rpc()` no frontend | OK |
| `profiles-crud` — ERROR_CODES corrigidos | OK |
| `vault-query` — signatures corrigidas | OK |
| `.lovable/plan.md` atualizado (sem XState) | OK |
| Deploy de todas as 14 Edge Functions | OK |

---

## O que FALHOU ❌ — Comentários em Português (Regra 5.4)

A remediação traduziu os 4 shared helpers (`api-helpers.ts`, `cors-v2.ts`, `sentry.ts`, `auth.ts`), mas **NÃO tocou** nos seguintes arquivos que ainda têm comentários em português:

### Arquivos com comentários PT restantes:

| Arquivo | Exemplos de violação |
|---|---|
| `supabase/functions/_shared/supabase-client.ts` | "Sistema de Multi-Keys por Domínio", "Mapa de domínio → variável de ambiente", "Funções críticas (criar/revogar API keys)", "Operações de leitura/escrita do dashboard", "Fallback para compatibilidade durante a migração", "Cria e retorna um cliente Supabase", "Valida um JWT de usuário" |
| `supabase/functions/_shared/api-key-guard.ts` | "Guard de autenticação por API Key", "Valida API Keys externas usando a função SQL vault-backed" |
| `supabase/functions/_shared/rate-limit-guard.ts` | "Padrão extraído do RiseCheckout", "evitar race conditions em ambientes de alta concorrência" |
| `supabase/functions/_shared/logger.ts` | "Inclui correlation-id para rastreamento", "Padrão extraído do RiseCheckout" |
| `supabase/functions/revoke-api-key/index.ts` | "Rate limiting por IP", "Autenticação do usuário via JWT", "Validação do payload", "Revogar a chave via função SQL vault-backed" |
| `supabase/functions/create-api-key/index.ts` | "Rate limiting por IP (proteção contra abuso)", "Autenticação do usuário via JWT", "Validação do payload", "Criar a chave via função SQL vault-backed" |
| `supabase/functions/global-search/index.ts` | "Rate limiting por IP (limite generoso)", "Autenticação do usuário via JWT", "Validação do payload" |

**Total: 7 arquivos com comentários em português que violam a Regra 5.4.**

---

## Plano de Correção

### Passo único: Traduzir comentários PT → EN nos 7 arquivos restantes

Substituir todos os inline comments e JSDoc em português por equivalentes em inglês técnico. Não há mudanças de lógica — apenas tradução de comentários.

### Arquivos a modificar:
```text
supabase/functions/_shared/supabase-client.ts
supabase/functions/_shared/api-key-guard.ts
supabase/functions/_shared/rate-limit-guard.ts
supabase/functions/_shared/logger.ts
supabase/functions/revoke-api-key/index.ts
supabase/functions/create-api-key/index.ts
supabase/functions/global-search/index.ts
```

Após isso, a conformidade com o Protocolo DevVault V1 será **100%**.

