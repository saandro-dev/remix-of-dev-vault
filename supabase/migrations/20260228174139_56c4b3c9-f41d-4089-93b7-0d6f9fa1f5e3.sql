
-- Phase 3: pgvector + hybrid search
-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Step 2: Add embedding column (nullable for gradual backfill)
ALTER TABLE public.vault_modules
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Step 3: HNSW index for cosine similarity search
CREATE INDEX IF NOT EXISTS idx_vault_modules_embedding
  ON public.vault_modules
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Step 4: Hybrid search RPC combining full-text + vector similarity
CREATE OR REPLACE FUNCTION public.hybrid_search_vault_modules(
  p_query_text TEXT DEFAULT NULL,
  p_query_embedding vector(1536) DEFAULT NULL,
  p_domain TEXT DEFAULT NULL,
  p_module_type TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_match_count INT DEFAULT 10,
  p_full_text_weight FLOAT DEFAULT 0.3,
  p_semantic_weight FLOAT DEFAULT 0.7
)
RETURNS TABLE(
  id UUID,
  slug TEXT,
  title TEXT,
  description TEXT,
  domain TEXT,
  module_type TEXT,
  language TEXT,
  saas_phase INT,
  phase_title TEXT,
  why_it_matters TEXT,
  usage_hint TEXT,
  code TEXT,
  code_example TEXT,
  context_markdown TEXT,
  tags TEXT[],
  source_project TEXT,
  validation_status TEXT,
  related_modules UUID[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  relevance_score REAL,
  difficulty TEXT,
  estimated_minutes INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tsquery_pt TSQUERY;
  v_tsquery_en TSQUERY;
  v_has_text BOOLEAN;
  v_has_embedding BOOLEAN;
BEGIN
  v_has_text := p_query_text IS NOT NULL AND trim(p_query_text) != '';
  v_has_embedding := p_query_embedding IS NOT NULL;

  -- Build tsqueries if text provided
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
    -- Combined score: weighted sum of full-text rank + semantic similarity
    (
      CASE
        -- Both text and embedding available
        WHEN v_has_text AND v_has_embedding THEN
          p_full_text_weight * COALESCE(
            GREATEST(
              ts_rank(vm.search_vector, v_tsquery_pt),
              ts_rank(COALESCE(vm.search_vector_en, ''::tsvector), v_tsquery_en)
            ),
            0
          )
          + p_semantic_weight * COALESCE(
            CASE WHEN vm.embedding IS NOT NULL
              THEN 1.0 - (vm.embedding <=> p_query_embedding)
              ELSE 0
            END,
            0
          )
        -- Only embedding (no text)
        WHEN v_has_embedding AND NOT v_has_text THEN
          CASE WHEN vm.embedding IS NOT NULL
            THEN (1.0 - (vm.embedding <=> p_query_embedding))::FLOAT
            ELSE 0
          END
        -- Only text (no embedding)
        WHEN v_has_text AND NOT v_has_embedding THEN
          GREATEST(
            ts_rank(vm.search_vector, v_tsquery_pt),
            ts_rank(COALESCE(vm.search_vector_en, ''::tsvector), v_tsquery_en)
          )::FLOAT
        -- Neither (list mode)
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
    -- Filter: require at least one search signal to match
    AND (
      -- If no search criteria, return all (list mode)
      (NOT v_has_text AND NOT v_has_embedding)
      -- Text match via tsvector or ILIKE fallback
      OR (v_has_text AND (
        vm.search_vector @@ v_tsquery_pt
        OR COALESCE(vm.search_vector_en, ''::tsvector) @@ v_tsquery_en
        OR vm.title ILIKE '%' || p_query_text || '%'
        OR vm.description ILIKE '%' || p_query_text || '%'
        OR vm.why_it_matters ILIKE '%' || p_query_text || '%'
        OR vm.usage_hint ILIKE '%' || p_query_text || '%'
        OR EXISTS (SELECT 1 FROM unnest(vm.solves_problems) sp WHERE sp ILIKE '%' || p_query_text || '%')
      ))
      -- Semantic match (cosine distance < 0.5 threshold)
      OR (v_has_embedding AND vm.embedding IS NOT NULL AND (vm.embedding <=> p_query_embedding) < 0.5)
    )
  ORDER BY
    relevance_score DESC,
    CASE WHEN vm.validation_status = 'validated' THEN 0 ELSE 1 END,
    vm.updated_at DESC
  LIMIT p_match_count;
END;
$function$;
