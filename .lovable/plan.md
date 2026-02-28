

## Diagnostico: Interceptacao Manual de GET Conflita com o Protocolo

### Evidencia

Os logs confirmam que o servidor responde corretamente ao POST `initialize` (200, JSON-RPC valido). O GET subsequente passa pela auth e recebe nosso 405 manual. Mas o Lovable continua reportando "Connection failed".

### Causa Raiz

Todos os exemplos oficiais do mcp-lite (Hono+Bun, Cloudflare Workers, Next.js, Supabase) delegam **TODOS** os metodos HTTP ao transport — incluindo GET:

```text
// Exemplo oficial Hono+Bun (do README do mcp-lite):
app.all("/mcp", (c) => handler(c.req.raw))  // GET, POST, DELETE — tudo vai pro transport

// Exemplo oficial Next.js:
export const POST = handler
export const GET = handler   // ← GET tambem vai pro transport
```

O transport em modo stateless (sem `sessionAdapter`) sabe retornar a resposta correta para GET. Nossa interceptacao manual retorna um 405 com body em texto plano ("Method Not Allowed") — o cliente MCP provavelmente espera uma resposta JSON-RPC formatada pelo transport, ou headers MCP especificos que nao estamos incluindo.

### Solucao

1. **Remover** a interceptacao manual de GET (linhas 82-90)
2. **Adicionar `logger`** ao McpServer para visibilidade interna do mcp-lite
3. **Deixar o transport lidar com todos os metodos** — e o padrao documentado

### Mudancas

**Arquivo: `supabase/functions/devvault-mcp/index.ts`**

1. Remover o bloco `if (c.req.method === "GET") { ... }` (linhas 82-90)
2. Adicionar logger ao McpServer:

```typescript
const mcp = new McpServer({
  name: "devvault",
  version: "2.4.0",
  logger: {
    error: (...args) => console.error("[MCP:LIB]", ...args),
    warn: (...args) => console.warn("[MCP:LIB]", ...args),
    info: (...args) => console.info("[MCP:LIB]", ...args),
    debug: (...args) => console.debug("[MCP:LIB]", ...args),
  },
});
```

Isso vai: (a) seguir o padrao exato da documentacao oficial, e (b) nos dar visibilidade total do que o mcp-lite faz internamente em cada request, incluindo GET.

### Arquivos Afetados

| Arquivo | Acao |
|---------|------|
| `supabase/functions/devvault-mcp/index.ts` | Remover interceptacao GET, adicionar logger |

