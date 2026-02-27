

# Analise do Relatorio da Manus + Plano de Internacionalizacao (i18n)

---

## Avaliacao do Relatorio da Manus

### Tarefa 1: Bootstrap Endpoint
**Veredicto: APROVADA.** A SQL function `bootstrap_vault_context()` e a action `"bootstrap"` no `vault-query` sao a abordagem correta. Um agente recebe playbooks, dominios e top modules em uma unica chamada. Nenhuma objecao tecnica.

### Tarefa 2: Evoluir Formulario de Criacao
**Veredicto: JA IMPLEMENTADA.** O `CreateModuleDialog.tsx` atual ja possui 3 abas (Basico, Codigo, Metadados) com os campos `why_it_matters`, `code_example`, `context_markdown`, `source_project`, `saas_phase`, `phase_title`, `validation_status`, `is_public`. O unico campo faltante mencionado pela Manus e `dependencies` (lista de UUIDs). A Manus provavelmente analisou uma versao anterior do codigo.

**Acao:** Adicionar apenas o campo `dependencies` ao formulario e ao hook de criacao.

### Tarefa 3: Busca Bilingue
**Veredicto: APROVADA.** Adicionar `search_vector_en` com `to_tsvector('english', ...)` e um indice GIN e a solucao correta para busca bilingue no PostgreSQL. A modificacao na `query_vault_modules` para combinar scores de ambos os vetores e tecnicamente solida.

---

## Decisao sobre Idioma: EN Padrao

Concordo. O DevVault e um Knowledge OS para agentes. Agentes processam ingles nativamente. A decisao correta e:

- **EN como idioma padrao** de toda a UI
- **PT-BR como idioma secundario** disponivel via toggle
- **Implementar i18n desde o inicio** com arquivos de traducao separados

### Situacao Atual de Strings Hardcoded em PT-BR

Identifiquei **146+ strings em portugues** espalhadas por **12+ arquivos**:
- `CreateModuleDialog.tsx` — Labels, placeholders, tabs, botoes
- `SettingsPage.tsx` — Titulos, descricoes, botoes
- `Topbar.tsx` — Menu dropdown items
- `BugCreateDialog.tsx` — Labels, placeholders
- `ApiKeysPage.tsx` — Titulos, descricoes
- `ProjectsListPage.tsx` — Titulos
- `DashboardPage.tsx` — Labels, shortcuts
- `ConfirmDelete.tsx` — Botoes
- `ApiDocsPage.tsx` — Descricoes
- `VaultListPage.tsx` — Botoes, placeholders
- Auth pages (Login, Signup, ForgotPassword, ResetPassword)

---

## Plano de Implementacao (4 Etapas)

### Etapa 1 — Sistema i18n
1. Instalar `react-i18next` + `i18next`
2. Criar estrutura `src/i18n/locales/en.json` e `src/i18n/locales/pt-BR.json`
3. Criar `src/i18n/config.ts` com deteccao de idioma (localStorage) e fallback EN
4. Criar componente `LanguageSwitcher` no Topbar

### Etapa 2 — Migrar Strings (EN padrao)
1. Extrair todas as 146+ strings PT-BR para `en.json` como chaves em ingles
2. Copiar traducoes para `pt-BR.json`
3. Substituir strings hardcoded por chamadas `t('key')` em todos os 12+ arquivos

### Etapa 3 — Bootstrap Endpoint (Tarefa 1 da Manus)
1. Criar SQL function `bootstrap_vault_context()`
2. Adicionar action `"bootstrap"` ao `vault-query` Edge Function
3. Atualizar documentacao da API (`apiReference.ts`)

### Etapa 4 — Campo Dependencies + Busca Bilingue (Tarefas 2 e 3 da Manus)
1. Adicionar campo `dependencies` ao `CreateModuleDialog` e ao hook
2. Criar migracao SQL para `search_vector_en` + indice GIN
3. Atualizar `query_vault_modules` para busca combinada PT+EN

### Arquivos a Criar/Modificar

```text
CRIAR:
  src/i18n/config.ts
  src/i18n/locales/en.json
  src/i18n/locales/pt-BR.json
  src/components/LanguageSwitcher.tsx

MODIFICAR (i18n — strings):
  src/modules/vault/components/CreateModuleDialog.tsx
  src/modules/vault/components/EditModuleSheet.tsx
  src/modules/vault/pages/VaultListPage.tsx
  src/modules/vault/pages/VaultDetailPage.tsx
  src/modules/settings/pages/SettingsPage.tsx
  src/modules/settings/pages/ApiKeysPage.tsx
  src/modules/settings/components/CreateKeyCard.tsx
  src/modules/bugs/components/BugCreateDialog.tsx
  src/modules/bugs/components/BugCard.tsx
  src/modules/bugs/pages/BugDiaryPage.tsx
  src/modules/dashboard/pages/DashboardPage.tsx
  src/modules/projects/pages/ProjectsListPage.tsx
  src/modules/projects/pages/ProjectDetailPage.tsx
  src/modules/projects/pages/FolderDetailPage.tsx
  src/modules/docs/pages/ApiDocsPage.tsx
  src/modules/auth/pages/LoginPage.tsx
  src/modules/auth/pages/SignupPage.tsx
  src/modules/auth/pages/ForgotPasswordPage.tsx
  src/modules/auth/pages/ResetPasswordPage.tsx
  src/layouts/Topbar.tsx
  src/layouts/AppSidebar.tsx
  src/components/common/ConfirmDelete.tsx
  src/modules/navigation/config/navigationConfig.ts
  src/App.tsx (wrap com I18nextProvider)

MODIFICAR (backend):
  supabase/functions/vault-query/index.ts (action bootstrap)
  src/modules/vault/components/CreateModuleDialog.tsx (campo dependencies)
  src/modules/docs/constants/apiReference.ts (documentar bootstrap)
```

### Ordem de Execucao

A i18n (Etapas 1-2) deve ser feita PRIMEIRO porque altera todos os arquivos de UI. Fazer as tarefas da Manus antes criaria conflitos desnecessarios. Apos o i18n estar completo, as tarefas de backend (Etapas 3-4) entram de forma limpa.

