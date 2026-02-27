

# Plano: Criar Modulo de Documentacao da API

## Objetivo
Criar uma pagina dedicada dentro do DevVault (`/docs/api`) com documentacao completa e estruturada da API, otimizada para que agentes de IA e desenvolvedores consigam consumir a API sem assistencia.

## Arquivos a Criar/Modificar

```text
src/modules/docs/pages/ApiDocsPage.tsx          CRIAR   (pagina principal)
src/modules/docs/constants/apiReference.ts      CRIAR   (dados da documentacao)
src/modules/docs/components/EndpointCard.tsx     CRIAR   (card de endpoint)
src/modules/docs/components/CodeExample.tsx      CRIAR   (bloco de exemplo copiavel)
src/modules/docs/components/ParamTable.tsx       CRIAR   (tabela de parametros)
src/routes/appRoutes.tsx                         MODIFICAR (adicionar rota /docs/api)
src/modules/navigation/config/navigationConfig.ts MODIFICAR (adicionar link na sidebar)
```

## Conteudo da Documentacao

A pagina cobrira:

1. **Autenticacao** — Como gerar e usar a API key (`x-api-key` ou `Authorization: Bearer`)
2. **Base URL** — `https://bskfnthwewhpfrldbhqx.supabase.co/functions/v1/`
3. **Endpoint: POST /vault-ingest** — Payload completo, campos obrigatorios/opcionais, validacoes, categorias validas
4. **Respostas** — Formatos de sucesso (201) e erro (400, 401, 405, 422, 429, 500) com exemplos JSON
5. **Rate Limiting** — 60 requests/min, bloqueio de 5min
6. **Audit Log** — Todas as chamadas sao registradas
7. **Exemplos prontos** — cURL, JavaScript/fetch, Python requests

## Estrutura Tecnica

- `apiReference.ts` contera os dados como objetos tipados (endpoints, params, examples) — separando dados de apresentacao (SOLID)
- Componentes `EndpointCard`, `CodeExample`, `ParamTable` sao reutilizaveis para futuros endpoints
- `CodeExample` tera botao de copiar integrado
- Pagina acessivel tanto autenticado (sidebar) quanto como referencia estatica

## Passos de Implementacao

1. Criar `apiReference.ts` com tipos e dados de todos os endpoints, parametros, exemplos e codigos de erro
2. Criar `ParamTable` — tabela de parametros com nome, tipo, obrigatorio, descricao
3. Criar `CodeExample` — bloco de codigo com syntax highlight basico e botao copiar
4. Criar `EndpointCard` — agrupa metodo, path, descricao, ParamTable, respostas e exemplos
5. Criar `ApiDocsPage` — compoe os componentes acima consumindo dados de `apiReference.ts`
6. Adicionar rota `/docs/api` em `appRoutes.tsx`
7. Adicionar item "API Docs" no grupo "Conta" da `navigationConfig.ts` com icone `BookOpen`

