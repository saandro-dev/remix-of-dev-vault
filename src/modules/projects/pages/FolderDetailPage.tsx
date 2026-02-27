import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KeyMask } from "@/components/KeyMask";
import { StatusBadge } from "@/components/StatusBadge";
import { useConfirmDelete } from "@/components/common/ConfirmDelete";
import { Plus, Loader2, Trash2, ArrowLeft, Key, Eye, Lock } from "lucide-react";
import {
  useProjectApiKeys,
  useRevealApiKey,
  useCreateProjectApiKey,
  useDeleteProjectApiKey,
} from "@/modules/projects/hooks/useProjectApiKeys";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import type { ProjectEnvironment, KeyFolder } from "@/modules/projects/types";

// ---------------------------------------------------------------------------
// ApiKeyRow — Linha da tabela com revelação sob demanda via Vault.
// Só busca o valor real quando o usuário clica em "Revelar".
// ---------------------------------------------------------------------------
function ApiKeyRow({
  keyItem,
  onDelete,
}: {
  keyItem: { id: string; label: string; environment: string; has_value: boolean };
  onDelete: () => void;
}) {
  const [revealId, setRevealId] = useState<string | null>(null);
  const { data: revealedValue, isLoading: isRevealing } = useRevealApiKey(revealId);

  const handleReveal = () => {
    // Alterna entre revelar e ocultar
    setRevealId((prev) => (prev ? null : keyItem.id));
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{keyItem.label}</TableCell>
      <TableCell>
        {revealedValue ? (
          // Valor real obtido do Vault — passa para o KeyMask para copiar/ocultar
          <KeyMask value={revealedValue} />
        ) : (
          <div className="flex items-center gap-2">
            <code className="font-mono text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
              {keyItem.has_value ? "••••••••••••••••" : "Sem valor"}
            </code>
            {keyItem.has_value && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-muted-foreground hover:text-foreground text-xs"
                onClick={handleReveal}
                disabled={isRevealing}
              >
                {isRevealing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
                {isRevealing ? "Buscando..." : "Revelar"}
              </Button>
            )}
          </div>
        )}
      </TableCell>
      <TableCell>
        <StatusBadge variant={keyItem.environment as ProjectEnvironment} />
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// FolderDetailPage — Página principal da pasta de API Keys.
// ---------------------------------------------------------------------------
export function FolderDetailPage() {
  const { projectId, folderId } = useParams<{ projectId: string; folderId: string }>();
  const { user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirmDelete();

  const { data: folder } = useQuery({
    queryKey: ["key_folder", folderId],
    queryFn: () => invokeEdgeFunction<KeyFolder>("folders-crud", { action: "get", id: folderId }),
    enabled: !!folderId && !!user,
  });

  const { data: apiKeys, isLoading } = useProjectApiKeys(folderId);

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [environment, setEnvironment] = useState<ProjectEnvironment>("dev");

  const createMutation = useCreateProjectApiKey(folderId, () => {
    setLabel("");
    setKeyValue("");
    setEnvironment("dev");
    setOpen(false);
  });
  const deleteMutation = useDeleteProjectApiKey(folderId);

  const handleDeleteKey = async (key: { id: string; label: string }) => {
    const confirmed = await confirm({ resourceType: "API Key", resourceName: key.label });
    if (confirmed) deleteMutation.mutate(key.id);
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog />

      {/* Header */}
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
          <p className="text-muted-foreground text-sm flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            API Keys criptografadas no Vault
          </p>
        </div>
      </div>

      {/* Toolbar */}
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
            <p className="text-sm text-muted-foreground -mt-2">
              O valor será criptografado no Supabase Vault. Nunca fica em texto plano no banco.
            </p>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!projectId || !folderId) return;
                createMutation.mutate({
                  project_id: projectId,
                  folder_id: folderId,
                  label,
                  key_value: keyValue,
                  environment,
                });
              }}
            >
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                  placeholder="Ex: Stripe Secret Key"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor da Key</Label>
                <Input
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  required
                  placeholder="sk_live_..."
                  type="password"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <Select
                  value={environment}
                  onValueChange={(v) => setEnvironment(v as ProjectEnvironment)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dev">Dev</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="prod">Prod</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Adicionar com segurança"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela */}
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
                <ApiKeyRow
                  key={key.id}
                  keyItem={key}
                  onDelete={() => handleDeleteKey(key)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
