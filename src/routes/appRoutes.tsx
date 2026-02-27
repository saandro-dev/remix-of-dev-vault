import { type RouteObject } from "react-router-dom";
import { AppShell } from "@/layouts/AppShell";
import { ProtectedRoute } from "@/modules/auth/components/ProtectedRoute";
import { DashboardPage } from "@/modules/dashboard/pages/DashboardPage";
import { VaultListPage } from "@/modules/vault/pages/VaultListPage";
import { VaultDetailPage } from "@/modules/vault/pages/VaultDetailPage";
import { ProjectsListPage } from "@/modules/projects/pages/ProjectsListPage";
import { ProjectDetailPage } from "@/modules/projects/pages/ProjectDetailPage";
import { FolderDetailPage } from "@/modules/projects/pages/FolderDetailPage";
import { BugDiaryPage } from "@/modules/bugs/pages/BugDiaryPage";
import { AdminPage } from "@/modules/admin/pages/AdminPage";
import { RoleProtectedRoute } from "@/modules/auth/components/RoleProtectedRoute";
import { SearchPage } from "@/modules/search/pages/SearchPage";
import { SettingsPage } from "@/modules/settings/pages/SettingsPage";
import { ApiKeysPage } from "@/modules/settings/pages/ApiKeysPage";
import { ApiDocsPage } from "@/modules/docs/pages/ApiDocsPage";
import { LoginPage } from "@/modules/auth/pages/LoginPage";
import { SignupPage } from "@/modules/auth/pages/SignupPage";
import { ForgotPasswordPage } from "@/modules/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/modules/auth/pages/ResetPasswordPage";
import NotFound from "@/pages/NotFound";

export const appRoutes: RouteObject[] = [
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },

  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "projects", element: <ProjectsListPage /> },
      { path: "projects/:projectId", element: <ProjectDetailPage /> },
      { path: "projects/:projectId/folders/:folderId", element: <FolderDetailPage /> },
      { path: "vault", element: <VaultListPage /> },
      { path: "vault/shared", element: <VaultListPage /> },
      { path: "vault/global", element: <VaultListPage /> },
      { path: "vault/:moduleId", element: <VaultDetailPage /> },
      { path: "bugs", element: <BugDiaryPage /> },
      {
        path: "admin",
        element: (
          <RoleProtectedRoute requiredRole="admin">
            <AdminPage />
          </RoleProtectedRoute>
        ),
      },
      { path: "settings", element: <SettingsPage /> },
      { path: "settings/api-keys", element: <ApiKeysPage /> },
      { path: "docs/api", element: <ApiDocsPage /> },
    ],
  },
  { path: "*", element: <NotFound /> },
];
