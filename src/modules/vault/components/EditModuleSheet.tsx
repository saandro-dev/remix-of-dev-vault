import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

type VaultCategory = "frontend" | "backend" | "devops" | "security";

const categoryOptions = [
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "devops", label: "DevOps & Infra" },
  { value: "security", label: "Segurança & Criptografia" },
];

interface VaultModule {
  id: string;
  title: string;
  description: string | null;
  category: VaultCategory;
  language: string;
  code: string;
  context_markdown: string | null;
  dependencies: string | null;
  tags: string[];
}

interface EditModuleSheetProps {
  module: VaultModule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditModuleSheet({ module, open, onOpenChange }: EditModuleSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(module.title);
  const [description, setDescription] = useState(module.description ?? "");
  const [category, setCategory] = useState<VaultCategory>(module.category);
  const [language, setLanguage] = useState(module.language);
  const [code, setCode] = useState(module.code);
  const [contextMarkdown, setContextMarkdown] = useState(module.context_markdown ?? "");
  const [dependencies, setDependencies] = useState(module.dependencies ?? "");
  const [tagsInput, setTagsInput] = useState(module.tags.join(", "));

  useEffect(() => {
    setTitle(module.title);
    setDescription(module.description ?? "");
    setCategory(module.category);
    setLanguage(module.language);
    setCode(module.code);
    setContextMarkdown(module.context_markdown ?? "");
    setDependencies(module.dependencies ?? "");
    setTagsInput(module.tags.join(", "));
  }, [module]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const { error } = await supabase
        .from("vault_modules")
        .update({
          title,
          description: description || null,
          category,
          language,
          code,
          context_markdown: contextMarkdown || null,
          dependencies: dependencies || null,
          tags,
        })
        .eq("id", module.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault_modules"] });
      queryClient.invalidateQueries({ queryKey: ["vault_module", module.id] });
      toast({ title: "Módulo atualizado!" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Módulo</SheetTitle>
        </SheetHeader>
        <form
          className="space-y-4 mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as VaultCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Linguagem</Label>
              <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Código</Label>
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="font-mono text-sm min-h-[150px]"
            />
          </div>
          <div className="space-y-2">
            <Label>Contexto (Markdown)</Label>
            <Textarea value={contextMarkdown} onChange={(e) => setContextMarkdown(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Dependências</Label>
            <Input
              value={dependencies}
              onChange={(e) => setDependencies(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label>Tags (separadas por vírgula)</Label>
            <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar Alterações
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
