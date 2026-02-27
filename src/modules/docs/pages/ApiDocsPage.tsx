import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EndpointCard } from "../components/EndpointCard";
import {
  API_BASE_URL,
  allEndpoints,
  allSections,
} from "../constants/apiReference";
import { BookOpen, Globe, Shield, Clock, FileText } from "lucide-react";

const SECTION_ICONS: Record<string, React.ElementType> = {
  authentication: Shield,
  "rate-limiting": Clock,
  "audit-log": FileText,
};

export function ApiDocsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            API Reference
          </h1>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Documentação completa da API pública do DevVault. Use esta referência
          para integrar agentes de IA, scripts de CI/CD ou qualquer automação
          que precise salvar módulos no Cofre Global.
        </p>
      </header>

      {/* Base URL */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Base URL</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <code className="block font-mono text-sm bg-muted/50 rounded-md px-4 py-3 text-foreground break-all select-all">
            {API_BASE_URL}
          </code>
        </CardContent>
      </Card>

      {/* Info Sections */}
      {allSections.map((section) => {
        const Icon = SECTION_ICONS[section.id] ?? FileText;
        return (
          <Card key={section.id} id={section.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">{section.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {section.content.split("\n").map((line, i) => {
                  if (line.startsWith("|")) return null;
                  if (line.startsWith("- **")) {
                    const match = line.match(/^- \*\*(.+?)\*\* — (.+)$/);
                    if (match) {
                      return (
                        <div key={i} className="flex gap-2 py-0.5">
                          <Badge variant="secondary" className="font-mono text-xs shrink-0">
                            {match[1]}
                          </Badge>
                          <span>{match[2]}</span>
                        </div>
                      );
                    }
                  }
                  if (line.includes("`")) {
                    const parts = line.split(/(`[^`]+`)/g);
                    return (
                      <p key={i} className="py-0.5">
                        {parts.map((part, j) =>
                          part.startsWith("`") ? (
                            <code key={j} className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">
                              {part.slice(1, -1)}
                            </code>
                          ) : (
                            <span key={j} dangerouslySetInnerHTML={{ __html: part.replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground'>$1</strong>") }} />
                          ),
                        )}
                      </p>
                    );
                  }
                  if (line.trim() === "") return <br key={i} />;
                  return (
                    <p key={i} className="py-0.5" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground'>$1</strong>") }} />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Endpoints */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Endpoints</h2>
        <p className="text-sm text-muted-foreground">
          Lista de todos os endpoints disponíveis na API pública.
        </p>
      </div>

      {allEndpoints.map((ep) => (
        <EndpointCard key={ep.id} endpoint={ep} />
      ))}
    </div>
  );
}
