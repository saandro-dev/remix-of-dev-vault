import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import i18n from "@/i18n/config";
import type { Project, KeyFolder } from "../types";

export function useProject(projectId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () =>
      invokeEdgeFunction<Project>("projects-crud", {
        action: "get",
        id: projectId,
      }),
    enabled: !!projectId && !!user,
  });
}

export function useFolders(projectId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["key_folders", projectId],
    queryFn: () =>
      invokeEdgeFunction<{ items: KeyFolder[] }>("folders-crud", {
        action: "list",
        project_id: projectId,
      }).then((d) => d.items),
    enabled: !!projectId && !!user,
  });
}

interface CreateFolderInput {
  project_id: string;
  name: string;
  color?: string;
}

export function useCreateFolder(projectId: string | undefined, onSuccess?: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFolderInput) =>
      invokeEdgeFunction("folders-crud", { action: "create", ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_folders", projectId] });
      toast({ title: i18n.t("toast.folderCreated") });
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: i18n.t("toast.error"), description: err.message });
    },
  });
}

export function useDeleteFolder(projectId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      invokeEdgeFunction("folders-crud", { action: "delete", id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_folders", projectId] });
      toast({ title: i18n.t("toast.folderDeleted") });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: i18n.t("toast.error"), description: err.message });
    },
  });
}
