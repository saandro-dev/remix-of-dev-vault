import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { CodeBlock } from "@/components/CodeBlock";
import { TagCloud } from "@/components/TagCloud";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2, Copy, Check, Loader2 } from "lucide-react";
import { useState } from "react";

export function VaultDetailPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [depCopied, setDepCopied] = useState(false);

  const { data: mod, isLoading } = useQuery({
    queryKey: ["vault_module", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vault_modules")
        .select("*")
        .eq("id", moduleId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!moduleId && !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("vault_modules").delete().eq("id", moduleId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault_modules"] });
      toast({ title: "Módulo excluído." });
      navigate(-1);
    },
  });

  const copyDeps = async () => {
    if (!mod?.dependencies) return;
    await navigator.clipboard.writeText(mod.dependencies);
    setDepCopied(true);
    setTimeout(() => setDepCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!mod) {
    return <p className="text-muted-foreground">Módulo não encontrado.</p>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/vault/${mod.category}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{mod.title}</h1>
            <p className="text-sm text-muted-foreground">{mod.description}</p>
          </div>
        </div>
        <Button variant="destructive" size="sm" className="gap-2" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </Button>
      </div>

      <TagCloud tags={mod.tags} />

      {mod.context_markdown && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Porquê e Como</h2>
          <div className="prose prose-sm dark:prose-invert max-w-none bg-surface p-4 rounded-lg border border-border">
            <p className="text-foreground whitespace-pre-wrap">{mod.context_markdown}</p>
          </div>
        </div>
      )}

      {mod.dependencies && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Dependências</h2>
          <div className="flex items-center gap-2 bg-surface rounded-lg border border-border p-3">
            <code className="font-mono text-sm text-foreground flex-1">{mod.dependencies}</code>
            <Button variant="ghost" size="sm" onClick={copyDeps}>
              {depCopied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Código</h2>
        <CodeBlock code={mod.code} language={mod.language} />
      </div>
    </div>
  );
}
