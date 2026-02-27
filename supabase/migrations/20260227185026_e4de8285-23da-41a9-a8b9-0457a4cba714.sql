
-- Drop the old function signature first (return type changed)
DROP FUNCTION IF EXISTS public.query_vault_modules(text, text, text, text[], integer, integer, integer);

-- Recreate with usage_hint in output + ILIKE fallback
CREATE OR REPLACE FUNCTION public.query_vault_modules(
  p_query text DEFAULT NULL::text,
  p_domain text DEFAULT NULL::text,
  p_module_type text DEFAULT NULL::text,
  p_tags text[] DEFAULT NULL::text[],
  p_saas_phase integer DEFAULT NULL::integer,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
 RETURNS TABLE(
   id uuid, slug text, title text, description text, domain text,
   module_type text, language text, saas_phase integer, phase_title text,
   why_it_matters text, usage_hint text, code text, code_example text,
   context_markdown text, tags text[], source_project text,
   validation_status text, related_modules uuid[],
   created_at timestamp with time zone, updated_at timestamp with time zone,
   relevance_score real
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tsquery_pt TSQUERY;
  v_tsquery_en TSQUERY;
  v_has_query BOOLEAN;
  v_ts_count INT;
BEGIN
  v_has_query := p_query IS NOT NULL AND trim(p_query) != '';

  IF v_has_query THEN
    v_tsquery_pt := plainto_tsquery('portuguese', p_query);
    v_tsquery_en := plainto_tsquery('english', p_query);
  END IF;

  IF v_has_query THEN
    SELECT COUNT(*) INTO v_ts_count
    FROM vault_modules vm
    WHERE vm.visibility = 'global'
      AND vm.validation_status IN ('validated', 'draft')
      AND (vm.search_vector @@ v_tsquery_pt OR coalesce(vm.search_vector_en, ''::tsvector) @@ v_tsquery_en)
      AND (p_domain IS NULL OR vm.domain::TEXT = p_domain)
      AND (p_module_type IS NULL OR vm.module_type::TEXT = p_module_type)
      AND (p_saas_phase IS NULL OR vm.saas_phase = p_saas_phase)
      AND (p_tags IS NULL OR vm.tags && p_tags);

    IF v_ts_count > 0 THEN
      RETURN QUERY
      SELECT
        vm.id, vm.slug, vm.title, vm.description,
        vm.domain::TEXT, vm.module_type::TEXT, vm.language,
        vm.saas_phase, vm.phase_title, vm.why_it_matters, vm.usage_hint,
        vm.code, vm.code_example, vm.context_markdown,
        vm.tags, vm.source_project, vm.validation_status::TEXT,
        vm.related_modules, vm.created_at, vm.updated_at,
        GREATEST(
          ts_rank(vm.search_vector, v_tsquery_pt),
          ts_rank(coalesce(vm.search_vector_en, ''::tsvector), v_tsquery_en)
        )::REAL AS relevance_score
      FROM vault_modules vm
      WHERE vm.visibility = 'global'
        AND vm.validation_status IN ('validated', 'draft')
        AND (vm.search_vector @@ v_tsquery_pt OR coalesce(vm.search_vector_en, ''::tsvector) @@ v_tsquery_en)
        AND (p_domain IS NULL OR vm.domain::TEXT = p_domain)
        AND (p_module_type IS NULL OR vm.module_type::TEXT = p_module_type)
        AND (p_saas_phase IS NULL OR vm.saas_phase = p_saas_phase)
        AND (p_tags IS NULL OR vm.tags && p_tags)
      ORDER BY relevance_score DESC,
        CASE WHEN vm.validation_status = 'validated' THEN 0 ELSE 1 END,
        vm.updated_at DESC
      LIMIT p_limit OFFSET p_offset;
      RETURN;
    END IF;

    RETURN QUERY
    SELECT
      vm.id, vm.slug, vm.title, vm.description,
      vm.domain::TEXT, vm.module_type::TEXT, vm.language,
      vm.saas_phase, vm.phase_title, vm.why_it_matters, vm.usage_hint,
      vm.code, vm.code_example, vm.context_markdown,
      vm.tags, vm.source_project, vm.validation_status::TEXT,
      vm.related_modules, vm.created_at, vm.updated_at,
      0.5::REAL AS relevance_score
    FROM vault_modules vm
    WHERE vm.visibility = 'global'
      AND vm.validation_status IN ('validated', 'draft')
      AND (
        vm.title ILIKE '%' || p_query || '%'
        OR vm.description ILIKE '%' || p_query || '%'
        OR vm.why_it_matters ILIKE '%' || p_query || '%'
        OR vm.usage_hint ILIKE '%' || p_query || '%'
        OR EXISTS (SELECT 1 FROM unnest(vm.tags) t WHERE t ILIKE '%' || p_query || '%')
      )
      AND (p_domain IS NULL OR vm.domain::TEXT = p_domain)
      AND (p_module_type IS NULL OR vm.module_type::TEXT = p_module_type)
      AND (p_saas_phase IS NULL OR vm.saas_phase = p_saas_phase)
      AND (p_tags IS NULL OR vm.tags && p_tags)
    ORDER BY
      CASE WHEN vm.validation_status = 'validated' THEN 0 ELSE 1 END,
      vm.updated_at DESC
    LIMIT p_limit OFFSET p_offset;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    vm.id, vm.slug, vm.title, vm.description,
    vm.domain::TEXT, vm.module_type::TEXT, vm.language,
    vm.saas_phase, vm.phase_title, vm.why_it_matters, vm.usage_hint,
    vm.code, vm.code_example, vm.context_markdown,
    vm.tags, vm.source_project, vm.validation_status::TEXT,
    vm.related_modules, vm.created_at, vm.updated_at,
    1.0::REAL AS relevance_score
  FROM vault_modules vm
  WHERE vm.visibility = 'global'
    AND vm.validation_status IN ('validated', 'draft')
    AND (p_domain IS NULL OR vm.domain::TEXT = p_domain)
    AND (p_module_type IS NULL OR vm.module_type::TEXT = p_module_type)
    AND (p_saas_phase IS NULL OR vm.saas_phase = p_saas_phase)
    AND (p_tags IS NULL OR vm.tags && p_tags)
  ORDER BY
    CASE WHEN vm.validation_status = 'validated' THEN 0 ELSE 1 END,
    vm.updated_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;
