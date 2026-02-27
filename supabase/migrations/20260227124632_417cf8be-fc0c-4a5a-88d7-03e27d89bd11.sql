
-- Trigger: sync role changes to auth.users.raw_app_meta_data
-- The function sync_user_role_to_metadata() already exists.
-- We only need the trigger + initial sync.

CREATE TRIGGER trg_sync_user_role_to_metadata
  AFTER INSERT OR UPDATE OF role ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_role_to_metadata();

-- Initial sync: fire trigger for all existing rows
UPDATE public.user_roles SET role = role;
