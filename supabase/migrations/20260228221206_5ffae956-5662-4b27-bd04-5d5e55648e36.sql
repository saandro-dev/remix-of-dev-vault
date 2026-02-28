
-- Migration 1: Expand tsvector triggers to include code, code_example, module_group, usage_hint

-- Recreate PT trigger function with expanded fields
CREATE OR REPLACE FUNCTION public.update_vault_module_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_vector := to_tsvector('portuguese',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.why_it_matters, '') || ' ' ||
    coalesce(NEW.context_markdown, '') || ' ' ||
    coalesce(NEW.phase_title, '') || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.solves_problems, ' '), '') || ' ' ||
    coalesce(NEW.code, '') || ' ' ||
    coalesce(NEW.code_example, '') || ' ' ||
    coalesce(NEW.module_group, '') || ' ' ||
    coalesce(NEW.usage_hint, '')
  );
  RETURN NEW;
END;
$function$;

-- Recreate EN trigger function with expanded fields
CREATE OR REPLACE FUNCTION public.update_vault_module_search_vector_en()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_vector_en := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.why_it_matters, '') || ' ' ||
    coalesce(NEW.context_markdown, '') || ' ' ||
    coalesce(NEW.phase_title, '') || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.solves_problems, ' '), '') || ' ' ||
    coalesce(NEW.code, '') || ' ' ||
    coalesce(NEW.code_example, '') || ' ' ||
    coalesce(NEW.module_group, '') || ' ' ||
    coalesce(NEW.usage_hint, '')
  );
  RETURN NEW;
END;
$function$;

-- Backfill: trigger re-indexation for all existing modules
UPDATE vault_modules SET updated_at = updated_at;
