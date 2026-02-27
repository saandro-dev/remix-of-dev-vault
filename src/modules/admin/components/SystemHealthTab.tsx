import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Database,
  Globe,
  Key,
  FileText,
  Bug,
  FolderOpen,
  Share2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import type { AdminStats } from "../types/admin.types";

interface StatsResponse {
  stats: AdminStats;
}

const STAT_CONFIG = [
  { key: "totalUsers", icon: Users, color: "text-blue-500" },
  { key: "totalModules", icon: Database, color: "text-violet-500" },
  { key: "globalModules", icon: Globe, color: "text-emerald-500" },
  { key: "activeApiKeys", icon: Key, color: "text-amber-500" },
  { key: "auditLogs24h", icon: FileText, color: "text-cyan-500" },
  { key: "openBugs", icon: Bug, color: "text-red-500" },
  { key: "totalProjects", icon: FolderOpen, color: "text-indigo-500" },
  { key: "activeShares", icon: Share2, color: "text-pink-500" },
] as const;

export function SystemHealthTab() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () =>
      invokeEdgeFunction<StatsResponse>("admin-crud", {
        action: "admin-stats",
      }),
    staleTime: 30_000,
  });

  const stats = data?.stats;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 w-24 bg-muted rounded mb-3" />
              <div className="h-8 w-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {STAT_CONFIG.map(({ key, icon: Icon, color }) => (
        <Card key={key}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {t(`admin.stats.${key}`)}
              </span>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-3xl font-bold text-foreground">
              {stats?.[key] ?? 0}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
