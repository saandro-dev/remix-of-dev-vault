import {
  LayoutDashboard,
  Search,
  FolderOpen,
  Code2,
  Server,
  Shield,
  MonitorSmartphone,
  Bug,
  Users,
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
      { id: "vault-frontend", label: "Frontend", icon: MonitorSmartphone, path: "/vault/frontend" },
      { id: "vault-backend", label: "Backend", icon: Server, path: "/vault/backend" },
      { id: "vault-devops", label: "DevOps & Infra", icon: Code2, path: "/vault/devops" },
      { id: "vault-security", label: "Segurança", icon: Shield, path: "/vault/security" },
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
];
