import { useState } from "react";
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
import { DOMAIN_LABELS, MODULE_TYPE_LABELS, VALIDATION_STATUS_LABELS } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const DOMAINS: VaultDomain[] = ["security", "backend", "frontend", "architecture", "devops", "saas_playbook"];
const MODULE_TYPES: VaultModuleType[] = ["code_snippet", "full_module", "sql_migration", "architecture_doc", "playbook_phase", "pattern_guide"];
const LANGUAGES = ["typescript", "sql", "bash", "json", "yaml", "markdown", "javascript", "python"];

export function CreateModuleDialog({ open, onOpenChange }: Props) {
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
          <DialogTitle>Novo Módulo de Conhecimento</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="basic">Básico</TabsTrigger>
            <TabsTrigger value="code">Código</TabsTrigger>
            <TabsTrigger value="meta">Metadados</TabsTrigger>
          </TabsList>

          {/* ABA BÁSICO */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Supabase Vault — Como usar vault.create_secret()"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                placeholder="O que este módulo faz e quando usar..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Domínio</Label>
                <Select value={form.domain} onValueChange={(v) => set("domain", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOMAINS.map((d) => (
                      <SelectItem key={d} value={d}>{DOMAIN_LABELS[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de Módulo</Label>
                <Select value={form.module_type} onValueChange={(v) => set("module_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODULE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{MODULE_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Por que isso importa?</Label>
              <Textarea
                placeholder="Explique o motivo arquitetural desta decisão. Ex: 'Usar vault.create_secret() em vez de INSERT direto porque...'"
                value={form.why_it_matters}
                onChange={(e) => set("why_it_matters", e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                placeholder="vault, criptografia, supabase, segurança"
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
              />
            </div>
          </TabsContent>

          {/* ABA CÓDIGO */}
          <TabsContent value="code" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>Linguagem</Label>
              <Select value={form.language} onValueChange={(v) => set("language", v)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Código Principal</Label>
              <Textarea
                placeholder="// Cole o código completo aqui..."
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Exemplo de Uso</Label>
              <Textarea
                placeholder="// Exemplo mínimo de como usar este módulo..."
                value={form.code_example}
                onChange={(e) => set("code_example", e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Documentação / Contexto (Markdown)</Label>
              <Textarea
                placeholder="# Como usar&#10;&#10;Explique com mais detalhes, decisões, alternativas consideradas..."
                value={form.context_markdown}
                onChange={(e) => set("context_markdown", e.target.value)}
                rows={6}
              />
            </div>
          </TabsContent>

          {/* ABA METADADOS */}
          <TabsContent value="meta" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fase do SaaS</Label>
                <Input
                  type="number"
                  placeholder="1, 2, 3..."
                  value={form.saas_phase}
                  onChange={(e) => set("saas_phase", e.target.value)}
                  min={1}
                />
                <p className="text-xs text-muted-foreground">Preencha se for parte de um playbook</p>
              </div>
              <div className="space-y-1.5">
                <Label>Título da Fase</Label>
                <Input
                  placeholder="Ex: Fundação, Autenticação..."
                  value={form.phase_title}
                  onChange={(e) => set("phase_title", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Projeto de Origem</Label>
                <Input
                  placeholder="risecheckout, devvault..."
                  value={form.source_project}
                  onChange={(e) => set("source_project", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status de Validação</Label>
                <Select value={form.validation_status} onValueChange={(v) => set("validation_status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["draft", "validated", "deprecated"] as VaultValidationStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{VALIDATION_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium">Módulo Público</p>
                <p className="text-xs text-muted-foreground">Visível para outros usuários via API</p>
              </div>
              <Switch
                checked={form.is_public}
                onCheckedChange={(v) => set("is_public", v)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.title.trim() || create.isPending}
          >
            {create.isPending ? "Salvando..." : "Criar Módulo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
