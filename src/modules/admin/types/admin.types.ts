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

export interface AdminStats {
  totalUsers: number;
  totalModules: number;
  globalModules: number;
  activeApiKeys: number;
  auditLogs24h: number;
  openBugs: number;
  totalProjects: number;
  activeShares: number;
}

export interface AdminApiKey {
  id: string;
  userId: string;
  ownerName: string;
  keyName: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
}

export interface AdminGlobalModule {
  id: string;
  title: string;
  description: string | null;
  domain: string | null;
  language: string;
  tags: string[];
  authorName: string;
  createdAt: string;
}
