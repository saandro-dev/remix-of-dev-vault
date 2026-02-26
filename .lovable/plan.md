

# Fix: "Módulo não encontrado" na VaultDetailPage

## Diagnóstico

A causa raiz é o uso de `.single()` na query do Supabase em `VaultDetailPage.tsx` (linha 27). Quando o `moduleId` da URL não corresponde a nenhum registro (seja UUID inválido, módulo deletado, ou URL legada das rotas antigas com categoria), `.single()` lança um erro que é capturado pelo React Query, resultando em `mod = undefined` e exibindo "Módulo não encontrado" sem contexto útil.

Além disso, conforme as diretrizes do projeto, `.single()` deve ser substituído por `.maybeSingle()` quando há risco de zero resultados.

## Mudanças

### `src/modules/vault/pages/VaultDetailPage.tsx`
1. Substituir `.single()` por `.maybeSingle()` na query (linha 27)
2. Melhorar o estado "não encontrado" com um botão de volta para `/vault` em vez de apenas texto solto
3. Tratar o caso de `error` separadamente do caso de "módulo não existe" para dar feedback adequado

