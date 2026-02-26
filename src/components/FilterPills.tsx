import { cn } from "@/lib/utils";

interface FilterPillsProps {
  options: { label: string; value: string }[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  className?: string;
}

export function FilterPills({ options, selected, onSelect, className }: FilterPillsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
          selected === null
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
        )}
      >
        Todos
      </button>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(selected === opt.value ? null : opt.value)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
            selected === opt.value
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
