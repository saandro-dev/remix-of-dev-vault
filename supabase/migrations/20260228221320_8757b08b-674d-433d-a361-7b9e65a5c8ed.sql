
-- Migration 3: pg_trgm extension + GIN trigram indexes for ILIKE performance

-- Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- GIN trigram indexes on key text fields
CREATE INDEX IF NOT EXISTS idx_vault_modules_title_trgm
  ON vault_modules USING GIN (title extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_vault_modules_description_trgm
  ON vault_modules USING GIN (description extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_vault_modules_code_trgm
  ON vault_modules USING GIN (code extensions.gin_trgm_ops);
