

## Diagnóstico

**Causa-raiz**: A linha `v_tokens := array(SELECT unnest(v_tokens) WHERE length(unnest) >= 1)` trata `unnest` como coluna, mas no PostgreSQL `unnest()` é uma set-returning function e precisa de alias quando referenciada no `WHERE`.

Erro idêntico em ambas as funções:
- `hybrid_search_vault_modules` 
- `query_vault_modules`

## Correção

Uma única migration SQL que recria ambas as funções, alterando apenas a linha problemática:

```sql
-- DE (quebrado):
v_tokens := array(SELECT unnest(v_tokens) WHERE length(unnest) >= 1);

-- PARA (correto):
v_tokens := array(SELECT t FROM unnest(v_tokens) AS t WHERE length(t) >= 1);
```

## Arquivos Afetados

```text
supabase/migrations/XXXX_fix_unnest_alias.sql  [NEW — fix syntax in both functions]
```

Zero alterações em TypeScript. Zero alterações em documentação (a lógica não muda, apenas a sintaxe SQL é corrigida).

