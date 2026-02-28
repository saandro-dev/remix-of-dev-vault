import { useTranslation } from "react-i18next";
import { Shield, Server, Layout, Building2, Rocket, BookOpen, Package, CheckCircle2, Clock, XCircle, Lock, Users, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { VaultDomain, VaultModuleSummary, VisibilityLevel } from "../types";
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

interface VaultModuleCardProps {
  mod: VaultModuleSummary;
  onClick: () => void;
}

export function VaultModuleCard({ mod, onClick }: VaultModuleCardProps) {
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
