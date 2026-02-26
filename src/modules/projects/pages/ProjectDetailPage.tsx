import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useConfirmDelete } from "@/components/common/ConfirmDelete";
import { Plus, Loader2, ArrowLeft, Folder, Trash2 } from "lucide-react";

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState("#3B82F6");
  const { confirm, ConfirmDialog } = useConfirmDelete();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!user,
  });

  const { data: folders, isLoading } = useQuery({
    queryKey: ["key_folders", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("key_folders")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("key_folders").insert({
        project_id: projectId!,
        user_id: user!.id,
        name: folderName,
        color: folderColor,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_folders", projectId] });
      toast({ title: "Pasta criada!" });
      setFolderName("");
      setFolderColor("#3B82F6");
      setOpen(false);
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("key_folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key_folders", projectId] });
      toast({ title: "Pasta removida." });
    },
  });

  const handleDeleteFolder = async (folder: { id: string; name: string }) => {
    const confirmed = await confirm({
      resourceType: "pasta",
      resourceName: folder.name,
    });
    if (confirmed) deleteMutation.mutate(folder.id);
  };

  const PRESET_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

  return (
    <div className="space-y-6">
      <ConfirmDialog />
      <div className="flex items-center gap-3">
        <Link to="/projects">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {project?.name ?? "Projeto"}
          </h1>
          <p className="text-muted-foreground text-sm">{project?.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Folder className="h-4 w-4" /> Pastas
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Nova Pasta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Pasta</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
            >
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  required
                  placeholder="Ex: Keys do Supabase"
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFolderColor(c)}
                      className="h-8 w-8 rounded-full border-2 transition-transform"
                      style={{
                        backgroundColor: c,
                        borderColor: folderColor === c ? "hsl(var(--foreground))" : "transparent",
                        transform: folderColor === c ? "scale(1.15)" : "scale(1)",
                      }}
                    />
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !folders?.length ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma pasta criada. Crie uma pasta para organizar suas API Keys.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="group relative rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow"
            >
              <Link
                to={`/projects/${projectId}/folders/${folder.id}`}
                className="flex items-center gap-3"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: folder.color + "20" }}
                >
                  <Folder className="h-5 w-5" style={{ color: folder.color }} />
                </div>
                <span className="font-medium text-foreground">{folder.name}</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFolder(folder);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
