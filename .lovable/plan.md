

## Analise do Feedback do Agente — Plano de Evolucao do Knowledge Graph

O feedback e excelente e identifica lacunas operacionais reais. Vou categorizar por viabilidade e impacto.

### Estado Atual vs Solicitado

| Campo solicitado | Existe no DB? | Existe no MCP? |
|---|---|---|
| `prerequisites` | SIM (jsonb[]) | NAO exposto |
| `common_errors` | NAO | NAO |
| `solves_problems` | NAO | NAO |
| `test_code` | NAO | NAO |
| `difficulty` | NAO | NAO |
| `estimated_minutes` | NAO | NAO |
| `changelog` | NAO | NAO |
| `devvault_validate` tool | Logica existe (`completeness`) | NAO como tool |
| `related_modules` com slugs | UUIDs no DB | MCP retorna UUIDs |
| `usage_hint` no list | Campo existe | NAO retornado no list |

### Fase 1 — Schema (Migracao SQL)

Adicionar 5 colunas a `vault_modules`:

```sql
ALTER TABLE vault_modules
  ADD COLUMN IF NOT EXISTS common_errors jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS solves_problems text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS test_code text,
  ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'intermediate',
  ADD COLUMN IF NOT EXISTS estimated_minutes integer;
```

Adicionar `changelog` como tabela separada (nao coluna — um modulo pode ter N entradas de changelog, e misturar no mesmo registro violaria 1NF):

```sql
CREATE TABLE vault_module_changelog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES vault_modules(id) ON DELETE CASCADE,
  version text NOT NULL,
  changes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Fase 2 — Funcoes SQL

1. Atualizar `get_vault_module` para retornar os novos campos + `prerequisites`
2. Atualizar `query_vault_modules` para buscar em `solves_problems`
3. Atualizar `vault_module_completeness` para considerar novos campos
4. Atualizar `search_vector_en` trigger para indexar `solves_problems`

### Fase 3 — MCP Tools (Edge Functions)

| Arquivo | Mudanca |
|---|---|
| `ingest.ts` | Aceitar `common_errors`, `solves_problems`, `test_code`, `difficulty`, `estimated_minutes`, `prerequisites` |
| `update.ts` | Aceitar os mesmos campos novos no `ALLOWED_UPDATE_FIELDS` |
| `get.ts` | Resolver `related_modules` UUIDs para `{id, slug, title}` inline |
| `list.ts` | Incluir `usage_hint`, `difficulty`, `estimated_minutes` nos resultados |
| `get-group.ts` | Gerar checklist de implementacao em markdown no response |
| `search.ts` | Buscar tambem no campo `solves_problems` |
| `register.ts` | Registrar nova tool `devvault_validate` |
| **NOVO** `validate.ts` | Tool `devvault_validate` que expoe completeness como ferramenta |

### Fase 4 — Completeness Score Atualizado

Novos campos opcionais no calculo (peso menor que os core):
- `common_errors` (preenchido = +1)
- `test_code` (preenchido = +1)
- `solves_problems` (preenchido = +1)

### Item 4 (Validacao code_example vs codigo) — Fora de Escopo

Validar se `code_example` compila contra `code` requer analise estatica de AST. Isso e um linter/CI, nao uma feature de runtime. Recomendo anotar como melhoria futura de tooling.

### Item 7 (Frontend fraco) — Conteudo, nao Codigo

A solucao e criar mais modulos via `devvault_ingest`, nao mudanca de codigo.

### Arquivos Afetados (Total: 10)

| Arquivo | Tipo |
|---|---|
| Migracao SQL (novo) | Schema + funcoes DB |
| `supabase/functions/_shared/mcp-tools/ingest.ts` | Novos campos |
| `supabase/functions/_shared/mcp-tools/update.ts` | Novos campos |
| `supabase/functions/_shared/mcp-tools/get.ts` | Related modules resolvidos |
| `supabase/functions/_shared/mcp-tools/list.ts` | usage_hint + metadata |
| `supabase/functions/_shared/mcp-tools/get-group.ts` | Checklist markdown |
| `supabase/functions/_shared/mcp-tools/search.ts` | solves_problems search |
| `supabase/functions/_shared/mcp-tools/validate.ts` | NOVO — tool devvault_validate |
| `supabase/functions/_shared/mcp-tools/register.ts` | Registrar validate |
| `supabase/functions/_shared/mcp-tools/completeness.ts` | Novos campos no score |

