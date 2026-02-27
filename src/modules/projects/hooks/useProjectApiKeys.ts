import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import i18n from "@/i18n/config";
import type { ProjectApiKey, ProjectEnvironment } from "../types";

// Lists keys for a folder WITHOUT the actual value.
// The has_value field indicates whether the key has a Vault secret.
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

// Fetches the decrypted value of a key on demand.
// Only calls when enabled=true (user clicked "Reveal").
// Cached for 30 seconds to avoid repeated calls.
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
    staleTime: 30_000,
    gcTime: 60_000,
    retry: false,
  });
}

// Creates a new key via store_project_api_key().
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
      toast({ title: i18n.t("toast.apiKeyAdded"), description: i18n.t("toast.apiKeyAddedDesc") });
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: i18n.t("toast.apiKeyAddError"), description: err.message });
    },
  });
}

// Removes the key from the table AND the Vault atomically.
export function useDeleteProjectApiKey(folderId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      invokeEdgeFunction("project-api-keys-crud", { action: "delete", id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api_keys", folderId] });
      toast({ title: i18n.t("toast.apiKeyRemoved"), description: i18n.t("toast.apiKeyRemovedDesc") });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: i18n.t("toast.apiKeyRemoveError"), description: err.message });
    },
  });
}
