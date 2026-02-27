CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
  RETURNS uuid
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT id FROM auth.users WHERE email = lower(p_email) LIMIT 1;
$$;