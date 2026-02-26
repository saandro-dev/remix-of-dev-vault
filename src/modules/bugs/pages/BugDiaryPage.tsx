import { useState } from "react";
import { useConfirmDelete } from "@/components/common/ConfirmDelete";
import { Loader2, Bug } from "lucide-react";
import { useBugs, useToggleBugStatus, useDeleteBug } from "@/modules/bugs/hooks/useBugs";
import { useProjects } from "@/modules/projects/hooks/useProjects";
import { useVaultModules } from "@/modules/vault/hooks/useVaultModules";
import { BugCreateDialog } from "@/modules/bugs/components/BugCreateDialog";
import { BugCard } from "@/modules/bugs/components/BugCard";
import type { BugStatus } from "@/modules/bugs/types";

export function BugDiaryPage() {
  const { data: bugs, isLoading } = useBugs();
  const { data: projects } = useProjects();
  const { data: modules } = useVaultModules();
  const toggleStatus = useToggleBugStatus();
  const deleteBugMutation = useDeleteBug();
  const { confirm, ConfirmDialog } = useConfirmDelete();
  const [filterStatus, setFilterStatus] = useState<BugStatus | null>(null);

  const filtered = bugs?.filter((b) => !filterStatus || b.status === filterStatus);

  const getProjectName = (projectId: string | null) =>
    projects?.find((p) => p.id === projectId)?.name;

  const getModuleTitle = (moduleId: string | null) =>
    modules?.find((m) => m.id === moduleId)?.title;

  const handleDeleteBug = async (bug: { id: string; title: string }) => {
    const confirmed = await confirm({ resourceType: "bug", resourceName: bug.title });
    if (confirmed) deleteBugMutation.mutate(bug.id);
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Diário de Bugs</h1>
          <p className="text-muted-foreground mt-1">Documente sintomas, causas e soluções.</p>
        </div>
        <BugCreateDialog />
      </div>

      <div className="flex gap-2">
        {([null, "open", "resolved"] as const).map((status) => (
          <button
            key={status ?? "all"}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              filterStatus === status
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground border-border hover:bg-accent"
            }`}
          >
            {status === null ? "Todos" : status === "open" ? "Abertos" : "Resolvidos"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !filtered?.length ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bug className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum bug registrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((bug) => (
            <BugCard
              key={bug.id}
              bug={bug}
              projectName={getProjectName(bug.project_id)}
              moduleName={getModuleTitle(bug.vault_module_id)}
              onToggleStatus={(id, status) => toggleStatus.mutate({ id, currentStatus: status })}
              onDelete={handleDeleteBug}
            />
          ))}
        </div>
      )}
    </div>
  );
}
