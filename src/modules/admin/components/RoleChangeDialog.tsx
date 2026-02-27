import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdmin } from "../hooks/useAdmin";
import type { AppRole } from "../types/admin.types";
import { useState, useEffect } from "react";

const ROLE_OPTIONS: AppRole[] = ["user", "admin", "owner"];

export function RoleChangeDialog() {
  const { t } = useTranslation();
  const {
    selectedUser,
    isChangingRole,
    confirmRoleChange,
    cancelRoleChange,
  } = useAdmin();

  const [newRole, setNewRole] = useState<AppRole>("user");

  useEffect(() => {
    if (selectedUser) {
      setNewRole(selectedUser.role);
    }
  }, [selectedUser]);

  if (!selectedUser) return null;

  const hasChanged = newRole !== selectedUser.role;

  return (
    <Dialog open={!!selectedUser} onOpenChange={() => cancelRoleChange()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("admin.changeRole")}</DialogTitle>
          <DialogDescription>
            {t("admin.confirmRoleChange", {
              name: selectedUser.displayName,
              role: t(`admin.${newRole}`),
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Select
            value={newRole}
            onValueChange={(v) => setNewRole(v as AppRole)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((role) => (
                <SelectItem key={role} value={role}>
                  {t(`admin.${role}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={cancelRoleChange}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => confirmRoleChange(newRole)}
            disabled={!hasChanged || isChangingRole}
          >
            {isChangingRole ? t("common.saving") : t("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
