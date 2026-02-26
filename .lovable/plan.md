

# Migracao: Criar Novos Secrets e Atualizar Edge Functions

## Passo 1 — Voce (Manual no Dashboard)

Em **Settings > Edge Functions > Secrets**, criar:

| Novo Secret | Valor |
|---|---|
| `DEVVAULT_PUBLISHABLE_KEY` | Valor da nova chave publicavel (`sb_publishable_...`) |
| `DEVVAULT_SECRET_KEY` | Valor da nova chave secreta (`sb_secret_...`) |

Os legados (`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) ficam la pois nao podem ser deletados, mas nenhum codigo vai referencia-los mais.

## Passo 2 — Codigo (7 arquivos)

Substituicoes em cada arquivo:

| Arquivo | De | Para |
|---|---|---|
| `supabase/functions/create-api-key/index.ts` | `SUPABASE_PUBLISHABLE_KEY` | `DEVVAULT_PUBLISHABLE_KEY` |
| | `SUPABASE_SERVICE_ROLE_KEY` | `DEVVAULT_SECRET_KEY` |
| `supabase/functions/revoke-api-key/index.ts` | `SUPABASE_PUBLISHABLE_KEY` | `DEVVAULT_PUBLISHABLE_KEY` |
| | `SUPABASE_SERVICE_ROLE_KEY` | `DEVVAULT_SECRET_KEY` |
| `supabase/functions/global-search/index.ts` | `SUPABASE_PUBLISHABLE_KEY` | `DEVVAULT_PUBLISHABLE_KEY` |
| | `SUPABASE_SERVICE_ROLE_KEY` | `DEVVAULT_SECRET_KEY` |
| `supabase/functions/vault-ingest/index.ts` | `SUPABASE_SERVICE_ROLE_KEY` | `DEVVAULT_SECRET_KEY` |
| `supabase/functions/_shared/api-key-guard.ts` | `SUPABASE_SERVICE_ROLE_KEY` | `DEVVAULT_SECRET_KEY` |
| `supabase/functions/_shared/api-audit-logger.ts` | `SUPABASE_SERVICE_ROLE_KEY` | `DEVVAULT_SECRET_KEY` |
| `supabase/functions/_shared/rate-limit-guard.ts` | `SUPABASE_SERVICE_ROLE_KEY` | `DEVVAULT_SECRET_KEY` |

## Resultado Final

| Secret | Status |
|---|---|
| `SUPABASE_URL` | Auto-injetado, manter (usado como esta) |
| `SUPABASE_DB_URL` | Auto-injetado, manter |
| `DEVVAULT_PUBLISHABLE_KEY` | **NOVO** — chave publica nova |
| `DEVVAULT_SECRET_KEY` | **NOVO** — chave secreta nova |
| `LOVABLE_API_KEY` | Interno Lovable, manter |
| `SUPABASE_ANON_KEY` | Travado, ignorado pelo codigo |
| `SUPABASE_SERVICE_ROLE_KEY` | Travado, ignorado pelo codigo |
| `SUPABASE_PUBLISHABLE_KEY` | Sera substituido por `DEVVAULT_PUBLISHABLE_KEY` |

Zero dependencia de artefatos legados. Nomenclatura propria do DevVault.

