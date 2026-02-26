import { cn } from "@/lib/utils";

type StatusVariant = "dev" | "staging" | "prod" | "open" | "resolved";

const variantStyles: Record<StatusVariant, string> = {
  dev: "bg-info/15 text-info border-info/30",
  staging: "bg-warning/15 text-warning border-warning/30",
  prod: "bg-success/15 text-success border-success/30",
  open: "bg-destructive/15 text-destructive border-destructive/30",
  resolved: "bg-success/15 text-success border-success/30",
};

const variantLabels: Record<StatusVariant, string> = {
  dev: "Dev",
  staging: "Staging",
  prod: "Prod",
  open: "Aberto",
  resolved: "Resolvido",
};

interface StatusBadgeProps {
  variant: StatusVariant;
  className?: string;
}

export function StatusBadge({ variant, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        variantStyles[variant],
        className
      )}
    >
      {variantLabels[variant]}
    </span>
  );
}
