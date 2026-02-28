

## Diagnostico: API Incorreta do mcp-lite

### Evidencia dos Logs

```text
10:41:23  incoming request (POST)
10:41:23  key extraction (dvlt_V6psapr...) — source: authorization
10:41:24  validation result (valid: true)
10:41:24  auth passed (userId: 32d5c933...)
10:41:24  transport response { status: 200 }  ← RESPONDEU 200!
10:42:38  shutdown
```

O transport **respondeu 200**, mas o Lovable ainda mostra "Connection failed". O problema esta na forma como chamamos o mcp-lite.

### Causa Raiz

A documentacao oficial do Supabase mostra esta API:

```text
DOCUMENTACAO OFICIAL:                       NOSSO CODIGO ATUAL:
─────────────────────                       ────────────────────
const httpHandler = transport.bind(mcp)     const httpHandler = transport.handleRequest.bind(transport)
await httpHandler(c.req.raw)                await httpHandler(c.req.raw, mcp)
        ↑ 1 argumento                                ↑ 2 argumentos
```

`transport.bind(mcp)` retorna um handler pre-configurado que recebe apenas o `Request`. Nosso codigo usa `handleRequest` com assinatura diferente — o que pode gerar uma resposta com formato incorreto (body vazio ou JSON-RPC malformado), fazendo o Lovable rejeitar a conexao apesar do status 200.

### Correcao

**Arquivo: `supabase/functions/devvault-mcp/index.ts`**

Linha 56: Trocar de:
```typescript
const httpHandler = transport.handleRequest.bind(transport);
```
Para:
```typescript
const httpHandler = transport.bind(mcp);
```

Linha 87: Trocar de:
```typescript
const mcpResponse = await httpHandler(c.req.raw, mcp);
```
Para:
```typescript
const mcpResponse = await httpHandler(c.req.raw);
```

### Resultado

O handler retornado por `transport.bind(mcp)` ja encapsula o servidor MCP internamente, garantindo que o JSON-RPC de `initialize` seja processado corretamente e o handshake com o Lovable complete.

