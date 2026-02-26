

# Plano de Implementacao — DevVault

## Concluído

### Bug: Links Quebrados no Dashboard
- ✅ Corrigido `/vault/frontend` → `/vault`

### Fase 1: Confirmação de Exclusão
- ✅ `useConfirmDelete` hook + `ConfirmDialog` component
- ✅ Integrado em VaultDetailPage, ProjectDetailPage, BugDiaryPage

### Fase 2: Página de Perfil e Settings
- ✅ SettingsPage com tabs Perfil/Conta
- ✅ Upload de avatar, display_name, bio
- ✅ Bucket `avatars` criado
- ✅ Rota, navegação e Topbar atualizados

### Fase 3: Edição de Módulos + Vínculos nos Bugs
- ✅ EditModuleSheet para editar módulos do cofre
- ✅ Bugs vinculados a projetos e módulos
- ✅ Tags nos bugs

### Fase 4: Busca Global
- ✅ Edge Function `global-search`
- ✅ SearchPage com debounce e resultados agrupados

### Fase 5: API Ingestion System
- ✅ Tabelas: `devvault_api_keys`, `devvault_api_audit_log`, `devvault_api_rate_limits`
- ✅ Criptografia 100% via Supabase Vault (pgsodium)
- ✅ Funções SQL SECURITY DEFINER: `create_devvault_api_key`, `validate_devvault_api_key`, `revoke_devvault_api_key`
- ✅ Módulos compartilhados: `_shared/api-helpers`, `api-key-guard`, `api-audit-logger`, `rate-limit-guard`
- ✅ Edge Functions: `vault-ingest`, `create-api-key`, `revoke-api-key`
- ✅ Frontend: ApiKeysPage com geração, visualização única e revogação
- ✅ Rota `/settings/api-keys`, navegação e Topbar atualizados
