import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import type { VaultModule } from "../types";

export function useVaultModules() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["vault_modules"],
    queryFn: () =>
      invokeEdgeFunction<{ items: VaultModule[] }>("vault-crud", {
        action: "list",
      }).then((d) => d.items),
    enabled: !!user,
  });
}

interface CreateModuleInput {
  title: string;
  description?: string;
  category?: string;
  language?: string;
  code: string;
  context_markdown?: string;
  dependencies?: string;
  tags?: string[];
}

export function useCreateVaultModule(onSuccess?: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateModuleInput) =>
      invokeEdgeFunction("vault-crud", { action: "create", ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault_modules"] });
      toast({ title: "Módulo criado!" });
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });
}
