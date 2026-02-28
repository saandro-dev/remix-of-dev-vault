CREATE OR REPLACE FUNCTION public.vault_module_completeness(p_id uuid)
 RETURNS TABLE(score integer, missing_fields text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

  -- Bonus fields (4 total)
  IF v_mod.common_errors IS NOT NULL AND v_mod.common_errors::text != '[]' AND v_mod.common_errors::text != 'null' THEN
    v_filled := v_filled + 1;
  ELSE v_missing := array_append(v_missing, 'common_errors'); END IF;
  IF v_mod.test_code IS NOT NULL AND trim(v_mod.test_code) != '' THEN v_filled := v_filled + 1;
  ELSE v_missing := array_append(v_missing, 'test_code'); END IF;
  IF v_mod.solves_problems IS NOT NULL AND array_length(v_mod.solves_problems, 1) > 0 THEN v_filled := v_filled + 1;
  ELSE v_missing := array_append(v_missing, 'solves_problems'); END IF;
  IF v_mod.database_schema IS NOT NULL AND trim(v_mod.database_schema) != '' THEN v_filled := v_filled + 1;
  ELSE v_missing := array_append(v_missing, 'database_schema'); END IF;

  score := (v_filled * 100) / v_total;
  missing_fields := v_missing;
  RETURN NEXT;
END;
$function$;