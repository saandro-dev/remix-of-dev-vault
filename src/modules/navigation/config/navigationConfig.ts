import {
  LayoutDashboard,
  Search,
  FolderOpen,
  Code2,
  Bug,
  BookOpen,
  Settings,
  KeyRound,
  Shield,
  Globe,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  path: string;
  requiredRole?: "admin" | "owner";
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
    labelKey: "nav.vault",
    defaultOpen: true,
    items: [
      { id: "vault-mine", labelKey: "nav.myModules", icon: Code2, path: "/vault" },
      { id: "vault-shared", labelKey: "nav.sharedWithMe", icon: Users, path: "/vault/shared" },
      { id: "vault-global", labelKey: "nav.globalVault", icon: Globe, path: "/vault/global" },
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
      { id: "admin", labelKey: "nav.admin", icon: Shield, path: "/admin", requiredRole: "admin" },
    ],
  },
];
