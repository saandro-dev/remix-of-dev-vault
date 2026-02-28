-- Drop the OLD overload of hybrid_search_vault_modules that accepts extensions.vector directly.
-- The NEW version (accepting text with internal cast) was created in a previous migration,
-- but PostgreSQL kept both overloads because the parameter types differ.
-- This eliminates the ambiguity for RPC calls.

DROP FUNCTION IF EXISTS public.hybrid_search_vault_modules(
  text,                    -- p_query_text
  extensions.vector,       -- p_query_embedding (OLD type)
  text,                    -- p_domain
  text,                    -- p_module_type
  text[],                  -- p_tags
  integer,                 -- p_match_count
  double precision,        -- p_full_text_weight
  double precision         -- p_semantic_weight
);