import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import i18n from "@/i18n/config";
import type { VaultModule, VaultModuleSummary, VaultDomain, VaultModuleType, VaultValidationStatus, VaultScope, VisibilityLevel } from "../types";

// Filters for module listing
export interface VaultModuleFilters {
  scope?: VaultScope;
  domain?: VaultDomain;
  module_type?: VaultModuleType;
  saas_phase?: number;
  source_project?: string;
  validation_status?: VaultValidationStatus;
  tags?: string[];
  query?: string;
  limit?: number;
  offset?: number;
}

// Lists modules with optional filters via get_visible_modules RPC
export function useVaultModules(filters?: VaultModuleFilters) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["vault_modules", filters],
    queryFn: () =>
      invokeEdgeFunction<{ items: VaultModuleSummary[]; total: number }>("vault-crud", {
        action: "list",
        scope: filters?.scope ?? "owned",
        domain: filters?.domain,
        module_type: filters?.module_type,
        query: filters?.query,
        limit: filters?.limit ?? 50,
        offset: filters?.offset ?? 0,
      }).then((d) => d.items),
    enabled: !!user,
  });
}

// Advanced search via SQL function
export function useVaultSearch(params: VaultModuleFilters & { validated?: boolean }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["vault_search", params],
    queryFn: () =>
      invokeEdgeFunction<{ items: VaultModuleSummary[]; total: number }>("vault-crud", {
        action: "search",
        ...params,
      }).then((d) => d.items),
    enabled: !!user && !!(params.query || params.domain || params.module_type || params.saas_phase != null),
  });
}

// Fetches all SaaS playbook modules grouped by phase
export function useVaultPlaybook() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["vault_playbook"],
    queryFn: () =>
      invokeEdgeFunction<{ phases: Record<number, VaultModuleSummary[]>; total: number }>("vault-crud", {
        action: "get_playbook",
      }).then((d) => d.phases),
    enabled: !!user,
  });
}

// Creates a module with all structured fields
export interface CreateModuleInput {
  title: string;
  description?: string;
  domain?: VaultDomain;
  module_type?: VaultModuleType;
  language?: string;
  code?: string;
  context_markdown?: string;
  dependencies?: string;
  tags?: string[];
  saas_phase?: number;
  phase_title?: string;
  why_it_matters?: string;
  code_example?: string;
  source_project?: string;
  validation_status?: VaultValidationStatus;
  related_modules?: string[];
  visibility?: VisibilityLevel;
}

export function useCreateVaultModule(onSuccess?: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateModuleInput) =>
      invokeEdgeFunction<VaultModule>("vault-crud", { action: "create", ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault_modules"] });
      queryClient.invalidateQueries({ queryKey: ["vault_playbook"] });
      toast({ title: i18n.t("toast.moduleCreated") });
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: i18n.t("toast.createError"), description: err.message });
    },
  });
}

// Updates module fields selectively
export function useUpdateVaultModule(onSuccess?: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...fields }: Partial<CreateModuleInput> & { id: string }) =>
      invokeEdgeFunction<VaultModule>("vault-crud", { action: "update", id, ...fields }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["vault_modules"] });
      queryClient.invalidateQueries({ queryKey: ["vault_module", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["vault_playbook"] });
      toast({ title: i18n.t("toast.moduleUpdated") });
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: i18n.t("toast.updateError"), description: err.message });
    },
  });
}
