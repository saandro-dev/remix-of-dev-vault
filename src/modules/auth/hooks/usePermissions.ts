/**
 * usePermissions — Reads the user's role from JWT app_metadata.
 *
 * The role is synced into `auth.users.raw_app_meta_data` via a
 * SECURITY DEFINER trigger on `public.user_roles`. This eliminates
 * the need for a network call on every page load.
 *
 * The `get-my-role` action in `admin-crud` is kept for external
 * API consumers but is no longer used by the frontend.
 */
import { useAuth } from "@/modules/auth/providers/AuthProvider";

type AppRole = "owner" | "admin" | "moderator" | "user";

const ROLE_HIERARCHY: Record<AppRole, number> = {
  owner: 1,
  admin: 2,
  moderator: 3,
  user: 4,
};

function parseAppRole(value: unknown): AppRole {
  if (typeof value === "string" && value in ROLE_HIERARCHY) {
    return value as AppRole;
  }
  return "user";
}

export function usePermissions() {
  const { user, isLoading } = useAuth();

  const role: AppRole = parseAppRole(user?.app_metadata?.app_role);
  const level = ROLE_HIERARCHY[role];

  return {
    role,
    isLoading,
    isAdmin: level <= ROLE_HIERARCHY.admin,
    isOwner: level <= ROLE_HIERARCHY.owner,
  };
}
