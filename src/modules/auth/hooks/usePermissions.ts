import { useQuery } from "@tanstack/react-query";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import { useAuth } from "@/modules/auth/providers/AuthProvider";

type AppRole = "owner" | "admin" | "moderator" | "user";

interface RoleResponse {
  role: AppRole;
}

const ROLE_HIERARCHY: Record<AppRole, number> = {
  owner: 1,
  admin: 2,
  moderator: 3,
  user: 4,
};

export function usePermissions() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: () =>
      invokeEdgeFunction<RoleResponse>("admin-crud", {
        action: "get-my-role",
      }),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const role: AppRole = data?.role ?? "user";
  const level = ROLE_HIERARCHY[role] ?? 99;

  return {
    role,
    isLoading,
    isAdmin: level <= ROLE_HIERARCHY.admin,
    isOwner: level <= ROLE_HIERARCHY.owner,
  };
}
