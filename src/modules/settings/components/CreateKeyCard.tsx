import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Plus, Loader2 } from "lucide-react";
import { useCreateDevVaultKey } from "@/modules/settings/hooks/useDevVaultKeys";

interface CreateKeyCardProps {
  onKeyCreated: (rawKey: string) => void;
}

export function CreateKeyCard({ onKeyCreated }: CreateKeyCardProps) {
  const [keyName, setKeyName] = useState("");
  const createMutation = useCreateDevVaultKey();
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyName.trim().length < 2) return;
    createMutation.mutate(keyName.trim(), {
      onSuccess: (data) => {
        onKeyCreated(data.key);
        setKeyName("");
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Key className="h-4 w-4" />
          {t("apiKeys.generateNew")}
        </CardTitle>
        <CardDescription>{t("apiKeys.generateDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex items-end gap-3" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-2">
            <Label>{t("apiKeys.keyName")}</Label>
            <Input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder={t("apiKeys.keyNamePlaceholder")}
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
            {t("common.generate")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
