import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import type { ProjectApiKey, ProjectEnvironment } from "../types";

// ---------------------------------------------------------------------------
// useProjectApiKeys — Lista as chaves de uma pasta SEM o valor real.
// O campo has_value indica se a chave possui um secret armazenado no Vault.
// ---------------------------------------------------------------------------
export function useProjectApiKeys(folderId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["api_keys", folderId],
    queryFn: () =>
      invokeEdgeFunction<{ items: ProjectApiKey[] }>("project-api-keys-crud", {
        action: "list",
        folder_id: folderId,
      }).then((d) => d.items),
    enabled: !!folderId && !!user,
  });
}

// ---------------------------------------------------------------------------
// useRevealApiKey — Busca o valor decriptado de uma chave sob demanda.
// Só faz a chamada quando enabled=true (usuário clicou em "Revelar").
// O valor é cacheado por 30 segundos para evitar chamadas repetidas.
// ---------------------------------------------------------------------------
export function useRevealApiKey(keyId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["api_key_reveal", keyId],
    queryFn: () =>
      invokeEdgeFunction<{ value: string }>("project-api-keys-crud", {
        action: "read",
        id: keyId,
      }).then((d) => d.value),
    enabled: !!keyId && !!user,
    staleTime: 30_000, // Cache por 30s — evita chamadas repetidas ao Vault
    gcTime: 60_000,    // Remove do cache após 60s sem uso
    retry: false,      // Não tentar novamente em caso de erro (ex: acesso negado)
  });
}

// ---------------------------------------------------------------------------
// useCreateProjectApiKey — Cria uma nova chave via store_project_api_key().
// ---------------------------------------------------------------------------
interface CreateApiKeyInput {
  project_id: string;
  folder_id: string;
  label: string;
  key_value: string;
  environment: ProjectEnvironment;
}

export function useCreateProjectApiKey(folderId: string | undefined, onSuccess?: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateApiKeyInput) =>
      invokeEdgeFunction("project-api-keys-crud", { action: "create", ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api_keys", folderId] });
      toast({ title: "API Key adicionada com segurança!", description: "O valor foi criptografado no Vault." });
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Erro ao adicionar key", description: err.message });
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteProjectApiKey — Remove a chave da tabela E do Vault atomicamente.
// ---------------------------------------------------------------------------
export function useDeleteProjectApiKey(folderId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      invokeEdgeFunction("project-api-keys-crud", { action: "delete", id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api_keys", folderId] });
      toast({ title: "API Key removida.", description: "O secret foi apagado do Vault." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Erro ao remover key", description: err.message });
    },
  });
}
