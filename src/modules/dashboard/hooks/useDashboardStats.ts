import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import type { Project } from "@/modules/projects/types";

interface DashboardStats {
  projects: number;
  modules: number;
  keys: number;
  openBugs: number;
}

interface DashboardData {
  stats: DashboardStats;
  recentProjects: Project[];
}

export function useDashboardStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () =>
      invokeEdgeFunction<DashboardData>("dashboard-stats", {}),
    enabled: !!user,
  });
}
