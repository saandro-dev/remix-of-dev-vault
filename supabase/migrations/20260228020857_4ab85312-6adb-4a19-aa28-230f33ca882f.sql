
-- =============================================================================
-- Step 1: Translate 2 remaining descriptions from PT to EN
-- =============================================================================

UPDATE vault_modules
SET description = 'Typed HTTP client for the Evolution API v2, written in TypeScript for Deno. Abstracts API communication, handling authentication, timeouts, and errors. Provides methods for managing instances and sending text and media messages.'
WHERE slug = 'evolution-api-v2-client';

UPDATE vault_modules
SET description = 'Handles incoming webhook events from the Evolution API for WhatsApp message status updates (sent, delivered, read, failed). Validates the payload, updates the message status in the database, and logs the event for auditing.'
WHERE slug = 'whatsapp-status-webhook';

-- =============================================================================
-- Step 2: Populate related_modules for all 33 modules
-- =============================================================================

-- Security domain
UPDATE vault_modules SET related_modules = ARRAY[
  'eef928f4-d03a-48fc-a1f5-041cf5de177a'::uuid,
  'dd4555d1-9a31-434e-b09e-755e09766d92'::uuid,
  'c10e967c-a89e-43d1-9c37-3b788c9b43e6'::uuid,
  '8380b4fd-da99-4dad-b64c-a11460981844'::uuid
] WHERE id = '261e96aa-24c0-41d6-824c-3c559f9e9fa7'; -- auth-constants-ssot

UPDATE vault_modules SET related_modules = ARRAY[
  'd2507ee8-2cbb-43ca-936d-84a32e0f905f'::uuid,
  'e0c22f46-0edd-4f2a-9913-1337c58b5654'::uuid,
  '1d4626eb-50ef-4f68-9b73-089201b02963'::uuid
] WHERE id = '8075cfbd-1427-4fd0-8782-c3b1703f364a'; -- multi-key-domain-isolation

UPDATE vault_modules SET related_modules = ARRAY[
  '8075cfbd-1427-4fd0-8782-c3b1703f364a'::uuid,
  '1d4626eb-50ef-4f68-9b73-089201b02963'::uuid
] WHERE id = 'd2507ee8-2cbb-43ca-936d-84a32e0f905f'; -- multi-key-supabase-client

UPDATE vault_modules SET related_modules = ARRAY[
  '4af498f0-2afe-4095-802e-089674112ea9'::uuid,
  '36609909-332b-46cf-a8b2-4e24c03d9aaa'::uuid,
  '3f5ef597-a382-49ba-8a2b-95e91ada6667'::uuid
] WHERE id = 'e7e1ee85-cb09-423d-bf8d-1de5cb285598'; -- rate-limiting-middleware

UPDATE vault_modules SET related_modules = ARRAY[
  '8380b4fd-da99-4dad-b64c-a11460981844'::uuid,
  '261e96aa-24c0-41d6-824c-3c559f9e9fa7'::uuid,
  'eef928f4-d03a-48fc-a1f5-041cf5de177a'::uuid
] WHERE id = 'c10e967c-a89e-43d1-9c37-3b788c9b43e6'; -- secure-cookie-helper

UPDATE vault_modules SET related_modules = ARRAY[
  'c10e967c-a89e-43d1-9c37-3b788c9b43e6'::uuid,
  '261e96aa-24c0-41d6-824c-3c559f9e9fa7'::uuid,
  'eef928f4-d03a-48fc-a1f5-041cf5de177a'::uuid
] WHERE id = '8380b4fd-da99-4dad-b64c-a11460981844'; -- secure-session-cookies

UPDATE vault_modules SET related_modules = ARRAY[
  '1d4626eb-50ef-4f68-9b73-089201b02963'::uuid,
  '8075cfbd-1427-4fd0-8782-c3b1703f364a'::uuid
] WHERE id = 'e0c22f46-0edd-4f2a-9913-1337c58b5654'; -- security-audit-logger

UPDATE vault_modules SET related_modules = ARRAY[
  'e0c22f46-0edd-4f2a-9913-1337c58b5654'::uuid,
  '8075cfbd-1427-4fd0-8782-c3b1703f364a'::uuid,
  'd2507ee8-2cbb-43ca-936d-84a32e0f905f'::uuid
] WHERE id = '1d4626eb-50ef-4f68-9b73-089201b02963'; -- supabase-vault-secrets

-- Backend domain
UPDATE vault_modules SET related_modules = ARRAY[
  '3f5ef597-a382-49ba-8a2b-95e91ada6667'::uuid,
  '36609909-332b-46cf-a8b2-4e24c03d9aaa'::uuid,
  '56edbf7c-c7ba-477a-826d-a0228b0aaf4f'::uuid
] WHERE id = '8e918d67-d47d-4413-9e26-029c7ef303ca'; -- api-response-helpers

UPDATE vault_modules SET related_modules = ARRAY[
  '8e918d67-d47d-4413-9e26-029c7ef303ca'::uuid,
  '36609909-332b-46cf-a8b2-4e24c03d9aaa'::uuid,
  'e7e1ee85-cb09-423d-bf8d-1de5cb285598'::uuid
] WHERE id = '3f5ef597-a382-49ba-8a2b-95e91ada6667'; -- cors-allowlist-guard

UPDATE vault_modules SET related_modules = ARRAY[
  '8e918d67-d47d-4413-9e26-029c7ef303ca'::uuid,
  '3f5ef597-a382-49ba-8a2b-95e91ada6667'::uuid,
  'e7e1ee85-cb09-423d-bf8d-1de5cb285598'::uuid,
  '4af498f0-2afe-4095-802e-089674112ea9'::uuid,
  '802b38c3-529a-46ed-906d-f59c35349d7a'::uuid
] WHERE id = '36609909-332b-46cf-a8b2-4e24c03d9aaa'; -- edge-function-pipeline

UPDATE vault_modules SET related_modules = ARRAY[
  'e138bb68-c16e-4732-8793-73b8d7c4c9c6'::uuid,
  'e691051a-cd8b-46a3-a292-ce4a1b319b5c'::uuid,
  'aed2617b-6183-4da8-b432-28b8ee22f291'::uuid,
  'f612457b-e0a2-4b4b-a90e-3ed89e1a184d'::uuid,
  '8135a5df-0b10-4c57-8b7e-13cbd4f3d214'::uuid,
  'ebae6291-f016-40d3-9b4a-79b5f8b37ccb'::uuid
] WHERE id = '03968b5a-7db0-42f2-8f03-85b1eeca44bf'; -- evolution-api-v2-client

UPDATE vault_modules SET related_modules = ARRAY[
  'f612457b-e0a2-4b4b-a90e-3ed89e1a184d'::uuid,
  '36609909-332b-46cf-a8b2-4e24c03d9aaa'::uuid,
  '802b38c3-529a-46ed-906d-f59c35349d7a'::uuid
] WHERE id = '917ad252-f7f1-4d12-9f6a-a0b185c2c3a6'; -- idempotency-middleware-webhooks

UPDATE vault_modules SET related_modules = ARRAY[
  'e7e1ee85-cb09-423d-bf8d-1de5cb285598'::uuid,
  '36609909-332b-46cf-a8b2-4e24c03d9aaa'::uuid
] WHERE id = '4af498f0-2afe-4095-802e-089674112ea9'; -- rate-limit-guard

UPDATE vault_modules SET related_modules = ARRAY[
  'd9ddc685-2a8a-482d-ab56-c0d97dc5c2eb'::uuid,
  'aed2617b-6183-4da8-b432-28b8ee22f291'::uuid
] WHERE id = '2dd64f55-d229-4cac-a09a-e85a569d1223'; -- rls-granular-policies

UPDATE vault_modules SET related_modules = ARRAY[
  '261e96aa-24c0-41d6-824c-3c559f9e9fa7'::uuid,
  'dd4555d1-9a31-434e-b09e-755e09766d92'::uuid,
  'c10e967c-a89e-43d1-9c37-3b788c9b43e6'::uuid,
  '8380b4fd-da99-4dad-b64c-a11460981844'::uuid
] WHERE id = 'eef928f4-d03a-48fc-a1f5-041cf5de177a'; -- unified-auth-v2

UPDATE vault_modules SET related_modules = ARRAY[
  '03968b5a-7db0-42f2-8f03-85b1eeca44bf'::uuid,
  'e691051a-cd8b-46a3-a292-ce4a1b319b5c'::uuid,
  'aed2617b-6183-4da8-b432-28b8ee22f291'::uuid,
  'f612457b-e0a2-4b4b-a90e-3ed89e1a184d'::uuid,
  '8135a5df-0b10-4c57-8b7e-13cbd4f3d214'::uuid,
  'ebae6291-f016-40d3-9b4a-79b5f8b37ccb'::uuid
] WHERE id = 'e138bb68-c16e-4732-8793-73b8d7c4c9c6'; -- whatsapp-evolution-types

UPDATE vault_modules SET related_modules = ARRAY[
  '03968b5a-7db0-42f2-8f03-85b1eeca44bf'::uuid,
  'e138bb68-c16e-4732-8793-73b8d7c4c9c6'::uuid,
  '8135a5df-0b10-4c57-8b7e-13cbd4f3d214'::uuid,
  'aed2617b-6183-4da8-b432-28b8ee22f291'::uuid,
  'f612457b-e0a2-4b4b-a90e-3ed89e1a184d'::uuid,
  'ebae6291-f016-40d3-9b4a-79b5f8b37ccb'::uuid
] WHERE id = 'e691051a-cd8b-46a3-a292-ce4a1b319b5c'; -- whatsapp-message-dispatcher

UPDATE vault_modules SET related_modules = ARRAY[
  '03968b5a-7db0-42f2-8f03-85b1eeca44bf'::uuid,
  'e138bb68-c16e-4732-8793-73b8d7c4c9c6'::uuid,
  'e691051a-cd8b-46a3-a292-ce4a1b319b5c'::uuid,
  'f612457b-e0a2-4b4b-a90e-3ed89e1a184d'::uuid,
  '8135a5df-0b10-4c57-8b7e-13cbd4f3d214'::uuid,
  'ebae6291-f016-40d3-9b4a-79b5f8b37ccb'::uuid,
  '2dd64f55-d229-4cac-a09a-e85a569d1223'::uuid,
  'd9ddc685-2a8a-482d-ab56-c0d97dc5c2eb'::uuid
] WHERE id = 'aed2617b-6183-4da8-b432-28b8ee22f291'; -- whatsapp-sql-schema

UPDATE vault_modules SET related_modules = ARRAY[
  '03968b5a-7db0-42f2-8f03-85b1eeca44bf'::uuid,
  'e138bb68-c16e-4732-8793-73b8d7c4c9c6'::uuid,
  'e691051a-cd8b-46a3-a292-ce4a1b319b5c'::uuid,
  'aed2617b-6183-4da8-b432-28b8ee22f291'::uuid,
  '8135a5df-0b10-4c57-8b7e-13cbd4f3d214'::uuid,
  'ebae6291-f016-40d3-9b4a-79b5f8b37ccb'::uuid,
  '917ad252-f7f1-4d12-9f6a-a0b185c2c3a6'::uuid
] WHERE id = 'f612457b-e0a2-4b4b-a90e-3ed89e1a184d'; -- whatsapp-status-webhook

UPDATE vault_modules SET related_modules = ARRAY[
  '03968b5a-7db0-42f2-8f03-85b1eeca44bf'::uuid,
  'e138bb68-c16e-4732-8793-73b8d7c4c9c6'::uuid,
  'e691051a-cd8b-46a3-a292-ce4a1b319b5c'::uuid,
  'aed2617b-6183-4da8-b432-28b8ee22f291'::uuid,
  'f612457b-e0a2-4b4b-a90e-3ed89e1a184d'::uuid,
  'ebae6291-f016-40d3-9b4a-79b5f8b37ccb'::uuid
] WHERE id = '8135a5df-0b10-4c57-8b7e-13cbd4f3d214'; -- whatsapp-template-renderer

-- Frontend domain
UPDATE vault_modules SET related_modules = ARRAY[
  '261e96aa-24c0-41d6-824c-3c559f9e9fa7'::uuid,
  'eef928f4-d03a-48fc-a1f5-041cf5de177a'::uuid,
  '56edbf7c-c7ba-477a-826d-a0228b0aaf4f'::uuid
] WHERE id = 'dd4555d1-9a31-434e-b09e-755e09766d92'; -- auth-hooks-pattern

UPDATE vault_modules SET related_modules = ARRAY[
  '8e918d67-d47d-4413-9e26-029c7ef303ca'::uuid,
  '36609909-332b-46cf-a8b2-4e24c03d9aaa'::uuid,
  'dd4555d1-9a31-434e-b09e-755e09766d92'::uuid,
  'd0b6fbe8-b09c-4c2e-a1be-0faad516819a'::uuid
] WHERE id = '56edbf7c-c7ba-477a-826d-a0228b0aaf4f'; -- edge-function-client

UPDATE vault_modules SET related_modules = ARRAY[
  '03968b5a-7db0-42f2-8f03-85b1eeca44bf'::uuid,
  'e138bb68-c16e-4732-8793-73b8d7c4c9c6'::uuid,
  'e691051a-cd8b-46a3-a292-ce4a1b319b5c'::uuid,
  'aed2617b-6183-4da8-b432-28b8ee22f291'::uuid,
  'f612457b-e0a2-4b4b-a90e-3ed89e1a184d'::uuid,
  '8135a5df-0b10-4c57-8b7e-13cbd4f3d214'::uuid,
  '56edbf7c-c7ba-477a-826d-a0228b0aaf4f'::uuid
] WHERE id = 'ebae6291-f016-40d3-9b4a-79b5f8b37ccb'; -- whatsapp-react-query-hooks

-- Architecture domain
UPDATE vault_modules SET related_modules = ARRAY[
  '36609909-332b-46cf-a8b2-4e24c03d9aaa'::uuid,
  '917ad252-f7f1-4d12-9f6a-a0b185c2c3a6'::uuid,
  '03968b5a-7db0-42f2-8f03-85b1eeca44bf'::uuid
] WHERE id = '802b38c3-529a-46ed-906d-f59c35349d7a'; -- circuit-breaker-external-apis

UPDATE vault_modules SET related_modules = ARRAY[
  '36609909-332b-46cf-a8b2-4e24c03d9aaa'::uuid
] WHERE id = '8c50a4c4-2ee4-4d3a-a403-dbda6b58725a'; -- config-toml-best-practices

UPDATE vault_modules SET related_modules = ARRAY[
  '56edbf7c-c7ba-477a-826d-a0228b0aaf4f'::uuid,
  '8e918d67-d47d-4413-9e26-029c7ef303ca'::uuid
] WHERE id = 'd0b6fbe8-b09c-4c2e-a1be-0faad516819a'; -- devvault-api-docs

UPDATE vault_modules SET related_modules = ARRAY[
  '895f4d1c-edec-4f98-9543-20ed441a067f'::uuid,
  '3e68f6a3-c1f0-4db7-87e2-3e11a83704e0'::uuid,
  '309ee5bf-b445-4fd5-9ae3-e6b42edd5849'::uuid,
  '277f4552-2027-439f-8d23-b56441057c66'::uuid
] WHERE id = '6721ded7-e8c0-4879-9fa0-f3eeecba87a0'; -- saas-playbook-phase-1

UPDATE vault_modules SET related_modules = ARRAY[
  '6721ded7-e8c0-4879-9fa0-f3eeecba87a0'::uuid,
  '3e68f6a3-c1f0-4db7-87e2-3e11a83704e0'::uuid,
  '309ee5bf-b445-4fd5-9ae3-e6b42edd5849'::uuid,
  '277f4552-2027-439f-8d23-b56441057c66'::uuid
] WHERE id = '895f4d1c-edec-4f98-9543-20ed441a067f'; -- saas-playbook-phase-2

UPDATE vault_modules SET related_modules = ARRAY[
  '6721ded7-e8c0-4879-9fa0-f3eeecba87a0'::uuid,
  '895f4d1c-edec-4f98-9543-20ed441a067f'::uuid,
  '309ee5bf-b445-4fd5-9ae3-e6b42edd5849'::uuid,
  '277f4552-2027-439f-8d23-b56441057c66'::uuid
] WHERE id = '3e68f6a3-c1f0-4db7-87e2-3e11a83704e0'; -- saas-playbook-phase-3

UPDATE vault_modules SET related_modules = ARRAY[
  '6721ded7-e8c0-4879-9fa0-f3eeecba87a0'::uuid,
  '895f4d1c-edec-4f98-9543-20ed441a067f'::uuid,
  '3e68f6a3-c1f0-4db7-87e2-3e11a83704e0'::uuid,
  '277f4552-2027-439f-8d23-b56441057c66'::uuid
] WHERE id = '309ee5bf-b445-4fd5-9ae3-e6b42edd5849'; -- saas-playbook-phase-4

UPDATE vault_modules SET related_modules = ARRAY[
  '6721ded7-e8c0-4879-9fa0-f3eeecba87a0'::uuid,
  '895f4d1c-edec-4f98-9543-20ed441a067f'::uuid,
  '3e68f6a3-c1f0-4db7-87e2-3e11a83704e0'::uuid,
  '309ee5bf-b445-4fd5-9ae3-e6b42edd5849'::uuid
] WHERE id = '277f4552-2027-439f-8d23-b56441057c66'; -- saas-playbook-phase-5

UPDATE vault_modules SET related_modules = ARRAY[
  '2dd64f55-d229-4cac-a09a-e85a569d1223'::uuid,
  'aed2617b-6183-4da8-b432-28b8ee22f291'::uuid
] WHERE id = 'd9ddc685-2a8a-482d-ab56-c0d97dc5c2eb'; -- sql-schema-patterns

-- =============================================================================
-- Step 3: Fix vault_module_completeness to not penalize standalone modules
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
BEGIN
  SELECT * INTO v_mod FROM vault_modules WHERE id = p_id;
  
  IF NOT FOUND THEN
    score := 0;
    missing_fields := ARRAY['module_not_found'];
    RETURN NEXT;
    RETURN;
  END IF;

  -- Determine if this module belongs to a group (non-standalone)
  v_is_grouped := (v_mod.module_group IS NOT NULL AND trim(v_mod.module_group) != '');

  -- Standalone modules: 9 fields (no dependency requirement)
  -- Grouped modules: 10 fields (dependencies expected)
  IF v_is_grouped THEN
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
  
  -- Only check dependencies for grouped modules
  IF v_is_grouped THEN
    SELECT EXISTS(SELECT 1 FROM vault_module_dependencies WHERE module_id = p_id) INTO v_has_deps;
    IF v_has_deps THEN v_filled := v_filled + 1;
    ELSE v_missing := array_append(v_missing, 'dependencies'); END IF;
  END IF;
  
  score := (v_filled * 100) / v_total;
  missing_fields := v_missing;
  RETURN NEXT;
END;
$function$;
