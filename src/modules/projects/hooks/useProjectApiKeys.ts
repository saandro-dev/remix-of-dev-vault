import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import type { ProjectApiKey, ProjectEnvironment } from "../types";

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
      toast({ title: "API Key adicionada!" });
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });
}

export function useDeleteProjectApiKey(folderId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      invokeEdgeFunction("project-api-keys-crud", { action: "delete", id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api_keys", folderId] });
      toast({ title: "API Key removida." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });
}
