
-- Stage 1a: Add owner enum value only (must be committed before use)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';
