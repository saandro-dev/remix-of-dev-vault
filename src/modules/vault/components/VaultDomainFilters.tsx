import { useTranslation } from "react-i18next";
import { Shield, Server, Layout, Building2, Rocket, BookOpen } from "lucide-react";
import type { VaultDomain } from "../types";
import { DOMAIN_COLORS } from "../types";

const DOMAIN_ICONS: Record<VaultDomain, React.ElementType> = {
  security: Shield,
  backend: Server,
  frontend: Layout,
  architecture: Building2,
  devops: Rocket,
  saas_playbook: BookOpen,
};

const ALL_DOMAINS: VaultDomain[] = ["security", "backend", "frontend", "architecture", "devops", "saas_playbook"];

interface VaultDomainFiltersProps {
  activeDomain: VaultDomain | undefined;
  onDomainChange: (domain: VaultDomain | undefined) => void;
  domainCounts: Record<string, number>;
  totalCount: number;
}

export function VaultDomainFilters({ activeDomain, onDomainChange, domainCounts, totalCount }: VaultDomainFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onDomainChange(undefined)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
          !activeDomain
            ? "bg-primary text-primary-foreground border-primary"
            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
        }`}
      >
        {t("common.all")} {totalCount > 0 ? `(${totalCount})` : ""}
      </button>
      {ALL_DOMAINS.map((domain) => {
        const Icon = DOMAIN_ICONS[domain];
        const isActive = activeDomain === domain;
        const count = domainCounts[domain] ?? 0;
        return (
          <button
            key={domain}
            onClick={() => onDomainChange(isActive ? undefined : domain)}
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
  );
}
