import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirmDelete } from "@/components/common/ConfirmDelete";
import { Loader2, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import { useDevVaultKeys, useRevokeDevVaultKey } from "@/modules/settings/hooks/useDevVaultKeys";
import { CreateKeyCard } from "@/modules/settings/components/CreateKeyCard";
import { KeyRevealDialog } from "@/modules/settings/components/KeyRevealDialog";

export function ApiKeysPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "pt-BR" ? ptBR : enUS;
  const { data: keys = [], isLoading } = useDevVaultKeys();
  const revokeMutation = useRevokeDevVaultKey();
  const { confirm, ConfirmDialog } = useConfirmDelete();
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  const handleRevoke = async (key: { id: string; key_name: string }) => {
    const confirmed = await confirm({
      resourceType: "API Key",
      resourceName: key.key_name,
      requireTypeToConfirm: true,
    });
    if (confirmed) revokeMutation.mutate(key.id);
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("apiKeys.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("apiKeys.subtitle")}</p>
      </div>

      <CreateKeyCard onKeyCreated={setNewlyCreatedKey} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {t("apiKeys.activeKeys", { count: activeKeys.length })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("apiKeys.noActiveKeys")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead>{t("apiKeys.prefix")}</TableHead>
                  <TableHead>{t("apiKeys.created")}</TableHead>
                  <TableHead>{t("apiKeys.lastUsed")}</TableHead>
                  <TableHead className="text-right">{t("common.action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.key_name}</TableCell>
                    <TableCell>
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{key.key_prefix}••••</code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(key.created_at), { addSuffix: true, locale: dateLocale })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.last_used_at
                        ? formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true, locale: dateLocale })
                        : t("apiKeys.never")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost" size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRevoke(key)}
                        disabled={revokeMutation.isPending}
                      >
                        {t("common.revoke")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {revokedKeys.length > 0 && (
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">
              {t("apiKeys.revokedKeys", { count: revokedKeys.length })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead>{t("apiKeys.prefix")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revokedKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium text-muted-foreground">{key.key_name}</TableCell>
                    <TableCell>
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{key.key_prefix}••••</code>
                    </TableCell>
                    <TableCell><Badge variant="destructive" className="text-xs">{t("apiKeys.revoked")}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <KeyRevealDialog rawKey={newlyCreatedKey} onClose={() => setNewlyCreatedKey(null)} />
      <ConfirmDialog />
    </div>
  );
}
