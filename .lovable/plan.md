

## Diagnostico: McpServer e Transport Criados Por Request — Devem Ser Singleton

### Evidencia dos Logs

```text
10:31:10  incoming request (POST)
10:31:10  key extraction (dvlt_V6psapr...)
10:31:11  validation result (valid: true)
10:31:12  auth passed (userId: 32d5c933...)
          ← SILENCIO TOTAL — nenhum log de transport response NEM transport error
10:31:52  shutdown (timeout após 40 segundos)
```

O `try-catch` ao redor do `handler(c.req.raw)` nao capturou nada. A Promise simplesmente **nunca resolve** — ela fica pendurada ate o timeout da Edge Function.

### Causa Raiz

O codigo atual cria `McpServer`, registra todas as tools, cria `StreamableHttpTransport`, e chama `transport.bind(server)` **dentro do handler de cada request**. A documentacao oficial do Supabase e do mcp-lite mostra que estes objetos devem ser criados **uma unica vez no nivel do modulo**:

```text
DOCUMENTACAO (correto):                    NOSSO CODIGO (incorreto):
─────────────────────────                  ──────────────────────────
const mcp = new McpServer(...)             app.all("/*", async (c) => {
mcp.tool('sum', {...})                       const server = new McpServer(...)
const transport = new StreamableHttp...()    registerAllTools(server, ...)
const httpHandler = transport.bind(mcp)      const transport = new StreamableHttp...()
                                             const handler = transport.bind(server)
app.all("/mcp", async (c) => {               return handler(c.req.raw)
  return httpHandler(c.req.raw)            })
})
```

O transport do mcp-lite gerencia estado de sessao MCP (initialize → initialized → tool calls). Quando criado por request, o estado e perdido e o handler fica pendurado esperando um handshake que nunca acontece corretamente.

### Solucao

Mover `McpServer`, `registerAllTools`, `StreamableHttpTransport`, e `transport.bind()` para o nivel do modulo. Para o auth per-request, usar um objeto mutavel compartilhado — como Edge Functions sao single-threaded, nao ha race condition.

### Mudancas Concretas

**Arquivo: `supabase/functions/devvault-mcp/index.ts`**

```typescript
// MODULO LEVEL (antes do Hono app)
const client = getSupabaseClient("general");
const mcp = new McpServer({ name: "devvault", version: "2.3.0" });

// Auth mutavel — atualizado per-request, capturado por referencia pelas tools
const requestAuth: AuthContext = { userId: "", keyId: "" };
registerAllTools(mcp, client, requestAuth);

const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcp);

// HANDLER (apenas auth + delegate)
app.all("/*", async (c) => {
  if (c.req.method === "OPTIONS") { return ...; }
  
  const authResult = await authenticateRequest(c.req.raw);
  if (authResult instanceof Response) { return withCors(authResult); }
  
  // Mutate shared reference — tools veem os valores atualizados
  requestAuth.userId = authResult.userId;
  requestAuth.keyId = authResult.keyId;
  
  const mcpResponse = await httpHandler(c.req.raw);
  return withCors(mcpResponse);
});
```

**Importacao adicional necessaria:**
```typescript
import type { AuthContext } from "../_shared/mcp-tools/types.ts";
```

### Por que Funciona

1. `McpServer` e criado uma vez — tools registradas uma vez
2. `transport.bind(mcp)` e chamado uma vez — estado de sessao MCP preservado
3. O objeto `requestAuth` e passado por referencia — quando mutado no handler, as tools que o capturaram veem os valores atualizados
4. Edge Functions sao single-threaded — sem race conditions entre requests

### Arquivos Afetados

| Arquivo | Acao |
|---------|------|
| `supabase/functions/devvault-mcp/index.ts` | Reestruturar para singleton pattern |

Nenhuma mudanca nos arquivos de tools (`_shared/mcp-tools/*.ts`) — eles ja recebem `auth` como objeto e acessam `.userId`/`.keyId` dentro do handler, entao a mutacao funciona transparentemente.

