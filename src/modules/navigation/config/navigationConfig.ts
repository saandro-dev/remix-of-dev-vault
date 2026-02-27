import {
  LayoutDashboard,
  Search,
  FolderOpen,
  Code2,
  Bug,
  BookOpen,
  Settings,
  KeyRound,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  path: string;
}

export interface NavigationGroup {
  id: string;
  labelKey: string;
  items: NavigationItem[];
  defaultOpen?: boolean;
}

export const navigationConfig: NavigationGroup[] = [
  {
    id: "main",
    labelKey: "nav.mainMenu",
    defaultOpen: true,
    items: [
      { id: "dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, path: "/" },
      { id: "search", labelKey: "nav.globalSearch", icon: Search, path: "/search" },
    ],
  },
  {
    id: "projects",
    labelKey: "nav.yourProjects",
    defaultOpen: true,
    items: [
      { id: "projects-list", labelKey: "nav.allProjects", icon: FolderOpen, path: "/projects" },
    ],
  },
  {
    id: "vault",
    labelKey: "nav.globalVault",
    defaultOpen: true,
    items: [
      { id: "vault", labelKey: "nav.globalVault", icon: Code2, path: "/vault" },
    ],
  },
  {
    id: "tools",
    labelKey: "nav.tools",
    defaultOpen: true,
    items: [
      { id: "bugs", labelKey: "nav.bugDiary", icon: Bug, path: "/bugs" },
    ],
  },
  {
    id: "account",
    labelKey: "nav.account",
    defaultOpen: false,
    items: [
      { id: "settings", labelKey: "nav.settings", icon: Settings, path: "/settings" },
      { id: "api-keys", labelKey: "nav.apiIntegrations", icon: KeyRound, path: "/settings/api-keys" },
      { id: "api-docs", labelKey: "nav.apiDocs", icon: BookOpen, path: "/docs/api" },
    ],
  },
];
