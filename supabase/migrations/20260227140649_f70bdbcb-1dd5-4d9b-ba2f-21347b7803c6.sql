
-- =============================================================================
-- vault_module_dependencies — N:N junction table for Knowledge Graph
-- =============================================================================

CREATE TABLE public.vault_module_dependencies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid NOT NULL REFERENCES public.vault_modules(id) ON DELETE CASCADE,
  depends_on_id uuid NOT NULL REFERENCES public.vault_modules(id) ON DELETE CASCADE,
  dependency_type text NOT NULL DEFAULT 'required',
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Prevent duplicate relationships
  CONSTRAINT uq_module_dependency UNIQUE (module_id, depends_on_id),
  -- Prevent self-referencing
  CONSTRAINT chk_no_self_reference CHECK (module_id != depends_on_id)
);

-- Index for fast lookups by module_id
CREATE INDEX idx_vmd_module_id ON public.vault_module_dependencies(module_id);
CREATE INDEX idx_vmd_depends_on_id ON public.vault_module_dependencies(depends_on_id);

-- =============================================================================
-- Validation trigger for dependency_type (instead of CHECK with runtime values)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_dependency_type()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.dependency_type NOT IN ('required', 'recommended') THEN
    RAISE EXCEPTION 'Invalid dependency_type: %. Must be required or recommended.', NEW.dependency_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_dependency_type
  BEFORE INSERT OR UPDATE ON public.vault_module_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_dependency_type();

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE public.vault_module_dependencies ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access on vault_module_dependencies"
  ON public.vault_module_dependencies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can SELECT dependencies of modules they have access to (owned, shared, global)
CREATE POLICY "Users can select accessible module dependencies"
  ON public.vault_module_dependencies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vault_modules vm
      WHERE vm.id = vault_module_dependencies.module_id
      AND (
        vm.user_id = auth.uid()
        OR vm.visibility = 'global'
        OR (
          vm.visibility = 'shared'
          AND EXISTS (
            SELECT 1 FROM public.vault_module_shares vms
            WHERE vms.module_id = vm.id
            AND vms.shared_with_user_id = auth.uid()
          )
        )
      )
    )
  );

-- Users can INSERT dependencies on modules they own
CREATE POLICY "Users can insert dependencies on own modules"
  ON public.vault_module_dependencies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vault_modules vm
      WHERE vm.id = vault_module_dependencies.module_id
      AND vm.user_id = auth.uid()
    )
  );

-- Users can DELETE dependencies on modules they own
CREATE POLICY "Users can delete dependencies on own modules"
  ON public.vault_module_dependencies
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vault_modules vm
      WHERE vm.id = vault_module_dependencies.module_id
      AND vm.user_id = auth.uid()
    )
  );
