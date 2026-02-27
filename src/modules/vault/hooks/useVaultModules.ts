import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import type { VaultModule, VaultModuleSummary, VaultDomain, VaultModuleType, VaultValidationStatus } from "../types";

// =============================================================================
// Filtros para listagem de módulos
// =============================================================================
export interface VaultModuleFilters {
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

// =============================================================================
// useVaultModules — lista módulos com filtros opcionais
// =============================================================================
export function useVaultModules(filters?: VaultModuleFilters) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["vault_modules", filters],
    queryFn: () =>
      invokeEdgeFunction<{ items: VaultModuleSummary[]; total: number }>("vault-crud", {
        action: "list",
        ...filters,
      }).then((d) => d.items),
    enabled: !!user,
  });
}

// =============================================================================
// useVaultSearch — busca avançada via função SQL
// =============================================================================
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

// =============================================================================
// useVaultPlaybook — busca todos os módulos do playbook de SaaS por fase
// =============================================================================
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

// =============================================================================
// useCreateVaultModule — cria módulo com todos os campos novos
// =============================================================================
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
  is_public?: boolean;
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
      toast({ title: "Módulo criado com sucesso!" });
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Erro ao criar módulo", description: err.message });
    },
  });
}

// =============================================================================
// useUpdateVaultModule — atualiza campos seletivamente
// =============================================================================
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
      toast({ title: "Módulo atualizado!" });
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Erro ao atualizar", description: err.message });
    },
  });
}
