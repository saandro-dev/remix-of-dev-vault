
-- Fase 1a: Drop the old query_vault_modules WITHOUT p_group to eliminate signature conflict
DROP FUNCTION IF EXISTS public.query_vault_modules(text, text, text, text[], integer, integer, integer);

-- Fase 1b: Replace hybrid_search_vault_modules to accept p_query_embedding as TEXT instead of extensions.vector
CREATE OR REPLACE FUNCTION public.hybrid_search_vault_modules(
  p_query_text text DEFAULT NULL,
  p_query_embedding text DEFAULT NULL,
  p_domain text DEFAULT NULL,
  p_module_type text DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  p_match_count integer DEFAULT 10,
  p_full_text_weight double precision DEFAULT 0.3,
  p_semantic_weight double precision DEFAULT 0.7
)
RETURNS TABLE(
  id uuid, slug text, title text, description text, domain text,
  module_type text, language text, saas_phase integer, phase_title text,
  why_it_matters text, usage_hint text, code text, code_example text,
  context_markdown text, tags text[], source_project text,
  validation_status text, related_modules uuid[],
  created_at timestamptz, updated_at timestamptz,
  relevance_score real, difficulty text, estimated_minutes integer
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_tsquery_pt TSQUERY;
  v_tsquery_en TSQUERY;
  v_has_text BOOLEAN;
  v_has_embedding BOOLEAN;
  v_embedding extensions.vector;
BEGIN
  v_has_text := p_query_text IS NOT NULL AND trim(p_query_text) != '';
  v_has_embedding := p_query_embedding IS NOT NULL AND trim(p_query_embedding) != '';

  -- Cast text to vector once
  IF v_has_embedding THEN
    v_embedding := p_query_embedding::extensions.vector;
  END IF;

  IF v_has_text THEN
    v_tsquery_pt := plainto_tsquery('portuguese', p_query_text);
    v_tsquery_en := plainto_tsquery('english', p_query_text);
  END IF;

  RETURN QUERY
  SELECT
    vm.id, vm.slug, vm.title, vm.description,
    vm.domain::TEXT, vm.module_type::TEXT, vm.language,
    vm.saas_phase, vm.phase_title, vm.why_it_matters, vm.usage_hint,
    vm.code, vm.code_example, vm.context_markdown,
    vm.tags, vm.source_project, vm.validation_status::TEXT,
    vm.related_modules, vm.created_at, vm.updated_at,
    (
      CASE
        WHEN v_has_text AND v_has_embedding THEN
          p_full_text_weight * COALESCE(
            GREATEST(
              ts_rank(vm.search_vector, v_tsquery_pt),
              ts_rank(COALESCE(vm.search_vector_en, ''::tsvector), v_tsquery_en)
            ), 0
          )
          + p_semantic_weight * COALESCE(
            CASE WHEN vm.embedding IS NOT NULL
              THEN 1.0 - (vm.embedding <=> v_embedding)
              ELSE 0
            END, 0
          )
        WHEN v_has_embedding AND NOT v_has_text THEN
          CASE WHEN vm.embedding IS NOT NULL
            THEN (1.0 - (vm.embedding <=> v_embedding))::FLOAT
            ELSE 0
          END
        WHEN v_has_text AND NOT v_has_embedding THEN
          GREATEST(
            ts_rank(vm.search_vector, v_tsquery_pt),
            ts_rank(COALESCE(vm.search_vector_en, ''::tsvector), v_tsquery_en)
          )::FLOAT
        ELSE 1.0
      END
    )::REAL AS relevance_score,
    vm.difficulty, vm.estimated_minutes
  FROM vault_modules vm
  WHERE vm.visibility = 'global'
    AND vm.validation_status IN ('validated', 'draft')
    AND (p_domain IS NULL OR vm.domain::TEXT = p_domain)
    AND (p_module_type IS NULL OR vm.module_type::TEXT = p_module_type)
    AND (p_tags IS NULL OR vm.tags && p_tags)
    AND (
      (NOT v_has_text AND NOT v_has_embedding)
      OR (v_has_text AND (
        vm.search_vector @@ v_tsquery_pt
        OR COALESCE(vm.search_vector_en, ''::tsvector) @@ v_tsquery_en
        OR vm.title ILIKE '%' || p_query_text || '%'
        OR vm.description ILIKE '%' || p_query_text || '%'
        OR vm.why_it_matters ILIKE '%' || p_query_text || '%'
        OR vm.usage_hint ILIKE '%' || p_query_text || '%'
        OR EXISTS (SELECT 1 FROM unnest(vm.solves_problems) sp WHERE sp ILIKE '%' || p_query_text || '%')
      ))
      OR (v_has_embedding AND vm.embedding IS NOT NULL AND (vm.embedding <=> v_embedding) < 0.5)
    )
  ORDER BY
    relevance_score DESC,
    CASE WHEN vm.validation_status = 'validated' THEN 0 ELSE 1 END,
    vm.updated_at DESC
  LIMIT p_match_count;
END;
$function$;
