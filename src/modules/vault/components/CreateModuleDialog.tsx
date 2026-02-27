import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateVaultModule } from "../hooks/useVaultModules";
import type { VaultDomain, VaultModuleType, VaultValidationStatus } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const DOMAINS: VaultDomain[] = ["security", "backend", "frontend", "architecture", "devops", "saas_playbook"];
const MODULE_TYPES: VaultModuleType[] = ["code_snippet", "full_module", "sql_migration", "architecture_doc", "playbook_phase", "pattern_guide"];
const LANGUAGES = ["typescript", "sql", "bash", "json", "yaml", "markdown", "javascript", "python"];

export function CreateModuleDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState("basic");
  const create = useCreateVaultModule(() => onOpenChange(false));

  const [form, setForm] = useState({
    title: "",
    description: "",
    domain: "backend" as VaultDomain,
    module_type: "code_snippet" as VaultModuleType,
    language: "typescript",
    code: "",
    context_markdown: "",
    why_it_matters: "",
    code_example: "",
    source_project: "",
    tags: "",
    saas_phase: "",
    phase_title: "",
    validation_status: "draft" as VaultValidationStatus,
    is_public: false,
  });

  const set = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    create.mutate({
      title: form.title.trim(),
      description: form.description || undefined,
      domain: form.domain,
      module_type: form.module_type,
      language: form.language,
      code: form.code || undefined,
      context_markdown: form.context_markdown || undefined,
      why_it_matters: form.why_it_matters || undefined,
      code_example: form.code_example || undefined,
      source_project: form.source_project || undefined,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      saas_phase: form.saas_phase ? parseInt(form.saas_phase) : undefined,
      phase_title: form.phase_title || undefined,
      validation_status: form.validation_status,
      is_public: form.is_public,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("createModule.title")}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="basic">{t("createModule.tabBasic")}</TabsTrigger>
            <TabsTrigger value="code">{t("createModule.tabCode")}</TabsTrigger>
            <TabsTrigger value="meta">{t("createModule.tabMeta")}</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>{t("createModule.moduleTitle")}</Label>
              <Input placeholder={t("createModule.titlePlaceholder")} value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("createModule.description")}</Label>
              <Textarea placeholder={t("createModule.descriptionPlaceholder")} value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("createModule.domain")}</Label>
                <Select value={form.domain} onValueChange={(v) => set("domain", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOMAINS.map((d) => (
                      <SelectItem key={d} value={d}>{t(`domains.${d}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("createModule.moduleType")}</Label>
                <Select value={form.module_type} onValueChange={(v) => set("module_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODULE_TYPES.map((mt) => (
                      <SelectItem key={mt} value={mt}>{t(`moduleTypes.${mt}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("createModule.whyItMatters")}</Label>
              <Textarea placeholder={t("createModule.whyPlaceholder")} value={form.why_it_matters} onChange={(e) => set("why_it_matters", e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("createModule.tagsSeparated")}</Label>
              <Input placeholder={t("createModule.tagsPlaceholder")} value={form.tags} onChange={(e) => set("tags", e.target.value)} />
            </div>
          </TabsContent>

          <TabsContent value="code" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>{t("createModule.language")}</Label>
              <Select value={form.language} onValueChange={(v) => set("language", v)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("createModule.mainCode")}</Label>
              <Textarea placeholder={t("createModule.codePlaceholder")} value={form.code} onChange={(e) => set("code", e.target.value)} rows={10} className="font-mono text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("createModule.usageExample")}</Label>
              <Textarea placeholder={t("createModule.examplePlaceholder")} value={form.code_example} onChange={(e) => set("code_example", e.target.value)} rows={6} className="font-mono text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("createModule.docContext")}</Label>
              <Textarea placeholder={t("createModule.docPlaceholder")} value={form.context_markdown} onChange={(e) => set("context_markdown", e.target.value)} rows={6} />
            </div>
          </TabsContent>

          <TabsContent value="meta" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("createModule.saasPhase")}</Label>
                <Input type="number" placeholder={t("createModule.phasePlaceholder")} value={form.saas_phase} onChange={(e) => set("saas_phase", e.target.value)} min={1} />
                <p className="text-xs text-muted-foreground">{t("createModule.phaseHint")}</p>
              </div>
              <div className="space-y-1.5">
                <Label>{t("createModule.phaseTitle")}</Label>
                <Input placeholder={t("createModule.phaseTitlePlaceholder")} value={form.phase_title} onChange={(e) => set("phase_title", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("createModule.sourceProject")}</Label>
                <Input placeholder={t("createModule.sourceProjectPlaceholder")} value={form.source_project} onChange={(e) => set("source_project", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("createModule.validationStatus")}</Label>
                <Select value={form.validation_status} onValueChange={(v) => set("validation_status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["draft", "validated", "deprecated"] as VaultValidationStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{t(`validationStatus.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium">{t("createModule.publicModule")}</p>
                <p className="text-xs text-muted-foreground">{t("createModule.publicHint")}</p>
              </div>
              <Switch checked={form.is_public} onCheckedChange={(v) => set("is_public", v)} />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!form.title.trim() || create.isPending}>
            {create.isPending ? t("common.saving") : t("createModule.createModule")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
