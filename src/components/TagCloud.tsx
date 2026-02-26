import { cn } from "@/lib/utils";

interface TagCloudProps {
  tags: string[];
  activeTags?: string[];
  onTagClick?: (tag: string) => void;
  className?: string;
}

export function TagCloud({ tags, activeTags = [], onTagClick, className }: TagCloudProps) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => {
        const isActive = activeTags.includes(tag);
        return (
          <button
            key={tag}
            onClick={() => onTagClick?.(tag)}
            className={cn(
              "px-2 py-0.5 rounded text-xs font-mono transition-colors",
              isActive
                ? "bg-info/20 text-info border border-info/30"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            #{tag}
          </button>
        );
      })}
    </div>
  );
}
