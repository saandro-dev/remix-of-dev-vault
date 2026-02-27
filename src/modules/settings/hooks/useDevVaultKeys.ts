import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import { supabase } from "@/integrations/supabase/client";
import i18n from "@/i18n/config";

export interface DevVaultApiKey {
  id: string;
  key_name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export function useDevVaultKeys() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["devvault-api-keys", user?.id],
    queryFn: () =>
      invokeEdgeFunction<{ items: DevVaultApiKey[] }>("list-devvault-keys", {}).then(
        (d) => d.items
      ),
    enabled: !!user,
  });
}

export function useCreateDevVaultKey() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyName: string) => {
      const { data, error } = await supabase.functions.invoke("create-api-key", {
        body: { key_name: keyName },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error.message);
      return data as { id: string; key: string; key_name: string; prefix: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devvault-api-keys"] });
      toast({ title: i18n.t("toast.keyCreated") });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: i18n.t("toast.error"), description: err.message });
    },
  });
}

export function useRevokeDevVaultKey() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) => {
      const { data, error } = await supabase.functions.invoke("revoke-api-key", {
        body: { key_id: keyId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devvault-api-keys"] });
      toast({ title: i18n.t("toast.keyRevoked") });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: i18n.t("toast.error"), description: err.message });
    },
  });
}
