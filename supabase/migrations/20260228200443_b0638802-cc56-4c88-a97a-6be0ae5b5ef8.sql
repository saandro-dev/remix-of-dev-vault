
CREATE OR REPLACE FUNCTION public.get_domain_counts(
  p_user_id UUID,
  p_scope TEXT DEFAULT 'owned'
)
RETURNS TABLE(domain TEXT, count BIGINT, grand_total BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT vm.domain::TEXT AS d
    FROM public.vault_modules vm
    WHERE
      CASE p_scope
        WHEN 'owned' THEN vm.user_id = p_user_id
        WHEN 'shared_with_me' THEN
          vm.visibility = 'shared'
          AND EXISTS (
            SELECT 1 FROM public.vault_module_shares vms
            WHERE vms.module_id = vm.id AND vms.shared_with_user_id = p_user_id
          )
        WHEN 'global' THEN vm.visibility = 'global'
        WHEN 'all' THEN
          vm.user_id = p_user_id
          OR vm.visibility = 'global'
          OR (vm.visibility = 'shared' AND EXISTS (
            SELECT 1 FROM public.vault_module_shares vms
            WHERE vms.module_id = vm.id AND vms.shared_with_user_id = p_user_id
          ))
        ELSE vm.user_id = p_user_id
      END
  ),
  counts AS (
    SELECT f.d, COUNT(*)::BIGINT AS cnt
    FROM filtered f
    GROUP BY f.d
  ),
  total AS (
    SELECT SUM(cnt)::BIGINT AS gt FROM counts
  )
  SELECT c.d, c.cnt, COALESCE(t.gt, 0)
  FROM counts c
  CROSS JOIN total t
  ORDER BY c.cnt DESC;
END;
$$;
