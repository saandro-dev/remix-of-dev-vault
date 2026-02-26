import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import type { Project } from "../types";

export function useProjects() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["projects"],
    queryFn: () =>
      invokeEdgeFunction<{ items: Project[] }>("projects-crud", {
        action: "list",
      }).then((d) => d.items),
    enabled: !!user,
  });
}

interface UpsertProjectInput {
  id?: string;
  name: string;
  description?: string;
  color?: string;
}

export function useUpsertProject(onSuccess?: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertProjectInput) => {
      const action = input.id ? "update" : "create";
      return invokeEdgeFunction("projects-crud", { action, ...input });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: variables.id ? "Projeto atualizado!" : "Projeto criado!" });
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });
}

export function useDeleteProject() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      invokeEdgeFunction("projects-crud", { action: "delete", id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Projeto excluído." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });
}
