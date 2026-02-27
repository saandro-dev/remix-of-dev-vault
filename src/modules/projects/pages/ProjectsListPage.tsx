import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useConfirmDelete } from "@/components/common/ConfirmDelete";
import { Plus, FolderOpen, Loader2, Trash2, Pencil } from "lucide-react";
import { useProjects, useUpsertProject, useDeleteProject } from "@/modules/projects/hooks/useProjects";
import type { Project } from "@/modules/projects/types";

export function ProjectsListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: projects, isLoading } = useProjects();
  const { confirm, ConfirmDialog } = useConfirmDelete();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3B82F6");

  const resetForm = () => {
    setName(""); setDescription(""); setColor("#3B82F6");
    setEditingId(null); setOpen(false);
  };

  const upsertMutation = useUpsertProject(resetForm);
  const deleteMutation = useDeleteProject();

  const startEdit = (project: Project) => {
    setEditingId(project.id);
    setName(project.name);
    setDescription(project.description ?? "");
    setColor(project.color);
    setOpen(true);
  };

  const handleDelete = async (project: Project) => {
    const confirmed = await confirm({
      resourceType: t("projects.project"),
      resourceName: project.name,
    });
    if (confirmed) deleteMutation.mutate(project.id);
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("projects.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("projects.subtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> {t("projects.newProject")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? t("projects.editProject") : t("projects.newProject")}</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                upsertMutation.mutate({ id: editingId ?? undefined, name, description, color });
              }}
            >
              <div className="space-y-2">
                <Label>{t("common.name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder={t("projects.namePlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label>{t("common.description")}</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("projects.descriptionPlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label>{t("common.color")}</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-9 rounded border border-border cursor-pointer" />
                  <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1 font-mono text-sm" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? t("common.save") : t("common.create")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !projects?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{t("projects.noProjects")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="group hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                  <CardTitle className="text-base truncate">{project.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{project.description || t("common.noDescription")}</p>
                <div className="flex gap-1 mt-3">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); startEdit(project); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(project); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
