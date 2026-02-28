
-- Phase 2: Add version field to vault_modules
ALTER TABLE public.vault_modules ADD COLUMN IF NOT EXISTS version TEXT DEFAULT 'v1';
