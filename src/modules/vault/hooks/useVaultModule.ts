import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import type { VaultModule } from "../types";

export function useVaultModule(moduleId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["vault_module", moduleId],
    queryFn: () =>
      invokeEdgeFunction<VaultModule>("vault-crud", {
        action: "get",
        id: moduleId,
      }),
    enabled: !!moduleId && !!user,
  });
}

export function useUpdateVaultModule(moduleId: string, onSuccess?: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fields: Partial<VaultModule>) =>
      invokeEdgeFunction("vault-crud", {
        action: "update",
        id: moduleId,
        ...fields,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault_modules"] });
      queryClient.invalidateQueries({ queryKey: ["vault_module", moduleId] });
      toast({ title: "Módulo atualizado!" });
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });
}

export function useDeleteVaultModule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      invokeEdgeFunction("vault-crud", { action: "delete", id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault_modules"] });
      toast({ title: "Módulo excluído." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });
}
