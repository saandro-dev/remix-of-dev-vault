

# Plano de Implementacao — Lacunas do DevVault (Baseado no Relatorio Manus)

## Bug Imediato: Links Quebrados no Dashboard

O `DashboardPage.tsx` ainda referencia `/vault/frontend` (linhas 48 e 119) — rota que nao existe mais apos a consolidacao. Corrigir para `/vault`.

---

## Fase 1: Confirmacao de Exclusao (`useConfirmDelete`)

### Arquivos a criar:
- `src/components/common/ConfirmDelete.tsx` — Hook imperativo `useConfirmDelete` + componente `Bridge` que renderiza `AlertDialog`
  - Props: `resourceType`, `resourceName`, `requireTypeToConfirm`, `onConfirm`
  - Quando `requireTypeToConfirm = true`, exige digitar "EXCLUIR" para habilitar o botao

### Arquivos a alterar:
- `src/modules/vault/pages/VaultDetailPage.tsx` — Substituir o `onClick` direto do botao "Excluir" pelo `confirm()` do hook
- `src/modules/projects/pages/ProjectDetailPage.tsx` — Idem para exclusao de projeto, pasta e key
- `src/modules/bugs/pages/BugDiaryPage.tsx` — Se houver botao de deletar bug (verificar)

---

## Fase 2: Pagina de Perfil e Settings

### Arquivos a criar:
- `src/modules/settings/pages/SettingsPage.tsx` — Pagina com `Tabs` (Perfil / Conta)
  - Aba Perfil: campos `display_name`, `bio`, avatar (upload futuro)
  - Hook `useQuery` para buscar `profiles` e `useMutation` para atualizar

### Arquivos a alterar:
- `src/modules/navigation/config/navigationConfig.ts` — Adicionar item "Settings" no menu
- `src/routes/appRoutes.tsx` — Adicionar rota `/settings`
- `src/layouts/Topbar.tsx` — Adicionar link para settings no avatar/menu do usuario

### Banco de dados:
- Criar storage bucket `avatars` para upload de fotos de perfil
- Tabela `profiles` ja existe com campos corretos, nenhuma migracao necessaria

---

## Fase 3: Edicao de Modulos + Vinculos nos Bugs

### Edicao de Modulos:
- `src/modules/vault/components/EditModuleSheet.tsx` — `Sheet` com formulario pre-populado (mesmo layout do criar), `useMutation` para `update`
- Alterar `VaultDetailPage.tsx` — Adicionar botao "Editar" que abre o Sheet

### Vinculos nos Bugs:
- Alterar `BugDiaryPage.tsx` — Adicionar dois `Select`/`Combobox` no formulario de criacao:
  - Selecionar projeto (dados de `projects`)
  - Selecionar modulo do cofre (dados de `vault_modules`)
- Adicionar campo de tags (input separado por virgula, igual ao Cofre)
- Exibir projeto e modulo vinculados no card do bug

---

## Fase 4: Busca Global (Edge Function)

### Arquivos a criar:
- `supabase/functions/global-search/index.ts` — Edge Function que:
  - Recebe `query: string` via POST
  - Executa 3 buscas em paralelo com `ILIKE '%query%'` em `vault_modules.title`, `projects.name`, `bugs.title`
  - Filtra por `user_id` do JWT
  - Retorna array unificado com `{ id, title, type }`

- `src/modules/search/pages/SearchPage.tsx` — Reescrever com:
  - Input de busca com debounce
  - Chamada via `supabase.functions.invoke('global-search', ...)`
  - Resultados agrupados por tipo (Modulos, Projetos, Bugs)
  - Click navega para a pagina de detalhe correspondente

---

## Resumo de Arquivos

| Acao | Arquivo |
|------|---------|
| Corrigir | `src/modules/dashboard/pages/DashboardPage.tsx` (links `/vault/frontend` → `/vault`) |
| Criar | `src/components/common/ConfirmDelete.tsx` |
| Criar | `src/modules/settings/pages/SettingsPage.tsx` |
| Criar | `src/modules/vault/components/EditModuleSheet.tsx` |
| Criar | `supabase/functions/global-search/index.ts` |
| Alterar | `src/modules/vault/pages/VaultDetailPage.tsx` (confirm delete + botao editar) |
| Alterar | `src/modules/projects/pages/ProjectDetailPage.tsx` (confirm delete) |
| Alterar | `src/modules/bugs/pages/BugDiaryPage.tsx` (vinculos + tags + confirm delete) |
| Alterar | `src/modules/search/pages/SearchPage.tsx` (implementar busca real) |
| Alterar | `src/modules/navigation/config/navigationConfig.ts` (item Settings) |
| Alterar | `src/routes/appRoutes.tsx` (rota /settings) |
| Alterar | `src/layouts/Topbar.tsx` (link settings) |

