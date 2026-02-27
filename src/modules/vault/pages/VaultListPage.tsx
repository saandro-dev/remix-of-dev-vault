import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Search, Shield, Server, Layout, Building2, Rocket, BookOpen, Loader2, Package, CheckCircle2, Clock, XCircle, Lock, Users, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useVaultModules } from "../hooks/useVaultModules";
import { CreateModuleDialog } from "../components/CreateModuleDialog";
import type { VaultDomain, VaultModuleSummary, VaultScope, VisibilityLevel } from "../types";
import { DOMAIN_COLORS, VALIDATION_COLORS, VISIBILITY_COLORS } from "../types";

const DOMAIN_ICONS: Record<VaultDomain, React.ElementType> = {
  security: Shield,
  backend: Server,
  frontend: Layout,
  architecture: Building2,
  devops: Rocket,
  saas_playbook: BookOpen,
};

const VISIBILITY_ICONS: Record<VisibilityLevel, React.ElementType> = {
  private: Lock,
  shared: Users,
  global: Globe,
};

const ALL_DOMAINS: VaultDomain[] = ["security", "backend", "frontend", "architecture", "devops", "saas_playbook"];

function ValidationBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  if (status === "validated") return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${VALIDATION_COLORS.validated}`}>
      <CheckCircle2 className="h-3 w-3" /> {t("vault.validated")}
    </span>
  );
  if (status === "deprecated") return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${VALIDATION_COLORS.deprecated}`}>
      <XCircle className="h-3 w-3" /> {t("vault.deprecated")}
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${VALIDATION_COLORS.draft}`}>
      <Clock className="h-3 w-3" /> {t("vault.draft")}
    </span>
  );
}

function VisibilityBadge({ visibility }: { visibility: VisibilityLevel }) {
  const { t } = useTranslation();
  const Icon = VISIBILITY_ICONS[visibility];
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${VISIBILITY_COLORS[visibility]}`}>
      <Icon className="h-3 w-3" /> {t(`visibility.${visibility}`)}
    </span>
  );
}

function ModuleCard({ mod, onClick }: { mod: VaultModuleSummary; onClick: () => void }) {
  const { t } = useTranslation();
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
        <div className="flex items-center gap-1.5 shrink-0">
          <VisibilityBadge visibility={mod.visibility} />
          <ValidationBadge status={mod.validation_status} />
        </div>
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
            {t(`domains.${mod.domain}`)}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded border border-border text-muted-foreground">
            {t(`moduleTypes.${mod.module_type}`)}
          </span>
          {mod.saas_phase && (
            <span className="text-xs px-1.5 py-0.5 rounded border border-cyan-400/20 text-cyan-400 bg-cyan-400/10">
              {t("common.phase")} {mod.saas_phase}
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
  const location = useLocation();
  const { t } = useTranslation();
  const [activeDomain, setActiveDomain] = useState<VaultDomain | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  // Derive scope from route path
  const scope: VaultScope = useMemo(() => {
    if (location.pathname === "/vault/shared") return "shared_with_me";
    if (location.pathname === "/vault/global") return "global";
    return "owned";
  }, [location.pathname]);

  const pageTitle = useMemo(() => {
    if (scope === "shared_with_me") return t("vault.sharedWithMe");
    if (scope === "global") return t("vault.globalVaultTitle");
    return t("vault.title");
  }, [scope, t]);

  const { data: modules, isLoading } = useVaultModules({
    scope,
    domain: activeDomain,
    query: searchQuery || undefined,
  });

  const { data: allModules } = useVaultModules({ scope });
  const domainCounts = (allModules ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.domain] = (acc[m.domain] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("vault.moduleCount", { count: allModules?.length ?? 0 })}
          </p>
        </div>
        {scope === "owned" && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> {t("vault.newModule")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveDomain(undefined)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
            !activeDomain
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
          }`}
        >
          {t("common.all")} {allModules?.length ? `(${allModules.length})` : ""}
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
              {t(`domains.${domain}`)}
              {count > 0 && <span className="text-xs opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("vault.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !modules?.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <Package className="h-12 w-12 text-muted-foreground/30" />
          <div>
            <p className="text-foreground font-medium">{t("vault.noModules")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery || activeDomain ? t("vault.tryOtherFilters") : t("vault.createFirstModule")}
            </p>
          </div>
          {!searchQuery && !activeDomain && scope === "owned" && (
            <Button onClick={() => setCreateOpen(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> {t("vault.createFirst")}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => (
            <ModuleCard key={mod.id} mod={mod} onClick={() => navigate(`/vault/${mod.id}`)} />
          ))}
        </div>
      )}

      <CreateModuleDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
