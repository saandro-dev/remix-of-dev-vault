

## Paginação — Implementado ✅

### Problema
O frontend limitava a listagem a 50 módulos sem paginação. A contagem exibida era incorreta (baseada no array retornado, não no total real).

### Solução Implementada

1. **RPC `get_visible_modules`** — Adicionado `COUNT(*) OVER()::BIGINT AS total_count` ao retorno. Agora cada row inclui o total real de registros que atendem aos filtros, independente do `LIMIT/OFFSET`.

2. **Edge Function `vault-crud`** (action `list`) — Extrai `total_count` da primeira row e remove o campo antes de enviar ao frontend. Retorna `{ items, total }` com o total real.

3. **Hook `useVaultModules`** — Migrado de `useQuery` para `useInfiniteQuery` com `PAGE_SIZE = 50`. Suporta `getNextPageParam` para carregar páginas adicionais automaticamente.

4. **UI `VaultListPage`** — Refatorada em 3 componentes:
   - `VaultListPage.tsx` — Página principal com Load More
   - `VaultModuleCard.tsx` — Card individual extraído
   - `VaultDomainFilters.tsx` — Filtros de domínio extraídos
   - Exibe "Showing X of Y modules" e botão "Load More"

5. **i18n** — Adicionadas keys `vault.loadMore` e `vault.showingOf` em EN e PT-BR.

### Arquivos Afetados
```
supabase/migrations/*_drop_recreate_get_visible_modules.sql  [NEW]
supabase/functions/vault-crud/index.ts                        [EDIT]
src/modules/vault/hooks/useVaultModules.ts                    [EDIT]
src/modules/vault/pages/VaultListPage.tsx                     [EDIT]
src/modules/vault/components/VaultModuleCard.tsx               [NEW]
src/modules/vault/components/VaultDomainFilters.tsx            [NEW]
src/modules/bugs/components/BugCreateDialog.tsx                [EDIT]
src/modules/bugs/pages/BugDiaryPage.tsx                        [EDIT]
src/i18n/locales/en.json                                       [EDIT]
src/i18n/locales/pt-BR.json                                    [EDIT]
```
