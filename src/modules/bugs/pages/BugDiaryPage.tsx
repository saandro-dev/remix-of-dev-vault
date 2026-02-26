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
import { StatusBadge } from "@/components/StatusBadge";
import { CodeBlock } from "@/components/CodeBlock";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Bug, CheckCircle2 } from "lucide-react";

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
  const [filterStatus, setFilterStatus] = useState<BugStatus | null>(null);

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

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bugs").insert({
        user_id: user!.id,
        title,
        symptom,
        cause_code: causeCode || null,
        solution: solution || null,
        status: solution ? "resolved" : "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bugs"] });
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bugs"] }),
  });

  const resetForm = () => {
    setTitle("");
    setSymptom("");
    setCauseCode("");
    setSolution("");
    setOpen(false);
  };

  const filtered = bugs?.filter((b) => !filterStatus || b.status === filterStatus);

  return (
    <div className="space-y-6">
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
                  </div>
                </div>
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
