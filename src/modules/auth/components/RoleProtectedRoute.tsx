import { Navigate } from "react-router-dom";
import { usePermissions } from "@/modules/auth/hooks/usePermissions";
import { useTranslation } from "react-i18next";

type AppRole = "owner" | "admin" | "moderator" | "user";

const ROLE_HIERARCHY: Record<AppRole, number> = {
  owner: 1,
  admin: 2,
  moderator: 3,
  user: 4,
};

interface RoleProtectedRouteProps {
  requiredRole: AppRole;
  children: React.ReactNode;
}

export function RoleProtectedRoute({
  requiredRole,
  children,
}: RoleProtectedRouteProps) {
  const { role, isLoading } = usePermissions();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">
            {t("common.loading")}
          </span>
        </div>
      </div>
    );
  }

  const userLevel = ROLE_HIERARCHY[role] ?? 99;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 99;

  if (userLevel > requiredLevel) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
