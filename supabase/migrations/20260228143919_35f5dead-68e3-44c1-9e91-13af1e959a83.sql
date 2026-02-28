
-- Drop existing functions that need return type changes
DROP FUNCTION IF EXISTS public.get_vault_module(uuid, text);
DROP FUNCTION IF EXISTS public.query_vault_modules(text, text, text, text[], integer, integer, integer);
DROP FUNCTION IF EXISTS public.vault_module_completeness(uuid);

-- =============================================================================
-- Fase 1: Schema — New columns + changelog table (IF NOT EXISTS = safe re-run)
-- =============================================================================

ALTER TABLE vault_modules
  ADD COLUMN IF NOT EXISTS common_errors jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS solves_problems text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS test_code text,
  ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'intermediate',
  ADD COLUMN IF NOT EXISTS estimated_minutes integer;

CREATE TABLE IF NOT EXISTS vault_module_changelog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES vault_modules(id) ON DELETE CASCADE,
  version text NOT NULL,
  changes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vault_module_changelog ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on vault_module_changelog') THEN
    CREATE POLICY "Service role full access on vault_module_changelog"
      ON vault_module_changelog FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view changelog for accessible modules') THEN
    CREATE POLICY "Users can view changelog for accessible modules"
      ON vault_module_changelog FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM vault_modules vm
          WHERE vm.id = vault_module_changelog.module_id
            AND (vm.user_id = auth.uid() OR vm.visibility = 'global'
              OR (vm.visibility = 'shared' AND EXISTS (
                SELECT 1 FROM vault_module_shares vms
                WHERE vms.module_id = vm.id AND vms.shared_with_user_id = auth.uid()
              )))
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert changelog on own modules') THEN
    CREATE POLICY "Users can insert changelog on own modules"
      ON vault_module_changelog FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM vault_modules vm
          WHERE vm.id = vault_module_changelog.module_id AND vm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- =============================================================================
-- Fase 2: Recreate functions with new signatures
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_vault_module(
  p_id uuid DEFAULT NULL, p_slug text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, slug text, title text, description text,
  domain text, module_type text, language text,
  saas_phase integer, phase_title text, why_it_matters text,
  usage_hint text, code text, code_example text, context_markdown text,
  tags text[], source_project text, validation_status text,
  related_modules uuid[], created_at timestamptz, updated_at timestamptz,
  prerequisites jsonb[], common_errors jsonb, solves_problems text[],
  test_code text, difficulty text, estimated_minutes integer
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    vm.id, vm.slug, vm.title, vm.description,
    vm.domain::TEXT, vm.module_type::TEXT, vm.language,
    vm.saas_phase, vm.phase_title, vm.why_it_matters,
    vm.usage_hint, vm.code, vm.code_example, vm.context_markdown,
    vm.tags, vm.source_project, vm.validation_status::TEXT,
    vm.related_modules, vm.created_at, vm.updated_at,
    vm.prerequisites, vm.common_errors, vm.solves_problems,
    vm.test_code, vm.difficulty, vm.estimated_minutes
  FROM vault_modules vm
  WHERE vm.visibility = 'global'
    AND ((p_id IS NOT NULL AND vm.id = p_id) OR (p_slug IS NOT NULL AND lower(vm.slug) = lower(p_slug)))
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.query_vault_modules(
  p_query text DEFAULT NULL, p_domain text DEFAULT NULL,
  p_module_type text DEFAULT NULL, p_tags text[] DEFAULT NULL,
  p_saas_phase integer DEFAULT NULL, p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, slug text, title text, description text,
  domain text, module_type text, language text,
  saas_phase integer, phase_title text, why_it_matters text,
  usage_hint text, code text, code_example text, context_markdown text,
  tags text[], source_project text, validation_status text,
  related_modules uuid[], created_at timestamptz, updated_at timestamptz,
  relevance_score real, difficulty text, estimated_minutes integer
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_tsquery_pt TSQUERY; v_tsquery_en TSQUERY;
  v_has_query BOOLEAN; v_ts_count INT;
BEGIN
  v_has_query := p_query IS NOT NULL AND trim(p_query) != '';
  IF v_has_query THEN
    v_tsquery_pt := plainto_tsquery('portuguese', p_query);
    v_tsquery_en := plainto_tsquery('english', p_query);
  END IF;

  IF v_has_query THEN
    SELECT COUNT(*) INTO v_ts_count
    FROM vault_modules vm2
    WHERE vm2.visibility = 'global' AND vm2.validation_status IN ('validated', 'draft')
      AND (vm2.search_vector @@ v_tsquery_pt OR coalesce(vm2.search_vector_en, ''::tsvector) @@ v_tsquery_en)
      AND (p_domain IS NULL OR vm2.domain::TEXT = p_domain)
      AND (p_module_type IS NULL OR vm2.module_type::TEXT = p_module_type)
      AND (p_saas_phase IS NULL OR vm2.saas_phase = p_saas_phase)
      AND (p_tags IS NULL OR vm2.tags && p_tags);

    IF v_ts_count > 0 THEN
      RETURN QUERY
      SELECT vm.id, vm.slug, vm.title, vm.description,
        vm.domain::TEXT, vm.module_type::TEXT, vm.language,
        vm.saas_phase, vm.phase_title, vm.why_it_matters, vm.usage_hint,
        vm.code, vm.code_example, vm.context_markdown,
        vm.tags, vm.source_project, vm.validation_status::TEXT,
        vm.related_modules, vm.created_at, vm.updated_at,
        GREATEST(ts_rank(vm.search_vector, v_tsquery_pt), ts_rank(coalesce(vm.search_vector_en, ''::tsvector), v_tsquery_en))::REAL,
        vm.difficulty, vm.estimated_minutes
      FROM vault_modules vm
      WHERE vm.visibility = 'global' AND vm.validation_status IN ('validated', 'draft')
        AND (vm.search_vector @@ v_tsquery_pt OR coalesce(vm.search_vector_en, ''::tsvector) @@ v_tsquery_en)
        AND (p_domain IS NULL OR vm.domain::TEXT = p_domain)
        AND (p_module_type IS NULL OR vm.module_type::TEXT = p_module_type)
        AND (p_saas_phase IS NULL OR vm.saas_phase = p_saas_phase)
        AND (p_tags IS NULL OR vm.tags && p_tags)
      ORDER BY GREATEST(ts_rank(vm.search_vector, v_tsquery_pt), ts_rank(coalesce(vm.search_vector_en, ''::tsvector), v_tsquery_en)) DESC,
        CASE WHEN vm.validation_status = 'validated' THEN 0 ELSE 1 END, vm.updated_at DESC
      LIMIT p_limit OFFSET p_offset;
      RETURN;
    END IF;

    RETURN QUERY
    SELECT vm.id, vm.slug, vm.title, vm.description,
      vm.domain::TEXT, vm.module_type::TEXT, vm.language,
      vm.saas_phase, vm.phase_title, vm.why_it_matters, vm.usage_hint,
      vm.code, vm.code_example, vm.context_markdown,
      vm.tags, vm.source_project, vm.validation_status::TEXT,
      vm.related_modules, vm.created_at, vm.updated_at,
      0.5::REAL, vm.difficulty, vm.estimated_minutes
    FROM vault_modules vm
    WHERE vm.visibility = 'global' AND vm.validation_status IN ('validated', 'draft')
      AND (vm.title ILIKE '%' || p_query || '%' OR vm.description ILIKE '%' || p_query || '%'
        OR vm.why_it_matters ILIKE '%' || p_query || '%' OR vm.usage_hint ILIKE '%' || p_query || '%'
        OR EXISTS (SELECT 1 FROM unnest(vm.tags) t WHERE t ILIKE '%' || p_query || '%')
        OR EXISTS (SELECT 1 FROM unnest(vm.solves_problems) sp WHERE sp ILIKE '%' || p_query || '%'))
      AND (p_domain IS NULL OR vm.domain::TEXT = p_domain)
      AND (p_module_type IS NULL OR vm.module_type::TEXT = p_module_type)
      AND (p_saas_phase IS NULL OR vm.saas_phase = p_saas_phase)
      AND (p_tags IS NULL OR vm.tags && p_tags)
    ORDER BY CASE WHEN vm.validation_status = 'validated' THEN 0 ELSE 1 END, vm.updated_at DESC
    LIMIT p_limit OFFSET p_offset;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT vm.id, vm.slug, vm.title, vm.description,
    vm.domain::TEXT, vm.module_type::TEXT, vm.language,
    vm.saas_phase, vm.phase_title, vm.why_it_matters, vm.usage_hint,
    vm.code, vm.code_example, vm.context_markdown,
    vm.tags, vm.source_project, vm.validation_status::TEXT,
    vm.related_modules, vm.created_at, vm.updated_at,
    1.0::REAL, vm.difficulty, vm.estimated_minutes
  FROM vault_modules vm
  WHERE vm.visibility = 'global' AND vm.validation_status IN ('validated', 'draft')
    AND (p_domain IS NULL OR vm.domain::TEXT = p_domain)
    AND (p_module_type IS NULL OR vm.module_type::TEXT = p_module_type)
    AND (p_saas_phase IS NULL OR vm.saas_phase = p_saas_phase)
    AND (p_tags IS NULL OR vm.tags && p_tags)
  ORDER BY CASE WHEN vm.validation_status = 'validated' THEN 0 ELSE 1 END, vm.updated_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.vault_module_completeness(p_id uuid)
RETURNS TABLE(score integer, missing_fields text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_mod RECORD; v_missing TEXT[] := '{}';
  v_total INT; v_filled INT := 0;
  v_has_deps BOOLEAN; v_is_grouped BOOLEAN; v_is_root BOOLEAN;
BEGIN
  SELECT * INTO v_mod FROM vault_modules WHERE vault_modules.id = p_id;
  IF NOT FOUND THEN
    score := 0; missing_fields := ARRAY['module_not_found'];
    RETURN NEXT; RETURN;
  END IF;

  v_is_grouped := (v_mod.module_group IS NOT NULL AND trim(v_mod.module_group) != '');
  v_is_root := v_is_grouped AND (v_mod.implementation_order IS NOT NULL AND v_mod.implementation_order = 1);

  IF v_is_grouped AND NOT v_is_root THEN v_total := 13; ELSE v_total := 12; END IF;

  IF v_mod.title IS NOT NULL AND trim(v_mod.title) != '' THEN v_filled := v_filled + 1;
  ELSE v_missing := array_append(v_missing, 'title'); END IF;
  IF v_mod.description IS NOT NULL AND trim(v_mod.description) != '' THEN v_filled := v_filled + 1;
  ELSE v_missing := array_append(v_missing, 'description'); END IF;
  IF v_mod.why_it_matters IS NOT NULL AND trim(v_mod.why_it_matters) != '' THEN v_filled := v_filled + 1;
  ELSE v_missing := array_append(v_missing, 'why_it_matters'); END IF;
  IF v_mod.code IS NOT NULL AND trim(v_mod.code) != '' THEN v_filled := v_filled + 1;
  ELSE v_missing := array_append(v_missing, 'code'); END IF;
  IF v_mod.code_example IS NOT NULL AND trim(v_mod.code_example) != '' THEN v_filled := v_filled + 1;
  ELSE v_missing := array_append(v_missing, 'code_example'); END IF;
  IF v_mod.context_markdown IS NOT NULL AND trim(v_mod.context_markdown) != '' THEN v_filled := v_filled + 1;
  ELSE v_missing := array_append(v_missing, 'context_markdown'); END IF;
  IF v_mod.tags IS NOT NULL AND array_length(v_mod.tags, 1) > 0 THEN v_filled := v_filled + 1;
  ELSE v_missing := array_append(v_missing, 'tags'); END IF;
  IF v_mod.slug IS NOT NULL AND trim(v_mod.slug) != '' THEN v_filled := v_filled + 1;
  ELSE v_missing := array_append(v_missing, 'slug'); END IF;
  IF v_mod.domain IS NOT NULL THEN v_filled := v_filled + 1;
  ELSE v_missing := array_append(v_missing, 'domain'); END IF;

  IF v_is_grouped AND NOT v_is_root THEN
    SELECT EXISTS(SELECT 1 FROM vault_module_dependencies WHERE module_id = p_id) INTO v_has_deps;
    IF v_has_deps THEN v_filled := v_filled + 1;
    ELSE v_missing := array_append(v_missing, 'dependencies'); END IF;
  END IF;

  -- Bonus fields
  IF v_mod.common_errors IS NOT NULL AND v_mod.common_errors::text != '[]' AND v_mod.common_errors::text != 'null' THEN
    v_filled := v_filled + 1;
  ELSE v_missing := array_append(v_missing, 'common_errors'); END IF;
  IF v_mod.test_code IS NOT NULL AND trim(v_mod.test_code) != '' THEN v_filled := v_filled + 1;
  ELSE v_missing := array_append(v_missing, 'test_code'); END IF;
  IF v_mod.solves_problems IS NOT NULL AND array_length(v_mod.solves_problems, 1) > 0 THEN v_filled := v_filled + 1;
  ELSE v_missing := array_append(v_missing, 'solves_problems'); END IF;

  score := (v_filled * 100) / v_total;
  missing_fields := v_missing;
  RETURN NEXT;
END;
$function$;

-- Update search vector triggers to index solves_problems
CREATE OR REPLACE FUNCTION public.update_vault_module_search_vector_en()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_vector_en := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.why_it_matters, '') || ' ' || coalesce(NEW.context_markdown, '') || ' ' ||
    coalesce(NEW.phase_title, '') || ' ' || coalesce(array_to_string(NEW.tags, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.solves_problems, ' '), '')
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_vault_module_search_vector()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_vector := to_tsvector('portuguese',
    coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.why_it_matters, '') || ' ' || coalesce(NEW.context_markdown, '') || ' ' ||
    coalesce(NEW.phase_title, '') || ' ' || coalesce(array_to_string(NEW.tags, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.solves_problems, ' '), '')
  );
  RETURN NEW;
END;
$function$;
