

# Plano de Correcao: 8 Bugs Criticos de Runtime

## Arquivos a Modificar

```text
MODIFY  supabase/functions/vault-crud/index.ts
MODIFY  supabase/functions/vault-query/index.ts
MODIFY  supabase/functions/vault-ingest/index.ts
MODIFY  .lovable/plan.md
```

## Passo 1: `vault-crud/index.ts` — Fix Logger

- Substituir `import { log }` por `import { createLogger }`
- Criar `const logger = createLogger("vault-crud")`
- Substituir todas as chamadas `log("level", "vault-crud", msg)` por `logger.level(msg)`

## Passo 2: `vault-query/index.ts` — 3 Fixes

1. Corrigir `checkRateLimit(clientIp, "vault-query", 60, 60)` para assinatura correta com objeto `RateLimitConfig`
2. Substituir `rateLimit.allowed` por `!rateLimit.blocked`
3. Substituir logica inline de dependencias (duplicada) por import de `enrichModuleDependencies` de `dependency-helpers.ts`

## Passo 3: `vault-ingest/index.ts` — 4 Fixes

1. Remover import de `RATE_LIMIT_CONFIGS` (inexistente)
2. Corrigir `checkRateLimit` para assinatura correta
3. Substituir `rateLimit.allowed` por `!rateLimit.blocked`
4. Corrigir `keyValidation.user_id` para `keyValidation.userId`

## Passo 4: `.lovable/plan.md` — Atualizar Documentacao

- Substituir conteudo stale pelo estado atual do projeto com MCP Server implementado e bugs corrigidos

