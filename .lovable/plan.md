
## Análise de Soluções

### Solução A: Patch mínimo (apenas bind do transport)
- Manutenibilidade: 8.2/10
- Zero DT: 7.8/10
- Arquitetura: 8.0/10
- Escalabilidade: 7.9/10
- Segurança: 8.8/10
- **NOTA FINAL: 8.1/10**

### Solução B: Correção estrutural (bind + hardening de handshake/CORS + validação ponta a ponta)
- Manutenibilidade: 9.4/10
- Zero DT: 9.2/10
- Arquitetura: 9.5/10
- Escalabilidade: 9.1/10
- Segurança: 9.3/10
- **NOTA FINAL: 9.3/10**

### DECISÃO: Solução B (Nota 9.3)

## Plano de implementação

```text
MODIFY  supabase/functions/devvault-mcp/index.ts
MODIFY  .lovable/plan.md
```

1) Em `devvault-mcp/index.ts`, corrigir o fluxo de transporte:
- Manter autenticação antes do MCP.
- Criar `transport`.
- Fazer `const handler = transport.bind(mcpServer)`.
- Trocar `transport.handleRequest(c.req.raw, mcpServer)` por `handler(c.req.raw)`.

2) Harden de compatibilidade de conexão MCP:
- Ajustar `Access-Control-Allow-Headers` para incluir headers comuns do handshake MCP/Lovable (`authorization`, `content-type`, `accept`, `x-devvault-key`, `x-api-key`, `mcp-session-id`, `mcp-protocol-version`, e headers Supabase client quando aplicável).

3) Preservar modelo de segurança atual:
- Continuar aceitando API key por `x-devvault-key`, `x-api-key` ou `Authorization: Bearer`.
- Não alterar validação de chave nem rate-limit.

4) Atualizar `.lovable/plan.md` com:
- causa raiz final: `StreamableHttpTransport` sem `bind`.
- correção aplicada.
- checklist de testes iniciais de conexão MCP.

## Validação inicial (após deploy)

1) Teste handshake:
- `initialize` (JSON-RPC) com `Authorization: Bearer dvlt_...` **ou** `X-DevVault-Key`.
2) Teste descoberta:
- `tools/list` deve retornar 6 tools.
3) Teste funcional:
- `devvault_bootstrap` e `devvault_domains`.
4) Teste no Lovable (outra conta):
- reconectar servidor custom MCP e confirmar ausência de “Connection failed”.
5) Conferir logs:
- sem `Transport not bound to a server`.

## Detalhes técnicos

- Erro atual confirmado em log: `Transport not bound to a server`.
- O problema de `server.tool(...)` já foi corrigido; o bloqueio remanescente está no ciclo de binding do transport.
