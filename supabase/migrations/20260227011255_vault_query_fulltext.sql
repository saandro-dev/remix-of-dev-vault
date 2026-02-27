-- ============================================================
-- Migration: vault_query_fulltext
-- Objetivo: Adicionar busca full-text, slug único e função
--           de query pública para o endpoint vault-query
-- ============================================================

-- 1. Adicionar coluna slug para identificação amigável
ALTER TABLE vault_modules
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Criar índice único no slug (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_modules_slug
  ON vault_modules (lower(slug))
  WHERE slug IS NOT NULL;

-- 3. Adicionar coluna tsvector para busca full-text
ALTER TABLE vault_modules
  ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- 4. Popular o search_vector para módulos existentes
UPDATE vault_modules
SET search_vector = to_tsvector('portuguese',
  coalesce(title, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(why_it_matters, '') || ' ' ||
  coalesce(context_markdown, '') || ' ' ||
  coalesce(phase_title, '') || ' ' ||
  coalesce(array_to_string(tags, ' '), '')
);

-- 5. Criar índice GIN para busca full-text
CREATE INDEX IF NOT EXISTS idx_vault_modules_search_vector
  ON vault_modules USING GIN (search_vector);

-- 6. Criar trigger para manter search_vector atualizado automaticamente
CREATE OR REPLACE FUNCTION update_vault_module_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('portuguese',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.why_it_matters, '') || ' ' ||
    coalesce(NEW.context_markdown, '') || ' ' ||
    coalesce(NEW.phase_title, '') || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_vault_module_search_vector ON vault_modules;
CREATE TRIGGER trigger_vault_module_search_vector
  BEFORE INSERT OR UPDATE ON vault_modules
  FOR EACH ROW EXECUTE FUNCTION update_vault_module_search_vector();

-- 7. Função principal de query pública — usada pelo endpoint vault-query
-- Aceita: query texto livre, domain, module_type, tags, saas_phase, limit, offset
-- Retorna: módulos públicos e validados com score de relevância
CREATE OR REPLACE FUNCTION query_vault_modules(
  p_query        TEXT DEFAULT NULL,
  p_domain       TEXT DEFAULT NULL,
  p_module_type  TEXT DEFAULT NULL,
  p_tags         TEXT[] DEFAULT NULL,
  p_saas_phase   INTEGER DEFAULT NULL,
  p_limit        INTEGER DEFAULT 10,
  p_offset       INTEGER DEFAULT 0
)
RETURNS TABLE (
  id               UUID,
  slug             TEXT,
  title            TEXT,
  description      TEXT,
  domain           TEXT,
  module_type      TEXT,
  language         TEXT,
  saas_phase       INTEGER,
  phase_title      TEXT,
  why_it_matters   TEXT,
  code             TEXT,
  code_example     TEXT,
  context_markdown TEXT,
  tags             TEXT[],
  source_project   TEXT,
  validation_status TEXT,
  related_modules  UUID[],
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ,
  relevance_score  REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tsquery TSQUERY;
BEGIN
  -- Construir tsquery se houver texto de busca
  IF p_query IS NOT NULL AND trim(p_query) != '' THEN
    v_tsquery := plainto_tsquery('portuguese', p_query);
  END IF;

  RETURN QUERY
  SELECT
    vm.id,
    vm.slug,
    vm.title,
    vm.description,
    vm.domain::TEXT,
    vm.module_type::TEXT,
    vm.language,
    vm.saas_phase,
    vm.phase_title,
    vm.why_it_matters,
    vm.code,
    vm.code_example,
    vm.context_markdown,
    vm.tags,
    vm.source_project,
    vm.validation_status::TEXT,
    vm.related_modules,
    vm.created_at,
    vm.updated_at,
    CASE
      WHEN v_tsquery IS NOT NULL THEN ts_rank(vm.search_vector, v_tsquery)
      ELSE 1.0
    END::REAL AS relevance_score
  FROM vault_modules vm
  WHERE
    -- Apenas módulos públicos e validados (ou draft)
    vm.is_public = true
    AND vm.validation_status IN ('validated', 'draft')
    -- Filtro de busca full-text
    AND (v_tsquery IS NULL OR vm.search_vector @@ v_tsquery)
    -- Filtros opcionais
    AND (p_domain IS NULL OR vm.domain::TEXT = p_domain)
    AND (p_module_type IS NULL OR vm.module_type::TEXT = p_module_type)
    AND (p_saas_phase IS NULL OR vm.saas_phase = p_saas_phase)
    AND (p_tags IS NULL OR vm.tags && p_tags)
  ORDER BY
    -- Prioridade: relevância de busca, depois módulos validados, depois mais recentes
    CASE WHEN v_tsquery IS NOT NULL THEN ts_rank(vm.search_vector, v_tsquery) ELSE 1.0 END DESC,
    CASE WHEN vm.validation_status = 'validated' THEN 0 ELSE 1 END,
    vm.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 8. Função para buscar módulo por ID ou slug (para leitura individual)
CREATE OR REPLACE FUNCTION get_vault_module(
  p_id   UUID DEFAULT NULL,
  p_slug TEXT DEFAULT NULL
)
RETURNS TABLE (
  id               UUID,
  slug             TEXT,
  title            TEXT,
  description      TEXT,
  domain           TEXT,
  module_type      TEXT,
  language         TEXT,
  saas_phase       INTEGER,
  phase_title      TEXT,
  why_it_matters   TEXT,
  code             TEXT,
  code_example     TEXT,
  context_markdown TEXT,
  tags             TEXT[],
  source_project   TEXT,
  validation_status TEXT,
  related_modules  UUID[],
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vm.id,
    vm.slug,
    vm.title,
    vm.description,
    vm.domain::TEXT,
    vm.module_type::TEXT,
    vm.language,
    vm.saas_phase,
    vm.phase_title,
    vm.why_it_matters,
    vm.code,
    vm.code_example,
    vm.context_markdown,
    vm.tags,
    vm.source_project,
    vm.validation_status::TEXT,
    vm.related_modules,
    vm.created_at,
    vm.updated_at
  FROM vault_modules vm
  WHERE
    vm.is_public = true
    AND (
      (p_id IS NOT NULL AND vm.id = p_id)
      OR
      (p_slug IS NOT NULL AND lower(vm.slug) = lower(p_slug))
    )
  LIMIT 1;
END;
$$;

-- 9. Função para listar categorias/domínios disponíveis com contagem
CREATE OR REPLACE FUNCTION list_vault_domains()
RETURNS TABLE (
  domain       TEXT,
  total        BIGINT,
  module_types TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vm.domain::TEXT,
    COUNT(*)::BIGINT AS total,
    array_agg(DISTINCT vm.module_type::TEXT) AS module_types
  FROM vault_modules vm
  WHERE vm.is_public = true
    AND vm.validation_status IN ('validated', 'draft')
  GROUP BY vm.domain
  ORDER BY COUNT(*) DESC;
END;
$$;

-- 10. Permissões: funções públicas acessíveis por anon e authenticated
GRANT EXECUTE ON FUNCTION query_vault_modules TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_vault_module TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION list_vault_domains TO anon, authenticated, service_role;

-- 11. Gerar slugs automáticos para módulos existentes sem slug
UPDATE vault_modules
SET slug = lower(
  regexp_replace(
    regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  )
) || '-' || substring(id::TEXT, 1, 6)
WHERE slug IS NULL;
