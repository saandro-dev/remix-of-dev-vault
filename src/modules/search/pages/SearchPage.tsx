import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, Package, FolderOpen, Bug } from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  type: "module" | "project" | "bug";
  meta: string;
}

const typeConfig = {
  module: { label: "Módulos", icon: Package, path: (id: string) => `/vault/${id}` },
  project: { label: "Projetos", icon: FolderOpen, path: (id: string) => `/projects/${id}` },
  bug: { label: "Bugs", icon: Bug, path: (id: string) => `/bugs` },
};

export function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("global-search", {
        body: { query: q.trim() },
      });
      if (error) throw error;
      setResults(data?.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 350);
    return () => clearTimeout(timer);
  }, [query, search]);

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    acc[r.type] = acc[r.type] || [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Busca Global</h1>
        <p className="text-muted-foreground mt-1">Encontre módulos, projetos e bugs.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Digite para buscar..."
          className="pl-10"
          autoFocus
        />
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <Search className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum resultado para "{query}"</p>
        </div>
      )}

      {!loading && Object.entries(grouped).map(([type, items]) => {
        const config = typeConfig[type as keyof typeof typeConfig];
        const Icon = config.icon;
        return (
          <div key={type} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Icon className="h-3.5 w-3.5" /> {config.label}
            </h2>
            <div className="space-y-1">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => navigate(config.path(item.id))}
                >
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.meta}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
