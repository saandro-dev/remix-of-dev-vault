import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import i18n from "@/i18n/config";
import type { Bug, BugStatus } from "../types";

export function useBugs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["bugs"],
    queryFn: () =>
      invokeEdgeFunction<{ items: Bug[] }>("bugs-crud", {
        action: "list",
      }).then((d) => d.items),
    enabled: !!user,
  });
}

interface CreateBugInput {
  title: string;
  symptom: string;
  cause_code?: string;
  solution?: string;
  project_id?: string;
  vault_module_id?: string;
  tags?: string[];
}

export function useCreateBug(onSuccess?: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBugInput) =>
      invokeEdgeFunction("bugs-crud", { action: "create", ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bugs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: i18n.t("toast.bugRegistered") });
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: i18n.t("toast.error"), description: err.message });
    },
  });
}

export function useToggleBugStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: BugStatus }) => {
      const newStatus: BugStatus = currentStatus === "open" ? "resolved" : "open";
      return invokeEdgeFunction("bugs-crud", { action: "update", id, status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bugs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useDeleteBug() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      invokeEdgeFunction("bugs-crud", { action: "delete", id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bugs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: i18n.t("toast.bugDeleted") });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: i18n.t("toast.error"), description: err.message });
    },
  });
}
