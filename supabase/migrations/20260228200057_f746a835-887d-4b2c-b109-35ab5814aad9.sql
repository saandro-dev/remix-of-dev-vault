DROP FUNCTION IF EXISTS public.search_vault_modules(uuid,text,vault_domain,vault_module_type,integer,text,boolean,integer,integer);

CREATE OR REPLACE FUNCTION public.search_vault_modules(
  p_user_id uuid,
  p_query text DEFAULT NULL,
  p_domain vault_domain DEFAULT NULL,
  p_module_type vault_module_type DEFAULT NULL,
  p_saas_phase integer DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_validated boolean DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, title text, description text, domain vault_domain,
  module_type vault_module_type, language text, tags text[],
  saas_phase integer, phase_title text, why_it_matters text,
  code_example text, source_project text,
  validation_status vault_validation_status,
  related_modules uuid[], created_at timestamptz, updated_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    vm.id, vm.title, vm.description, vm.domain, vm.module_type,
    vm.language, vm.tags, vm.saas_phase, vm.phase_title,
    vm.why_it_matters, vm.code_example, vm.source_project,
    vm.validation_status, vm.related_modules, vm.created_at, vm.updated_at,
    COUNT(*) OVER()::BIGINT AS total_count
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