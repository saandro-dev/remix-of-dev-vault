
-- Add ai_metadata JSONB column to vault_modules
ALTER TABLE public.vault_modules
  ADD COLUMN ai_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- GIN index for efficient JSONB queries (e.g. find modules needing STRIPE_SECRET_KEY)
CREATE INDEX idx_vault_modules_ai_metadata_gin
  ON public.vault_modules USING GIN (ai_metadata);

-- Validation trigger: enforces ai_metadata structure at DB level
-- Allowed top-level keys: npm_dependencies, env_vars_required, ai_rules (all arrays of strings)
CREATE OR REPLACE FUNCTION public.validate_ai_metadata()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_key TEXT;
  v_val JSONB;
  v_elem JSONB;
  v_allowed_keys TEXT[] := ARRAY['npm_dependencies', 'env_vars_required', 'ai_rules'];
BEGIN
  -- Allow empty object
  IF NEW.ai_metadata = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  -- Validate only allowed top-level keys
  FOR v_key IN SELECT jsonb_object_keys(NEW.ai_metadata) LOOP
    IF NOT v_key = ANY(v_allowed_keys) THEN
      RAISE EXCEPTION 'ai_metadata: unknown key "%". Allowed: npm_dependencies, env_vars_required, ai_rules', v_key;
    END IF;
  END LOOP;

  -- Validate each allowed key is an array of strings
  FOREACH v_key IN ARRAY v_allowed_keys LOOP
    IF NEW.ai_metadata ? v_key THEN
      v_val := NEW.ai_metadata -> v_key;
      IF jsonb_typeof(v_val) != 'array' THEN
        RAISE EXCEPTION 'ai_metadata.% must be an array', v_key;
      END IF;
      FOR v_elem IN SELECT jsonb_array_elements(v_val) LOOP
        IF jsonb_typeof(v_elem) != 'string' THEN
          RAISE EXCEPTION 'ai_metadata.% must contain only strings', v_key;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_ai_metadata
  BEFORE INSERT OR UPDATE ON public.vault_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_ai_metadata();
