import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import i18n from "@/i18n/config";
import type { ModuleDependency, DependencyType, VaultModuleSummary } from "../types";

/**
 * Lists dependencies for a given module via vault-crud list_dependencies.
 */
export function useModuleDependencies(moduleId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["module_dependencies", moduleId],
    queryFn: () =>
      invokeEdgeFunction<{ dependencies: ModuleDependency[] }>("vault-crud", {
        action: "list_dependencies",
        module_id: moduleId,
      }).then((d) => d.dependencies),
    enabled: !!moduleId && !!user,
  });
}

/**
 * Adds a dependency to a module.
 */
export function useAddDependency(moduleId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { depends_on_id: string; dependency_type: DependencyType }) =>
      invokeEdgeFunction("vault-crud", {
        action: "add_dependency",
        module_id: moduleId,
        ...input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module_dependencies", moduleId] });
      queryClient.invalidateQueries({ queryKey: ["vault_module", moduleId] });
      toast({ title: i18n.t("toast.dependencyAdded") });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: i18n.t("toast.error"), description: err.message });
    },
  });
}

/**
 * Removes a dependency from a module.
 */
export function useRemoveDependency(moduleId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dependsOnId: string) =>
      invokeEdgeFunction("vault-crud", {
        action: "remove_dependency",
        module_id: moduleId,
        depends_on_id: dependsOnId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module_dependencies", moduleId] });
      queryClient.invalidateQueries({ queryKey: ["vault_module", moduleId] });
      toast({ title: i18n.t("toast.dependencyRemoved") });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: i18n.t("toast.error"), description: err.message });
    },
  });
}

/**
 * Searches modules for the dependency autocomplete, excluding the current module.
 */
export function useSearchModulesForDependency(
  query: string,
  excludeModuleId: string,
  enabled: boolean
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dependency_search", query, excludeModuleId],
    queryFn: () =>
      invokeEdgeFunction<{ items: VaultModuleSummary[]; total: number }>("vault-crud", {
        action: "list",
        scope: "all",
        query: query || undefined,
        limit: 20,
        offset: 0,
      }).then((d) => d.items.filter((m) => m.id !== excludeModuleId)),
    enabled: !!user && enabled && query.length >= 2,
  });
}
