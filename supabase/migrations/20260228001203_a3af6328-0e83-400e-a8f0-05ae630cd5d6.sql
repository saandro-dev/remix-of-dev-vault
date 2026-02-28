
-- ============================================================
-- STEP 2: Populate usage_hint for ALL 33 modules
-- ============================================================
UPDATE vault_modules SET usage_hint = CASE slug
  -- saas-playbook group
  WHEN 'saas-playbook-phase-1' THEN 'Use when starting a new SaaS project to set up the foundation: Supabase config, repo structure, design system, and folder conventions'
  WHEN 'saas-playbook-phase-2' THEN 'Use when implementing authentication: login, signup, password recovery, route protection, and secure cookie handling'
  WHEN 'saas-playbook-phase-3' THEN 'Use when designing the database schema with RLS, triggers, indexes, and Supabase Vault for sensitive data'
  WHEN 'saas-playbook-phase-4' THEN 'Use when creating Edge Functions with the mandatory security pipeline: Sentry, CORS, rate limiting, and JWT validation'
  WHEN 'saas-playbook-phase-5' THEN 'Use when building the frontend layer: React components, hooks, Edge Function integration, and UX patterns'
  -- whatsapp-integration group
  WHEN 'evolution-api-v2-client' THEN 'Use when integrating with Evolution API v2 for WhatsApp automation: managing instances, sending text and media messages'
  WHEN 'whatsapp-evolution-types' THEN 'Use when you need TypeScript types for WhatsApp/Evolution API integration: database entities, API request/response types, dispatcher types'
  WHEN 'whatsapp-sql-schema' THEN 'Use when setting up the database schema for WhatsApp automation: tables for instances, templates, automations, and message logs'
  WHEN 'whatsapp-status-webhook' THEN 'Use when receiving webhooks from Evolution API about WhatsApp connection status changes (connected, disconnected, QR code updated)'
  WHEN 'whatsapp-template-renderer' THEN 'Use when rendering message templates with dynamic placeholders like customer_name, product_name, amount, pix_code'
  WHEN 'whatsapp-message-dispatcher' THEN 'Use when dispatching WhatsApp messages triggered by events (e.g., purchase approved): finds automations, renders templates, sends via Evolution API'
  WHEN 'whatsapp-react-query-hooks' THEN 'Use when building the WhatsApp management UI: React Query hooks for CRUD on instances, templates, automations, and message logs'
  -- security modules
  WHEN 'auth-constants-ssot' THEN 'Use when you need centralized authentication constants: token durations, bcrypt cost, hash version, to avoid duplication across Edge Functions'
  WHEN 'secure-cookie-helper' THEN 'Use when implementing secure session cookies with HttpOnly, Secure, and SameSite attributes for authentication'
  WHEN 'multi-key-supabase-client' THEN 'Use when creating a Supabase client with domain-isolated service keys to limit blast radius if one key is compromised'
  WHEN 'unified-auth-v2' THEN 'Use when building a custom authentication system independent of Supabase GoTrue, with role switching, password hashing, and session management'
  WHEN 'rate-limiting-middleware' THEN 'Use when adding rate limiting to Edge Functions with sliding window algorithm to prevent abuse and DoS attacks'
  WHEN 'circuit-breaker-external-apis' THEN 'Use when calling external APIs (payment gateways, email services) to prevent cascading failures with the Circuit Breaker pattern'
  WHEN 'idempotency-middleware-webhooks' THEN 'Use when handling webhooks to ensure exactly-once processing, preventing duplicate events from being processed twice'
  WHEN 'security-audit-logger' THEN 'Use when you need to log security-critical events: logins, key creation, access denials, for compliance and incident response'
  WHEN 'config-toml-best-practices' THEN 'Use when configuring supabase/config.toml for projects using the new sb_publishable_ and sb_secret_ key format'
  WHEN 'secure-session-cookies' THEN 'Use when storing authentication tokens in cookies instead of localStorage to prevent XSS token theft'
  WHEN 'cors-allowlist-guard' THEN 'Use when implementing CORS with a whitelist of allowed origins instead of the dangerous wildcard Access-Control-Allow-Origin: *'
  WHEN 'devvault-api-docs' THEN 'Use when you need to understand the DevVault API endpoints: the complete reference for interacting with the Knowledge OS via API'
  WHEN 'edge-function-client' THEN 'Use when calling Edge Functions from the React frontend: centralized client with automatic JWT inclusion, error handling, and 401 retry'
  WHEN 'auth-hooks-pattern' THEN 'Use when accessing authenticated user data in React components without causing unnecessary re-renders via selective hooks'
  WHEN 'api-response-helpers' THEN 'Use when creating standardized HTTP responses in Edge Functions with consistent error codes and CORS headers'
  WHEN 'sql-schema-patterns' THEN 'Use when designing SQL tables in Supabase: naming conventions, UUID primary keys, TIMESTAMPTZ, JSONB, and soft delete patterns'
  WHEN 'edge-function-pipeline' THEN 'Use when structuring an Edge Function with the mandatory security pipeline: Sentry error tracking, CORS, rate limiting, authentication'
  WHEN 'rate-limit-guard' THEN 'Use when adding IP-based rate limiting to Edge Functions with configurable limits per action type'
  WHEN 'rls-granular-policies' THEN 'Use when implementing Row Level Security with separate policies per operation (SELECT, INSERT, UPDATE, DELETE) and explicit service_role access'
  WHEN 'multi-key-domain-isolation' THEN 'Use when implementing multi-key domain isolation for Supabase clients to separate permissions by functional area'
  WHEN 'supabase-vault-secrets' THEN 'Use when storing and retrieving sensitive data using Supabase Vault: vault.create_secret() and vault.decrypted_secrets'
  ELSE usage_hint
END
WHERE usage_hint IS NULL;

-- ============================================================
-- STEP 3: Populate why_it_matters for WhatsApp modules (missing)
-- ============================================================
UPDATE vault_modules SET why_it_matters = CASE slug
  WHEN 'evolution-api-v2-client' THEN 'Without a typed HTTP client, every function that talks to the Evolution API will reimplement authentication, error handling, and timeouts differently. This leads to inconsistent behavior and harder debugging.'
  WHEN 'whatsapp-evolution-types' THEN 'Without shared types, the compiler cannot catch mismatches between modules. A dispatcher sending a field the webhook does not expect will only fail at runtime, in production.'
  WHEN 'whatsapp-sql-schema' THEN 'Without a proper schema with RLS, message logs and API keys are exposed. Without indexes, queries on large log tables will degrade as volume grows.'
  WHEN 'whatsapp-status-webhook' THEN 'Without real-time status tracking, the UI cannot show whether a WhatsApp instance is connected or needs a new QR code scan, leading to confusion and failed message sends.'
  WHEN 'whatsapp-template-renderer' THEN 'Hardcoding message text in the dispatcher makes it impossible to change messages without redeploying code. Templates allow non-developers to update messaging without touching the codebase.'
  WHEN 'whatsapp-message-dispatcher' THEN 'Without a centralized dispatcher, each event handler would implement its own message-sending logic, leading to duplicated code, inconsistent logging, and missed error handling.'
  WHEN 'whatsapp-react-query-hooks' THEN 'Without dedicated hooks, each component would call Edge Functions directly with ad-hoc error handling, cache management, and loading states. React Query hooks ensure consistent UX and data freshness.'
END
WHERE slug IN ('evolution-api-v2-client','whatsapp-evolution-types','whatsapp-sql-schema','whatsapp-status-webhook','whatsapp-template-renderer','whatsapp-message-dispatcher','whatsapp-react-query-hooks')
AND why_it_matters IS NULL;

-- ============================================================
-- STEP 4: Insert dependencies for whatsapp-integration group
-- ============================================================
-- Types (order 2) depends on Client (order 1)
INSERT INTO vault_module_dependencies (module_id, depends_on_id, dependency_type)
VALUES
  ('e138bb68-c16e-4732-8793-73b8d7c4c9c6', '03968b5a-7db0-42f2-8f03-85b1eeca44bf', 'required')
ON CONFLICT (module_id, depends_on_id) DO NOTHING;

-- Webhook (order 4) depends on Client (1) and Types (2)
INSERT INTO vault_module_dependencies (module_id, depends_on_id, dependency_type)
VALUES
  ('f612457b-e0a2-4b4b-a90e-3ed89e1a184d', '03968b5a-7db0-42f2-8f03-85b1eeca44bf', 'required'),
  ('f612457b-e0a2-4b4b-a90e-3ed89e1a184d', 'e138bb68-c16e-4732-8793-73b8d7c4c9c6', 'required')
ON CONFLICT (module_id, depends_on_id) DO NOTHING;

-- Template Renderer (order 5) depends on Types (2)
INSERT INTO vault_module_dependencies (module_id, depends_on_id, dependency_type)
VALUES
  ('8135a5df-0b10-4c57-8b7e-13cbd4f3d214', 'e138bb68-c16e-4732-8793-73b8d7c4c9c6', 'required')
ON CONFLICT (module_id, depends_on_id) DO NOTHING;

-- Dispatcher (order 6) depends on Client (1), Types (2), Template (5)
INSERT INTO vault_module_dependencies (module_id, depends_on_id, dependency_type)
VALUES
  ('e691051a-cd8b-46a3-a292-ce4a1b319b5c', '03968b5a-7db0-42f2-8f03-85b1eeca44bf', 'required'),
  ('e691051a-cd8b-46a3-a292-ce4a1b319b5c', 'e138bb68-c16e-4732-8793-73b8d7c4c9c6', 'required'),
  ('e691051a-cd8b-46a3-a292-ce4a1b319b5c', '8135a5df-0b10-4c57-8b7e-13cbd4f3d214', 'required')
ON CONFLICT (module_id, depends_on_id) DO NOTHING;

-- React Hooks (order 7) depends on Types (2)
INSERT INTO vault_module_dependencies (module_id, depends_on_id, dependency_type)
VALUES
  ('ebae6291-f016-40d3-9b4a-79b5f8b37ccb', 'e138bb68-c16e-4732-8793-73b8d7c4c9c6', 'required')
ON CONFLICT (module_id, depends_on_id) DO NOTHING;

-- ============================================================
-- STEP 5: Translate titles and descriptions to English
-- ============================================================
UPDATE vault_modules SET
  title = 'SaaS Playbook — Phase 1: Foundation and Project Setup',
  description = 'Everything needed before writing a single line of business code: create the Supabase project, configure the repository, define the design system, and structure the folders.'
WHERE id = '6721ded7-e8c0-4879-9fa0-f3eeecba87a0';

UPDATE vault_modules SET
  title = 'SaaS Playbook — Phase 2: Authentication and Security',
  description = 'Complete authentication system implementation: login, signup, password recovery, route protection, and secure cookies.'
WHERE id = '895f4d1c-edec-4f98-9543-20ed441a067f';

UPDATE vault_modules SET
  title = 'SaaS Playbook — Phase 3: Database and Encryption',
  description = 'Complete database schema design with granular RLS, triggers, indexes, and Supabase Vault configuration for sensitive data.'
WHERE id = '3e68f6a3-c1f0-4db7-87e2-3e11a83704e0';

UPDATE vault_modules SET
  title = 'SaaS Playbook — Phase 4: Edge Functions',
  description = 'Creation and configuration of all project Edge Functions following the mandatory security pipeline.'
WHERE id = '309ee5bf-b445-4fd5-9ae3-e6b42edd5849';

UPDATE vault_modules SET
  title = 'SaaS Playbook — Phase 5: Frontend and UX',
  description = 'Frontend implementation with React, hooks, components, and Edge Function integration. UX patterns and design system.'
WHERE id = '277f4552-2027-439f-8d23-b56441057c66';

UPDATE vault_modules SET
  title = 'WhatsApp/Evolution Integration Types (TypeScript)',
  description = 'Complete TypeScript type collection for Evolution API integration. Includes database entities (Instance, Template, Automation, Log), Evolution API request/response types, and dispatcher/webhook types.'
WHERE id = 'e138bb68-c16e-4732-8793-73b8d7c4c9c6';

UPDATE vault_modules SET
  title = 'SQL Schema for WhatsApp Automation',
  description = 'Complete SQL migration to create the tables, indexes, and RLS policies needed for the WhatsApp automation system. Includes tables for instances, templates, automations, and message logs.'
WHERE id = 'aed2617b-6183-4da8-b432-28b8ee22f291';

UPDATE vault_modules SET
  title = 'Message Template Renderer (TypeScript)',
  description = 'Utility function to replace placeholders in message templates. Supports variables like customer_name, product_name, amount, pix_code, using double-brace format.'
WHERE id = '8135a5df-0b10-4c57-8b7e-13cbd4f3d214';

UPDATE vault_modules SET
  title = 'WhatsApp Message Dispatcher (Core)',
  description = 'Core message sending logic. Triggered by events (e.g., purchase approved), finds matching automations, renders the template with order data, and sends the message via Evolution API, logging the entire process.'
WHERE id = 'e691051a-cd8b-46a3-a292-ce4a1b319b5c';

UPDATE vault_modules SET
  title = 'WhatsApp Frontend Hooks (React Query)',
  description = 'Collection of React Query hooks for the frontend to manage WhatsApp instances, templates, automations, and message logs. Includes hooks for full CRUD, test message sending, and status polling.'
WHERE id = 'ebae6291-f016-40d3-9b4a-79b5f8b37ccb';

UPDATE vault_modules SET
  title = 'Security Audit Logger — audit-logger.ts',
  description = 'Audit system for logging critical security events: logins, key creation, access denials, etc.'
WHERE id = 'e0c22f46-0edd-4f2a-9913-1337c58b5654';

UPDATE vault_modules SET
  title = 'config.toml Setup — verify_jwt, Secrets, and Best Practices',
  description = 'Correct supabase/config.toml configuration for projects using the new sb_publishable_ and sb_secret_ keys.'
WHERE id = '8c50a4c4-2ee4-4d3a-a403-dbda6b58725a';

UPDATE vault_modules SET
  title = 'Secure Session Cookies — HttpOnly, Secure, SameSite',
  description = 'Secure session cookie pattern for web application authentication, with protection against XSS, CSRF, and interception.'
WHERE id = '8380b4fd-da99-4dad-b64c-a11460981844';

UPDATE vault_modules SET
  title = 'Secure CORS with Allowlist — cors-v2.ts',
  description = 'CORS implementation with an allowed origins list, eliminating the Access-Control-Allow-Origin: * anti-pattern.'
WHERE id = '3f5ef597-a382-49ba-8a2b-95e91ada6667';

UPDATE vault_modules SET
  title = 'DevVault API — Complete Documentation',
  description = 'Complete documentation of the DevVault API endpoints. Use this module to understand how to interact with the Knowledge OS via API without needing GitHub or Supabase access.'
WHERE id = 'd0b6fbe8-b09c-4c2e-a1be-0faad516819a';

UPDATE vault_modules SET
  title = 'Edge Function Client Pattern — edge-function-client.ts',
  description = 'Centralized client for calling Supabase Edge Functions with automatic 401 retry, error handling, and TypeScript typing.'
WHERE id = '56edbf7c-c7ba-477a-826d-a0228b0aaf4f';

UPDATE vault_modules SET
  title = 'Auth Hooks Pattern — useAuthUser and useAuthRole',
  description = 'React hooks for selectively accessing authenticated user data, avoiding unnecessary re-renders.'
WHERE id = 'dd4555d1-9a31-434e-b09e-755e09766d92';

UPDATE vault_modules SET
  title = 'API Response Helpers — createSuccessResponse and createErrorResponse',
  description = 'Utility functions for creating standardized HTTP responses in Edge Functions with included CORS headers.'
WHERE id = '8e918d67-d47d-4413-9e26-029c7ef303ca';

UPDATE vault_modules SET
  title = 'SQL Schema Patterns — UUID, TIMESTAMPTZ, JSONB, and Soft Delete',
  description = 'Naming conventions and data types for SQL tables in Supabase, extracted from production-validated patterns.'
WHERE id = 'd9ddc685-2a8a-482d-ab56-c0d97dc5c2eb';

UPDATE vault_modules SET
  title = 'Mandatory Edge Function Pipeline — withSentry + handleCorsV2 + rateLimitMiddleware',
  description = 'The security pipeline every Edge Function must follow, in the correct order. Extracted from production-validated patterns in RiseCheckout.'
WHERE id = '36609909-332b-46cf-a8b2-4e24c03d9aaa';

UPDATE vault_modules SET
  title = 'IP and Action-Based Rate Limiting — rate-limit-guard.ts',
  description = 'Rate limiting system using a database table with different configurations per action type.'
WHERE id = '4af498f0-2afe-4095-802e-089674112ea9';

UPDATE vault_modules SET
  title = 'Granular RLS — Per-Operation Policies with service_role',
  description = 'Row Level Security pattern with separate policies per operation (SELECT, INSERT, UPDATE, DELETE) and explicit service_role policy.'
WHERE id = '2dd64f55-d229-4cac-a09a-e85a569d1223';

UPDATE vault_modules SET
  title = 'Multi-Key Domain Isolation System — supabase-client.ts',
  description = 'Multi-key system for Supabase clients that uses different SERVICE_ROLE_KEYs per functional domain to limit blast radius.'
WHERE id = '8075cfbd-1427-4fd0-8782-c3b1703f364a';

UPDATE vault_modules SET
  title = 'Supabase Vault — Using vault.create_secret() and vault.decrypted_secrets',
  description = 'Guide on storing and retrieving sensitive data using Supabase Vault functions for encryption at rest.'
WHERE id = '1d4626eb-50ef-4f68-9b73-089201b02963';

-- Also translate why_it_matters for the playbook modules and other Portuguese ones
UPDATE vault_modules SET why_it_matters = CASE id
  WHEN '6721ded7-e8c0-4879-9fa0-f3eeecba87a0' THEN 'Starting without a solid foundation is the #1 cause of rework. Defining the design system, folder structure, and Supabase configuration early prevents painful refactoring later.'
  WHEN '895f4d1c-edec-4f98-9543-20ed441a067f' THEN 'Poorly implemented authentication is the most common source of security vulnerabilities. Getting it right from the start prevents having to refactor the entire auth system later.'
  WHEN '3e68f6a3-c1f0-4db7-87e2-3e11a83704e0' THEN 'A poorly designed schema is extremely hard to migrate in production. Setting up correct RLS from the start prevents data leaks. Configuring Vault before you need it avoids migrating sensitive data later.'
  WHEN '309ee5bf-b445-4fd5-9ae3-e6b42edd5849' THEN 'Edge Functions are the security layer between frontend and database. Implementing them correctly from the start ensures all business logic is protected.'
  WHEN '277f4552-2027-439f-8d23-b56441057c66' THEN 'A well-structured frontend is as important as the backend. Poorly organized components, hooks that access the database directly, and missing error handling create a bad UX and unmaintainable code.'
  WHEN 'e0c22f46-0edd-4f2a-9913-1337c58b5654' THEN 'Without auditing, you cannot know who did what and when. In a security incident, audit logs are the only way to understand what happened and who was affected.'
  WHEN '8c50a4c4-2ee4-4d3a-a403-dbda6b58725a' THEN 'The most common mistake when migrating to new Supabase keys is forgetting to set verify_jwt = false. The new sb_publishable_ and sb_secret_ keys are not JWTs — Supabase cannot verify them as such and returns 401 on every call.'
  WHEN '8380b4fd-da99-4dad-b64c-a11460981844' THEN 'Storing JWT tokens in localStorage exposes the application to XSS attacks — any malicious script can steal the token. HttpOnly cookies are inaccessible to JavaScript, eliminating this attack vector.'
  WHEN '3f5ef597-a382-49ba-8a2b-95e91ada6667' THEN 'Using Access-Control-Allow-Origin: * allows any website on the internet to call your Edge Functions. With an allowlist, only known domains (your production app, Lovable preview, localhost) can make requests.'
  WHEN 'd0b6fbe8-b09c-4c2e-a1be-0faad516819a' THEN 'Any AI agent can query this module to understand how to use the DevVault API. It is the single source of truth (SSOT) for all available endpoints.'
  WHEN '56edbf7c-c7ba-477a-826d-a0228b0aaf4f' THEN 'Calling Edge Functions directly from each React component creates duplicated and inconsistent code. A centralized client ensures all errors are handled the same way, the JWT token is always included, and a 401 triggers an automatic refresh.'
  WHEN 'dd4555d1-9a31-434e-b09e-755e09766d92' THEN 'Using the auth context directly in all components causes cascading re-renders when any user data changes. Selective hooks that return only what the component needs drastically reduce re-renders.'
  WHEN '8e918d67-d47d-4413-9e26-029c7ef303ca' THEN 'Inconsistent responses across functions make frontend error handling difficult. With standardized utility functions, the frontend always knows the exact response format.'
  WHEN 'd9ddc685-2a8a-482d-ab56-c0d97dc5c2eb' THEN 'Schema inconsistencies (mixing INT and UUID as PKs, using TIMESTAMP without timezone, using VARCHAR without reason) create hard-to-trace bugs and make future migrations difficult. A consistent pattern eliminates this class of problems.'
  WHEN '36609909-332b-46cf-a8b2-4e24c03d9aaa' THEN 'Without this pipeline, errors silently disappear (no Sentry), any site can call your functions (no CORS), and an attacker can brute-force without limits (no rate limiting). Order matters: CORS must be first to respond to preflight OPTIONS before any authentication.'
  WHEN '4af498f0-2afe-4095-802e-089674112ea9' THEN 'Without rate limiting, an attacker can brute-force passwords, create hundreds of fake accounts, or overwhelm the API. IP-based rate limiting is the first line of defense against these attacks.'
  ELSE why_it_matters
END
WHERE id IN ('6721ded7-e8c0-4879-9fa0-f3eeecba87a0','895f4d1c-edec-4f98-9543-20ed441a067f','3e68f6a3-c1f0-4db7-87e2-3e11a83704e0','309ee5bf-b445-4fd5-9ae3-e6b42edd5849','277f4552-2027-439f-8d23-b56441057c66','e0c22f46-0edd-4f2a-9913-1337c58b5654','8c50a4c4-2ee4-4d3a-a403-dbda6b58725a','8380b4fd-da99-4dad-b64c-a11460981844','3f5ef597-a382-49ba-8a2b-95e91ada6667','d0b6fbe8-b09c-4c2e-a1be-0faad516819a','56edbf7c-c7ba-477a-826d-a0228b0aaf4f','dd4555d1-9a31-434e-b09e-755e09766d92','8e918d67-d47d-4413-9e26-029c7ef303ca','d9ddc685-2a8a-482d-ab56-c0d97dc5c2eb','36609909-332b-46cf-a8b2-4e24c03d9aaa','4af498f0-2afe-4095-802e-089674112ea9');
