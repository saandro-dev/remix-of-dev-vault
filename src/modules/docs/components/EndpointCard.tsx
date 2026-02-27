import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/CodeBlock";
import { ParamTable } from "./ParamTable";
import { CodeExample } from "./CodeExample";
import type { ApiEndpoint } from "../types";
import { API_BASE_URL } from "../constants/apiReference";

const METHOD_VARIANT: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  POST: "bg-primary/15 text-primary border-primary/30",
  PUT: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  PATCH: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  DELETE: "bg-destructive/15 text-destructive border-destructive/30",
};

interface EndpointCardProps {
  endpoint: ApiEndpoint;
}

export function EndpointCard({ endpoint }: EndpointCardProps) {
  return (
    <Card id={`endpoint-${endpoint.id}`} className="scroll-mt-20">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge className={`font-mono font-bold text-xs px-2.5 py-1 border ${METHOD_VARIANT[endpoint.method] ?? ""}`}>
            {endpoint.method}
          </Badge>
          <code className="font-mono text-sm text-foreground break-all">
            {API_BASE_URL}{endpoint.path}
          </code>
        </div>
        <CardTitle className="text-lg">{endpoint.summary}</CardTitle>
        <p className="text-sm text-muted-foreground leading-relaxed">{endpoint.description}</p>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Parameters */}
        <section>
          <h4 className="text-sm font-semibold mb-3 text-foreground">Parâmetros do Body (JSON)</h4>
          <ParamTable params={endpoint.params} />
        </section>

        {/* Responses */}
        <section>
          <h4 className="text-sm font-semibold mb-3 text-foreground">Respostas</h4>
          <div className="space-y-4">
            {endpoint.responses.map((res) => (
              <div key={res.status} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={res.status < 300 ? "default" : "destructive"}
                    className="font-mono text-xs"
                  >
                    {res.status}
                  </Badge>
                  <span className="text-sm font-medium">{res.label}</span>
                  <span className="text-xs text-muted-foreground">— {res.description}</span>
                </div>
                <CodeBlock code={res.body} language="json" showLineNumbers={false} maxHeight="200px" />
              </div>
            ))}
          </div>
        </section>

        {/* Code Examples */}
        <section>
          <h4 className="text-sm font-semibold mb-3 text-foreground">Exemplos de Uso</h4>
          <CodeExample examples={endpoint.examples} />
        </section>
      </CardContent>
    </Card>
  );
}
