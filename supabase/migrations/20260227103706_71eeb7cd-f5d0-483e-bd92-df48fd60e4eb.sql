
-- =============================================================================
-- 1. bootstrap_vault_context() — Returns playbooks, domains, and top modules
--    in a single call for AI agents to bootstrap their context.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.bootstrap_vault_context()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'domains', (
      SELECT coalesce(json_agg(d), '[]'::json)
      FROM (
        SELECT
          vm.domain::TEXT AS domain,
          COUNT(*)::BIGINT AS total,
          array_agg(DISTINCT vm.module_type::TEXT) AS module_types
        FROM vault_modules vm
        WHERE vm.is_public = true
          AND vm.validation_status IN ('validated', 'draft')
        GROUP BY vm.domain
        ORDER BY COUNT(*) DESC
      ) d
    ),
    'playbook_phases', (
      SELECT coalesce(json_agg(p ORDER BY p.saas_phase), '[]'::json)
      FROM (
        SELECT
          vm.id,
          vm.slug,
          vm.title,
          vm.description,
          vm.saas_phase,
          vm.phase_title,
          vm.why_it_matters,
          vm.tags,
          vm.validation_status::TEXT AS validation_status
        FROM vault_modules vm
        WHERE vm.is_public = true
          AND vm.module_type = 'playbook_phase'
          AND vm.validation_status IN ('validated', 'draft')
      ) p
    ),
    'top_modules', (
      SELECT coalesce(json_agg(m), '[]'::json)
      FROM (
        SELECT
          vm.id,
          vm.slug,
          vm.title,
          vm.description,
          vm.domain::TEXT AS domain,
          vm.module_type::TEXT AS module_type,
          vm.language,
          vm.tags,
          vm.validation_status::TEXT AS validation_status,
          vm.updated_at
        FROM vault_modules vm
        WHERE vm.is_public = true
          AND vm.validation_status = 'validated'
        ORDER BY vm.updated_at DESC
        LIMIT 20
      ) m
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- =============================================================================
-- 2. search_vector_en — English full-text search vector + trigger + index
-- =============================================================================

-- Add column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vault_modules'
      AND column_name = 'search_vector_en'
  ) THEN
    ALTER TABLE public.vault_modules
      ADD COLUMN search_vector_en tsvector;
  END IF;
END $$;

-- Create GIN index on the new column
CREATE INDEX IF NOT EXISTS idx_vault_modules_search_vector_en
  ON public.vault_modules USING GIN (search_vector_en);

-- Trigger function to maintain search_vector_en
CREATE OR REPLACE FUNCTION public.update_vault_module_search_vector_en()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector_en := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.why_it_matters, '') || ' ' ||
    coalesce(NEW.context_markdown, '') || ' ' ||
    coalesce(NEW.phase_title, '') || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END;
$function$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_vault_module_search_vector_en ON public.vault_modules;
CREATE TRIGGER trg_vault_module_search_vector_en
  BEFORE INSERT OR UPDATE ON public.vault_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vault_module_search_vector_en();

-- Backfill existing rows
UPDATE public.vault_modules SET search_vector_en = to_tsvector('english',
  coalesce(title, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(why_it_matters, '') || ' ' ||
  coalesce(context_markdown, '') || ' ' ||
  coalesce(phase_title, '') || ' ' ||
  coalesce(array_to_string(tags, ' '), '')
);

-- =============================================================================
-- 3. Update query_vault_modules to combine PT + EN search scores
-- =============================================================================
CREATE OR REPLACE FUNCTION public.query_vault_modules(
  p_query text DEFAULT NULL,
  p_domain text DEFAULT NULL,
  p_module_type text DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  p_saas_phase integer DEFAULT NULL,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, slug text, title text, description text, domain text,
  module_type text, language text, saas_phase integer, phase_title text,
  why_it_matters text, code text, code_example text, context_markdown text,
  tags text[], source_project text, validation_status text,
  related_modules uuid[], created_at timestamptz, updated_at timestamptz,
  relevance_score real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tsquery_pt TSQUERY;
  v_tsquery_en TSQUERY;
BEGIN
  IF p_query IS NOT NULL AND trim(p_query) != '' THEN
    v_tsquery_pt := plainto_tsquery('portuguese', p_query);
    v_tsquery_en := plainto_tsquery('english', p_query);
  END IF;

  RETURN QUERY
  SELECT
    vm.id, vm.slug, vm.title, vm.description,
    vm.domain::TEXT, vm.module_type::TEXT, vm.language,
    vm.saas_phase, vm.phase_title, vm.why_it_matters,
    vm.code, vm.code_example, vm.context_markdown,
    vm.tags, vm.source_project, vm.validation_status::TEXT,
    vm.related_modules, vm.created_at, vm.updated_at,
    CASE
      WHEN v_tsquery_pt IS NOT NULL THEN
        GREATEST(
          ts_rank(vm.search_vector, v_tsquery_pt),
          ts_rank(coalesce(vm.search_vector_en, ''::tsvector), v_tsquery_en)
        )
      ELSE 1.0
    END::REAL AS relevance_score
  FROM vault_modules vm
  WHERE
    vm.is_public = true
    AND vm.validation_status IN ('validated', 'draft')
    AND (
      (v_tsquery_pt IS NULL AND v_tsquery_en IS NULL)
      OR vm.search_vector @@ v_tsquery_pt
      OR coalesce(vm.search_vector_en, ''::tsvector) @@ v_tsquery_en
    )
    AND (p_domain IS NULL OR vm.domain::TEXT = p_domain)
    AND (p_module_type IS NULL OR vm.module_type::TEXT = p_module_type)
    AND (p_saas_phase IS NULL OR vm.saas_phase = p_saas_phase)
    AND (p_tags IS NULL OR vm.tags && p_tags)
  ORDER BY
    CASE
      WHEN v_tsquery_pt IS NOT NULL THEN
        GREATEST(
          ts_rank(vm.search_vector, v_tsquery_pt),
          ts_rank(coalesce(vm.search_vector_en, ''::tsvector), v_tsquery_en)
        )
      ELSE 1.0
    END DESC,
    CASE WHEN vm.validation_status = 'validated' THEN 0 ELSE 1 END,
    vm.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;
