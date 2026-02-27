
-- Stage 1b: Helper functions + RLS policies for RBAC

-- is_admin_or_owner() — checks if user has admin OR owner role
CREATE OR REPLACE FUNCTION public.is_admin_or_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'owner')
  )
$$;

-- get_user_role() — returns highest priority role or 'user' as fallback
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT role::text
      FROM public.user_roles
      WHERE user_id = _user_id
      ORDER BY
        CASE role
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'moderator' THEN 3
          WHEN 'user' THEN 4
          ELSE 5
        END
      LIMIT 1
    ),
    'user'
  )
$$;

-- RLS: Admin/Owner can SELECT all user_roles
CREATE POLICY "Admin/Owner can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin_or_owner(auth.uid()));

-- RLS: Admin/Owner can manage user_roles (INSERT, UPDATE, DELETE)
CREATE POLICY "Admin/Owner can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin_or_owner(auth.uid()))
WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- RLS: Admin/Owner can SELECT all profiles (for admin panel user listing)
CREATE POLICY "Admin/Owner can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin_or_owner(auth.uid()));
