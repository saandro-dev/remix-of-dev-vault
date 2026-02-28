
-- =============================================================================
-- Step 1: Fill context_markdown for 7 modules with empty context
-- =============================================================================

UPDATE vault_modules SET context_markdown = '## Auth Constants - Single Source of Truth

This module centralizes all authentication-related constants (token expiry times, cookie names, session durations, error codes, redirect paths) into a single file. By importing from one place, you eliminate magic strings scattered across edge functions and frontend code.

### When to Use
- Starting any project that uses Supabase Auth or custom JWT
- When you find duplicated auth-related strings across multiple files
- Before implementing any auth flow (login, signup, password reset)

### Architecture Notes
- This is a **dependency-free** module — it should be imported by auth middleware, hooks, and edge functions
- Constants are typed with `as const` for maximum type safety
- Follows the SSOT principle: change once, propagate everywhere'
WHERE id = '261e96aa-24c0-41d6-824c-3c559f9e9fa7';

UPDATE vault_modules SET context_markdown = '## Circuit Breaker for External API Calls

Implements the Circuit Breaker pattern to protect your application from cascading failures when external APIs (payment gateways, email providers, WhatsApp APIs) become unavailable.

### When to Use
- Integrating with any external API that may have downtime
- Building webhook dispatchers that call third-party services
- Any edge function that depends on external HTTP calls

### Architecture Notes
- Three states: **Closed** (normal), **Open** (failing, skip calls), **Half-Open** (testing recovery)
- Configurable thresholds: failure count, timeout duration, recovery window
- Works with Supabase Edge Functions using Deno fetch API
- Logs state transitions for observability'
WHERE id = '802b38c3-529a-46ed-906d-f59c35349d7a';

UPDATE vault_modules SET context_markdown = '## Idempotency Middleware for Webhook Handlers

Ensures that webhook events (Stripe, Evolution API, etc.) are processed exactly once, even when the sender retries delivery. Uses a database-backed idempotency key to deduplicate incoming requests.

### When to Use
- Receiving webhooks from payment providers (Stripe, MercadoPago)
- Processing WhatsApp message callbacks from Evolution API
- Any edge function that handles external event notifications

### Architecture Notes
- Stores idempotency keys in a dedicated table with TTL-based cleanup
- Returns cached response for duplicate requests instead of reprocessing
- Compatible with Supabase Edge Functions middleware pattern
- Prevents double-charging, duplicate messages, and data corruption'
WHERE id = '917ad252-f7f1-4d12-9f6a-a0b185c2c3a6';

UPDATE vault_modules SET context_markdown = '## Multi-Key Supabase Client for Domain Isolation

Creates isolated Supabase clients per domain (e.g., one for auth operations, another for storage, another for business logic) to enforce the principle of least privilege and prevent accidental cross-domain data access.

### When to Use
- Building multi-tenant SaaS applications
- When different edge functions need different permission levels
- Isolating service-role operations from anon-key operations

### Architecture Notes
- Factory function creates typed clients with domain-specific configurations
- Each client uses its own key pair (anon vs service-role) based on the operation
- Prevents accidental RLS bypass by keeping service-role clients contained
- Works with Supabase Edge Functions and can be extended for multi-project setups'
WHERE id = 'd2507ee8-2cbb-43ca-936d-84a32e0f905f';

UPDATE vault_modules SET context_markdown = '## Rate Limiting Middleware for Edge Functions

Database-backed rate limiter that protects Supabase Edge Functions from abuse. Uses a sliding window algorithm with configurable limits per action and identifier (user ID, IP, API key).

### When to Use
- Protecting public-facing edge functions from brute-force attacks
- Limiting API key usage to prevent quota abuse
- Adding per-user request throttling to any endpoint

### Architecture Notes
- Uses `devvault_api_rate_limits` table for persistent tracking across function invocations
- Sliding window algorithm: counts attempts within a configurable time window
- Returns standardized 429 responses with Retry-After header
- Composable middleware pattern — wrap any edge function handler'
WHERE id = 'e7e1ee85-cb09-423d-bf8d-1de5cb285598';

UPDATE vault_modules SET context_markdown = '## Secure Cookie Helper - HttpOnly, Secure, SameSite=None

Provides utility functions for setting and reading HTTP cookies with security best practices baked in: HttpOnly, Secure, SameSite=None (for cross-origin), and configurable expiry.

### When to Use
- Implementing refresh token rotation in edge functions
- Storing session identifiers that must not be accessible to JavaScript
- Any cross-origin authentication flow requiring cookies

### Architecture Notes
- All cookies are HttpOnly by default — no XSS vector
- SameSite=None + Secure for cross-origin edge function calls
- Configurable path, domain, and max-age
- Pairs with `auth-constants-ssot` for cookie name constants
- Works in Deno (Supabase Edge Functions) without external dependencies'
WHERE id = 'c10e967c-a89e-43d1-9c37-3b788c9b43e6';

UPDATE vault_modules SET context_markdown = '## Unified Auth v2 - Single Identity Model

Implements a unified authentication layer that consolidates Supabase Auth, custom JWT validation, and API key authentication into a single middleware. Every request goes through one entry point that returns a standardized AuthContext object.

### When to Use
- Building edge functions that accept both session tokens and API keys
- Migrating from multiple auth checks scattered across functions
- When you need a single getCurrentUser() that works everywhere

### Architecture Notes
- Single authenticate(req) function returns { userId, role, method } regardless of auth type
- Priority: Bearer token → API key → Cookie session
- Integrates with auth-constants-ssot for token names and expiry values
- Integrates with validate_devvault_api_key DB function for API key auth
- Returns typed errors (UNAUTHORIZED, FORBIDDEN, EXPIRED) for consistent error handling'
WHERE id = 'eef928f4-d03a-48fc-a1f5-041cf5de177a';

-- =============================================================================
-- Step 2: Insert sequential dependencies for saas-playbook phases
-- =============================================================================

INSERT INTO vault_module_dependencies (module_id, depends_on_id, dependency_type) VALUES
  ('895f4d1c-edec-4f98-9543-20ed441a067f', '6721ded7-e8c0-4879-9fa0-f3eeecba87a0', 'required'),  -- phase-2 → phase-1
  ('3e68f6a3-c1f0-4db7-87e2-3e11a83704e0', '895f4d1c-edec-4f98-9543-20ed441a067f', 'required'),  -- phase-3 → phase-2
  ('309ee5bf-b445-4fd5-9ae3-e6b42edd5849', '3e68f6a3-c1f0-4db7-87e2-3e11a83704e0', 'required'),  -- phase-4 → phase-3
  ('277f4552-2027-439f-8d23-b56441057c66', '309ee5bf-b445-4fd5-9ae3-e6b42edd5849', 'required')   -- phase-5 → phase-4
ON CONFLICT (module_id, depends_on_id) DO NOTHING;

-- =============================================================================
-- Step 3: Fix completeness function — root modules (implementation_order = 1)
--         within a group should NOT be penalized for missing dependencies
-- =============================================================================

CREATE OR REPLACE FUNCTION public.vault_module_completeness(p_id uuid)
 RETURNS TABLE(score integer, missing_fields text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_mod RECORD;
  v_missing TEXT[] := '{}';
  v_total INT;
  v_filled INT := 0;
  v_has_deps BOOLEAN;
  v_is_grouped BOOLEAN;
  v_is_root BOOLEAN;
BEGIN
  SELECT * INTO v_mod FROM vault_modules WHERE id = p_id;
  
  IF NOT FOUND THEN
    score := 0;
    missing_fields := ARRAY['module_not_found'];
    RETURN NEXT;
    RETURN;
  END IF;

  -- Determine if this module belongs to a group
  v_is_grouped := (v_mod.module_group IS NOT NULL AND trim(v_mod.module_group) != '');
  
  -- Root modules within a group (implementation_order = 1) are treated like standalone
  v_is_root := v_is_grouped AND (v_mod.implementation_order IS NOT NULL AND v_mod.implementation_order = 1);

  -- Standalone or root modules: 9 fields (no dependency requirement)
  -- Non-root grouped modules: 10 fields (dependencies expected)
  IF v_is_grouped AND NOT v_is_root THEN
    v_total := 10;
  ELSE
    v_total := 9;
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
  
  -- Only check dependencies for grouped non-root modules
  IF v_is_grouped AND NOT v_is_root THEN
    SELECT EXISTS(SELECT 1 FROM vault_module_dependencies WHERE module_id = p_id) INTO v_has_deps;
    IF v_has_deps THEN v_filled := v_filled + 1;
    ELSE v_missing := array_append(v_missing, 'dependencies'); END IF;
  END IF;
  
  score := (v_filled * 100) / v_total;
  missing_fields := v_missing;
  RETURN NEXT;
END;
$function$;
