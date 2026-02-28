

## Plano: Correcao dos 4 Pontos Pendentes do Relatorio MCP

### Diagnostico

1. **Descriptions em portugues**: 2 modulos ainda em PT (`evolution-api-v2-client`, `whatsapp-status-webhook`)
2. **related_modules vazio**: Nenhum dos 33 modulos tem `related_modules` preenchido
3. **Completeness penaliza standalone**: A funcao `vault_module_completeness` desconta 10% para modulos sem dependencies, mesmo quando nao faz sentido ter
4. **Dominios devops/saas_playbook sem modulos**: Existem nos enums mas sem dados — nao requer acao (serao preenchidos na migracao do RiseCheckout)

### Execucao

**Passo 1 — Traduzir 2 descriptions restantes (SQL UPDATE)**

- `evolution-api-v2-client`: traduzir description de PT para EN
- `whatsapp-status-webhook`: traduzir description de PT para EN

**Passo 2 — Preencher related_modules para os 33 modulos (SQL UPDATE)**

Mapeamento logico de relacoes laterais entre modulos do mesmo dominio ou com funcionalidade complementar. Exemplos:
- `rate-limit-guard` ↔ `rate-limiting-middleware` (ambos sobre rate limiting)
- `secure-cookie-helper` ↔ `secure-session-cookies` (ambos sobre cookies/sessoes)
- `auth-constants-ssot` ↔ `unified-auth-v2` ↔ `auth-hooks-pattern` (stack de auth)
- Todos os 7 modulos whatsapp apontam entre si

**Passo 3 — Corrigir funcao vault_module_completeness (SQL Migration)**

Alterar a logica para nao penalizar modulos standalone. A abordagem: verificar se o modulo pertence a um `module_group` — se sim, cobrar dependencies; se nao, ignorar o campo. Isso muda o total de 10 para 9 campos para modulos standalone, mantendo o score justo.

### Arquivos Afetados

| Tipo | Arquivo/Tabela | Acao |
|------|---------------|------|
| Dados | `vault_modules.description` | UPDATE em 2 rows |
| Dados | `vault_modules.related_modules` | UPDATE em ~33 rows |
| Migration | `vault_module_completeness` function | ALTER para logica condicional de deps |

