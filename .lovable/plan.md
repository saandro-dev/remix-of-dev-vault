

# Auditoria do Plano Manus: Sistema de Visibilidade em 3 Camadas

## Veredicto: PLANO COM FALHAS ESTRUTURAIS — Requer Correções Significativas

---

## Falhas Identificadas no Plano Manus

### CRITICA 1: Ordem das Tarefas Invertida (Seguranca por Ultimo)

O plano coloca RLS como Tarefa 4 (prioridade "MEDIA"), **depois** do backend e frontend. Isso significa que entre a Tarefa 1 (migration) e a Tarefa 4, o banco fica **sem politicas de seguranca adequadas** para a nova coluna `visibility` e a tabela `vault_module_shares`. RLS deve ser parte da migration, nao um afterthought.

### CRITICA 2: Nao Atualiza 6 Funcoes SQL que Referenciam `is_public`

Ao dropar `is_public`, as seguintes funcoes SQL **quebram imediatamente**:

| Funcao | Referencia a `is_public` |
|--------|--------------------------|
| `bootstrap_vault_context()` | `vm.is_public = true` (3x) |
| `query_vault_modules()` | `vm.is_public = true` |
| `get_vault_module()` | `vm.is_public = true` |
| `list_vault_domains()` | `vm.is_public = true` |
| `search_vault_modules()` | `vm.is_public = true` |
| RLS policy original | `is_public = true` |

O plano da Manus **nao menciona nenhuma dessas funcoes**. O banco quebraria completamente.

### CRITICA 3: `vault-ingest` e `vault-query` Nao Atualizados

Ambas as Edge Functions referenciam `is_public`:
- `vault-ingest`: linha 131 (`is_public: m.is_public ?? false`) e linha 178 (allowed fields)
- `vault-query`: usa RPCs que referenciam `is_public`

O plano so menciona `vault-crud`.

### CRITICA 4: `global-search` Referencia Coluna `category` (Bug Pre-Existente)

`global-search/index.ts` linha 60: `.select("id, title, category")` — a coluna `category` ja foi renomeada para `domain`. Este bug pre-existente deve ser corrigido nesta mesma migration.

### MEDIA 1: RPC `get_visible_modules` Sem Filtros

A funcao proposta retorna `SETOF vault_modules` sem parametros de filtro (domain, query, etc.). Isso forca o backend a fazer filtragem em memoria, violando Clean Architecture — a filtragem deve ser no banco.

### MEDIA 2: Auto-Mudanca de Visibility no `share`

O plano sugere que ao fazer `share`, a visibility muda automaticamente para `'shared'`, e ao fazer `unshare` (se nao sobrar ninguem) muda para `'private'`. Isso acopla estado de compartilhamento com estado de visibilidade. A visibility deve ser um campo controlado **explicitamente** pelo usuario.

### MEDIA 3: Comentarios em Portugues nos SQL

Os exemplos de migration contem comentarios em PT: "Adiciona a nova coluna", "Migra os dados existentes", "Remove a coluna antiga", etc.

### BAIXA 1: 4 Migrations Separadas Desnecessarias

Com zero usuarios, nao ha razao para 4 migrations. Uma unica migration atomica e mais segura e correta.

---

## Plano Corrigido

### Etapa 1 — Migration SQL Unica (Atomica)

Um unico arquivo de migration que faz **tudo**:

1. Criar enum `visibility_level` (`private`, `shared`, `global`)
2. Adicionar coluna `visibility` com default `'private'`
3. Migrar dados: `UPDATE SET visibility = 'global' WHERE is_public = true`
4. Criar tabela `vault_module_shares` com composite PK, `shared_by_user_id`, e timestamps
5. **Recriar TODAS as 5 funcoes SQL** substituindo `is_public = true` por `visibility = 'global'`
6. Criar nova RPC `get_visible_modules(p_user_id, p_scope, p_domain, p_module_type, p_query, p_limit, p_offset)` com parametro `scope` (`owned`, `shared_with_me`, `global`, `all`)
7. Criar RLS policies para `vault_module_shares` e atualizar as de `vault_modules`
8. Dropar `is_public` (somente apos todas as dependencias estarem atualizadas)
9. Dropar indice `idx_vault_modules_is_public`, criar `idx_vault_modules_visibility`
10. Todos os comentarios em ingles

### Etapa 2 — Backend (Edge Functions)

**`vault-crud/index.ts`** — Alteracoes:
- Action `list`: substituir query direta por chamada a `get_visible_modules` RPC com parametro `scope`
- Action `get`: substituir `is_public.eq.true` por logica de visibility
- Action `create`: substituir `is_public` por `visibility` (default `'private'`)
- Action `update`: substituir `is_public` por `visibility` no allowed fields
- Action `get_playbook`: substituir `is_public.eq.true` por `visibility.eq.global`
- Novas actions: `share`, `unshare`, `list-shares`

**`vault-ingest/index.ts`** — Alteracoes:
- Substituir `is_public` por `visibility` no mapping e allowed fields
- Manter backward compatibility: se `is_public: true` vier no payload, converter para `visibility: 'global'`

**`global-search/index.ts`** — Correcoes:
- Linha 60: substituir `category` por `domain`
- Adicionar filtro de visibility na query de modules

### Etapa 3 — Frontend: Types, Hooks, UI

**Types (`vault/types.ts`)**:
- Adicionar `VisibilityLevel = 'private' | 'shared' | 'global'`
- Substituir `is_public: boolean` por `visibility: VisibilityLevel` em `VaultModule`
- Remover `VaultCategory` (dead code)

**Hooks (`vault/hooks/`)**:
- `useVaultModules`: adicionar parametro `scope` aos filters
- Novo hook `useModuleShares`: CRUD de compartilhamentos via `vault-crud`

**Navigation (`navigationConfig.ts`)**:
- Reestruturar grupo vault em 3 items: "My Modules", "Shared with Me", "Global Vault"

**Routes (`appRoutes.tsx`)**:
- `/vault` → owned modules
- `/vault/shared` → shared with me
- `/vault/global` → global modules
- `/vault/:moduleId` → detail (unchanged)

**UI Components**:
- `CreateModuleDialog`: substituir Switch `is_public` por RadioGroup com 3 opcoes de visibility
- `EditModuleSheet`: adicionar controle de visibility
- `VaultDetailPage`: adicionar botao "Share" (so para owner), dialog de compartilhamento
- Novo componente: `ShareModuleDialog` — input de email, lista de shares, botao remover
- `VaultListPage`: adaptar para receber `scope` como prop ou da rota

**i18n**: Adicionar keys para visibility, sharing, e novas rotas

### Etapa 4 — Deploy e Validacao

- Deploy das 3 Edge Functions modificadas
- Atualizar `supabase/types.ts` para refletir novo schema
- Atualizar API docs (`apiReference.ts`) para refletir `visibility` em vez de `is_public`

---

## Arquivos a Modificar/Criar

```text
CREATE  supabase/migrations/XXXX_visibility_three_layers.sql
MODIFY  supabase/functions/vault-crud/index.ts
MODIFY  supabase/functions/vault-ingest/index.ts
MODIFY  supabase/functions/global-search/index.ts
MODIFY  src/modules/vault/types.ts
MODIFY  src/modules/vault/hooks/useVaultModules.ts
MODIFY  src/modules/vault/hooks/useVaultModule.ts
CREATE  src/modules/vault/hooks/useModuleShares.ts
MODIFY  src/modules/vault/components/CreateModuleDialog.tsx
MODIFY  src/modules/vault/components/EditModuleSheet.tsx
CREATE  src/modules/vault/components/ShareModuleDialog.tsx
MODIFY  src/modules/vault/pages/VaultListPage.tsx
MODIFY  src/modules/vault/pages/VaultDetailPage.tsx
MODIFY  src/modules/navigation/config/navigationConfig.ts
MODIFY  src/routes/appRoutes.tsx
MODIFY  src/i18n/locales/en.json
MODIFY  src/i18n/locales/pt-BR.json
MODIFY  src/integrations/supabase/types.ts
MODIFY  src/modules/docs/constants/apiReference.ts
```

