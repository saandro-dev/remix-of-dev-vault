import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateBug } from "@/modules/bugs/hooks/useBugs";
import { useProjects } from "@/modules/projects/hooks/useProjects";
import { useVaultModules } from "@/modules/vault/hooks/useVaultModules";
import { Plus, Loader2 } from "lucide-react";

export function BugCreateDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [symptom, setSymptom] = useState("");
  const [causeCode, setCauseCode] = useState("");
  const [solution, setSolution] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const { data: projects } = useProjects();
  const { data: modules } = useVaultModules();

  const resetForm = () => {
    setTitle(""); setSymptom(""); setCauseCode(""); setSolution("");
    setSelectedProjectId(""); setSelectedModuleId(""); setTagsInput("");
    setOpen(false);
  };

  const createMutation = useCreateBug(resetForm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    createMutation.mutate({
      title,
      symptom,
      cause_code: causeCode || undefined,
      solution: solution || undefined,
      project_id: selectedProjectId && selectedProjectId !== "none" ? selectedProjectId : undefined,
      vault_module_id: selectedModuleId && selectedModuleId !== "none" ? selectedModuleId : undefined,
      tags,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> {t("bugs.registerBug")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("bugs.registerBug")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>{t("bugs.titleLabel")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder={t("bugs.titlePlaceholder")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("bugs.project")}</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger><SelectValue placeholder={t("common.none")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("common.none")}</SelectItem>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("bugs.module")}</Label>
              <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                <SelectTrigger><SelectValue placeholder={t("common.none")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("common.none")}</SelectItem>
                  {modules?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("bugs.symptom")}</Label>
            <Textarea value={symptom} onChange={(e) => setSymptom(e.target.value)} required placeholder={t("bugs.symptomPlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>{t("bugs.causeCode")}</Label>
            <Textarea value={causeCode} onChange={(e) => setCauseCode(e.target.value)} className="font-mono text-sm" placeholder={t("bugs.causeCodePlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>{t("bugs.solution")}</Label>
            <Textarea value={solution} onChange={(e) => setSolution(e.target.value)} placeholder={t("bugs.solutionPlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>{t("bugs.tagsSeparated")}</Label>
            <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder={t("bugs.tagsPlaceholder")} />
          </div>
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.register")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
