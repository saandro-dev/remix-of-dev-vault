import {
  LayoutDashboard,
  Search,
  FolderOpen,
  Code2,
  Bug,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

export interface NavigationGroup {
  id: string;
  label: string;
  items: NavigationItem[];
  defaultOpen?: boolean;
}

export const navigationConfig: NavigationGroup[] = [
  {
    id: "main",
    label: "Menu Principal",
    defaultOpen: true,
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
      { id: "search", label: "Busca Global", icon: Search, path: "/search" },
    ],
  },
  {
    id: "projects",
    label: "Seus Projetos",
    defaultOpen: true,
    items: [
      { id: "projects-list", label: "Todos os Projetos", icon: FolderOpen, path: "/projects" },
    ],
  },
  {
    id: "vault",
    label: "Cofre Global",
    defaultOpen: true,
    items: [
      { id: "vault", label: "Cofre Global", icon: Code2, path: "/vault" },
    ],
  },
  {
    id: "tools",
    label: "Ferramentas",
    defaultOpen: true,
    items: [
      { id: "bugs", label: "Diário de Bugs", icon: Bug, path: "/bugs" },
      { id: "community", label: "Comunidade", icon: Users, path: "/community" },
    ],
  },
  {
    id: "account",
    label: "Conta",
    defaultOpen: false,
    items: [
      { id: "settings", label: "Configurações", icon: Settings, path: "/settings" },
    ],
  },
];
