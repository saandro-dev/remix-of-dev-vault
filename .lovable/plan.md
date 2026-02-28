

## Diagnóstico: Por que apenas 50 módulos aparecem

A causa raiz está em **duas camadas** que limitam os resultados:

### 1. Frontend hardcoded `limit: 50` (linha 34 de `useVaultModules.ts`)
```typescript
limit: filters?.limit ?? 50,
```
O hook **sempre** pede no máximo 50 módulos ao backend. Sem paginação implementada, os demais são invisíveis.

### 2. Sem mecanismo de paginação na UI (`VaultListPage.tsx`)
A página renderiza `modules.map(...)` sem botão "Load More", scroll infinito, ou controle de página. Mesmo que o backend retornasse 1000, a UI não tem como navegar além do primeiro lote.

### 3. Contagem incorreta
A contagem exibida ("50 modules") vem de `allModules?.length` — que também está limitada a 50 pelo mesmo hook. O usuário não sabe quantos módulos realmente existem.

---

## Plano de Implementação — Paginação Completa

### Fase 1: Backend — Retornar `total` real da RPC
- A RPC `get_visible_modules` precisa retornar o count total (não apenas os itens paginados)
- O `vault-crud` action `list` atualmente faz `total: (data ?? []).length` — isso é o count da página, não o total real
- Criar migration para atualizar a RPC com `COUNT(*) OVER()` como coluna extra

### Fase 2: Hook — Suportar paginação e total real
- Alterar `useVaultModules` para retornar `{ items, total }` em vez de apenas `items`
- Manter `limit: 50` por página (performance), mas expor `offset` controlável

### Fase 3: UI — Implementar "Load More" ou paginação
- Adicionar botão "Load More" no final da lista
- Exibir contagem real: "Showing 50 of 312 modules"
- Carregar próximos 50 ao clicar

### Arquivos Afetados

```text
supabase/migrations/XXXXXX_update_rpc_total_count.sql   [NEW]
src/modules/vault/hooks/useVaultModules.ts               [EDIT]
src/modules/vault/pages/VaultListPage.tsx                [EDIT]
src/i18n/locales/en.json                                 [EDIT]
src/i18n/locales/pt-BR.json                              [EDIT]
```

