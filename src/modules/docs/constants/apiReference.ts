import type { ApiEndpoint, ApiSection } from "../types";

export const API_BASE_URL =
  "https://bskfnthwewhpfrldbhqx.supabase.co/functions/v1";

export const authSection: ApiSection = {
  id: "authentication",
  title: "Authentication",
  content: `All API requests must include a valid key generated in **Settings → API & Integrations**.

The key (prefix \`dvlt_\`) must be sent in **one** of the following headers:

| Header | Format |
|--------|--------|
| \`x-api-key\` | \`dvlt_xxxxxxxxxxxxxxxx\` |
| \`Authorization\` | \`Bearer dvlt_xxxxxxxxxxxxxxxx\` |

Keys are stored encrypted via **Supabase Vault (pgsodium)**. After creation, the full value is shown **only once** — copy and store it securely.`,
};

export const rateLimitSection: ApiSection = {
  id: "rate-limiting",
  title: "Rate Limiting",
  content: `The API enforces a limit of **60 requests per minute** per IP address.

When the limit is exceeded, all subsequent requests return **429 Too Many Requests** and the IP is blocked for **5 minutes**.

The response header will include \`retryAfterSeconds\` indicating the remaining block time.`,
};

export const auditSection: ApiSection = {
  id: "audit-log",
  title: "Audit Log",
  content: `All API calls are automatically logged in the \`devvault_api_audit_log\` table, including:

- **user_id** — owner of the API key used
- **api_key_id** — reference to the key used
- **ip_address** — source IP
- **action** — edge function name invoked
- **success** — success/failure boolean
- **http_status** — HTTP status code returned
- **error_code / error_message** — details on failure
- **processing_time_ms** — processing time
- **request_body** — partial payload (title and domain only, no code)`,
};

export const vaultIngestEndpoint: ApiEndpoint = {
  id: "vault-ingest",
  method: "POST",
  path: "/vault-ingest",
  summary: "Ingest module into the Global Vault",
  description:
    "Creates a new code module in the authenticated user's Global Vault via API key. Ideal for automations, CI/CD scripts, and AI agents that need to save snippets programmatically.",
  params: [
    {
      name: "title",
      type: "string",
      required: true,
      description: "Descriptive title of the module",
      constraints: "5–150 characters",
    },
    {
      name: "code",
      type: "string",
      required: true,
      description: "Source code of the snippet",
      constraints: "Minimum 10 characters",
    },
    {
      name: "language",
      type: "string",
      required: true,
      description: 'Programming language (e.g. "typescript", "python", "bash")',
    },
    {
      name: "domain",
      type: "string",
      required: true,
      description: "Module domain",
      constraints: '"security" | "backend" | "frontend" | "architecture" | "devops" | "saas_playbook"',
    },
    {
      name: "description",
      type: "string",
      required: false,
      description: "Short description of the module's purpose",
    },
    {
      name: "tags",
      type: "string[]",
      required: false,
      description: "Array of tags for search and organization",
      constraints: "Maximum 10 items",
    },
    {
      name: "dependencies",
      type: "string",
      required: false,
      description: "External dependencies required (free text)",
    },
    {
      name: "context_markdown",
      type: "string",
      required: false,
      description: "Additional context in Markdown (usage instructions, notes, etc.)",
    },
    {
      name: "visibility",
      type: "string",
      required: false,
      description: "Module visibility level. Default: \"private\"",
      constraints: '"private" | "shared" | "global"',
    },
  ],
  responses: [
    {
      status: 201,
      label: "Created",
      description: "Module created successfully",
      body: JSON.stringify(
        {
          success: true,
          data: {
            module: {
              id: "uuid-of-module",
              title: "Hook useDebounce",
              domain: "frontend",
              visibility: "private",
              created_at: "2026-02-27T12:00:00.000Z",
            },
          },
        },
        null,
        2,
      ),
    },
    {
      status: 400,
      label: "Bad Request",
      description: "Invalid JSON in request body",
      body: JSON.stringify(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
        null,
        2,
      ),
    },
    {
      status: 401,
      label: "Unauthorized",
      description: "API key missing, invalid, or revoked",
      body: JSON.stringify(
        { success: false, error: { code: "INVALID_API_KEY", message: "Invalid or missing API key" } },
        null,
        2,
      ),
    },
    {
      status: 405,
      label: "Method Not Allowed",
      description: "HTTP method other than POST",
      body: JSON.stringify(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Only POST allowed" } },
        null,
        2,
      ),
    },
    {
      status: 422,
      label: "Unprocessable Entity",
      description: "Valid JSON payload but with invalid fields",
      body: JSON.stringify(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "title must be a string between 5-150 characters",
          },
        },
        null,
        2,
      ),
    },
    {
      status: 429,
      label: "Too Many Requests",
      description: "Rate limit exceeded (60 req/min). IP blocked for 5 minutes",
      body: JSON.stringify(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Retry after 300s",
          },
        },
        null,
        2,
      ),
    },
    {
      status: 500,
      label: "Internal Server Error",
      description: "Internal error during database insertion",
      body: JSON.stringify(
        { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
        null,
        2,
      ),
    },
  ],
  examples: [
    {
      language: "bash",
      label: "cURL",
      code: `curl -X POST \\
  "${API_BASE_URL}/vault-ingest" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: dvlt_YOUR_KEY_HERE" \\
  -d '{
    "title": "Hook useDebounce",
    "code": "export function useDebounce<T>(value: T, delay: number): T {\\n  const [debounced, setDebounced] = useState(value);\\n  useEffect(() => {\\n    const timer = setTimeout(() => setDebounced(value), delay);\\n    return () => clearTimeout(timer);\\n  }, [value, delay]);\\n  return debounced;\\n}",
    "language": "typescript",
    "domain": "frontend",
    "description": "Custom hook for debouncing reactive values",
    "tags": ["react", "hooks", "debounce"],
    "visibility": "private"
  }'`,
    },
    {
      language: "javascript",
      label: "JavaScript (fetch)",
      code: `const response = await fetch(
  "${API_BASE_URL}/vault-ingest",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "dvlt_YOUR_KEY_HERE",
    },
    body: JSON.stringify({
      title: "Hook useDebounce",
      code: \`export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}\`,
      language: "typescript",
      domain: "frontend",
      description: "Custom hook for debouncing reactive values",
      tags: ["react", "hooks", "debounce"],
    }),
  }
);

const data = await response.json();
console.log(data);`,
    },
    {
      language: "python",
      label: "Python (requests)",
      code: `import requests

response = requests.post(
    "${API_BASE_URL}/vault-ingest",
    headers={
        "Content-Type": "application/json",
        "x-api-key": "dvlt_YOUR_KEY_HERE",
    },
    json={
        "title": "Hook useDebounce",
        "code": """export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}""",
        "language": "typescript",
        "domain": "frontend",
        "description": "Custom hook for debouncing reactive values",
        "tags": ["react", "hooks", "debounce"],
    },
)

print(response.status_code)
print(response.json())`,
    },
  ],
};

export const vaultQueryBootstrapEndpoint: ApiEndpoint = {
  id: "vault-query-bootstrap",
  method: "POST",
  path: "/vault-query",
  summary: "Bootstrap Vault Context (for AI Agents)",
  description:
    "Returns all available domains, playbook phases, and top validated modules in a single call. Designed for AI agents to bootstrap their context before interacting with the Knowledge OS.",
  params: [
    {
      name: "action",
      type: "string",
      required: true,
      description: 'Must be "bootstrap"',
      constraints: '"bootstrap"',
    },
  ],
  responses: [
    {
      status: 200,
      label: "OK",
      description: "Full context returned successfully",
      body: JSON.stringify(
        {
          success: true,
          data: {
            domains: [
              { domain: "backend", total: 12, module_types: ["code_snippet", "full_module"] },
              { domain: "security", total: 5, module_types: ["pattern_guide"] },
            ],
            playbook_phases: [
              {
                id: "uuid",
                slug: "phase-1-foundation",
                title: "Phase 1 — Foundation",
                saas_phase: 1,
                phase_title: "Foundation",
                why_it_matters: "Sets up the core architecture...",
                tags: ["foundation", "setup"],
                validation_status: "validated",
              },
            ],
            top_modules: [
              {
                id: "uuid",
                slug: "supabase-vault-encrypt",
                title: "Supabase Vault Encryption",
                domain: "security",
                module_type: "pattern_guide",
                language: "sql",
                tags: ["vault", "encryption"],
                validation_status: "validated",
              },
            ],
          },
        },
        null,
        2,
      ),
    },
    {
      status: 401,
      label: "Unauthorized",
      description: "API key missing, invalid, or revoked",
      body: JSON.stringify(
        { success: false, error: { code: "INVALID_API_KEY", message: "Invalid or missing API key" } },
        null,
        2,
      ),
    },
  ],
  examples: [
    {
      language: "bash",
      label: "cURL",
      code: `curl -X POST \\
  "${API_BASE_URL}/vault-query" \\
  -H "Content-Type: application/json" \\
  -H "X-DevVault-Key: dvlt_YOUR_KEY_HERE" \\
  -d '{"action": "bootstrap"}'`,
    },
    {
      language: "javascript",
      label: "JavaScript (fetch)",
      code: `const response = await fetch(
  "${API_BASE_URL}/vault-query",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-DevVault-Key": "dvlt_YOUR_KEY_HERE",
    },
    body: JSON.stringify({ action: "bootstrap" }),
  }
);

const { data } = await response.json();
console.log(data.domains);
console.log(data.playbook_phases);
console.log(data.top_modules);`,
    },
    {
      language: "python",
      label: "Python (requests)",
      code: `import requests

response = requests.post(
    "${API_BASE_URL}/vault-query",
    headers={
        "Content-Type": "application/json",
        "X-DevVault-Key": "dvlt_YOUR_KEY_HERE",
    },
    json={"action": "bootstrap"},
)

data = response.json()["data"]
print(data["domains"])
print(data["playbook_phases"])
print(data["top_modules"])`,
    },
  ],
};

export const vaultQuerySearchEndpoint: ApiEndpoint = {
  id: "vault-query-search",
  method: "POST",
  path: "/vault-query",
  summary: "Search Modules (Bilingual PT + EN)",
  description:
    "Full-text bilingual search across all public modules. Queries are matched against both Portuguese and English search vectors, returning the highest relevance score.",
  params: [
    {
      name: "action",
      type: "string",
      required: true,
      description: 'Must be "search"',
      constraints: '"search"',
    },
    {
      name: "query",
      type: "string",
      required: false,
      description: "Search query (works in both Portuguese and English)",
    },
    {
      name: "domain",
      type: "string",
      required: false,
      description: "Filter by domain",
      constraints: '"security" | "backend" | "frontend" | "architecture" | "devops" | "saas_playbook"',
    },
    {
      name: "module_type",
      type: "string",
      required: false,
      description: "Filter by module type",
      constraints: '"code_snippet" | "full_module" | "sql_migration" | "architecture_doc" | "playbook_phase" | "pattern_guide"',
    },
    {
      name: "tags",
      type: "string[]",
      required: false,
      description: "Filter by tags (AND match)",
    },
    {
      name: "saas_phase",
      type: "number",
      required: false,
      description: "Filter by SaaS playbook phase number",
    },
    {
      name: "limit",
      type: "number",
      required: false,
      description: "Max results to return. Default: 10, Max: 50",
    },
    {
      name: "offset",
      type: "number",
      required: false,
      description: "Offset for pagination. Default: 0",
    },
  ],
  responses: [
    {
      status: 200,
      label: "OK",
      description: "Search results returned",
      body: JSON.stringify(
        {
          success: true,
          data: {
            modules: [{ id: "uuid", title: "Module Title", relevance_score: 0.85, "...": "..." }],
            total: 1,
            query: { query: "encryption", domain: null, limit: 10, offset: 0 },
          },
        },
        null,
        2,
      ),
    },
  ],
  examples: [
    {
      language: "bash",
      label: "cURL",
      code: `curl -X POST \\
  "${API_BASE_URL}/vault-query" \\
  -H "Content-Type: application/json" \\
  -H "X-DevVault-Key: dvlt_YOUR_KEY_HERE" \\
  -d '{"action": "search", "query": "encryption vault", "domain": "security"}'`,
    },
  ],
};

export const allEndpoints: ApiEndpoint[] = [
  vaultIngestEndpoint,
  vaultQueryBootstrapEndpoint,
  vaultQuerySearchEndpoint,
];

export const allSections: ApiSection[] = [authSection, rateLimitSection, auditSection];
