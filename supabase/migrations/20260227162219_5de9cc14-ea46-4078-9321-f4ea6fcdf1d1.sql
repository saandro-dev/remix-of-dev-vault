
-- =============================================================================
-- 1. Auto-slug trigger for vault_modules
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_vault_module_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  -- Only generate if slug is null or empty
  IF NEW.slug IS NULL OR trim(NEW.slug) = '' THEN
    -- Sanitize title to slug: lowercase, replace non-alphanumeric with hyphens
    base_slug := lower(regexp_replace(trim(NEW.title), '[^a-zA-Z0-9]+', '-', 'g'));
    -- Remove leading/trailing hyphens
    base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
    -- Ensure non-empty
    IF base_slug = '' THEN
      base_slug := 'module';
    END IF;
    
    final_slug := base_slug;
    
    -- Deduplicate: append counter if slug already exists
    LOOP
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM vault_modules WHERE slug = final_slug AND id != NEW.id
      );
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger (drop first to be idempotent)
DROP TRIGGER IF EXISTS trg_vault_module_auto_slug ON vault_modules;
CREATE TRIGGER trg_vault_module_auto_slug
  BEFORE INSERT OR UPDATE ON vault_modules
  FOR EACH ROW EXECUTE FUNCTION generate_vault_module_slug();

-- =============================================================================
-- 2. New columns: module_group and implementation_order
-- =============================================================================

ALTER TABLE vault_modules ADD COLUMN IF NOT EXISTS module_group TEXT;
ALTER TABLE vault_modules ADD COLUMN IF NOT EXISTS implementation_order INT;

-- =============================================================================
-- 3. Completeness scoring function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.vault_module_completeness(p_id UUID)
RETURNS TABLE(score INT, missing_fields TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mod RECORD;
  v_missing TEXT[] := '{}';
  v_total INT := 10;
  v_filled INT := 0;
  v_has_deps BOOLEAN;
BEGIN
  SELECT * INTO v_mod FROM vault_modules WHERE id = p_id;
  
  IF NOT FOUND THEN
    score := 0;
    missing_fields := ARRAY['module_not_found'];
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Check each important field
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
  
  -- Check if dependencies are mapped
  SELECT EXISTS(SELECT 1 FROM vault_module_dependencies WHERE module_id = p_id) INTO v_has_deps;
  IF v_has_deps THEN v_filled := v_filled + 1;
  ELSE v_missing := array_append(v_missing, 'dependencies'); END IF;
  
  score := (v_filled * 100) / v_total;
  missing_fields := v_missing;
  RETURN NEXT;
END;
$$;

-- =============================================================================
-- 4. Backfill slugs for existing modules with null slug
--    (Setting slug to NULL triggers the auto-slug function on UPDATE)
-- =============================================================================

UPDATE vault_modules SET slug = NULL, updated_at = updated_at WHERE slug IS NULL OR trim(slug) = '';
