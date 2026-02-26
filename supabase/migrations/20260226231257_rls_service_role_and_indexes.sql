-- =============================================
-- Migration: Refinar RLS + Políticas service_role + Índices
-- Autor: Manus AI (Engenheiro de Software Principal)
-- Data: 2026-02-26
--
-- Objetivo: Elevar a segurança do banco de dados do DevVault
-- adicionando políticas explícitas de service_role para todas
-- as tabelas críticas, refinando as políticas RLS genéricas
-- para operações granulares, e adicionando índices de performance.
-- =============================================

-- =============================================
-- PARTE 1: Políticas service_role explícitas
-- Garante que as Edge Functions (que usam a service_role key)
-- sempre tenham acesso total, independente de outras políticas.
-- =============================================

-- vault_modules
CREATE POLICY "Service role full access on vault_modules"
  ON public.vault_modules FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- projects
CREATE POLICY "Service role full access on projects"
  ON public.projects FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- bugs
CREATE POLICY "Service role full access on bugs"
  ON public.bugs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- profiles
CREATE POLICY "Service role full access on profiles"
  ON public.profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- api_keys (tabela legada)
CREATE POLICY "Service role full access on api_keys"
  ON public.api_keys FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- key_folders
CREATE POLICY "Service role full access on key_folders"
  ON public.key_folders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- favorites
CREATE POLICY "Service role full access on favorites"
  ON public.favorites FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- shared_snippets
CREATE POLICY "Service role full access on shared_snippets"
  ON public.shared_snippets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- user_roles
CREATE POLICY "Service role full access on user_roles"
  ON public.user_roles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- devvault_api_keys
CREATE POLICY "Service role full access on devvault_api_keys"
  ON public.devvault_api_keys FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- devvault_api_audit_log
CREATE POLICY "Service role full access on devvault_api_audit_log"
  ON public.devvault_api_audit_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- devvault_api_rate_limits
CREATE POLICY "Service role full access on devvault_api_rate_limits"
  ON public.devvault_api_rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================
-- PARTE 2: Refinar políticas RLS para granularidade
-- Substituir políticas ALL genéricas por políticas
-- específicas por operação (SELECT, INSERT, UPDATE, DELETE).
-- Isso permite controle fino sobre cada tipo de acesso.
-- =============================================

-- vault_modules: substituir ALL por operações granulares
DROP POLICY IF EXISTS "Users can CRUD own vault modules" ON public.vault_modules;

CREATE POLICY "Users can select own vault modules"
  ON public.vault_modules FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own vault modules"
  ON public.vault_modules FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own vault modules"
  ON public.vault_modules FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own vault modules"
  ON public.vault_modules FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- projects: substituir ALL por operações granulares
DROP POLICY IF EXISTS "Users can CRUD own projects" ON public.projects;

CREATE POLICY "Users can select own projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- bugs: substituir ALL por operações granulares
DROP POLICY IF EXISTS "Users can CRUD own bugs" ON public.bugs;

CREATE POLICY "Users can select own bugs"
  ON public.bugs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own bugs"
  ON public.bugs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bugs"
  ON public.bugs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own bugs"
  ON public.bugs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- key_folders: substituir ALL por operações granulares
DROP POLICY IF EXISTS "Users can CRUD own key_folders" ON public.key_folders;

CREATE POLICY "Users can select own key_folders"
  ON public.key_folders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own key_folders"
  ON public.key_folders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own key_folders"
  ON public.key_folders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own key_folders"
  ON public.key_folders FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- favorites: substituir ALL por operações granulares
DROP POLICY IF EXISTS "Users can CRUD own favorites" ON public.favorites;

CREATE POLICY "Users can select own favorites"
  ON public.favorites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own favorites"
  ON public.favorites FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own favorites"
  ON public.favorites FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- api_keys (legada): substituir ALL por operações granulares
DROP POLICY IF EXISTS "Users can CRUD own api_keys" ON public.api_keys;

CREATE POLICY "Users can select own api_keys"
  ON public.api_keys FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own api_keys"
  ON public.api_keys FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own api_keys"
  ON public.api_keys FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- PARTE 3: Índices de performance
-- Índices nas colunas mais consultadas para acelerar
-- as queries mais frequentes do sistema.
-- =============================================

-- vault_modules: busca por usuário e categoria (query mais comum)
CREATE INDEX IF NOT EXISTS idx_vault_modules_user_id
  ON public.vault_modules(user_id);

CREATE INDEX IF NOT EXISTS idx_vault_modules_user_category
  ON public.vault_modules(user_id, category);

CREATE INDEX IF NOT EXISTS idx_vault_modules_is_public
  ON public.vault_modules(is_public) WHERE is_public = true;

-- projects: busca por usuário
CREATE INDEX IF NOT EXISTS idx_projects_user_id
  ON public.projects(user_id);

-- bugs: busca por usuário e status
CREATE INDEX IF NOT EXISTS idx_bugs_user_id
  ON public.bugs(user_id);

CREATE INDEX IF NOT EXISTS idx_bugs_user_status
  ON public.bugs(user_id, status);

-- key_folders: busca por projeto
CREATE INDEX IF NOT EXISTS idx_key_folders_project_id
  ON public.key_folders(project_id);

-- api_keys (legada): busca por projeto
CREATE INDEX IF NOT EXISTS idx_api_keys_project_id
  ON public.api_keys(project_id);

-- devvault_api_keys: busca por prefixo (lookup de validação)
CREATE INDEX IF NOT EXISTS idx_devvault_api_keys_prefix_active
  ON public.devvault_api_keys(key_prefix)
  WHERE revoked_at IS NULL;

-- =============================================
-- PARTE 4: Comentários de documentação nas tabelas
-- =============================================

COMMENT ON TABLE public.vault_modules IS
  'Módulos de código do DevVault. Cada módulo pertence a um usuário e pode ser público ou privado.';

COMMENT ON TABLE public.devvault_api_keys IS
  'Chaves de API para ingestão externa. O valor real da chave é armazenado no Supabase Vault (vault.secrets). Esta tabela contém apenas metadados e o prefixo para lookup eficiente.';

COMMENT ON TABLE public.devvault_api_audit_log IS
  'Log de auditoria de todas as chamadas à API de ingestão. Registra sucesso, falha, IP, tempo de processamento e código de erro.';

COMMENT ON TABLE public.devvault_api_rate_limits IS
  'Controle de rate limiting por identificador (IP ou user_id) e ação. Gerenciado exclusivamente pelas Edge Functions via service_role.';
