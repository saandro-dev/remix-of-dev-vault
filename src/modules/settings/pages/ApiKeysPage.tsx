import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useConfirmDelete } from "@/components/common/ConfirmDelete";
import { Loader2, Plus, Copy, Check, Key, AlertTriangle, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ApiKeyRow {
  id: string;
  key_name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export function ApiKeysPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirmDelete();

  const [keyName, setKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["devvault-api-keys", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devvault_api_keys")
        .select("id, key_name, key_prefix, created_at, last_used_at, revoked_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ApiKeyRow[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.functions.invoke("create-api-key", {
        body: { key_name: name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error.message);
      return data;
    },
    onSuccess: (data) => {
      setNewlyCreatedKey(data.key);
      setKeyName("");
      queryClient.invalidateQueries({ queryKey: ["devvault-api-keys"] });
      toast({ title: "Chave criada com sucesso!" });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const { data, error } = await supabase.functions.invoke("revoke-api-key", {
        body: { key_id: keyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devvault-api-keys"] });
      toast({ title: "Chave revogada!" });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });

  const handleRevoke = async (key: ApiKeyRow) => {
    const confirmed = await confirm({
      resourceType: "Chave de API",
      resourceName: key.key_name,
      requireTypeToConfirm: true,
    });
    if (confirmed) {
      revokeMutation.mutate(key.id);
    }
  };

  const handleCopy = async () => {
    if (newlyCreatedKey) {
      await navigator.clipboard.writeText(newlyCreatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const activeKeys = keys.filter((k) => !k.revoked_at);
  const revokedKeys = keys.filter((k) => k.revoked_at);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">API & Integrações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie chaves de API para integrar ferramentas externas ao seu DevVault.
        </p>
      </div>

      {/* Create new key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Gerar Nova Chave
          </CardTitle>
          <CardDescription>
            Chaves de API permitem que agentes, scripts e ferramentas externas adicionem módulos ao seu Cofre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (keyName.trim().length >= 2) createMutation.mutate(keyName.trim());
            }}
          >
            <div className="flex-1 space-y-2">
              <Label>Nome da Chave</Label>
              <Input
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Ex: MCP Agent, CI Pipeline..."
                required
                minLength={2}
              />
            </div>
            <Button type="submit" className="gap-2" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Gerar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Active keys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Chaves Ativas ({activeKeys.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma chave ativa. Gere uma acima para começar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Prefixo</TableHead>
                  <TableHead>Criada</TableHead>
                  <TableHead>Último Uso</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.key_name}</TableCell>
                    <TableCell>
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                        {key.key_prefix}••••
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(key.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.last_used_at
                        ? formatDistanceToNow(new Date(key.last_used_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })
                        : "Nunca"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRevoke(key)}
                        disabled={revokeMutation.isPending}
                      >
                        Revogar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Revoked keys */}
      {revokedKeys.length > 0 && (
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">
              Chaves Revogadas ({revokedKeys.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Prefixo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revokedKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium text-muted-foreground">
                      {key.key_name}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {key.key_prefix}••••
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="text-xs">
                        Revogada
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* One-time key reveal dialog */}
      <Dialog
        open={!!newlyCreatedKey}
        onOpenChange={(open) => {
          if (!open) {
            setNewlyCreatedKey(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Chave Criada com Sucesso
            </DialogTitle>
            <DialogDescription>
              Copie esta chave agora. Ela <strong>nunca mais será exibida</strong> após
              fechar este diálogo. A chave está armazenada de forma criptografada no Supabase Vault.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg border">
              <code className="text-sm font-mono break-all select-all text-foreground">
                {newlyCreatedKey}
              </code>
            </div>
            <Button className="w-full gap-2" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copiada!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copiar Chave
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  );
}
