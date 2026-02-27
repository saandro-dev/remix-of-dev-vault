import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Save, Lock, Users, Globe } from "lucide-react";
import { useUpdateVaultModule } from "@/modules/vault/hooks/useVaultModule";
import type { VaultModule, VaultDomain, VisibilityLevel } from "@/modules/vault/types";

const DOMAINS: VaultDomain[] = ["security", "backend", "frontend", "architecture", "devops", "saas_playbook"];

interface EditModuleSheetProps {
  module: VaultModule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditModuleSheet({ module, open, onOpenChange }: EditModuleSheetProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(module.title);
  const [description, setDescription] = useState(module.description ?? "");
  const [domain, setDomain] = useState<VaultDomain>(module.domain);
  const [language, setLanguage] = useState(module.language);
  const [code, setCode] = useState(module.code);
  const [contextMarkdown, setContextMarkdown] = useState(module.context_markdown ?? "");
  const [dependencies, setDependencies] = useState(module.dependencies ?? "");
  const [tagsInput, setTagsInput] = useState(module.tags.join(", "));
  const [visibility, setVisibility] = useState<VisibilityLevel>(module.visibility);

  useEffect(() => {
    setTitle(module.title);
    setDescription(module.description ?? "");
    setDomain(module.domain);
    setLanguage(module.language);
    setCode(module.code);
    setContextMarkdown(module.context_markdown ?? "");
    setDependencies(module.dependencies ?? "");
    setTagsInput(module.tags.join(", "));
    setVisibility(module.visibility);
  }, [module]);

  const updateMutation = useUpdateVaultModule(module.id, () => onOpenChange(false));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    updateMutation.mutate({
      title,
      description: description || null,
      domain,
      language,
      code,
      context_markdown: contextMarkdown || null,
      dependencies: dependencies || null,
      tags,
      visibility,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("editModule.title")}</SheetTitle>
        </SheetHeader>
        <form className="space-y-4 mt-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>{t("editModule.titleLabel")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>{t("editModule.description")}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("editModule.domain")}</Label>
              <Select value={domain} onValueChange={(v) => setDomain(v as VaultDomain)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOMAINS.map((d) => (
                    <SelectItem key={d} value={d}>{t(`domains.${d}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("editModule.language")}</Label>
              <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("editModule.code")}</Label>
            <Textarea value={code} onChange={(e) => setCode(e.target.value)} required className="font-mono text-sm min-h-[150px]" />
          </div>
          <div className="space-y-2">
            <Label>{t("editModule.context")}</Label>
            <Textarea value={contextMarkdown} onChange={(e) => setContextMarkdown(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("editModule.dependencies")}</Label>
            <Input value={dependencies} onChange={(e) => setDependencies(e.target.value)} className="font-mono text-sm" />
          </div>
          <div className="space-y-2">
            <Label>{t("editModule.tagsSeparated")}</Label>
            <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
          </div>

          {/* Visibility */}
          <div className="space-y-2 p-3 rounded-lg border border-border">
            <Label className="text-sm font-medium">{t("editModule.visibility")}</Label>
            <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as VisibilityLevel)} className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <RadioGroupItem value="private" />
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                {t("visibility.private")}
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <RadioGroupItem value="shared" />
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                {t("visibility.shared")}
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <RadioGroupItem value="global" />
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                {t("visibility.global")}
              </label>
            </RadioGroup>
          </div>

          <Button type="submit" className="w-full gap-2" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("editModule.saveChanges")}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
