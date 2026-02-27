import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import { useQuery } from "@tanstack/react-query";
import i18n from "@/i18n/config";

interface ShareRecord {
  shared_with_user_id: string;
  created_at: string;
}

export function useModuleShares(moduleId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["vault_shares", moduleId],
    queryFn: () =>
      invokeEdgeFunction<{ shares: ShareRecord[] }>("vault-crud", {
        action: "list_shares",
        module_id: moduleId,
      }).then((d) => d.shares),
    enabled: !!moduleId && !!user,
  });
}

export function useShareModule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, email }: { moduleId: string; email: string }) =>
      invokeEdgeFunction("vault-crud", {
        action: "share",
        module_id: moduleId,
        email,
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["vault_shares", vars.moduleId] });
      queryClient.invalidateQueries({ queryKey: ["vault_modules"] });
      toast({ title: i18n.t("toast.moduleShared") });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: i18n.t("toast.error"), description: err.message });
    },
  });
}

export function useUnshareModule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, userId }: { moduleId: string; userId: string }) =>
      invokeEdgeFunction("vault-crud", {
        action: "unshare",
        module_id: moduleId,
        user_id: userId,
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["vault_shares", vars.moduleId] });
      queryClient.invalidateQueries({ queryKey: ["vault_modules"] });
      toast({ title: i18n.t("toast.moduleUnshared") });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: i18n.t("toast.error"), description: err.message });
    },
  });
}
