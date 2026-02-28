

## Plano: Corrigir CORS e Adicionar Logging no MCP Auth

### Problema Identificado

As respostas de erro do auth middleware (`jsonRpcError` e rate-limit 429) **não incluem CORS headers**. Quando o Lovable (browser) faz a requisição e recebe um 401, o browser bloqueia a resposta por falta de `Access-Control-Allow-Origin`, impedindo o cliente de sequer ler o erro.

Além disso, não há logging para diagnosticar exatamente o que chega na requisição.

### Correções

**Arquivo 1: `supabase/functions/devvault-mcp/index.ts`**
- Exportar `CORS_HEADERS` para ser reutilizado pelo auth middleware
- Quando `authResult` é uma Response (erro), clonar e injetar CORS headers antes de retornar
- Adicionar logging temporário para registrar headers recebidos

**Arquivo 2: `supabase/functions/_shared/mcp-tools/auth.ts`**
- Adicionar `console.log` temporário para registrar quais headers de autenticação chegaram e os primeiros 12 caracteres do valor extraído
- Registrar se a validação passou ou falhou

### Mudanças Concretas

```text
devvault-mcp/index.ts
├── Quando authResult é Response, adicionar CORS_HEADERS à resposta
├── Log: headers de auth recebidos (x-devvault-key, x-api-key, authorization presença)
└── Log: primeiros 12 chars do rawKey extraído

_shared/mcp-tools/auth.ts  
├── Log: valor extraído (primeiros 12 chars) e fonte (qual header)
├── Log: resultado da validação (valid/invalid)
└── Sem mudança na lógica de autenticação
```

### Deploy

Após as edições, o deploy é automático. Os logs ficarão visíveis no dashboard do Supabase para diagnóstico da próxima tentativa de conexão.

