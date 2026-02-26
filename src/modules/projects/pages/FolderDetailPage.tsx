import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KeyMask } from "@/components/KeyMask";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Trash2, ArrowLeft, Key } from "lucide-react";

type Environment = "dev" | "staging" | "prod";

export function FolderDetailPage() {
  const { projectId, folderId } = useParams<{ projectId: string; folderId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [environment, setEnvironment] = useState<Environment>("dev");

  const { data: folder } = useQuery({
    queryKey: ["key_folder", folderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("key_folders")
        .select("*")
        .eq("id", folderId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!folderId && !!user,
  });

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ["api_keys", folderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("folder_id", folderId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!folderId && !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("api_keys").insert({
        project_id: projectId!,
        folder_id: folderId!,
        user_id: user!.id,
        label,
        key_value: keyValue,
        environment,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api_keys", folderId] });
      toast({ title: "API Key adicionada!" });
      setLabel("");
      setKeyValue("");
      setEnvironment("dev");
      setOpen(false);
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api_keys", folderId] });
      toast({ title: "API Key removida." });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/projects/${projectId}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {folder?.name ?? "Pasta"}
          </h1>
          <p className="text-muted-foreground text-sm">API Keys desta pasta</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Key className="h-4 w-4" /> API Keys
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Nova Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar API Key</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} required placeholder="Ex: Stripe Secret Key" />
              </div>
              <div className="space-y-2">
                <Label>Valor da Key</Label>
                <Input value={keyValue} onChange={(e) => setKeyValue(e.target.value)} required placeholder="sk_live_..." type="password" />
              </div>
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <Select value={environment} onValueChange={(v) => setEnvironment(v as Environment)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dev">Dev</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="prod">Prod</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !apiKeys?.length ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma API Key nesta pasta.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Ambiente</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.label}</TableCell>
                  <TableCell><KeyMask value={key.key_value} /></TableCell>
                  <TableCell><StatusBadge variant={key.environment as Environment} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(key.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
