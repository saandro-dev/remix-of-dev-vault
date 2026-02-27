export type AppRole = "owner" | "admin" | "moderator" | "user";

export interface AdminUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: AppRole;
  createdAt: string;
}

export interface AdminContextValue {
  users: AdminUser[];
  isLoading: boolean;
  isChangingRole: boolean;
  error: string | null;
  selectedUser: AdminUser | null;
  pendingRole: AppRole | null;
  openRoleDialog: (user: AdminUser) => void;
  confirmRoleChange: (newRole: AppRole) => void;
  cancelRoleChange: () => void;
  refetch: () => void;
}
