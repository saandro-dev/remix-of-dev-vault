

## Diagnostico: Handlers das Tools Nao Produzem Logs

Os logs da Edge Function mostram apenas requests de `initialize`, `initialized` (202) e `tools/list` — nenhuma chamada real de `tools/call` (search, domains) aparece nos logs. Isso indica que:

1. As chamadas podem ter acontecido antes do window de logs visivel, OU
2. Os handlers crasham silenciosamente sem produzir output

### Problema Identificado

Os tool handlers atuais (`search.ts`, `domains.ts`) nao possuem logging de entrada — nao ha como saber se o handler foi invocado, quais parametros recebeu, ou se o Supabase client RPC falhou. Os erros sao capturados mas os logs ficam perdidos se a Edge Function encerrar rapidamente.

### Solucao

Adicionar logging de diagnostico granular a TODOS os tool handlers para capturar:
- Confirmacao de que o handler foi invocado
- Parametros recebidos
- Resultado do RPC (sucesso/erro)
- Try-catch global para capturar excecoes nao previstas

### Arquivos Afetados

| Arquivo | Acao |
|---------|------|
| `supabase/functions/_shared/mcp-tools/search.ts` | Adicionar logs de entrada, parametros, resultado RPC e try-catch global |
| `supabase/functions/_shared/mcp-tools/domains.ts` | Adicionar logs de entrada, resultado RPC e try-catch global |
| `supabase/functions/_shared/mcp-tools/bootstrap.ts` | Adicionar logs de entrada e try-catch global (referencia de comparacao) |
| `supabase/functions/_shared/mcp-tools/list.ts` | Adicionar logs de entrada, parametros, resultado RPC e try-catch global |

### Exemplo de Mudanca (search.ts)

```typescript
handler: async (params: Record<string, unknown>) => {
  console.log("[MCP:TOOL] devvault_search invoked", { params });
  try {
    const limit = Math.min(Number(params.limit ?? 10), 50);
    // ... existing logic ...
    const { data, error } = await client.rpc("query_vault_modules", rpcParams);
    console.log("[MCP:TOOL] devvault_search RPC result", {
      success: !error,
      resultCount: (data as unknown[])?.length ?? 0,
      error: error?.message,
    });
    // ... existing response ...
  } catch (err) {
    console.error("[MCP:TOOL] devvault_search UNCAUGHT", { error: String(err) });
    return { content: [{ type: "text", text: `Uncaught error: ${String(err)}` }] };
  }
}
```

Apos deploy, o proximo teste vai revelar exatamente onde a falha ocorre — se e no handler, no RPC, ou se a chamada nunca chega ao handler.

