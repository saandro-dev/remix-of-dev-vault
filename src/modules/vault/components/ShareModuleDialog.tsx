import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useModuleShares,
  useShareModule,
  useUnshareModule,
} from "@/modules/vault/hooks/useModuleShares";
import { Share2, Trash2, Loader2 } from "lucide-react";

interface ShareModuleDialogProps {
  moduleId: string;
}

export function ShareModuleDialog({ moduleId }: ShareModuleDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  const { data: shares, isLoading } = useModuleShares(moduleId);
  const shareMutation = useShareModule();
  const unshareMutation = useUnshareModule();

  const handleShare = () => {
    if (!email.trim()) return;
    shareMutation.mutate(
      { moduleId, email: email.trim() },
      { onSuccess: () => setEmail("") },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleShare();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-3.5 w-3.5" /> {t("share.button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("share.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            type="email"
            placeholder={t("share.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button
            onClick={handleShare}
            disabled={!email.trim() || shareMutation.isPending}
          >
            {shareMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("share.shareAction")
            )}
          </Button>
        </div>

        <div className="space-y-2 mt-4">
          <h4 className="text-sm font-medium text-muted-foreground">
            {t("share.currentShares")}
          </h4>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : !shares?.length ? (
            <p className="text-sm text-muted-foreground py-2">
              {t("share.noShares")}
            </p>
          ) : (
            <ul className="space-y-1">
              {shares.map((share) => (
                <li
                  key={share.shared_with_user_id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <span className="text-sm font-mono text-foreground truncate">
                    {share.shared_with_user_id}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    disabled={unshareMutation.isPending}
                    onClick={() =>
                      unshareMutation.mutate({
                        moduleId,
                        userId: share.shared_with_user_id,
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
