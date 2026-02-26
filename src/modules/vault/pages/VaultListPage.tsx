import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ModuleCard } from "@/components/ModuleCard";
import { FilterPills } from "@/components/FilterPills";
import { TagCloud } from "@/components/TagCloud";
import { Plus, Loader2, Package } from "lucide-react";
import { useVaultModules, useCreateVaultModule } from "@/modules/vault/hooks/useVaultModules";
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from "@/modules/vault/constants";
import type { VaultCategory } from "@/modules/vault/types";

export function VaultListPage() {
  const navigate = useNavigate();
  const { data: modules, isLoading } = useVaultModules();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [moduleCategory, setModuleCategory] = useState<VaultCategory>("frontend");
  const [language, setLanguage] = useState("typescript");
  const [code, setCode] = useState("");
  const [contextMarkdown, setContextMarkdown] = useState("");
  const [dependencies, setDependencies] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const resetForm = () => {
    setTitle(""); setDescription(""); setCode(""); setContextMarkdown("");
    setDependencies(""); setTagsInput(""); setOpen(false);
  };

  const createMutation = useCreateVaultModule(resetForm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    createMutation.mutate({
      title, description, category: moduleCategory, language,
      code, context_markdown: contextMarkdown || undefined,
      dependencies: dependencies || undefined, tags,
    });
  };

  const allTags = [...new Set(modules?.flatMap((m) => m.tags) ?? [])];

  const filtered = modules?.filter((m) => {
    const matchesSearch = !searchQuery
      || m.title.toLowerCase().includes(searchQuery.toLowerCase())
      || m.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTags = activeTags.length === 0 || activeTags.some((t) => m.tags.includes(t));
    const matchesCategory = !selectedCategory || m.category === selectedCategory;
    return matchesSearch && matchesTags && matchesCategory;
  });

  const handleTagClick = (tag: string) => {
    setActiveTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const label = selectedCategory ? CATEGORY_LABELS[selectedCategory as VaultCategory] ?? "Todos" : "Todos";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cofre Global — {label}</h1>
          <p className="text-muted-foreground mt-1">Seus módulos reutilizáveis de código.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Módulo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo Módulo</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex: Hook de autenticação" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que este módulo faz?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={moduleCategory} onValueChange={(v) => setModuleCategory(v as VaultCategory)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Linguagem</Label>
                  <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="typescript" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Código</Label>
                <Textarea value={code} onChange={(e) => setCode(e.target.value)} required className="font-mono text-sm min-h-[120px]" placeholder="Cole seu código aqui..." />
              </div>
              <div className="space-y-2">
                <Label>Contexto (Markdown)</Label>
                <Textarea value={contextMarkdown} onChange={(e) => setContextMarkdown(e.target.value)} placeholder="Por que e como usar este módulo..." />
              </div>
              <div className="space-y-2">
                <Label>Dependências</Label>
                <Input value={dependencies} onChange={(e) => setDependencies(e.target.value)} placeholder="npm install zod @tanstack/react-query" className="font-mono text-sm" />
              </div>
              <div className="space-y-2">
                <Label>Tags (separadas por vírgula)</Label>
                <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="react, hooks, auth" />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Módulo"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        <FilterPills options={CATEGORY_OPTIONS} selected={selectedCategory} onSelect={setSelectedCategory} />
        <Input placeholder="Buscar módulos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="max-w-sm" />
        {allTags.length > 0 && <TagCloud tags={allTags} activeTags={activeTags} onTagClick={handleTagClick} />}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !filtered?.length ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum módulo encontrado.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((mod) => (
            <ModuleCard key={mod.id} title={mod.title} language={mod.language} codePreview={mod.code} tags={mod.tags} createdAt={mod.created_at} onClick={() => navigate(`/vault/${mod.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
