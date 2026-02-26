import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { CodeBlock } from "@/components/CodeBlock";
import { TagCloud } from "@/components/TagCloud";
import { Button } from "@/components/ui/button";
import { useConfirmDelete } from "@/components/common/ConfirmDelete";
import { EditModuleSheet } from "@/modules/vault/components/EditModuleSheet";
import { useVaultModule, useDeleteVaultModule } from "@/modules/vault/hooks/useVaultModule";
import { ArrowLeft, Trash2, Copy, Check, Loader2, Pencil } from "lucide-react";

export function VaultDetailPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const [depCopied, setDepCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { confirm, ConfirmDialog } = useConfirmDelete();

  const { data: mod, isLoading } = useVaultModule(moduleId);
  const deleteMutation = useDeleteVaultModule();

  const handleDelete = async () => {
    if (!mod) return;
    const confirmed = await confirm({
      resourceType: "módulo",
      resourceName: mod.title,
      requireTypeToConfirm: true,
    });
    if (confirmed) {
      deleteMutation.mutate(mod.id, { onSuccess: () => navigate(-1) });
    }
  };

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
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className="text-muted-foreground">Módulo não encontrado ou URL inválida.</p>
        <Link to="/vault">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar ao Cofre
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <ConfirmDialog />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/vault">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{mod.title}</h1>
            <p className="text-sm text-muted-foreground">{mod.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
          <Button variant="destructive" size="sm" className="gap-2" onClick={handleDelete} disabled={deleteMutation.isPending}>
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </Button>
        </div>
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

      <EditModuleSheet module={mod} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
