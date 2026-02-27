
-- =============================================================================
-- Data Migration: Clean slugs, assign groups, set implementation_order
-- =============================================================================

-- WhatsApp integration group (7 modules)
UPDATE vault_modules SET slug = 'evolution-api-v2-client', module_group = 'whatsapp-integration', implementation_order = 1 WHERE id = '03968b5a-7db0-42f2-8f03-85b1eeca44bf';
UPDATE vault_modules SET slug = 'whatsapp-evolution-types', module_group = 'whatsapp-integration', implementation_order = 2 WHERE id = 'e138bb68-c16e-4732-8793-73b8d7c4c9c6';
UPDATE vault_modules SET slug = 'whatsapp-sql-schema', module_group = 'whatsapp-integration', implementation_order = 3 WHERE id = 'aed2617b-6183-4da8-b432-28b8ee22f291';
UPDATE vault_modules SET slug = 'whatsapp-status-webhook', module_group = 'whatsapp-integration', implementation_order = 4 WHERE id = 'f612457b-e0a2-4b4b-a90e-3ed89e1a184d';
UPDATE vault_modules SET slug = 'whatsapp-template-renderer', module_group = 'whatsapp-integration', implementation_order = 5 WHERE id = '8135a5df-0b10-4c57-8b7e-13cbd4f3d214';
UPDATE vault_modules SET slug = 'whatsapp-message-dispatcher', module_group = 'whatsapp-integration', implementation_order = 6 WHERE id = 'e691051a-cd8b-46a3-a292-ce4a1b319b5c';
UPDATE vault_modules SET slug = 'whatsapp-react-query-hooks', module_group = 'whatsapp-integration', implementation_order = 7 WHERE id = 'ebae6291-f016-40d3-9b4a-79b5f8b37ccb';

-- Security modules (clean slugs)
UPDATE vault_modules SET slug = 'security-audit-logger' WHERE id = 'e0c22f46-0edd-4f2a-9913-1337c58b5654';
UPDATE vault_modules SET slug = 'secure-session-cookies' WHERE id = '8380b4fd-da99-4dad-b64c-a11460981844';
UPDATE vault_modules SET slug = 'multi-key-domain-isolation' WHERE id = '8075cfbd-1427-4fd0-8782-c3b1703f364a';
UPDATE vault_modules SET slug = 'supabase-vault-secrets' WHERE id = '1d4626eb-50ef-4f68-9b73-089201b02963';

-- Backend infrastructure (clean slugs)
UPDATE vault_modules SET slug = 'cors-allowlist-guard' WHERE id = '3f5ef597-a382-49ba-8a2b-95e91ada6667';
UPDATE vault_modules SET slug = 'api-response-helpers' WHERE id = '8e918d67-d47d-4413-9e26-029c7ef303ca';
UPDATE vault_modules SET slug = 'edge-function-pipeline' WHERE id = '36609909-332b-46cf-a8b2-4e24c03d9aaa';
UPDATE vault_modules SET slug = 'rate-limit-guard' WHERE id = '4af498f0-2afe-4095-802e-089674112ea9';
UPDATE vault_modules SET slug = 'rls-granular-policies' WHERE id = '2dd64f55-d229-4cac-a09a-e85a569d1223';

-- Frontend modules (clean slugs)
UPDATE vault_modules SET slug = 'edge-function-client' WHERE id = '56edbf7c-c7ba-477a-826d-a0228b0aaf4f';
UPDATE vault_modules SET slug = 'auth-hooks-pattern' WHERE id = 'dd4555d1-9a31-434e-b09e-755e09766d92';

-- Architecture modules (clean slugs)
UPDATE vault_modules SET slug = 'config-toml-best-practices' WHERE id = '8c50a4c4-2ee4-4d3a-a403-dbda6b58725a';
UPDATE vault_modules SET slug = 'devvault-api-docs' WHERE id = 'd0b6fbe8-b09c-4c2e-a1be-0faad516819a';
UPDATE vault_modules SET slug = 'sql-schema-patterns' WHERE id = 'd9ddc685-2a8a-482d-ab56-c0d97dc5c2eb';

-- Playbook SaaS group
UPDATE vault_modules SET slug = 'saas-playbook-phase-1', module_group = 'saas-playbook', implementation_order = 1 WHERE id = '6721ded7-e8c0-4879-9fa0-f3eeecba87a0';
UPDATE vault_modules SET slug = 'saas-playbook-phase-2', module_group = 'saas-playbook', implementation_order = 2 WHERE id = '895f4d1c-edec-4f98-9543-20ed441a067f';
UPDATE vault_modules SET slug = 'saas-playbook-phase-3', module_group = 'saas-playbook', implementation_order = 3 WHERE id = '3e68f6a3-c1f0-4db7-87e2-3e11a83704e0';
