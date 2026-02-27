
-- Fix search_path on sync_user_role_to_metadata to resolve linter warning
CREATE OR REPLACE FUNCTION public.sync_user_role_to_metadata()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('app_role', NEW.role)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$function$;
