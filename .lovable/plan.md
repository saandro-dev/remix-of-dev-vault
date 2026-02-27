# DevVault — Admin Panel v2

## Status: ✅ IMPLEMENTED

**Date:** 2026-02-27

---

## Architecture

All admin operations consolidated in `admin-crud` Edge Function (8 actions total):

| Action | Role | Description |
|--------|------|-------------|
| `get-my-role` | any | Returns authenticated user's role |
| `list-users` | admin+ | All users with profiles and roles |
| `change-role` | owner | Change target user's role |
| `admin-stats` | admin+ | System health metrics (8 counts) |
| `list-api-keys` | admin+ | All API keys with owner info |
| `admin-revoke-api-key` | owner | Force-revoke any user's API key |
| `list-global-modules` | admin+ | All modules with visibility = 'global' |
| `unpublish-module` | admin+ | Set module visibility back to 'private' |

## Frontend

`AdminPage.tsx` uses `Tabs` with 4 tabs:
1. **Users & Roles** — existing `UsersTable` + `RoleChangeDialog`
2. **System Health** — `SystemHealthTab` with 8 metric cards
3. **API Monitor** — `ApiMonitorTab` with key table + owner-only revoke
4. **Global Moderation** — `GlobalModerationTab` with unpublish confirmation

## Files Modified/Created

- `supabase/functions/admin-crud/index.ts` — 5 new actions
- `src/modules/admin/types/admin.types.ts` — 3 new interfaces
- `src/modules/admin/components/SystemHealthTab.tsx` — NEW
- `src/modules/admin/components/ApiMonitorTab.tsx` — NEW
- `src/modules/admin/components/GlobalModerationTab.tsx` — NEW
- `src/modules/admin/pages/AdminPage.tsx` — Tabs layout
- `src/i18n/locales/en.json` — admin.* expanded
- `src/i18n/locales/pt-BR.json` — admin.* expanded
