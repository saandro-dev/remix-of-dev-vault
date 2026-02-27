

# Relatório de Auditoria: RBAC + Admin Panel

## Status: PARCIALMENTE COMPLETO — Correções Necessárias

---

## 1. O QUE FOI IMPLEMENTADO CORRETAMENTE

| Componente | Status | Detalhe |
|------------|--------|---------|
| Database migration (owner enum, functions, RLS) | PASS | `is_admin_or_owner`, `get_user_role` criados corretamente |
| `role-validator.ts` (backend) | PASS | Hierarquia correta, `requireRole` com throw |
| `admin-crud/index.ts` | PASS | 3 actions, usa `handleCorsV2`, `createSuccessResponse(req, ...)` |
| `usePermissions.ts` | PASS | Usa `invokeEdgeFunction` (Regra 5.5 OK) |
| `RoleProtectedRoute.tsx` | PASS | Hierarquia numérica, loading spinner, redirect |
| `appRoutes.tsx` | PASS | `/admin` com `RoleProtectedRoute` |
| `navigationConfig.ts` | PASS | Item `admin` com `requiredRole: "admin"` |
| `AppSidebar.tsx` | PASS | Filtra nav por role |
| `AdminProvider.tsx` | PASS | React Query + Context, i18n nos toasts |
| `UsersTable.tsx` | PASS | Tabela com avatar, role badge, actions (owner only) |
| `RoleChangeDialog.tsx` | PASS | Select com 3 roles, confirmacao, disabled state |
| i18n keys (en + pt-BR) | PASS | Admin keys completas incluindo `moderator` |
| `ProtectedRoute.tsx` | PASS | `t("common.loading")` em vez de PT hardcoded |

---

## 2. VIOLACOES ENCONTRADAS

### 2.1 CRITICA: `auth.ts` usa signature legada de `createErrorResponse`

**Arquivo:** `supabase/functions/_shared/auth.ts` (linhas 14 e 28)

Chama `createErrorResponse(ERROR_CODES.UNAUTHORIZED, "...", 401)` sem `req`, resultando em CORS `*` wildcard em vez do CORS seguro com allowlist. Enquanto `admin-crud` usa corretamente `createErrorResponse(req, ...)`, o `auth.ts` compartilhado usa a forma insegura.

**Impacto:** Toda Edge Function que usa `authenticateRequest()` retorna erros de auth com CORS `*`.

**Correcao:** Alterar `authenticateRequest` para receber `req` e usar a signature segura.

### 2.2 CRITICA: Comentarios em portugues nos shared helpers

**Arquivos afetados:**
- `supabase/functions/_shared/api-helpers.ts` — 15+ comentarios em PT ("Cria uma resposta", "Sobrecarga legada", "Mantido para compatibilidade", "Extrai o IP", "Trata requisicoes")
- `supabase/functions/_shared/cors-v2.ts` — 6+ comentarios em PT ("Trata requisicoes OPTIONS", "Retorna null", "Origem nao permitida")
- `supabase/functions/_shared/sentry.ts` — 5+ comentarios em PT ("Envolve o handler", "Garante que nenhum erro")

**Violacao:** Regra 5.4 — Nomenclatura em ingles tecnico.

### 2.3 MEDIA: Funcoes legadas dead code em `api-helpers.ts`

- `handleCors()` esta marcado como `@deprecated` mas ainda existe no arquivo
- `corsHeaders` wildcard `*` exportado e usado pelo `auth.ts` e possivelmente outros
- Comentario "Mantido para compatibilidade retroativa durante a migração" — viola Regra 3.5 ("Nada e temporario")

### 2.4 MEDIA: `vault-ingest/index.ts` tem strings de erro em portugues

Pelo menos 12 mensagens de erro hardcoded em PT: "Apenas POST é aceito", "Rate limit excedido", "API Key inválida", "Body JSON inválido", "Payload vazio", "Máximo 50 módulos", etc.

### 2.5 BAIXA: `.lovable/plan.md` desatualizado

O plano menciona XState como dependencia e lista arquivos `machines/adminMachine.ts` e `machines/adminMachine.types.ts` que nunca foram criados. A implementacao real usa React Query + Context (decisao correta), mas o plano nao foi atualizado para refletir isso.

### 2.6 BAIXA: `AdminUser.email` removido da interface mas presente no plano

O plano original listava `AdminUser { id, displayName, avatarUrl, email, role, createdAt }` com `email`. A interface final nao tem `email` (correto, ja que `profiles` nao tem email). O plano esta desatualizado.

---

## 3. PLANO DE REMEDIACAO

### Step 1: Corrigir `auth.ts` para usar CORS seguro
- Alterar `authenticateRequest(req)` para propagar `req` nas chamadas de `createErrorResponse`
- Usar signature `createErrorResponse(req, code, message, status)` em vez da legada

### Step 2: Traduzir todos os comentarios dos shared helpers para ingles
- `api-helpers.ts` — todos os JSDoc e inline comments
- `cors-v2.ts` — todos os JSDoc e inline comments
- `sentry.ts` — todos os JSDoc e inline comments

### Step 3: Remover dead code legado de `api-helpers.ts`
- Deletar `corsHeaders` wildcard (apos migrar `auth.ts`)
- Deletar funcao `handleCors()` deprecated
- Verificar que nenhum outro arquivo importa esses exports

### Step 4: Traduzir strings de erro em `vault-ingest/index.ts`
- Substituir todas as mensagens PT por equivalentes em ingles

### Step 5: Atualizar `.lovable/plan.md`
- Remover referencias a XState/machines
- Refletir a arquitetura real (React Query + Context)

### Arquivos a modificar:
```text
supabase/functions/_shared/auth.ts
supabase/functions/_shared/api-helpers.ts
supabase/functions/_shared/cors-v2.ts
supabase/functions/_shared/sentry.ts
supabase/functions/vault-ingest/index.ts
.lovable/plan.md
```

