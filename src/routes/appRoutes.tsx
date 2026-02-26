import { type RouteObject } from "react-router-dom";
import { AppShell } from "@/layouts/AppShell";
import { DashboardPage } from "@/modules/dashboard/pages/DashboardPage";
import { VaultListPage } from "@/modules/vault/pages/VaultListPage";
import { ProjectsListPage } from "@/modules/projects/pages/ProjectsListPage";
import { BugDiaryPage } from "@/modules/bugs/pages/BugDiaryPage";
import { CommunityPage } from "@/modules/community/pages/CommunityPage";
import { SearchPage } from "@/modules/search/pages/SearchPage";
import NotFound from "@/pages/NotFound";

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "projects", element: <ProjectsListPage /> },
      { path: "vault/:category", element: <VaultListPage /> },
      { path: "bugs", element: <BugDiaryPage /> },
      { path: "community", element: <CommunityPage /> },
    ],
  },
  { path: "*", element: <NotFound /> },
];
