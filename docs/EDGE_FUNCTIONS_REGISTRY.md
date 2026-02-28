# DevVault - Edge Functions Registry

> **🔴 SINGLE SOURCE OF TRUTH** - This document lists ALL 16 Edge Functions deployed on Supabase for the DevVault project.
> Last updated: 2026-02-28
> Maintainer: AI Architect

---

## 🏆 DevVault Protocol V2 Compliance Badge

```
╔═══════════════════════════════════════════════════════════════╗
║  ✅ DEVVAULT PROTOCOL V2 - 10.0/10 - DUAL-AUTH ARCHITECTURE   ║
║     16 Edge Functions | 2 Auth Systems | Zero Legacy Code      ║
║     MCP Server v5.0: 21 Tools | Knowledge Flywheel + Tree     ║
║     Phase 3: Hybrid Search (pgvector + tsvector)               ║
║     Runtime: 100% Deno.serve() native                         ║
║     Secrets: Supabase Vault + Multi-Domain Keys               ║
║     verify_jwt: false (ALL 16 functions)                      ║
║     SECRET DOMAINS: admin | general                           ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Summary

| Metric | Value |
| :--- | :--- |
| **Total Functions** | 16 |
| **Internal Functions (Frontend)** | 12 |
| **Public Functions (External API)** | 3 |
| **Utility Functions (One-shot)** | 1 |
| **Functions with verify_jwt=true** | 0 ✅ |
| **config.toml entries** | 16 ✅ |
| **API Key System (External)** | `dvlt_` keys via Supabase Vault ✅ |
| **Security Domains (Secrets)** | 2 (admin, general) ✅ |
| **Base URL (Internal & External)** | `https://bskfnthwewhpfrldbhqx.supabase.co/functions/v1/` |

---

## 🔐 Dual Authentication Architecture

DevVault operates with two distinct and isolated authentication systems, ensuring that internal access (from the frontend application) and external access (from AI agents) have appropriate security mechanisms.

**ABSOLUTE RULE**: All 16 functions use `verify_jwt = false` in `supabase/config.toml`. Authentication is always handled inside the function code, enabling this flexible architecture.

### 1. Internal Authentication (Frontend App)

-   **Mechanism:** JWT (Bearer Token)
-   **Validation:** The helper `_shared/auth.ts` (`authenticateRequest`) validates the JWT of the user logged into Supabase Auth.
-   **Usage:** Used by all functions serving the DevVault interface. The frontend sends the user's session token, and the function validates their identity and permissions (via RLS and role checks).
-   **Functions:** 12

### 2. External Authentication (API for Agents)

-   **Mechanism:** Static API Key (`dvlt_...`)
-   **Validation:** The helper `_shared/api-key-guard.ts` (`validateApiKey`) validates the key sent in the `X-DevVault-Key` header (or `x-api-key`/`Authorization`). Validation occurs by comparing a hash of the key with the value stored securely in **Supabase Vault** through the SQL function `validate_devvault_api_key`.
-   **Usage:** Used by the public functions designated for automation and integration with AI agents, such as `devvault-mcp`.
-   **Functions:** 3

### 🔑 Multi-Secret Architecture (2 Domains)

To limit the "blast radius" in case of a key leak, the system uses two service keys (`service_role`) with different scopes, managed by the helper `_shared/supabase-client.ts`.

| Domain | Environment Variable | Purpose | Functions Using It |
| :--- | :--- | :--- | :--- |
| **admin** | `DEVVAULT_SECRET_ADMIN` | Critical high-risk operations: key creation/revocation, direct Vault access, user role changes. | `create-api-key`, `revoke-api-key`, `admin-crud` |
| **general** | `DEVVAULT_SECRET_GENERAL` | Standard daily read/write operations such as project, bug, and vault module CRUDs. | All other 12 functions |

---

## Function Registry

### Vault & Knowledge Modules

| Function | Auth | Domain | Description and Actions (`action`) |
| :--- | :--- | :--- | :--- |
| `vault-crud` | Internal (JWT) | general | **Main BFF for the Vault.** Performs all CRUD operations on the user's knowledge modules. **Actions:** `list`, `get`, `create`, `update`, `delete`, `search`, `get_playbook`, `share`, `unshare`, `list_shares`, `add_dependency`, `remove_dependency`, `list_dependencies`. |
| `vault-query` | External (API Key) | general | **Public READ endpoint for Agents.** Allows external systems to query the knowledge graph. **Actions:** `bootstrap`, `search`, `get`, `list`, `list_domains`. |
| `vault-ingest` | External (API Key) | general | **Public WRITE endpoint for Agents.** Allows external systems to create, update, and delete modules. **Actions:** `ingest` (single/batch creation), `update`, `delete`. |
| `devvault-mcp` | External (API Key) | general | **MCP Server (Model Context Protocol) for AI Agents (v5.0).** Exposes a structured API with tools to interact with the Vault. **Tools (21):** `devvault_bootstrap`, `devvault_search`, `devvault_get`, `devvault_list`, `devvault_domains`, `devvault_ingest`, `devvault_update`, `devvault_get_group`, `devvault_validate`, `devvault_delete`, `devvault_diagnose`, `devvault_report_bug`, `devvault_resolve_bug`, `devvault_report_success`, `devvault_export_tree`, `devvault_check_updates`, `devvault_load_context`, `devvault_quickstart`, `devvault_changelog`, `devvault_diary_bug`, `devvault_diary_resolve`. **v5.0 Improvements:** `devvault_validate` supports batch mode (no ID = audit all modules). `devvault_export_tree` supports optional ID (no ID = list root modules). `devvault_diagnose` supports health check mode (no params = open gaps + low-score modules). `devvault_list` and `devvault_search` include relation metadata (`has_dependencies`, `is_depended_upon`, `related_modules_count`). **New Tools (v5.0):** `devvault_load_context` loads all modules for a source_project. `devvault_quickstart` returns essential modules per domain ranked by usage. `devvault_changelog` returns version history for modules. **Bug Diary Tools (v5.1):** `devvault_diary_bug` creates entries in the user's personal Bug Diary (`bugs` table) with automatic status resolution (open/resolved based on solution presence). `devvault_diary_resolve` updates an existing bug with cause_code and solution, setting status to resolved. Both enforce ownership via `auth.userId`. **Knowledge Flywheel (v4.0):** `devvault_report_bug` registers knowledge gaps with dedup by hit_count, `devvault_resolve_bug` documents solutions and promotes to modules, `devvault_report_success` captures success patterns. `devvault_diagnose` also searches resolved gaps. **Scaffolding (v4.1):** `devvault_export_tree` resolves the full dependency tree with recursive CTE — eliminates N+1. `devvault_check_updates` compares local versions vs vault. Modules include `database_schema` (SQL) and `version` (versioning). |

### Entity Management

| Function | Auth | Domain | Description and Actions (`action`) |
| :--- | :--- | :--- | :--- |
| `projects-crud` | Internal (JWT) | general | Manages complete CRUD for the `projects` entity. **Actions:** `list`, `get`, `create`, `update`, `delete`. |
| `bugs-crud` | Internal (JWT) | general | Manages complete CRUD for the `bugs` entity (Bug Diary). **Actions:** `list`, `create`, `update`, `delete`. |
| `folders-crud` | Internal (JWT) | general | Manages CRUD for `key_folders` (project API key folders). **Actions:** `list`, `get`, `create`, `delete`. |
| `project-api-keys-crud` | Internal (JWT) | admin | Manages CRUD for project `api_keys`, interacting with the Vault to encrypt/decrypt keys. **Actions:** `list`, `create`, `read` (decrypts the key), `delete`. |

### Dashboard & Utilities

| Function | Auth | Domain | Description and Actions (`action`) |
| :--- | :--- | :--- | :--- |
| `dashboard-stats` | Internal (JWT) | general | Aggregates and returns key metrics for the user's dashboard (total projects, modules, etc.). No `action`. |
| `global-search` | Internal (JWT) | general | Performs a unified text search across `vault_modules`, `projects`, and `bugs`. No `action`. |
| `profiles-crud` | Internal (JWT) | general | Manages the logged-in user's profile. **Actions:** `get`, `update`. |

### API Keys & Administration

| Function | Auth | Domain | Description and Actions (`action`) |
| :--- | :--- | :--- | :--- |
| `create-api-key` | Internal (JWT) | admin | **Creates a new `dvlt_` key for external access.** Interacts with the SQL function `create_devvault_api_key` to save the hash in the Vault. Returns the complete key only once. No `action`. |
| `revoke-api-key` | Internal (JWT) | admin | **Revokes an existing `dvlt_` key.** Interacts with the SQL function `revoke_devvault_api_key`. No `action`. |
| `list-devvault-keys` | Internal (JWT) | general | Lists metadata (prefix, name, usage date) of the user's `dvlt_` keys. No `action`. |
| `admin-crud` | Internal (JWT) | admin | **Endpoint for the Admin Panel.** Requires `admin` or `owner` role. **Actions:** `get-my-role`, `list-users`, `change-role` (owner), `admin-stats`, `list-api-keys`, `admin-revoke-api-key` (owner), `list-global-modules`, `unpublish-module`. |

### Utilities (One-shot)

| Function | Auth | Domain | Description |
| :--- | :--- | :--- | :--- |
| `vault-backfill-embeddings` | Manual | general | **Embedding backfill for existing modules.** Processes modules with `embedding IS NULL` in batches of 20, generating embeddings via OpenAI `text-embedding-3-small`. One-shot function for manual execution after Phase 3 migration. |
