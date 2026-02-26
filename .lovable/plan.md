

# Diagnostico: Edge Function `create-api-key` falha na verificacao de JWT

## Investigacao

A edge function responde corretamente (retorna 401 sem auth header, como esperado). O problema ocorre quando o frontend envia o JWT do usuario — a verificacao via `getUser(token)` falha.

## Causa Raiz

A edge function usa `userClient.auth.getUser(token)` para verificar o JWT. Este metodo faz uma chamada HTTP ao Supabase Auth API, enviando o `apikey` header do cliente. Com o novo sistema de signing-keys e o formato `sb_publishable_...`, o `getUser()` pode falhar porque a versao do supabase-js carregada via `esm.sh/@supabase/supabase-js@2` pode nao suportar o novo formato de chave corretamente.

A documentacao da plataforma e explicita: **"Supabase's signing-keys system is used. Validate JWTs in code using `getClaims()`."**

`getClaims(jwt)` valida o JWT localmente sem depender do apikey header, eliminando o problema.

## Plano de Execucao

### Passo 1 — Atualizar `create-api-key/index.ts`

Substituir `getUser(token)` por `getClaims(token)`. Extrair `userId` de `data.claims.sub`. Manter o `serviceClient` com `DEVVAULT_SECRET_KEY` para o RPC (esse funciona pois e service role, nao depende de publishable key para auth).

### Passo 2 — Atualizar `revoke-api-key/index.ts`

Mesma substituicao: `getUser(token)` → `getClaims(token)`.

### Passo 3 — Atualizar `global-search/index.ts` e `vault-ingest/index.ts`

Verificar se usam `getUser()` e substituir por `getClaims()` onde aplicavel.

### Passo 4 — Adicionar logging temporario

Adicionar `console.log` para verificar se os secrets estao presentes (sem logar valores) e capturar erros especificos. Isso permite diagnosticar se ha problemas residuais.

### Arquivos Afetados

```text
supabase/functions/
  create-api-key/index.ts    ← getClaims + logging
  revoke-api-key/index.ts    ← getClaims + logging
  global-search/index.ts     ← verificar e atualizar
  vault-ingest/index.ts      ← verificar e atualizar
```

