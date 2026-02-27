
# DevVault MCP — Status do Servidor

## Causa Raiz (resolvida)

Dois problemas sequenciais impediram a conexão MCP:

1. **Tool registration signature** — `server.tool({ name: "..." })` → corrigido para `server.tool("name", { ... })`.
2. **Transport not bound** — `transport.handleRequest(req, server)` não faz binding interno; corrigido para `const handler = transport.bind(mcpServer); handler(req)`.

## CORS hardening

Headers expandidos para incluir:
- `mcp-session-id`, `mcp-protocol-version` (protocolo MCP)
- `x-client-info`, `apikey`, headers Supabase client

## Checklist de validação

- [ ] `initialize` (JSON-RPC) retorna `serverInfo`
- [ ] `tools/list` retorna 6 tools
- [ ] `devvault_bootstrap` retorna dados
- [ ] Conexão no Lovable MCP sem "Connection failed"
- [ ] Logs sem `Transport not bound to a server`
