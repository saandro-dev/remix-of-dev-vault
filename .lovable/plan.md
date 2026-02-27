
# Plan: JWT-Based Instant Roles — ✅ IMPLEMENTED

## What Changed

### Database
- **Trigger** `trg_sync_user_role_to_metadata` on `public.user_roles` (AFTER INSERT OR UPDATE OF role) fires `sync_user_role_to_metadata()`.
- **Function** `sync_user_role_to_metadata()` updated with `SET search_path TO 'public'` (linter-clean).
- **Initial sync** executed: all existing `user_roles` rows synced to `auth.users.raw_app_meta_data.app_role`.

### Frontend
- `usePermissions.ts` now reads `user.app_metadata.app_role` — **zero network calls**.
- Removed `useQuery`, `invokeEdgeFunction` dependencies.
- Added `parseAppRole()` for type-safe parsing with fallback to `"user"`.

### Kept
- `get-my-role` action in `admin-crud` remains for external API consumers.
