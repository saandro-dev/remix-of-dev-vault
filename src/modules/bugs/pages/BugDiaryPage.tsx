import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { CodeBlock } from "@/components/CodeBlock";
import { useToast } from "@/hooks/use-toast";
import { useConfirmDelete } from "@/components/common/ConfirmDelete";
import { Plus, Loader2, Bug, CheckCircle2, Trash2, FolderOpen, Package } from "lucide-react";

type BugStatus = "open" | "resolved";

export function BugDiaryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [symptom, setSymptom] = useState("");
  const [causeCode, setCauseCode] = useState("");
  const [solution, setSolution] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [tagsInput, setTagsInput] = useState("");
  const [filterStatus, setFilterStatus] = useState<BugStatus | null>(null);
  const { confirm, ConfirmDialog } = useConfirmDelete();

  const { data: bugs, isLoading } = useQuery({
    queryKey: ["bugs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bugs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: projects } = useQuery({
    queryKey: ["projects-list-simple"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: modules } = useQuery({
    queryKey: ["vault-modules-simple"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vault_modules").select("id, title").order("title");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const { error } = await supabase.from("bugs").insert({
        user_id: user!.id,
        title,
        symptom,
        cause_code: causeCode || null,
        solution: solution || null,
        status: solution ? "resolved" : "open",
        project_id: selectedProjectId || null,
        vault_module_id: selectedModuleId || null,
        tags,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bugs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: "Bug registrado!" });
      resetForm();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: BugStatus }) => {
      const newStatus: BugStatus = currentStatus === "open" ? "resolved" : "open";
      const { error } = await supabase.from("bugs").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bugs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bugs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bugs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: "Bug removido." });
    },
  });

  const handleDeleteBug = async (bug: { id: string; title: string }) => {
    const confirmed = await confirm({
      resourceType: "bug",
      resourceName: bug.title,
    });
    if (confirmed) deleteMutation.mutate(bug.id);
  };

  const resetForm = () => {
    setTitle("");
    setSymptom("");
    setCauseCode("");
    setSolution("");
    setSelectedProjectId("");
    setSelectedModuleId("");
    setTagsInput("");
    setOpen(false);
  };

  const filtered = bugs?.filter((b) => !filterStatus || b.status === filterStatus);

  const getProjectName = (projectId: string | null) =>
    projects?.find((p) => p.id === projectId)?.name;

  const getModuleTitle = (moduleId: string | null) =>
    modules?.find((m) => m.id === moduleId)?.title;

  return (
    <div className="space-y-6">
      <ConfirmDialog />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Diário de Bugs</h1>
          <p className="text-muted-foreground mt-1">Documente sintomas, causas e soluções.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Registrar Bug
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Bug</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}>
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex: Erro de CORS na API de pagamento" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Projeto (opcional)</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {projects?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Módulo (opcional)</Label>
                  <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {modules?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sintoma</Label>
                <Textarea value={symptom} onChange={(e) => setSymptom(e.target.value)} required placeholder="O que aconteceu? Qual foi o comportamento observado?" />
              </div>
              <div className="space-y-2">
                <Label>Código Causador</Label>
                <Textarea value={causeCode} onChange={(e) => setCauseCode(e.target.value)} className="font-mono text-sm" placeholder="Trecho de código que causou o problema" />
              </div>
              <div className="space-y-2">
                <Label>Solução</Label>
                <Textarea value={solution} onChange={(e) => setSolution(e.target.value)} placeholder="Como foi resolvido?" />
              </div>
              <div className="space-y-2">
                <Label>Tags (separadas por vírgula)</Label>
                <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="cors, api, auth" />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        {([null, "open", "resolved"] as const).map((status) => (
          <button
            key={status ?? "all"}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              filterStatus === status
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground border-border hover:bg-accent"
            }`}
          >
            {status === null ? "Todos" : status === "open" ? "Abertos" : "Resolvidos"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !filtered?.length ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bug className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum bug registrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((bug) => (
            <Card key={bug.id} className="border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{bug.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={bug.status as "open" | "resolved"} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => toggleStatus.mutate({ id: bug.id, currentStatus: bug.status as BugStatus })}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDeleteBug(bug)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {(bug.project_id || bug.vault_module_id) && (
                  <div className="flex items-center gap-3 mt-1">
                    {bug.project_id && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FolderOpen className="h-3 w-3" /> {getProjectName(bug.project_id) ?? "Projeto"}
                      </span>
                    )}
                    {bug.vault_module_id && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Package className="h-3 w-3" /> {getModuleTitle(bug.vault_module_id) ?? "Módulo"}
                      </span>
                    )}
                  </div>
                )}
                {bug.tags && bug.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {bug.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Sintoma</p>
                  <p className="text-sm text-foreground">{bug.symptom}</p>
                </div>
                {bug.cause_code && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Código Causador</p>
                    <CodeBlock code={bug.cause_code} showLineNumbers={false} maxHeight="150px" />
                  </div>
                )}
                {bug.solution && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Solução</p>
                    <p className="text-sm text-foreground">{bug.solution}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
