import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { invokeEdgeFunction } from "@/lib/edge-function-client";
import { toast } from "sonner";
import type { AdminGlobalModule } from "../types/admin.types";

interface GlobalModulesResponse {
  globalModules: AdminGlobalModule[];
}

export function GlobalModerationTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-global-modules"],
    queryFn: () =>
      invokeEdgeFunction<GlobalModulesResponse>("admin-crud", {
        action: "list-global-modules",
      }),
  });

  const unpublishMutation = useMutation({
    mutationFn: (moduleId: string) =>
      invokeEdgeFunction("admin-crud", {
        action: "unpublish-module",
        moduleId,
      }),
    onSuccess: () => {
      toast.success(t("admin.moderation.unpublished"));
      queryClient.invalidateQueries({ queryKey: ["admin-global-modules"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
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

  const modules = data?.globalModules ?? [];

  if (modules.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        {t("admin.moderation.noModules")}
      </p>
    );
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("admin.moderation.moduleTitle")}</TableHead>
            <TableHead>{t("admin.moderation.author")}</TableHead>
            <TableHead>{t("createModule.domain")}</TableHead>
            <TableHead>{t("apiKeys.created")}</TableHead>
            <TableHead className="w-[80px]">{t("admin.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modules.map((mod) => (
            <TableRow key={mod.id}>
              <TableCell>
                <Link
                  to={`/vault/${mod.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {mod.title}
                </Link>
              </TableCell>
              <TableCell className="text-foreground">{mod.authorName}</TableCell>
              <TableCell>
                {mod.domain && (
                  <Badge variant="secondary">
                    {t(`domains.${mod.domain}`, mod.domain)}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(mod.createdAt), "dd/MM/yyyy")}
              </TableCell>
              <TableCell>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                    >
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("admin.moderation.unpublishTitle")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("admin.moderation.unpublishConfirm", {
                          title: mod.title,
                        })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => unpublishMutation.mutate(mod.id)}
                      >
                        {t("common.confirm")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
