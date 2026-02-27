
-- =============================================================================
-- DevVault: 3-Layer Visibility System (Atomic Migration)
-- Replaces boolean is_public with enum visibility_level (private|shared|global)
-- Creates vault_module_shares table for user-to-user sharing
-- Recreates all dependent SQL functions
-- =============================================================================

-- 1. Create visibility_level enum
CREATE TYPE public.visibility_level AS ENUM ('private', 'shared', 'global');

-- 2. Add visibility column with default
ALTER TABLE public.vault_modules
  ADD COLUMN visibility public.visibility_level NOT NULL DEFAULT 'private';

-- 3. Migrate existing data
UPDATE public.vault_modules SET visibility = 'global' WHERE is_public = true;

-- 4. Create vault_module_shares table
CREATE TABLE public.vault_module_shares (
  module_id UUID NOT NULL REFERENCES public.vault_modules(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL,
  shared_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (module_id, shared_with_user_id)
);

CREATE INDEX idx_vault_module_shares_recipient ON public.vault_module_shares(shared_with_user_id);
CREATE INDEX idx_vault_module_shares_module ON public.vault_module_shares(module_id);

-- 5. RLS for vault_module_shares
ALTER TABLE public.vault_module_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on vault_module_shares"
  ON public.vault_module_shares FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Module owners can manage shares"
  ON public.vault_module_shares FOR ALL
  TO authenticated
  USING (shared_by_user_id = auth.uid())
  WITH CHECK (shared_by_user_id = auth.uid());

CREATE POLICY "Recipients can view their shares"
  ON public.vault_module_shares FOR SELECT
  TO authenticated
  USING (shared_with_user_id = auth.uid());

-- 6. Update RLS on vault_modules for visibility
DROP POLICY IF EXISTS "Anyone can view public vault modules" ON public.vault_modules;

CREATE POLICY "Users can view global vault modules"
  ON public.vault_modules FOR SELECT
  USING (visibility = 'global');

CREATE POLICY "Users can view shared vault modules"
  ON public.vault_modules FOR SELECT
  TO authenticated
  USING (
    visibility = 'shared'
    AND EXISTS (
      SELECT 1 FROM public.vault_module_shares vms
      WHERE vms.module_id = vault_modules.id
        AND vms.shared_with_user_id = auth.uid()
    )
  );

-- 7. Replace visibility index
DROP INDEX IF EXISTS idx_vault_modules_is_public;
CREATE INDEX idx_vault_modules_visibility ON public.vault_modules(visibility);

-- 8. Recreate bootstrap_vault_context (replace is_public with visibility)
CREATE OR REPLACE FUNCTION public.bootstrap_vault_context()
  RETURNS json
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
        WHERE vm.visibility = 'global'
          AND vm.validation_status IN ('validated', 'draft')
        GROUP BY vm.domain
        ORDER BY COUNT(*) DESC
      ) d
    ),
    'playbook_phases', (
      SELECT coalesce(json_agg(p ORDER BY p.saas_phase), '[]'::json)
      FROM (
        SELECT
          vm.id, vm.slug, vm.title, vm.description,
          vm.saas_phase, vm.phase_title, vm.why_it_matters,
          vm.tags, vm.validation_status::TEXT AS validation_status
        FROM vault_modules vm
        WHERE vm.visibility = 'global'
          AND vm.module_type = 'playbook_phase'
          AND vm.validation_status IN ('validated', 'draft')
      ) p
    ),
    'top_modules', (
      SELECT coalesce(json_agg(m), '[]'::json)
      FROM (
        SELECT
          vm.id, vm.slug, vm.title, vm.description,
          vm.domain::TEXT AS domain, vm.module_type::TEXT AS module_type,
          vm.language, vm.tags,
          vm.validation_status::TEXT AS validation_status, vm.updated_at
        FROM vault_modules vm
        WHERE vm.visibility = 'global'
          AND vm.validation_status = 'validated'
        ORDER BY vm.updated_at DESC
        LIMIT 20
      ) m
    )
  ) INTO v_result;
  RETURN v_result;
END;
$function$;

-- 9. Recreate list_vault_domains
CREATE OR REPLACE FUNCTION public.list_vault_domains()
  RETURNS TABLE(domain text, total bigint, module_types text[])
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    vm.domain::TEXT,
    COUNT(*)::BIGINT AS total,
    array_agg(DISTINCT vm.module_type::TEXT) AS module_types
  FROM vault_modules vm
  WHERE vm.visibility = 'global'
    AND vm.validation_status IN ('validated', 'draft')
  GROUP BY vm.domain
  ORDER BY COUNT(*) DESC;
END;
$function$;

-- 10. Recreate get_vault_module
CREATE OR REPLACE FUNCTION public.get_vault_module(p_id uuid DEFAULT NULL, p_slug text DEFAULT NULL)
  RETURNS TABLE(
    id uuid, slug text, title text, description text, domain text,
    module_type text, language text, saas_phase integer, phase_title text,
    why_it_matters text, code text, code_example text, context_markdown text,
    tags text[], source_project text, validation_status text,
    related_modules uuid[], created_at timestamptz, updated_at timestamptz
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    vm.id, vm.slug, vm.title, vm.description,
    vm.domain::TEXT, vm.module_type::TEXT, vm.language,
    vm.saas_phase, vm.phase_title, vm.why_it_matters,
    vm.code, vm.code_example, vm.context_markdown,
    vm.tags, vm.source_project, vm.validation_status::TEXT,
    vm.related_modules, vm.created_at, vm.updated_at
  FROM vault_modules vm
  WHERE
    vm.visibility = 'global'
    AND (
      (p_id IS NOT NULL AND vm.id = p_id)
      OR (p_slug IS NOT NULL AND lower(vm.slug) = lower(p_slug))
    )
  LIMIT 1;
END;
$function$;

-- 11. Recreate query_vault_modules
CREATE OR REPLACE FUNCTION public.query_vault_modules(
  p_query text DEFAULT NULL, p_domain text DEFAULT NULL,
  p_module_type text DEFAULT NULL, p_tags text[] DEFAULT NULL,
  p_saas_phase integer DEFAULT NULL,
  p_limit integer DEFAULT 10, p_offset integer DEFAULT 0
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
    vm.visibility = 'global'
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

-- 12. Recreate search_vault_modules
CREATE OR REPLACE FUNCTION public.search_vault_modules(
  p_user_id uuid,
  p_query text DEFAULT NULL, p_domain vault_domain DEFAULT NULL,
  p_module_type vault_module_type DEFAULT NULL,
  p_saas_phase integer DEFAULT NULL, p_source text DEFAULT NULL,
  p_validated boolean DEFAULT NULL,
  p_limit integer DEFAULT 20, p_offset integer DEFAULT 0
)
  RETURNS TABLE(
    id uuid, title text, description text, domain vault_domain,
    module_type vault_module_type, language text, tags text[],
    saas_phase integer, phase_title text, why_it_matters text,
    code_example text, source_project text,
    validation_status vault_validation_status,
    related_modules uuid[], created_at timestamptz, updated_at timestamptz
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    vm.id, vm.title, vm.description, vm.domain, vm.module_type,
    vm.language, vm.tags, vm.saas_phase, vm.phase_title,
    vm.why_it_matters, vm.code_example, vm.source_project,
    vm.validation_status, vm.related_modules, vm.created_at, vm.updated_at
  FROM public.vault_modules vm
  WHERE
    (
      vm.user_id = p_user_id
      OR vm.visibility = 'global'
      OR (vm.visibility = 'shared' AND EXISTS (
        SELECT 1 FROM public.vault_module_shares vms
        WHERE vms.module_id = vm.id AND vms.shared_with_user_id = p_user_id
      ))
    )
    AND (p_query IS NULL OR vm.title ILIKE '%' || p_query || '%' OR vm.description ILIKE '%' || p_query || '%' OR vm.why_it_matters ILIKE '%' || p_query || '%' OR EXISTS (SELECT 1 FROM unnest(vm.tags) t WHERE t ILIKE '%' || p_query || '%'))
    AND (p_domain IS NULL OR vm.domain = p_domain)
    AND (p_module_type IS NULL OR vm.module_type = p_module_type)
    AND (p_saas_phase IS NULL OR vm.saas_phase = p_saas_phase)
    AND (p_source IS NULL OR vm.source_project = p_source)
    AND (p_validated IS NULL OR (p_validated = true AND vm.validation_status = 'validated') OR (p_validated = false AND vm.validation_status != 'validated'))
  ORDER BY
    CASE vm.validation_status WHEN 'validated' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
    vm.saas_phase NULLS LAST,
    vm.updated_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- 13. Create new RPC: get_visible_modules with scope parameter
CREATE OR REPLACE FUNCTION public.get_visible_modules(
  p_user_id uuid,
  p_scope text DEFAULT 'owned',
  p_domain text DEFAULT NULL,
  p_module_type text DEFAULT NULL,
  p_query text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
  RETURNS TABLE(
    id uuid, title text, description text, domain text,
    module_type text, language text, tags text[],
    saas_phase integer, phase_title text, why_it_matters text,
    code_example text, source_project text, validation_status text,
    visibility text, related_modules uuid[],
    created_at timestamptz, updated_at timestamptz
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    vm.id, vm.title, vm.description,
    vm.domain::TEXT, vm.module_type::TEXT, vm.language,
    vm.tags, vm.saas_phase, vm.phase_title,
    vm.why_it_matters, vm.code_example, vm.source_project,
    vm.validation_status::TEXT, vm.visibility::TEXT,
    vm.related_modules, vm.created_at, vm.updated_at
  FROM public.vault_modules vm
  WHERE
    CASE p_scope
      WHEN 'owned' THEN vm.user_id = p_user_id
      WHEN 'shared_with_me' THEN
        vm.visibility = 'shared'
        AND EXISTS (
          SELECT 1 FROM public.vault_module_shares vms
          WHERE vms.module_id = vm.id AND vms.shared_with_user_id = p_user_id
        )
      WHEN 'global' THEN vm.visibility = 'global'
      WHEN 'all' THEN
        vm.user_id = p_user_id
        OR vm.visibility = 'global'
        OR (vm.visibility = 'shared' AND EXISTS (
          SELECT 1 FROM public.vault_module_shares vms
          WHERE vms.module_id = vm.id AND vms.shared_with_user_id = p_user_id
        ))
      ELSE vm.user_id = p_user_id
    END
    AND (p_domain IS NULL OR vm.domain::TEXT = p_domain)
    AND (p_module_type IS NULL OR vm.module_type::TEXT = p_module_type)
    AND (p_query IS NULL OR vm.title ILIKE '%' || p_query || '%' OR vm.description ILIKE '%' || p_query || '%')
  ORDER BY
    CASE vm.validation_status WHEN 'validated' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
    vm.saas_phase NULLS LAST,
    vm.updated_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- 14. Drop is_public column (all dependencies updated above)
ALTER TABLE public.vault_modules DROP COLUMN is_public;
