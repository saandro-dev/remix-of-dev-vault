import {
  createContext,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { fetchUsers } from "./adminFetchers";
import { changeUserRole } from "./adminHandlers";
import type {
  AdminContextValue,
  AdminUser,
  AppRole,
} from "../types/admin.types";

export const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [pendingRole, setPendingRole] = useState<AppRole | null>(null);

  const {
    data: users = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
    staleTime: 2 * 60 * 1000,
  });

  const roleChangeMutation = useMutation({
    mutationFn: ({ targetUserId, newRole }: { targetUserId: string; newRole: AppRole }) =>
      changeUserRole(targetUserId, newRole),
    onSuccess: () => {
      toast.success(t("admin.roleChanged"));
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelectedUser(null);
      setPendingRole(null);
    },
    onError: (err: Error) => {
      toast.error(t("admin.roleChangeError"), {
        description: err.message,
      });
    },
  });

  const openRoleDialog = useCallback((user: AdminUser) => {
    setSelectedUser(user);
    setPendingRole(user.role);
  }, []);

  const confirmRoleChange = useCallback(
    (newRole: AppRole) => {
      if (!selectedUser) return;
      roleChangeMutation.mutate({
        targetUserId: selectedUser.id,
        newRole,
      });
    },
    [selectedUser, roleChangeMutation],
  );

  const cancelRoleChange = useCallback(() => {
    setSelectedUser(null);
    setPendingRole(null);
  }, []);

  const value: AdminContextValue = {
    users,
    isLoading,
    isChangingRole: roleChangeMutation.isPending,
    error: error instanceof Error ? error.message : null,
    selectedUser,
    pendingRole,
    openRoleDialog,
    confirmRoleChange,
    cancelRoleChange,
    refetch,
  };

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}
