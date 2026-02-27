import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, Package, Key, Bug, ArrowRight, Loader2 } from "lucide-react";
import { useDashboardStats } from "@/modules/dashboard/hooks/useDashboardStats";

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useDashboardStats();
  const { t } = useTranslation();

  const stats = data?.stats;
  const recentProjects = data?.recentProjects;

  const statCards = [
    { label: t("dashboard.projects"), value: stats?.projects, icon: FolderOpen, path: "/projects", color: "text-primary" },
    { label: t("dashboard.vaultModules"), value: stats?.modules, icon: Package, path: "/vault", color: "text-info" },
    { label: t("dashboard.apiKeys"), value: stats?.keys, icon: Key, path: "/projects", color: "text-warning" },
    { label: t("dashboard.openBugs"), value: stats?.openBugs, icon: Bug, path: "/bugs", color: "text-destructive" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card
                key={stat.label}
                className="cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => navigate(stat.path)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stat.value ?? 0}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {recentProjects && recentProjects.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{t("dashboard.recentProjects")}</h2>
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/projects")}>
                  {t("common.viewAll")} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recentProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="cursor-pointer hover:border-primary/40 transition-colors"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                        <div className="truncate">
                          <p className="font-medium text-foreground text-sm truncate">{project.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{project.description || t("common.noDescription")}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: t("dashboard.newProject"), path: "/projects", icon: FolderOpen },
              { label: t("dashboard.newModule"), path: "/vault", icon: Package },
              { label: t("dashboard.registerBug"), path: "/bugs", icon: Bug },
            ].map((shortcut) => (
              <Button
                key={shortcut.label}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate(shortcut.path)}
              >
                <shortcut.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">{shortcut.label}</span>
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
