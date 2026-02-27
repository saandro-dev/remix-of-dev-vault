import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Shield, MoreHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdmin } from "../hooks/useAdmin";
import { usePermissions } from "@/modules/auth/hooks/usePermissions";
import type { AppRole } from "../types/admin.types";

const ROLE_VARIANT: Record<AppRole, "default" | "secondary" | "destructive" | "outline"> = {
  owner: "default",
  admin: "secondary",
  moderator: "outline",
  user: "outline",
};

export function UsersTable() {
  const { t } = useTranslation();
  const { users, isLoading, openRoleDialog } = useAdmin();
  const { isOwner } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        {t("admin.noUsers")}
      </p>
    );
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common.name")}</TableHead>
            <TableHead>{t("admin.role")}</TableHead>
            <TableHead>{t("admin.joined")}</TableHead>
            {isOwner && (
              <TableHead className="w-[80px]">{t("admin.actions")}</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl ?? undefined} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      {user.displayName?.charAt(0)?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">
                    {user.displayName}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={ROLE_VARIANT[user.role] ?? "outline"}>
                  <Shield className="h-3 w-3 mr-1" />
                  {t(`admin.${user.role}`)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(user.createdAt), "dd/MM/yyyy")}
              </TableCell>
              {isOwner && (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => openRoleDialog(user)}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        {t("admin.changeRole")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
