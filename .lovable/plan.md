

# Diagnostico: "Legacy API keys are disabled" no Login

## Causa Raiz

A reconexao do Supabase sobrescreveu `src/integrations/supabase/client.ts` com a chave legada (JWT `eyJhbGci...`). O diff confirma:

```text
- const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
+ const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIs...";  ← CHAVE ANTIGA
```

Esta chave foi desativada no dashboard. O frontend precisa usar `sb_publishable_XlH73lxriQdgud9WSQZ6Eg_paORcfoT`.

## Plano

### Passo 1 — Corrigir `src/integrations/supabase/client.ts`

Substituir a chave JWT hardcoded pela nova publishable key. Restaurar a leitura via `import.meta.env` com fallback para a chave correta, garantindo resiliencia contra futuras reconexoes.

### Passo 2 — Corrigir `supabase/config.toml`

A reconexao tambem removeu as configuracoes `verify_jwt = false` das edge functions. Restaurar essas configuracoes para `create-api-key`, `revoke-api-key`, `global-search` e `vault-ingest`.

### Arquivos Afetados

```text
src/integrations/supabase/client.ts  ← chave publishable correta
supabase/config.toml                 ← restaurar verify_jwt = false
```

