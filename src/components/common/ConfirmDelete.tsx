import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

interface ConfirmDeleteState {
  isOpen: boolean;
  resourceType: string;
  resourceName: string;
  requireTypeToConfirm: boolean;
}

type ConfirmFn = (opts: {
  resourceType: string;
  resourceName: string;
  requireTypeToConfirm?: boolean;
}) => Promise<boolean>;

export function useConfirmDelete(): {
  confirm: ConfirmFn;
  ConfirmDialog: React.FC;
} {
  const [state, setState] = useState<ConfirmDeleteState>({
    isOpen: false,
    resourceType: "",
    resourceName: "",
    requireTypeToConfirm: false,
  });

  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm: ConfirmFn = useCallback((opts) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({
        isOpen: true,
        resourceType: opts.resourceType,
        resourceName: opts.resourceName,
        requireTypeToConfirm: opts.requireTypeToConfirm ?? false,
      });
    });
  }, []);

  const handleClose = useCallback((confirmed: boolean) => {
    setState((prev) => ({ ...prev, isOpen: false }));
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
  }, []);

  const ConfirmDialog: React.FC = () => {
    const { t } = useTranslation();
    const [typed, setTyped] = useState("");
    const keyword = t("confirmDelete.keyword");
    const canConfirm = !state.requireTypeToConfirm || typed === keyword;

    return (
      <AlertDialog open={state.isOpen} onOpenChange={(open) => { if (!open) handleClose(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("confirmDelete.title", { resourceType: state.resourceType })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span dangerouslySetInnerHTML={{
                __html: t("confirmDelete.description", { resourceName: state.resourceName })
              }} />
              {state.requireTypeToConfirm && (
                <span className="block mt-2" dangerouslySetInnerHTML={{
                  __html: t("confirmDelete.typeToConfirm", { keyword })
                }} />
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {state.requireTypeToConfirm && (
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={keyword}
              className="font-mono"
            />
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleClose(false)}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!canConfirm}
              onClick={() => handleClose(true)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  return { confirm, ConfirmDialog };
}
