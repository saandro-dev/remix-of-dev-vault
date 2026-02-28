# DevVault - Content Standards Guide

> **🔴 MAXIMUM SOURCE OF TRUTH** — This document defines the rules and standards that **all** AI agents must follow when adding or modifying content in DevVault. The goal is to ensure consistency, quality, and maximum usability for agents consuming this knowledge.
> Last updated: 2026-02-28
> Maintainer: AI Architect

---

## Fundamental Principles

1.  **English First:** All text fields (`title`, `description`, `why_it_matters`, etc.) **must** be written in English. Tags may contain Portuguese terms if they are highly relevant for search.
2.  **Atomicity:** Each module must represent a single idea, pattern, or code snippet. Avoid monolithic modules. If a concept is too large, break it into multiple modules and group them using the `module_group` field.
3.  **Validation > Draft:** The goal is to have a validated knowledge vault. Whenever possible, add content that has been tested and proven in a real project. The `draft` status should be temporary.
4.  **Context is King:** A code snippet without context is useless. The fields `why_it_matters` and `usage_hint` are **mandatory** and must explain the problem the module solves and when it should be used.

---

## Module Structure (`vault_modules`)

This section details the purpose and correct filling of each field in the `vault_modules` table.

### Identification Fields

| Field | Type | Required | Description and Standard |
| :--- | :--- | :--- | :--- |
| `title` | `text` | ✅ Yes | **Concise, descriptive title in English.** Must be self-explanatory. E.g.: "Secure Session Cookies — HttpOnly, Secure, SameSite". |
| `slug` | `text` | ❌ No | **URL-friendly slug.** If omitted, will be generated from the title. E.g.: `secure-session-cookies`. |
| `description` | `text` | ❌ No | Slightly longer description than the title, if needed. |

### Classification Fields

| Field | Type | Required | Description and Valid Values |
| :--- | :--- | :--- | :--- |
| `domain` | `enum` | ✅ Yes | **The broad knowledge area.** Values: `security`, `backend`, `frontend`, `architecture`, `devops`, `saas_playbook`. |
| `module_type` | `enum` | ✅ Yes | **The content format.** Values: `code_snippet`, `full_module`, `sql_migration`, `architecture_doc`, `playbook_phase`, `pattern_guide`. |
| `language` | `text` | ✅ Yes | **The primary code language.** E.g.: `typescript`, `sql`, `bash`, `python`. Use `text` for documents. |
| `tags` | `text[]` | ✅ Yes | **Array of tags for search.** At least one tag is required. Use lowercase. E.g.: `["auth", "cookies", "security"]`. |

### Main Content Fields

| Field | Type | Required | Description and Standard |
| :--- | :--- | :--- | :--- |
| `code` | `text` | ✅ Yes | **The code snippet, SQL script, or document body.** Must be complete and functional. |
| `database_schema` | `text` | ❌ No | **The SQL migration/schema required for this module to work.** E.g.: `CREATE TABLE subscriptions (...)`. Include the exact DDL so agents can create the required tables automatically. |
| `why_it_matters` | `text` | ✅ Yes | **English explanation of why this module is important.** What problem does it solve? What vulnerability does it prevent? E.g.: "Storing JWTs in localStorage exposes the app to XSS attacks. HttpOnly cookies eliminate this vector." |
| `usage_hint` | `text` | ✅ Yes | **Clear instruction on when and how to use this module.** E.g.: "Use when storing auth tokens in cookies instead of localStorage to prevent XSS token theft." |
| `code_example` | `text` | ✅ Yes | **Practical example of how to use the code from the `code` field.** Show the function call, the `import`, etc. |
| `context_markdown` | `text` | ❌ No | Additional Markdown documentation for longer explanations, if needed. |

### Operational Depth Fields (AI Agent Support)

These fields provide critical operational context that transforms DevVault from a "code repository" into a "technical co-pilot". They help agents debug, validate, and understand implementation difficulty.

| Field | Type | Required | Description and Standard |
| :--- | :--- | :--- | :--- |
| `common_errors` | `jsonb` | ❌ No | **Array of common errors with causes and fixes.** Each entry must have `error`, `cause`, and `fix` keys. E.g.: `[{"error": "TypeError: Cannot read property 'id' of undefined", "cause": "Missing RLS policy on table X", "fix": "Run: ALTER TABLE x ENABLE ROW LEVEL SECURITY..."}]`. |
| `solves_problems` | `text[]` | ❌ No | **Array of problem descriptions this module solves.** Used for problem-based search. E.g.: `["webhook not receiving events", "API returning 401", "instance stuck in connecting state"]`. |
| `test_code` | `text` | ❌ No | **Quick validation code to confirm the module works after implementation.** E.g.: `"const result = await evo.getConnectionState('test');\nassert(result.state !== undefined, 'Client is working');"`. |
| `difficulty` | `text` | ❌ No | **Implementation difficulty level.** Values: `beginner`, `intermediate`, `advanced`. Default: `intermediate`. |
| `estimated_minutes` | `integer` | ❌ No | **Estimated implementation time in minutes.** E.g.: `15`, `45`, `120`. |
| `prerequisites` | `jsonb[]` | ❌ No | **Environment prerequisites (not module dependencies).** E.g.: `["Supabase Vault enabled", "pgcrypto extension", "Environment variable: EVOLUTION_API_URL"]`. |

### Grouping and Ordering Fields

| Field | Type | Required | Description and Standard |
| :--- | :--- | :--- | :--- |
| `module_group` | `text` | ❌ No | **Groups related modules that are not direct dependencies.** Use a lowercase slug. E.g.: `whatsapp-integration`. |
| `implementation_order` | `integer` | ❌ No | **Defines the implementation order within a `module_group`.** Use 1, 2, 3... |
| `saas_phase` | `integer` | ❌ No | **Associates the module with a SaaS Playbook phase.** Only for modules that fit the playbook. |
| `phase_title` | `text` | ❌ No | **SaaS Playbook phase title.** Must be consistent with `saas_phase`. E.g.: "Phase 2: Authentication and Security". |

### Relationship Fields

| Field | Type | Required | Description and Standard |
| :--- | :--- | :--- | :--- |
| `related_modules` | `uuid[]` | ❌ No | **Array of UUIDs of related modules.** The MCP `devvault_get` tool automatically resolves these UUIDs to `{id, slug, title}` objects for agent convenience. Use this to link contextually related modules (e.g., "audit-logging" ↔ "rls-policies"). |
| `dependencies` | `text` | ❌ No | **(LEGACY)** Do not use this field. Dependencies are managed by the `vault_module_dependencies` table. |

### Metadata Fields

| Field | Type | Required | Description and Standard |
| :--- | :--- | :--- | :--- |
| `source_project` | `text` | ✅ Yes | **The project name where this module was validated.** E.g.: `risecheckout`. |
| `validation_status` | `enum` | ✅ Yes | **The validation status.** Start with `draft` and change to `validated` after review. Values: `draft`, `validated`, `deprecated`. |
| `visibility` | `enum` | ✅ Yes | **Who can see this module.** Default is `private`. Use `global` for shared knowledge. Values: `private`, `shared`, `global`. |

---

## Module Changelog (`vault_module_changelog`)

The `vault_module_changelog` table tracks version history for modules. Each entry represents a version bump with a list of changes. This enables agents to understand what changed between versions without losing historical context.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Auto | Primary key. |
| `module_id` | `uuid` | ✅ Yes | FK to `vault_modules.id`. Cascades on delete. |
| `version` | `text` | ✅ Yes | Semantic version string. E.g.: `"1.1.0"`, `"2.0.0"`. |
| `changes` | `text[]` | ✅ Yes | Array of change descriptions. E.g.: `["Added retry logic", "Fixed timeout handling"]`. |
| `created_at` | `timestamptz` | Auto | Timestamp of the changelog entry. |

The MCP `devvault_get` tool automatically includes the changelog history when fetching a module.

---

## The SaaS Playbook

The `saas_playbook` is a special domain that organizes SaaS construction in phases. Modules of type `playbook_phase` define these phases. Other modules can associate with a phase using the `saas_phase` and `phase_title` fields.

| `saas_phase` | `phase_title` |
| :--- | :--- |
| 1 | Foundation and Project Setup |
| 2 | Authentication and Security |
| 3 | Database and Encryption |
| 4 | Edge Functions |
| 5 | Frontend and UX |

---

## How to Add Content (via API `vault-ingest`)

To add content, an agent must send a `POST` request to the Edge Function `vault-ingest` with the appropriate `action`.

**Endpoint:** `https://bskfnthwewhpfrldbhqx.supabase.co/functions/v1/vault-ingest`
**Authentication:** Header `X-DevVault-Key: dvlt_...`

### Action: `ingest` (Creation)

The request body can be a single module object or an array of modules in the `modules` field.

```json
{
  "action": "ingest",
  "modules": [
    {
      "title": "My New Validated Pattern",
      "domain": "backend",
      "module_type": "pattern_guide",
      "language": "text",
      "tags": ["design-pattern", "solid"],
      "code": "The actual content of the pattern guide in Markdown...",
      "why_it_matters": "This pattern reduces coupling and improves maintainability by...",
      "usage_hint": "Apply this pattern when you have multiple services that need to...",
      "code_example": "N/A",
      "source_project": "my-new-saas",
      "validation_status": "validated",
      "visibility": "global",
      "difficulty": "intermediate",
      "estimated_minutes": 30,
      "solves_problems": ["high coupling between services", "difficult to swap implementations"],
      "common_errors": [
        {
          "error": "TypeError: service.execute is not a function",
          "cause": "Missing interface implementation",
          "fix": "Ensure the class implements the required interface methods"
        }
      ],
      "test_code": "const svc = new MyService();\nassert(typeof svc.execute === 'function');",
      "prerequisites": ["TypeScript 5+", "Node.js 18+"]
    }
  ]
}
```

### Actions: `update` and `delete`

To update or delete, send the corresponding `action` and the `id` of the module to be modified.

```json
{
  "action": "update",
  "id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
  "validation_status": "deprecated",
  "common_errors": [{"error": "...", "cause": "...", "fix": "..."}]
}
```

```json
{
  "action": "delete",
  "id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6"
}
```

By following these standards, we ensure that DevVault becomes a high-quality knowledge asset, accelerating future project development consistently and securely.
