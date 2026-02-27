import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Shield, Server, Layout, Building2, Rocket, BookOpen, Loader2, Package, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useVaultModules } from "../hooks/useVaultModules";
import { CreateModuleDialog } from "../components/CreateModuleDialog";
import type { VaultDomain, VaultModuleSummary } from "../types";
import { DOMAIN_LABELS, DOMAIN_COLORS, VALIDATION_COLORS, MODULE_TYPE_LABELS } from "../types";

// Ícones por domínio
const DOMAIN_ICONS: Record<VaultDomain, React.ElementType> = {
  security: Shield,
  backend: Server,
  frontend: Layout,
  architecture: Building2,
  devops: Rocket,
  saas_playbook: BookOpen,
};

const ALL_DOMAINS: VaultDomain[] = ["security", "backend", "frontend", "architecture", "devops", "saas_playbook"];

function ValidationBadge({ status }: { status: string }) {
  if (status === "validated") return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${VALIDATION_COLORS.validated}`}>
      <CheckCircle2 className="h-3 w-3" /> Validado
    </span>
  );
  if (status === "deprecated") return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${VALIDATION_COLORS.deprecated}`}>
      <XCircle className="h-3 w-3" /> Depreciado
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${VALIDATION_COLORS.draft}`}>
      <Clock className="h-3 w-3" /> Rascunho
    </span>
  );
}

function ModuleCard({ mod, onClick }: { mod: VaultModuleSummary; onClick: () => void }) {
  const Icon = DOMAIN_ICONS[mod.domain] ?? Package;
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-lg border border-border bg-surface hover:bg-surface/80 hover:border-primary/30 transition-all space-y-3 group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-md border ${DOMAIN_COLORS[mod.domain]}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <h3 className="font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors">
            {mod.title}
          </h3>
        </div>
        <ValidationBadge status={mod.validation_status} />
      </div>

      {mod.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{mod.description}</p>
      )}

      {mod.why_it_matters && (
        <p className="text-xs text-muted-foreground/70 italic line-clamp-1">"{mod.why_it_matters}"</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          <span className={`text-xs px-1.5 py-0.5 rounded border ${DOMAIN_COLORS[mod.domain]}`}>
            {DOMAIN_LABELS[mod.domain]}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded border border-border text-muted-foreground">
            {MODULE_TYPE_LABELS[mod.module_type]}
          </span>
          {mod.saas_phase && (
            <span className="text-xs px-1.5 py-0.5 rounded border border-cyan-400/20 text-cyan-400 bg-cyan-400/10">
              Fase {mod.saas_phase}
            </span>
          )}
        </div>
        {mod.source_project && (
          <span className="text-xs text-muted-foreground/50 shrink-0">{mod.source_project}</span>
        )}
      </div>

      {mod.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {mod.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs py-0 h-5">{tag}</Badge>
          ))}
          {mod.tags.length > 4 && (
            <span className="text-xs text-muted-foreground">+{mod.tags.length - 4}</span>
          )}
        </div>
      )}
    </button>
  );
}

export function VaultListPage() {
  const navigate = useNavigate();
  const [activeDomain, setActiveDomain] = useState<VaultDomain | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: modules, isLoading } = useVaultModules({
    domain: activeDomain,
    query: searchQuery || undefined,
  });

  // Contagem por domínio para os badges
  const { data: allModules } = useVaultModules();
  const domainCounts = (allModules ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.domain] = (acc[m.domain] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Biblioteca de Conhecimento</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {allModules?.length ?? 0} módulos · padrões validados em produção
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Módulo
        </Button>
      </div>

      {/* Filtros por domínio */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveDomain(undefined)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
            !activeDomain
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
          }`}
        >
          Todos {allModules?.length ? `(${allModules.length})` : ""}
        </button>
        {ALL_DOMAINS.map((domain) => {
          const Icon = DOMAIN_ICONS[domain];
          const isActive = activeDomain === domain;
          const count = domainCounts[domain] ?? 0;
          return (
            <button
              key={domain}
              onClick={() => setActiveDomain(isActive ? undefined : domain)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                isActive
                  ? `${DOMAIN_COLORS[domain]} border-current`
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {DOMAIN_LABELS[domain]}
              {count > 0 && <span className="text-xs opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título, descrição ou porquê..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid de módulos */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !modules?.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <Package className="h-12 w-12 text-muted-foreground/30" />
          <div>
            <p className="text-foreground font-medium">Nenhum módulo encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery || activeDomain
                ? "Tente outros filtros ou busca"
                : "Crie o primeiro módulo da biblioteca"}
            </p>
          </div>
          {!searchQuery && !activeDomain && (
            <Button onClick={() => setCreateOpen(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Criar primeiro módulo
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => (
            <ModuleCard
              key={mod.id}
              mod={mod}
              onClick={() => navigate(`/vault/${mod.id}`)}
            />
          ))}
        </div>
      )}

      <CreateModuleDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
