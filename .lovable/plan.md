

## Causa Raiz Definitiva: `handleGet` do mcp-lite Rejeita Versao `2025-03-26`

### Evidencia do Codigo-Fonte (mcp-lite `transport-http.ts`, linhas 795-818)

```text
handleGet(request):
  1. Verifica Accept header → OK
  2. Verifica MCP-Protocol-Version header:
     → SE header presente E header !== "2025-06-18" → retorna 400 "Protocol version mismatch"
  3. SE nao tem sessionAdapter (modo stateless) → retorna 405 "Method Not Allowed"
```

### Sequencia de Eventos nos Logs

```text
POST initialize → servidor negocia protocolVersion "2025-03-26" → 200 OK
GET SSE         → Lovable envia MCP-Protocol-Version: "2025-03-26"
                → mcp-lite compara com "2025-06-18" (unica versao aceita no GET)
                → "2025-03-26" !== "2025-06-18" → 400 "Protocol version mismatch"
                → Lovable interpreta como falha de conexao
```

Mesmo se a versao correspondesse, o proximo check rejeitaria com 405 porque nao temos `sessionAdapter` (modo stateless). Edge Functions bootem uma instancia nova por request — sessoes em memoria sao impossiveis.

### Solucao

Interceptar GET requests **antes** de delegar ao transport do mcp-lite. Retornar 405 "Method Not Allowed" com headers corretos, para que o cliente Lovable saiba que SSE nao esta disponivel e use modo POST-only (stateless).

### Mudancas Concretas

**Arquivo: `supabase/functions/devvault-mcp/index.ts`**

No handler Hono, antes da chamada `httpHandler(c.req.raw)`, adicionar interceptacao de GET:

```typescript
// GET requests seek an SSE stream, which requires persistent sessions.
// Edge Functions are stateless (fresh boot per request), so SSE is impossible.
// Return 405 so the client falls back to POST-only (stateless) mode.
if (c.req.method === "GET") {
  return withCors(new Response("Method Not Allowed", {
    status: 405,
    headers: { "Allow": "POST, DELETE, OPTIONS" },
  }));
}
```

Isso evita que o GET chegue ao transport onde seria rejeitado com 400 (version mismatch) — um status que o cliente interpreta como erro fatal. O 405 e o status correto segundo a spec MCP para indicar que SSE nao esta disponivel, permitindo ao cliente operar em modo stateless.

### Arquivos Afetados

| Arquivo | Acao |
|---------|------|
| `supabase/functions/devvault-mcp/index.ts` | Interceptar GET antes do transport |

