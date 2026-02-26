import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";

export interface Profile {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface UpdateProfilePayload {
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery<Profile>({
    queryKey: ["profile", user?.id],
    queryFn: () =>
      invokeEdgeFunction<Profile>("profiles-crud", { action: "get" }),
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) =>
      invokeEdgeFunction<Profile>("profiles-crud", {
        action: "update",
        payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({ title: "Perfil atualizado!" });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });
}
