import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Ban } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import { usePermissions } from "@/modules/auth/hooks/usePermissions";
import { toast } from "sonner";
import type { AdminApiKey } from "../types/admin.types";

interface ApiKeysResponse {
  apiKeys: AdminApiKey[];
}

export function ApiMonitorTab() {
  const { t } = useTranslation();
  const { isOwner } = usePermissions();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-api-keys"],
    queryFn: () =>
      invokeEdgeFunction<ApiKeysResponse>("admin-crud", {
        action: "list-api-keys",
      }),
  });

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) =>
      invokeEdgeFunction("admin-crud", {
        action: "admin-revoke-api-key",
        keyId,
      }),
    onSuccess: () => {
      toast.success(t("toast.keyRevoked"));
      queryClient.invalidateQueries({ queryKey: ["admin-api-keys"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const keys = data?.apiKeys ?? [];

  if (keys.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        {t("admin.apiMonitor.noKeys")}
      </p>
    );
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("admin.apiMonitor.owner")}</TableHead>
            <TableHead>{t("admin.apiMonitor.keyName")}</TableHead>
            <TableHead>{t("apiKeys.prefix")}</TableHead>
            <TableHead>{t("common.status")}</TableHead>
            <TableHead>{t("apiKeys.created")}</TableHead>
            <TableHead>{t("apiKeys.lastUsed")}</TableHead>
            {isOwner && <TableHead className="w-[80px]">{t("admin.actions")}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((key) => {
            const isRevoked = !!key.revokedAt;
            return (
              <TableRow key={key.id}>
                <TableCell className="font-medium text-foreground">
                  {key.ownerName}
                </TableCell>
                <TableCell>{key.keyName}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {key.keyPrefix}...
                  </code>
                </TableCell>
                <TableCell>
                  <Badge variant={isRevoked ? "destructive" : "default"}>
                    {isRevoked ? t("apiKeys.revoked") : t("admin.apiMonitor.active")}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(key.createdAt), "dd/MM/yyyy")}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {key.lastUsedAt
                    ? format(new Date(key.lastUsedAt), "dd/MM/yyyy HH:mm")
                    : t("apiKeys.never")}
                </TableCell>
                {isOwner && (
                  <TableCell>
                    {!isRevoked && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => revokeMutation.mutate(key.id)}
                        disabled={revokeMutation.isPending}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
