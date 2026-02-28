
-- Drop and recreate get_vault_module with ai_metadata
DROP FUNCTION IF EXISTS public.get_vault_module(uuid, text);

CREATE FUNCTION public.get_vault_module(p_id uuid DEFAULT NULL::uuid, p_slug text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, slug text, title text, description text, domain text, module_type text, language text, saas_phase integer, phase_title text, why_it_matters text, usage_hint text, code text, code_example text, context_markdown text, database_schema text, tags text[], source_project text, validation_status text, related_modules uuid[], created_at timestamp with time zone, updated_at timestamp with time zone, prerequisites jsonb[], common_errors jsonb, solves_problems text[], test_code text, difficulty text, estimated_minutes integer, ai_metadata jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vm.id, vm.slug, vm.title, vm.description,
    vm.domain::TEXT, vm.module_type::TEXT, vm.language,
    vm.saas_phase, vm.phase_title, vm.why_it_matters,
    vm.usage_hint, vm.code, vm.code_example, vm.context_markdown,
    vm.database_schema,
    vm.tags, vm.source_project, vm.validation_status::TEXT,
    vm.related_modules, vm.created_at, vm.updated_at,
    vm.prerequisites, vm.common_errors, vm.solves_problems,
    vm.test_code, vm.difficulty, vm.estimated_minutes,
    vm.ai_metadata
  FROM vault_modules vm
  WHERE vm.visibility = 'global'
    AND ((p_id IS NOT NULL AND vm.id = p_id) OR (p_slug IS NOT NULL AND lower(vm.slug) = lower(p_slug)))
  LIMIT 1;
END;
$$;
