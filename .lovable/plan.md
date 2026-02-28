

## Diagnostico: A Interceptacao GET 405 Esta Causando a Falha

### Evidencia dos Logs

**Conexao bem-sucedida (13:51) — SEM interceptor GET:**
```
POST initialize → 200 ✅
POST initialized → 202 ✅
GET  → 400 "Protocol version mismatch" (mcp-lite bug, mas cliente TOLEROU) ✅
POST tools/list → 200 ✅ CONECTADO!
```

**Conexao falhada (13:58) — COM interceptor GET 405:**
```
POST initialize → 200 ✅
(nenhuma request subsequente — cliente abortou)
❌ "Connection failed"
```

### Causa Raiz

O interceptor GET que retorna **405 Method Not Allowed** e pior que o 400 original do mcp-lite. O cliente Lovable interpreta 405 como "este endpoint nao suporta este metodo" e aborta a conexao. Com o 400 do mcp-lite, o cliente simplesmente ignora o SSE e continua em modo POST-only.

### Solucao

**Remover o interceptor GET.** Deixar o mcp-lite retornar seu 400 nativo. A evidencia mostra que o cliente funciona perfeitamente com o 400.

### Mudanca

**Arquivo: `supabase/functions/devvault-mcp/index.ts`**

Remover linhas 83-104 (o bloco `if (c.req.method === "GET")` com o interceptor 405).

### Validacao

A conexao de 13:51:03-13:51:11 prova que o fluxo completo funciona quando o GET retorna 400 do mcp-lite. O interceptor 405 foi uma otimizacao que piorou o comportamento.

