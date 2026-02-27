

# Plano: Sistema RBAC + Painel Admin

## Resumo

Implementar controle de acesso baseado em roles (owner > admin > user) com painel administrativo usando XState. Adaptado do relatório da Manus com correções para conformidade com o Protocolo DevVault V1.

---

## Correções vs Relatório Manus

| Problema no Relatório | Correção |
|---|---|
| `usePermissions` usa `supabase.rpc()` direto (viola Regra 5.5) | Usar `invokeEdgeFunction("admin-crud", { action: "get-my-role" })` |
| `admin-crud` não usa helpers existentes (`handleCorsV2`, `createSuccessResponse`) | Seguir padrão de `bugs-crud/index.ts` com helpers corretos |
| Comentários em português | Tudo em inglês técnico |
| XState `fromPromise` com API incorreta para v5 | Usar import correto de `xstate` |
| RLS policies fazem DROP sem verificar existentes | Adicionar novas policies sem dropar as de service-role |

---

## Etapa 1 — Migration SQL

**1 arquivo de migração** com:
- `ALTER TYPE public.app_role ADD VALUE 'owner'`
- `CREATE OR REPLACE FUNCTION public.is_admin_or_owner(uuid)` — SECURITY DEFINER
- `CREATE OR REPLACE FUNCTION public.get_user_role(uuid)` — retorna role ou 'user' como fallback
- Novas RLS policies em `user_roles`: admin/owner SELECT, individual SELECT, admin/owner ALL
- Novas RLS policies em `profiles`: public SELECT (para listar users no admin panel), individual UPDATE

---

## Etapa 2 — Backend (Edge Function)

### `supabase/functions/_shared/role-validator.ts`
- `getUserRole(supabase, userId)` — chama `get_user_role` RPC
- `requireRole(supabase, userId, requiredRole)` — valida hierarquia, throws se insuficiente
- Hierarquia: `{ owner: 1, admin: 2, user: 3 }`

### `supabase/functions/admin-crud/index.ts`
Segue padrão de `bugs-crud` (usa `handleCors`, `authenticateRequest`, `isResponse`, `createSuccessResponse`, `createErrorResponse`).

**Actions:**
- `get-my-role` — retorna a role do user autenticado (substitui `supabase.rpc()` do frontend)
- `list-users` — requer admin+; retorna profiles com roles
- `change-role` — requer owner; atualiza role de target user

### `supabase/config.toml`
- Adicionar `[functions.admin-crud]` com `verify_jwt = false`

---

## Etapa 3 — Frontend: Hooks + Rotas

### `src/modules/auth/hooks/usePermissions.ts`
- Usa `invokeEdgeFunction("admin-crud", { action: "get-my-role" })` (Regra 5.5)
- React Query com `staleTime: 5min`, `refetchOnWindowFocus: true`
- Expõe: `role`, `isLoading`, `isAdmin`, `isOwner`

### `src/modules/auth/components/RoleProtectedRoute.tsx`
- Aceita `requiredRole: "admin" | "owner"`
- Hierarquia numérica para comparação
- Redirect para `/` se sem permissão
- Loading spinner enquanto verifica

### Modificar `src/routes/appRoutes.tsx`
- Adicionar rota `/admin` wrappada em `<RoleProtectedRoute requiredRole="admin">`

### Modificar `src/modules/navigation/config/navigationConfig.ts`
- Adicionar item `admin` no grupo `account` com ícone `Shield`

### Modificar `src/layouts/AppSidebar.tsx`
- Filtrar item `admin` da nav baseado em `usePermissions` (só mostra se admin/owner)

### Modificar `src/modules/auth/components/ProtectedRoute.tsx`
- Traduzir "Carregando..." para `t("common.loading")`

---

## Etapa 4 — Frontend: Admin Panel com XState

### Estrutura de arquivos:
```text
src/modules/admin/
├── types/admin.types.ts
├── machines/
│   ├── adminMachine.types.ts
│   └── adminMachine.ts
├── context/
│   ├── adminFetchers.ts
│   ├── adminHandlers.ts
│   └── AdminProvider.tsx
├── hooks/useAdmin.ts
├── components/
│   ├── UsersTable.tsx
│   └── RoleChangeDialog.tsx
└── pages/AdminPage.tsx
```

### `admin.types.ts`
- `AdminUser { id, displayName, avatarUrl, email, role, createdAt }`

### `adminMachine.ts` (XState v5)
- States: `idle → loading → loaded → changingRole → error`
- Events: `FETCH`, `ROLE_CHANGE`, `CONFIRM_ROLE_CHANGE`, `CANCEL`
- Usa `fromPromise` importado de `xstate`

### `adminFetchers.ts`
- `fetchUsers()` — `invokeEdgeFunction("admin-crud", { action: "list-users" })`

### `adminHandlers.ts`
- `changeUserRole(targetUserId, newRole)` — `invokeEdgeFunction("admin-crud", { action: "change-role", ... })`

### `AdminProvider.tsx`
- Context React + `useMachine` do `@xstate/react`
- Expõe state, users, selectedUser, send

### `useAdmin.ts`
- Hook que consome AdminContext

### `UsersTable.tsx`
- Tabela com avatar, nome, email, role badge, data criação, botão ações
- Dropdown para mudar role (só visível para owners)

### `RoleChangeDialog.tsx`
- Dialog de confirmação antes de mudar role
- Select com opções: user, admin, owner
- Mostra user atual e nova role

### `AdminPage.tsx`
- Título + subtítulo via i18n
- Renderiza `<AdminProvider>` + `<UsersTable />`

---

## i18n Keys

Adicionar ao `en.json` e `pt-BR.json`:
```json
{
  "admin": {
    "title": "Administration",
    "subtitle": "Manage users and roles.",
    "users": "Users",
    "role": "Role",
    "changeRole": "Change Role",
    "confirmRoleChange": "Are you sure you want to change the role of {{name}} to {{role}}?",
    "roleChanged": "Role updated successfully!",
    "roleChangeError": "Error changing role",
    "noUsers": "No users found.",
    "owner": "Owner",
    "admin": "Admin",
    "user": "User",
    "joined": "Joined",
    "actions": "Actions"
  },
  "nav": {
    "admin": "Admin Panel"
  }
}
```

---

## Dependências a Instalar

- `xstate` (v5)
- `@xstate/react`

---

## Arquivos Totais

| Ação | Arquivo |
|------|---------|
| CREATE | `supabase/migrations/XXXX_rbac_owner_role.sql` |
| CREATE | `supabase/functions/_shared/role-validator.ts` |
| CREATE | `supabase/functions/admin-crud/index.ts` |
| CREATE | `src/modules/auth/hooks/usePermissions.ts` |
| CREATE | `src/modules/auth/components/RoleProtectedRoute.tsx` |
| CREATE | `src/modules/admin/types/admin.types.ts` |
| CREATE | `src/modules/admin/machines/adminMachine.types.ts` |
| CREATE | `src/modules/admin/machines/adminMachine.ts` |
| CREATE | `src/modules/admin/context/adminFetchers.ts` |
| CREATE | `src/modules/admin/context/adminHandlers.ts` |
| CREATE | `src/modules/admin/context/AdminProvider.tsx` |
| CREATE | `src/modules/admin/hooks/useAdmin.ts` |
| CREATE | `src/modules/admin/components/UsersTable.tsx` |
| CREATE | `src/modules/admin/components/RoleChangeDialog.tsx` |
| CREATE | `src/modules/admin/pages/AdminPage.tsx` |
| MODIFY | `src/routes/appRoutes.tsx` |
| MODIFY | `src/modules/navigation/config/navigationConfig.ts` |
| MODIFY | `src/layouts/AppSidebar.tsx` |
| MODIFY | `src/modules/auth/components/ProtectedRoute.tsx` |
| MODIFY | `src/i18n/locales/en.json` |
| MODIFY | `src/i18n/locales/pt-BR.json` |
| MODIFY | `supabase/config.toml` |

