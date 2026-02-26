

# Consolidar Cofre Global em Uma Unica Pagina com Filtros

## Mudancas

### 1. Sidebar (`navigationConfig.ts`)
Substituir os 4 itens do grupo "Cofre Global" (Frontend, Backend, DevOps, Seguranca) por um unico item:
- `{ id: "vault", label: "Cofre Global", icon: Code2, path: "/vault" }`

### 2. Rota (`appRoutes.tsx`)
- Alterar `vault/:category` para simplesmente `vault`
- Manter `vault/:moduleId` para detalhe do modulo

### 3. VaultListPage
- Remover dependencia de `useParams` para category
- Buscar TODOS os modulos sempre (sem filtro por rota)
- Adicionar `FilterPills` de categoria no topo (Todos / Frontend / Backend / DevOps / Seguranca) como filtro client-side
- Adicionar estado `selectedCategory` que filtra junto com search e tags
- Ao navegar para detalhe: `/vault/${mod.id}` (sem category no path)

### 4. VaultDetailPage
- Ajustar rota de volta para `/vault` em vez de `/vault/:category`

### Arquivos afetados
1. `src/modules/navigation/config/navigationConfig.ts` — 4 items → 1 item
2. `src/routes/appRoutes.tsx` — rota `vault/:category` → `vault`, `vault/:category/:moduleId` → `vault/:moduleId`
3. `src/modules/vault/pages/VaultListPage.tsx` — adicionar FilterPills de categoria, remover useParams
4. `src/modules/vault/pages/VaultDetailPage.tsx` — ajustar link de volta

