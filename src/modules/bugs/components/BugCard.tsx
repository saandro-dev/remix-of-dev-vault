import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { CodeBlock } from "@/components/CodeBlock";
import { CheckCircle2, Trash2, FolderOpen, Package } from "lucide-react";
import type { Bug, BugStatus } from "../types";

interface BugCardProps {
  bug: Bug;
  projectName?: string;
  moduleName?: string;
  onToggleStatus: (id: string, currentStatus: BugStatus) => void;
  onDelete: (bug: { id: string; title: string }) => void;
}

export function BugCard({ bug, projectName, moduleName, onToggleStatus, onDelete }: BugCardProps) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{bug.title}</CardTitle>
          <div className="flex items-center gap-2">
            <StatusBadge variant={bug.status} />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onToggleStatus(bug.id, bug.status)}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => onDelete(bug)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {(bug.project_id || bug.vault_module_id) && (
          <div className="flex items-center gap-3 mt-1">
            {bug.project_id && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <FolderOpen className="h-3 w-3" /> {projectName ?? "Projeto"}
              </span>
            )}
            {bug.vault_module_id && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Package className="h-3 w-3" /> {moduleName ?? "Módulo"}
              </span>
            )}
          </div>
        )}
        {bug.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {bug.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Sintoma</p>
          <p className="text-sm text-foreground">{bug.symptom}</p>
        </div>
        {bug.cause_code && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Código Causador</p>
            <CodeBlock code={bug.cause_code} showLineNumbers={false} maxHeight="150px" />
          </div>
        )}
        {bug.solution && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Solução</p>
            <p className="text-sm text-foreground">{bug.solution}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
