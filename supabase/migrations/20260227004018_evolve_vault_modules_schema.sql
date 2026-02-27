-- =============================================================================
-- MIGRATION: Evoluir vault_modules para Sistema de Conhecimento Vivo
-- =============================================================================
-- Objetivo: Transformar vault_modules de um simples cofre de snippets em uma
-- biblioteca técnica estruturada, consultável por domínio, fase e tipo.
-- Isso permite que agentes de IA consumam o conhecimento via API com precisão.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Novos tipos ENUM
-- -----------------------------------------------------------------------------

-- Domínio técnico do módulo (substitui a categoria genérica)
CREATE TYPE vault_domain AS ENUM (
  'security',        -- Criptografia, Vault, RLS, autenticação
  'backend',         -- Edge Functions, banco de dados, SQL
  'frontend',        -- Componentes, hooks, UX patterns
  'architecture',    -- Padrões de arquitetura, decisões de design
  'devops',          -- Deploy, CI/CD, configuração
  'saas_playbook'    -- Playbooks de criação de SaaS por fases
);

-- Tipo do módulo (o que ele contém)
CREATE TYPE vault_module_type AS ENUM (
  'code_snippet',    -- Trecho de código reutilizável
  'full_module',     -- Módulo completo com código + documentação
  'sql_migration',   -- Migration SQL pronta para uso
  'architecture_doc',-- Documento de decisão arquitetural (ADR)
  'playbook_phase',  -- Uma fase de um playbook de criação de SaaS
  'pattern_guide'    -- Guia de padrão (ex: "Como usar o Vault")
);

-- -----------------------------------------------------------------------------
-- STEP 2: Adicionar novas colunas à tabela vault_modules
-- -----------------------------------------------------------------------------

-- domain: substitui category com mais granularidade
ALTER TABLE public.vault_modules
  ADD COLUMN IF NOT EXISTS domain vault_domain DEFAULT 'backend';

-- module_type: classifica o tipo de conteúdo
ALTER TABLE public.vault_modules
  ADD COLUMN IF NOT EXISTS module_type vault_module_type DEFAULT 'code_snippet';

-- saas_phase: fase do playbook de criação de SaaS (1-10)
-- NULL = módulo genérico, não pertence a um playbook
ALTER TABLE public.vault_modules
  ADD COLUMN IF NOT EXISTS saas_phase integer DEFAULT NULL
  CONSTRAINT saas_phase_range CHECK (saas_phase IS NULL OR (saas_phase >= 1 AND saas_phase <= 10));

-- phase_title: título da fase (ex: "Fase 1 — Fundação e Configuração")
ALTER TABLE public.vault_modules
  ADD COLUMN IF NOT EXISTS phase_title text DEFAULT NULL;

-- why_it_matters: explicação do PORQUÊ desta decisão arquitetural
-- Separado do context_markdown para ser mais direto e consultável
ALTER TABLE public.vault_modules
  ADD COLUMN IF NOT EXISTS why_it_matters text DEFAULT NULL;

-- code_example: exemplo de uso mínimo e prático (diferente do código completo)
-- Ideal para agentes que precisam de um exemplo rápido de como usar
ALTER TABLE public.vault_modules
  ADD COLUMN IF NOT EXISTS code_example text DEFAULT NULL;

-- source_project: de qual projeto este padrão foi extraído e validado
-- Ex: 'risecheckout', 'devvault', 'risespy'
ALTER TABLE public.vault_modules
  ADD COLUMN IF NOT EXISTS source_project text DEFAULT NULL;

-- validation_status: se o padrão foi validado em produção
CREATE TYPE vault_validation_status AS ENUM (
  'draft',        -- Em elaboração, não validado
  'validated',    -- Validado em produção
  'deprecated'    -- Não usar mais, substituído por outro
);

ALTER TABLE public.vault_modules
  ADD COLUMN IF NOT EXISTS validation_status vault_validation_status DEFAULT 'draft';

-- related_modules: IDs de módulos relacionados (para navegação entre módulos)
ALTER TABLE public.vault_modules
  ADD COLUMN IF NOT EXISTS related_modules uuid[] DEFAULT '{}';

-- -----------------------------------------------------------------------------
-- STEP 3: Migrar dados existentes (category → domain)
-- -----------------------------------------------------------------------------

UPDATE public.vault_modules SET domain = 'frontend'     WHERE category = 'frontend';
UPDATE public.vault_modules SET domain = 'backend'      WHERE category = 'backend';
UPDATE public.vault_modules SET domain = 'devops'       WHERE category = 'devops';
UPDATE public.vault_modules SET domain = 'security'     WHERE category = 'security';

-- -----------------------------------------------------------------------------
-- STEP 4: Novos índices para performance nas consultas da API
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_vault_modules_domain
  ON public.vault_modules (domain);

CREATE INDEX IF NOT EXISTS idx_vault_modules_module_type
  ON public.vault_modules (module_type);

CREATE INDEX IF NOT EXISTS idx_vault_modules_saas_phase
  ON public.vault_modules (saas_phase)
  WHERE saas_phase IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vault_modules_validation_status
  ON public.vault_modules (validation_status);

CREATE INDEX IF NOT EXISTS idx_vault_modules_source_project
  ON public.vault_modules (source_project)
  WHERE source_project IS NOT NULL;

-- Índice composto para a query mais comum: domínio + tipo + usuário
CREATE INDEX IF NOT EXISTS idx_vault_modules_domain_type_user
  ON public.vault_modules (domain, module_type, user_id);

-- Índice para busca por tags (GIN para arrays)
CREATE INDEX IF NOT EXISTS idx_vault_modules_tags_gin
  ON public.vault_modules USING GIN (tags);

-- -----------------------------------------------------------------------------
-- STEP 5: Função SQL para busca semântica por domínio/fase/tipo
-- Usada pelo vault-ingest (GET) e pelo global-search
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION search_vault_modules(
  p_user_id     uuid,
  p_query       text        DEFAULT NULL,
  p_domain      vault_domain DEFAULT NULL,
  p_module_type vault_module_type DEFAULT NULL,
  p_saas_phase  integer     DEFAULT NULL,
  p_source      text        DEFAULT NULL,
  p_validated   boolean     DEFAULT NULL,
  p_limit       integer     DEFAULT 20,
  p_offset      integer     DEFAULT 0
)
RETURNS TABLE (
  id                 uuid,
  title              text,
  description        text,
  domain             vault_domain,
  module_type        vault_module_type,
  language           text,
  tags               text[],
  saas_phase         integer,
  phase_title        text,
  why_it_matters     text,
  code_example       text,
  source_project     text,
  validation_status  vault_validation_status,
  related_modules    uuid[],
  created_at         timestamptz,
  updated_at         timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vm.id,
    vm.title,
    vm.description,
    vm.domain,
    vm.module_type,
    vm.language,
    vm.tags,
    vm.saas_phase,
    vm.phase_title,
    vm.why_it_matters,
    vm.code_example,
    vm.source_project,
    vm.validation_status,
    vm.related_modules,
    vm.created_at,
    vm.updated_at
  FROM public.vault_modules vm
  WHERE
    -- Filtro de dono: módulos do usuário OU módulos públicos
    (vm.user_id = p_user_id OR vm.is_public = true)
    -- Filtro de texto: busca em título, descrição, tags e why_it_matters
    AND (
      p_query IS NULL
      OR vm.title ILIKE '%' || p_query || '%'
      OR vm.description ILIKE '%' || p_query || '%'
      OR vm.why_it_matters ILIKE '%' || p_query || '%'
      OR EXISTS (SELECT 1 FROM unnest(vm.tags) t WHERE t ILIKE '%' || p_query || '%')
    )
    -- Filtros estruturais
    AND (p_domain IS NULL      OR vm.domain = p_domain)
    AND (p_module_type IS NULL OR vm.module_type = p_module_type)
    AND (p_saas_phase IS NULL  OR vm.saas_phase = p_saas_phase)
    AND (p_source IS NULL      OR vm.source_project = p_source)
    AND (p_validated IS NULL   OR (p_validated = true AND vm.validation_status = 'validated')
                               OR (p_validated = false AND vm.validation_status != 'validated'))
  ORDER BY
    -- Módulos validados primeiro, depois por fase, depois por data
    CASE vm.validation_status WHEN 'validated' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
    vm.saas_phase NULLS LAST,
    vm.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Permissões: apenas service_role pode chamar diretamente
REVOKE ALL ON FUNCTION search_vault_modules FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_vault_modules TO service_role;

-- -----------------------------------------------------------------------------
-- STEP 6: View pública para módulos validados (usada pela API pública)
-- Agentes externos podem consultar módulos públicos e validados sem autenticação
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.vault_modules_public AS
SELECT
  id,
  title,
  description,
  domain,
  module_type,
  language,
  tags,
  saas_phase,
  phase_title,
  why_it_matters,
  code_example,
  source_project,
  validation_status,
  related_modules,
  created_at,
  updated_at
FROM public.vault_modules
WHERE is_public = true
  AND validation_status = 'validated';

COMMENT ON VIEW public.vault_modules_public IS
  'Módulos públicos e validados — consultáveis por agentes externos via API sem autenticação';
