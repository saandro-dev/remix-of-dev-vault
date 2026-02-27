import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Link2, X } from "lucide-react";
import type { ModuleDependency } from "../types";

interface DependencyCardProps {
  dependency: ModuleDependency;
  onRemove?: () => void;
  isOwner?: boolean;
}

export function DependencyCard({ dependency, onRemove, isOwner }: DependencyCardProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors group">
      <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <Link
          to={`/vault/${dependency.depends_on_id}`}
          className="text-sm font-medium text-foreground hover:underline truncate block"
        >
          {dependency.title}
        </Link>
      </div>
      <Badge
        variant={dependency.dependency_type === "required" ? "default" : "secondary"}
        className="shrink-0 text-xs"
      >
        {t(`dependencies.${dependency.dependency_type}`)}
      </Badge>
      <Link to={`/vault/${dependency.depends_on_id}`}>
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
      {isOwner && onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
