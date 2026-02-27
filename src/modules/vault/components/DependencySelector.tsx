import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { X, Plus, Link2, Loader2 } from "lucide-react";
import { useSearchModulesForDependency } from "../hooks/useModuleDependencies";
import type { DependencyType } from "../types";

export interface PendingDependency {
  depends_on_id: string;
  title: string;
  dependency_type: DependencyType;
}

interface DependencySelectorProps {
  moduleId: string;
  selected: PendingDependency[];
  onChange: (deps: PendingDependency[]) => void;
}

export function DependencySelector({ moduleId, selected, onChange }: DependencySelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [depType, setDepType] = useState<DependencyType>("required");

  const { data: results, isLoading } = useSearchModulesForDependency(search, moduleId, open);

  const alreadySelected = new Set(selected.map((d) => d.depends_on_id));

  const handleSelect = (id: string, title: string) => {
    if (alreadySelected.has(id)) return;
    onChange([...selected, { depends_on_id: id, title, dependency_type: depType }]);
    setOpen(false);
    setSearch("");
  };

  const handleRemove = (id: string) => {
    onChange(selected.filter((d) => d.depends_on_id !== id));
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Link2 className="h-4 w-4" />
        {t("dependencies.addDependency")}
      </Label>

      {/* Selected dependencies chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((dep) => (
            <Badge
              key={dep.depends_on_id}
              variant={dep.dependency_type === "required" ? "default" : "secondary"}
              className="gap-1.5 pr-1"
            >
              {dep.title}
              <span className="text-[10px] opacity-70">({t(`dependencies.${dep.dependency_type}`)})</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleRemove(dep.depends_on_id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Type selector + Search */}
      <div className="flex gap-2">
        <Select value={depType} onValueChange={(v) => setDepType(v as DependencyType)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="required">{t("dependencies.required")}</SelectItem>
            <SelectItem value="recommended">{t("dependencies.recommended")}</SelectItem>
          </SelectContent>
        </Select>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 flex-1 justify-start">
              <Plus className="h-3.5 w-3.5" />
              {t("dependencies.searchModules")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-80" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={t("dependencies.searchModules")}
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                {isLoading && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                <CommandEmpty>{search.length < 2 ? t("common.typeToSearch") : t("common.noResults", { query: search })}</CommandEmpty>
                <CommandGroup>
                  {(results ?? [])
                    .filter((m) => !alreadySelected.has(m.id))
                    .map((m) => (
                      <CommandItem
                        key={m.id}
                        value={m.id}
                        onSelect={() => handleSelect(m.id, m.title)}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{m.title}</span>
                          {m.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {m.description}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
