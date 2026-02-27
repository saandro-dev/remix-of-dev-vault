
-- Fix search_path on trigger functions
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
    coalesce(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END;
$function$;

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
    coalesce(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END;
$function$;
