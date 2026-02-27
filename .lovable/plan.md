

# Plan: JWT-Based Instant Roles

## Analysis

The current `usePermissions` hook makes a network call to `admin-crud` (`get-my-role` action) on every page load, causing 1-2s delay for role-dependent UI. The Manus plan proposes injecting the role into `app_metadata` via a database trigger so it's available instantly from the JWT.

## Audit of Manus Plan

| Item | Verdict |
|------|---------|
| Trigger on `public.user_roles` (not on `auth` schema) | PASS — trigger is on public table |
| `SECURITY DEFINER` function updating `raw_app_meta_data` | PASS — documented Supabase pattern |
| Initial sync via `UPDATE public.user_roles SET role = role` | PASS — triggers the function for all existing rows |
| Frontend reads `user.app_metadata.app_role` | PASS — zero network calls |
| Removes `useQuery` + `invokeEdgeFunction` dependency | PASS — eliminates unnecessary API call |
| `get-my-role` action in `admin-crud` | KEEP — still valid for external API consumers |

## Implementation Steps

### Step 1: SQL Migration
Create `sync_user_role_to_metadata` function + trigger on `public.user_roles`. Run initial sync for existing users.

### Step 2: Modify `usePermissions.ts`
Remove `useQuery`, `invokeEdgeFunction` imports. Read role from `user?.app_metadata?.app_role`. Depend only on `useAuth` loading state.

### Files
```text
CREATE  supabase/migrations/XXXX_sync_role_to_jwt_metadata.sql
MODIFY  src/modules/auth/hooks/usePermissions.ts
```

