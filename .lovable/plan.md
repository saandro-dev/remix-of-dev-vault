

## Por que 8.9 e não 10? Análise das lacunas

A Solution B perdeu pontos em 4 áreas específicas. Vou detalhar cada uma e apresentar a **Solution C** que fecha todas as lacunas para atingir o 10.

### Lacunas da Solution B (JSONB puro sem guardrails)

| Critério | Score | Motivo da perda |
|----------|-------|----------------|
| Maintainability | 9/10 | JSONB sem schema validation no DB permite dados malformados silenciosamente. Em 2 anos, o campo pode conter lixo de agentes que erraram o formato. |
| Zero TD | 9/10 | Sem CHECK constraint, alguém vai precisar "limpar" dados inválidos no futuro — isso é dívida técnica latente. |
| Architecture | 9/10 | Validação apenas no TypeScript (frontend) e no Deno (MCP) viola defense-in-depth. O banco deve ser a última barreira. |
| Security | 8/10 | JSONB sem constraint aceita payloads arbitrariamente grandes ou com chaves inesperadas. |

---

## Solution C: JSONB com Defense-in-Depth (Score 10/10)

Tudo da Solution B **mais**:

1. **CHECK constraint no PostgreSQL** validando a estrutura do JSONB no nível do banco:
   - `npm_dependencies` deve ser array de strings (ou ausente)
   - `env_vars_required` deve ser array de strings (ou ausente)
   - `ai_rules` deve ser array de strings (ou ausente)
   - Rejeita chaves desconhecidas no top-level

2. **GIN index** no campo `ai_metadata` para permitir queries futuras como "todos os módulos que precisam de STRIPE_SECRET_KEY"

3. **Validação Zod no MCP** (Deno) — já prevista na Solution B, mas agora com schema estrito que normaliza input antes de gravar

4. **Validação TypeScript no frontend** — interface `AiMetadata` tipada, impossível enviar dados malformados

### Scoring

- Maintainability: **10/10** — Schema enforcement em 3 camadas (DB, backend, frontend) impede degradação
- Zero TD: **10/10** — Constraint no DB garante que dados inválidos nunca entram, zero limpeza futura
- Architecture: **10/10** — Defense-in-depth: DB constraint → Edge Function validation → Frontend types
- Scalability: **10/10** — GIN index permite queries eficientes no JSONB à medida que o vault cresce
- Security: **10/10** — Rejeição de payloads malformados na camada mais baixa (PostgreSQL)
- **FINAL SCORE: 10.0/10**

### Por que a Solution B é inferior

A Solution B confia que todos os consumidores (MCP tools, frontend, futuras APIs) validarão corretamente. Basta UM path de escrita sem validação para corromper dados permanentemente. A Solution C torna isso **impossível** ao nível do PostgreSQL.

---

## Plano de Implementação — Solution C

### Fase 1: Database Migration
- `ALTER TABLE vault_modules ADD COLUMN ai_metadata JSONB NOT NULL DEFAULT '{}'::jsonb`
- `CHECK constraint` validando estrutura (arrays de strings, chaves permitidas)
- `GIN index` em `ai_metadata` para queries por conteúdo

### Fase 2: TypeScript Types
- Interface `AiMetadata` em `src/modules/vault/types.ts`
- Campo `ai_metadata` adicionado a `VaultModule` e `VaultModuleSummary`

### Fase 3: MCP Tools (Edge Functions)
- `devvault_ingest`: aceitar `ai_metadata` com validação, default `{}`
- `devvault_get`: retornar `ai_metadata` com instrução contextual para o agente
- `devvault_search`/`devvault_list`: incluir `ai_metadata` nos resultados

### Fase 4: Edge Function `vault-crud`
- Suportar `ai_metadata` nas operações de create/update

### Fase 5: Frontend
- `CreateModuleDialog` e `EditModuleSheet`: inputs tag-style para npm deps e env vars
- `VaultDetailPage`: badges copiáveis para npm deps, alerta visual para env vars

### Fase 6: Database RPCs
- Atualizar `get_vault_module`, `hybrid_search_vault_modules` e `query_vault_modules` para incluir `ai_metadata`

### Arquivos Afetados

```text
supabase/migrations/XXXXXX_add_ai_metadata.sql           [NEW]
src/modules/vault/types.ts                                [EDIT]
supabase/functions/_shared/mcp-tools/ingest.ts            [EDIT]
supabase/functions/_shared/mcp-tools/get.ts               [EDIT]
supabase/functions/vault-crud/index.ts                    [EDIT]
src/modules/vault/components/CreateModuleDialog.tsx        [EDIT]
src/modules/vault/components/EditModuleSheet.tsx           [EDIT]
src/modules/vault/pages/VaultDetailPage.tsx               [EDIT]
src/i18n/locales/en.json                                  [EDIT]
src/i18n/locales/pt-BR.json                               [EDIT]
```

