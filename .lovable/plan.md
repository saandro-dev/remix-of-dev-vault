

# Diagnostico: Dois Problemas Distintos

## Problema 1 — Causa Raiz do Login
O arquivo `src/integrations/supabase/client.ts` (linha 6) tem a **chave JWT legada hardcoded**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
O Supabase desativou as chaves legadas, por isso o erro "Chaves de API legadas estao desativadas". O frontend esta tentando autenticar com uma chave morta.

Este arquivo e auto-gerado pelo Lovable e nao usa a variavel de ambiente `VITE_SUPABASE_PUBLISHABLE_KEY` do `.env`. Precisa ser atualizado.

## Problema 2 — Crash "removeChild"
Erro secundario. O Supabase retorna erro de autenticacao, o React tenta renderizar o toast de erro, e o error boundary do React colide com o DOM causando o `removeChild`. Resolver o Problema 1 elimina este crash.

Como medida defensiva, adicionar `dedupe` no `vite.config.ts` para prevenir instancias duplicadas do React.

## Plano de Execucao

### Passo 1 — Atualizar `client.ts` para usar variavel de ambiente
Modificar `src/integrations/supabase/client.ts` para ler `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` do `import.meta.env` em vez de valores hardcoded. Isso torna o cliente resiliente a mudancas de chave sem precisar reconectar.

### Passo 2 — Atualizar `.env` com a nova chave
Substituir o valor de `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env` pelo valor da nova chave publicavel (`sb_publishable_...`).

**Voce precisara fornecer o valor da nova publishable key** para que eu atualize o `.env`.

### Passo 3 — Adicionar `dedupe` no `vite.config.ts`
Adicionar `dedupe: ["react", "react-dom", "react/jsx-runtime"]` para prevenir instancias duplicadas do React.

### Arvore de Arquivos Afetados

```text
src/
  integrations/supabase/
    client.ts          ← ler de import.meta.env
.env                   ← novo valor da publishable key
vite.config.ts         ← adicionar dedupe
```

