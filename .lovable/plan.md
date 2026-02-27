

# Diagnostico: Por que os modulos somem (0 modules)

## Duas causas raiz encontradas

### Causa 1 (CRITICA): `vault-crud` nao consegue inicializar

Os logs do Supabase mostram:

```
worker boot error: The requested module '../_shared/dependency-helpers.ts'
does not provide an export named 'handleAddDependency'
```

O arquivo `dependency-helpers.ts` exporta apenas `enrichModuleDependencies` e `batchInsertDependencies`. Porem `vault-crud/index.ts` linha 7-12 importa tres funcoes que **nao existem**: `handleAddDependency`, `handleRemoveDependency`, `handleListDependencies`.

Como a Edge Function crasha no boot, **TODAS** as operacoes do vault (list, get, create, update, delete) falham. O frontend recebe erro, interpreta como lista vazia, e mostra "0 modules".

### Causa 2: `supabase-config.ts` ainda usa chave `sb_publishable_`

O `client.ts` importa de `supabase-config.ts` que forca a chave `sb_publishable_XlH73lxriQdgud9WSQZ6Eg_paORcfoT`. Mesmo com as legacy keys reativadas, essa chave nao e um JWT valido e pode causar falhas de autenticacao intermitentes.

---

## Plano de correcao

### 1. Criar as 3 funcoes faltantes em `dependency-helpers.ts`

Adicionar `handleAddDependency`, `handleRemoveDependency`, e `handleListDependencies` ao arquivo. Estas funcoes ja sao chamadas no `vault-crud/index.ts` (linhas 255-261), entao a assinatura deve receber `(req, client, userId/body)` e retornar `Response`.

### 2. Remover `supabase-config.ts` e restaurar `client.ts`

- Deletar `src/lib/supabase-config.ts`
- Restaurar `client.ts` para usar as variaveis de ambiente padrao do Lovable (`import.meta.env.VITE_SUPABASE_URL` e `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`)
- Atualizar comentarios para ingles (Protocolo V2 §8.1)

### 3. Re-deploy da Edge Function

O deploy e automatico apos editar o arquivo.

```text
MODIFY  supabase/functions/_shared/dependency-helpers.ts  — add 3 missing handler functions
DELETE  src/lib/supabase-config.ts                         — remove sb_publishable_ override
MODIFY  src/integrations/supabase/client.ts                — use Lovable env vars + English comments
```

