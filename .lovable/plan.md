

## Auditoria Completa — MCP v3.0 (11 Tools)

### Veredicto: 2 BUGS CRITICOS encontrados + 2 problemas menores

---

### BUGS CRITICOS (runtime crash)

**1. `get.ts` linha 90 — `auth` nao esta no escopo**

```typescript
// Linha 18: registrar recebe (server, client) — SEM auth
export const registerGetTool: ToolRegistrar = (server, client) => {
// ...
// Linha 90: usa `auth` que NAO EXISTE no escopo
trackUsage(client, auth, { ... });
```

Isso causa `ReferenceError: auth is not defined` toda vez que `devvault_get` e chamado. O `trackUsage` foi adicionado na Fase 3 (Analytics) mas o parametro `auth` nao foi incluido na assinatura da funcao.

**Correcao:** Alterar linha 18 para `(server, client, auth) =>`.

---

**2. `get-group.ts` linha 59 — identico ao problema acima**

```typescript
// Linha 15: registrar recebe (server, client) — SEM auth
export const registerGetGroupTool: ToolRegistrar = (server, client) => {
// ...
// Linha 59: usa `auth` que NAO EXISTE no escopo
trackUsage(client, auth, { ... });
```

**Correcao:** Alterar linha 15 para `(server, client, auth) =>`.

---

### Problemas Menores

**3. `index.ts` — logs de diagnostico usam `console.log` direto**

Linhas 76-82, 91, 101-106, 109 usam `console.log("[MCP:DIAG]")` enquanto todos os tools usam `createLogger`. Inconsistencia com o padrao estabelecido.

**Correcao:** Importar `createLogger` e migrar para logger estruturado.

**4. `.lovable/plan.md` — conteudo ainda mostra o plano de execucao, nao o estado final**

O arquivo deveria refletir o estado pos-implementacao com checklist de sucesso, nao o plano original.

---

### O que esta CORRETO (confirmado)

| Area | Status |
|---|---|
| `register.ts` — 11 tools registradas | ✅ |
| `delete.ts` — soft/hard delete com ownership check | ✅ |
| `diagnose.ts` — 3 estrategias de busca, analytics | ✅ |
| `list.ts` — p_group delegado ao SQL, zero filtro em memoria | ✅ |
| `search.ts` — description menciona solves_problems, logger | ✅ |
| `ingest.ts` — depends_on aceita slug, todos os campos novos | ✅ |
| `update.ts` — ALLOWED_UPDATE_FIELDS completo | ✅ |
| `validate.ts` — UUID/slug auto-detect | ✅ |
| `bootstrap.ts` — logger estruturado | ✅ |
| `domains.ts` — logger estruturado | ✅ |
| `auth.ts` — logger estruturado | ✅ |
| `usage-tracker.ts` — fire-and-forget, sem throw | ✅ |
| `dependency-helpers.ts` — batch slug resolution | ✅ |
| `completeness.ts` — delega para SQL | ✅ |
| `types.ts` — AuthContext + McpServerLike | ✅ |
| SQL `query_vault_modules` — p_group nativo | ✅ |
| `vault_usage_events` tabela + RLS | ✅ |
| `EDGE_FUNCTIONS_REGISTRY.md` — 11 tools, v3.0 | ✅ |
| `VAULT_CONTENT_STANDARDS.md` — todos os campos documentados | ✅ |
| `VaultModule` tipo frontend — 5 novos campos | ✅ |
| Zero codigo morto | ✅ |
| Zero imports nao utilizados | ✅ |

---

### Plano de Correcao (4 arquivos)

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/_shared/mcp-tools/get.ts` | Adicionar `auth` ao parametro da funcao registradora |
| `supabase/functions/_shared/mcp-tools/get-group.ts` | Adicionar `auth` ao parametro da funcao registradora |
| `supabase/functions/devvault-mcp/index.ts` | Migrar `console.log` para logger estruturado |
| `.lovable/plan.md` | Atualizar para estado pos-implementacao |

Apos correcoes: redeploy de `devvault-mcp`.

