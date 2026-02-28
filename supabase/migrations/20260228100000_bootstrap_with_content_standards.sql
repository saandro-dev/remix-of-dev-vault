-- Migration: Update bootstrap_vault_context to include content standards guide
-- This ensures every AI agent receives the content standards on first call,
-- before adding any content to the vault.

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
    -- Content standards guide: always returned so agents know the rules
    'content_standards', (
      SELECT json_build_object(
        'id', vm.id,
        'slug', vm.slug,
        'title', vm.title,
        'description', vm.description,
        'context_markdown', vm.context_markdown,
        'why_it_matters', vm.why_it_matters,
        'usage_hint', vm.usage_hint
      )
      FROM vault_modules vm
      WHERE vm.slug = 'devvault-content-standards'
        AND vm.visibility = 'global'
      LIMIT 1
    ),
    -- Domains summary: what knowledge areas exist and how many modules each has
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
    -- SaaS Playbook phases in order
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
    -- Top 20 most recently updated validated modules
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
          AND vm.slug != 'devvault-content-standards'
        ORDER BY vm.updated_at DESC
        LIMIT 20
      ) m
    )
  ) INTO v_result;
  RETURN v_result;
END;
$function$;

-- Grant execution to all roles (same as before)
GRANT EXECUTE ON FUNCTION public.bootstrap_vault_context() TO anon, authenticated, service_role;
