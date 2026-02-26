import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TagCloud } from "./TagCloud";
import { cn } from "@/lib/utils";
import { Code2, Calendar } from "lucide-react";

interface ModuleCardProps {
  title: string;
  language: string;
  codePreview: string;
  tags: string[];
  createdAt: string;
  onClick?: () => void;
  className?: string;
}

export function ModuleCard({
  title,
  language,
  codePreview,
  tags,
  createdAt,
  onClick,
  className,
}: ModuleCardProps) {
  const previewLines = codePreview.split("\n").slice(0, 3).join("\n");

  return (
    <Card
      className={cn(
        "cursor-pointer border-border bg-card hover:border-primary/40 transition-all duration-200 hover:shadow-md group",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {title}
          </h3>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Code2 className="h-3.5 w-3.5" />
            <span className="text-xs font-mono">{language}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <pre className="font-mono text-xs text-muted-foreground bg-surface rounded p-2 overflow-hidden leading-relaxed">
            {previewLines}
          </pre>
          <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-card to-transparent" />
        </div>
        <TagCloud tags={tags} className="pointer-events-none" />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{new Date(createdAt).toLocaleDateString("pt-BR")}</span>
        </div>
      </CardContent>
    </Card>
  );
}
