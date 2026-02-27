import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Copy, Check } from "lucide-react";

interface KeyRevealDialogProps {
  rawKey: string | null;
  onClose: () => void;
}

export function KeyRevealDialog({ rawKey, onClose }: KeyRevealDialogProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  const handleCopy = async () => {
    if (!rawKey) return;
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog
      open={!!rawKey}
      onOpenChange={(open) => {
        if (!open) {
          setCopied(false);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {t("apiKeys.keyCreated")}
          </DialogTitle>
          <DialogDescription dangerouslySetInnerHTML={{ __html: t("apiKeys.keyCreatedDescription") }} />
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg border">
            <code className="text-sm font-mono break-all select-all text-foreground">
              {rawKey}
            </code>
          </div>
          <Button className="w-full gap-2" onClick={handleCopy}>
            {copied ? (
              <><Check className="h-4 w-4" /> {t("apiKeys.copied")}</>
            ) : (
              <><Copy className="h-4 w-4" /> {t("apiKeys.copyKey")}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
