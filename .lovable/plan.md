

## Diagnostico

Os logs da Edge Function `vault-crud` mostram repetidamente:

```
"column vm.usage_hint does not exist"
```

A tabela `vault_modules` **nao possui** a coluna `usage_hint`. Porem, tres funcoes SQL do banco a referenciam:

1. `get_visible_modules` — usada pelo `vault-crud` action `list`
2. `query_vault_modules` — usada pelo MCP list/search
3. `get_vault_module` — usada pelo MCP get

Quando o frontend chama `vault-crud` com `action: "list"`, a RPC `get_visible_modules` falha com erro 500 porque tenta fazer `SELECT ... vm.usage_hint ...` em uma coluna inexistente. Resultado: 0 modulos.

## Causa Raiz

Desalinhamento entre o schema da tabela e as funcoes SQL. As funcoes foram criadas/atualizadas referenciando `usage_hint`, mas a migration para adicionar essa coluna nunca foi executada.

## Correcao

**Uma unica migration SQL** que adiciona a coluna faltante:

```sql
ALTER TABLE public.vault_modules
  ADD COLUMN IF NOT EXISTS usage_hint TEXT DEFAULT NULL;
```

Isso resolve imediatamente o erro nas tres funcoes SQL sem necessidade de alterar nenhum codigo no frontend ou nas Edge Functions.

### Arvore de arquivos

```text
MIGRATE  ADD COLUMN usage_hint TO vault_modules
```

Nenhum arquivo de codigo precisa ser alterado — o problema e exclusivamente no schema do banco.

