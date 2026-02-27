
# RBAC + Admin Panel — Implementation Report

## Status: COMPLETE ✅

---

## Architecture Overview

### Role Hierarchy
`owner > admin > moderator > user`

### Stack
- **Database:** PostgreSQL with `app_role` enum, `get_user_role()` and `is_admin_or_owner()` SECURITY DEFINER functions, RLS policies on `user_roles` and `profiles`
- **Backend:** Edge Function `admin-crud` with 3 actions (`get-my-role`, `list-users`, `change-role`), shared `role-validator.ts` for hierarchy enforcement
- **Frontend State:** React Query + Context pattern via `AdminProvider.tsx` (no XState)
- **Auth Hook:** `usePermissions.ts` invokes `admin-crud` Edge Function via `invokeEdgeFunction` (Rule 5.5 compliant)
- **Route Protection:** `RoleProtectedRoute.tsx` with numeric hierarchy comparison
- **UI:** `UsersTable.tsx` + `RoleChangeDialog.tsx` with full i18n support (en + pt-BR)

---

## Module Structure

```text
src/modules/admin/
├── types/admin.types.ts        — AdminUser interface
├── context/
│   ├── adminFetchers.ts        — fetchUsers() via invokeEdgeFunction
│   ├── adminHandlers.ts        — changeUserRole() via invokeEdgeFunction
│   └── AdminProvider.tsx       — React Query + Context provider
├── hooks/useAdmin.ts           — Hook consuming AdminContext
├── components/
│   ├── UsersTable.tsx          — User list with avatar, role badge, actions
│   └── RoleChangeDialog.tsx    — Role change confirmation dialog
└── pages/AdminPage.tsx         — Page component with i18n

src/modules/auth/
├── hooks/usePermissions.ts     — Role fetching via Edge Function
└── components/
    └── RoleProtectedRoute.tsx  — Route guard with role hierarchy
```

---

## Backend Files

```text
supabase/functions/
├── _shared/
│   ├── auth.ts                 — authenticateRequest with secure CORS
│   ├── api-helpers.ts          — createSuccessResponse/createErrorResponse (req-based only)
│   ├── cors-v2.ts              — Origin allowlist CORS handler
│   ├── sentry.ts               — Error reporting wrapper
│   └── role-validator.ts       — getUserRole, requireRole, isValidRole
└── admin-crud/index.ts         — Admin panel Edge Function
```

---

## Security Model

- All CORS responses use origin-validated allowlist (no wildcard `*`)
- Frontend never accesses database directly (Rule 5.5)
- Role changes restricted to `owner` role only
- Self-demotion prevented in `change-role` action
- All comments and error messages in English (Rule 5.4)

---

## Remediation Log (2026-02-27)

| Issue | Resolution |
|-------|-----------|
| `auth.ts` used legacy `createErrorResponse` without `req` (wildcard CORS) | Fixed: now passes `req` for secure CORS |
| Portuguese comments in shared helpers | Translated all to English |
| Dead code: `corsHeaders` wildcard + `handleCors()` deprecated | Removed entirely |
| Legacy overloaded signatures in `createSuccessResponse`/`createErrorResponse` | Removed: single clean `req`-based signature only |
| 6 Edge Functions using `handleCors` + legacy signatures | Migrated all to `handleCorsV2` + `req`-based signatures |
| `profiles-crud` using nonexistent `ERROR_CODES.INTERNAL`/`BAD_REQUEST` | Fixed to `INTERNAL_ERROR`/`VALIDATION_ERROR` |
| `vault-ingest` with 12+ Portuguese error messages | Translated all to English |
| Plan referencing XState (never implemented) | Updated to reflect React Query + Context |
