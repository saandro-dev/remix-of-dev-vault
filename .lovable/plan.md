

## Diagnostico: GET 400 "Protocol version mismatch" Persiste

### Evidencia dos Logs (13:51:09Z)

```text
POST initialize → 200, negocia protocolVersion "2025-03-26"
POST initialized → 202
GET  → mcp-lite compara "2025-03-26" com "2025-06-18" hardcoded → 400 "Protocol version mismatch"
POST tools/list → 200 (SSE, funciona)
```

O mcp-lite v0.10.0 tem um bug: o handler de GET verifica contra `2025-06-18` (hardcoded), mas o POST `initialize` negocia `2025-03-26`. O GET sempre vai falhar com 400. A conexao anterior funcionou porque o cliente Lovable tolerou o 400 naquela tentativa — comportamento inconsistente.

### Causa Raiz

Bug no mcp-lite 0.10.0: `handleGet()` compara `MCP-Protocol-Version` contra uma versao diferente da negociada no `initialize`. Nao ha versao mais nova disponivel no npm (0.10.0 e a latest).

### Solucao

Interceptar GET **antes** do transport e retornar 405 com corpo JSON-RPC e `Content-Type: application/json` — diferente da tentativa anterior que usou texto plano. Isso sinaliza ao cliente MCP que SSE nao esta disponivel, forcando modo POST-only.

### Mudanca

**Arquivo: `supabase/functions/devvault-mcp/index.ts`**

Adicionar interceptacao de GET apos auth e antes do `httpHandler`, retornando resposta JSON-RPC formatada:

```typescript
// After auth passes, before httpHandler:
if (c.req.method === "GET") {
  return withCors(new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "SSE transport not available. Use POST-only mode.",
      },
      id: null,
    }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Allow": "POST, OPTIONS",
      },
    },
  ));
}
```

### Diferenca da Tentativa Anterior

| Aspecto | Tentativa anterior | Nova solucao |
|---------|-------------------|--------------|
| Body | Texto plano `"Method Not Allowed"` | JSON-RPC formatado |
| Content-Type | Nenhum (text/plain implicito) | `application/json` |
| Formato | Nao-MCP | Compativel com protocolo JSON-RPC |

### Arquivo Afetado

| Arquivo | Acao |
|---------|------|
| `supabase/functions/devvault-mcp/index.ts` | Interceptar GET com resposta JSON-RPC 405 |

