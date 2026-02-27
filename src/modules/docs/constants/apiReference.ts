import type { ApiEndpoint, ApiSection } from "../types";

export const API_BASE_URL =
  "https://bskfnthwewhpfrldbhqx.supabase.co/functions/v1";

export const authSection: ApiSection = {
  id: "authentication",
  title: "Autenticação",
  content: `Todas as requisições à API devem incluir uma chave válida gerada em **Configurações → API & Integrações**.

A chave (prefixo \`dvlt_\`) deve ser enviada em **um** dos headers:

| Header | Formato |
|--------|---------|
| \`x-api-key\` | \`dvlt_xxxxxxxxxxxxxxxx\` |
| \`Authorization\` | \`Bearer dvlt_xxxxxxxxxxxxxxxx\` |

As chaves são armazenadas criptografadas via **Supabase Vault (pgsodium)**. Após a criação, o valor completo é exibido **uma única vez** — copie e guarde em local seguro.`,
};

export const rateLimitSection: ApiSection = {
  id: "rate-limiting",
  title: "Rate Limiting",
  content: `A API impõe limite de **60 requisições por minuto** por endereço IP.

Ao exceder o limite, todas as requisições subsequentes retornam **429 Too Many Requests** e o IP fica bloqueado por **5 minutos**.

O header de resposta incluirá \`retryAfterSeconds\` indicando o tempo restante de bloqueio.`,
};

export const auditSection: ApiSection = {
  id: "audit-log",
  title: "Audit Log",
  content: `Todas as chamadas à API são registradas automaticamente na tabela \`devvault_api_audit_log\`, incluindo:

- **user_id** — dono da API key usada
- **api_key_id** — referência à chave utilizada
- **ip_address** — IP de origem
- **action** — nome da edge function invocada
- **success** — booleano de sucesso/falha
- **http_status** — código HTTP retornado
- **error_code / error_message** — detalhes em caso de falha
- **processing_time_ms** — tempo de processamento
- **request_body** — payload parcial (título e categoria apenas, sem código)`,
};

export const vaultIngestEndpoint: ApiEndpoint = {
  id: "vault-ingest",
  method: "POST",
  path: "/vault-ingest",
  summary: "Ingerir módulo no Cofre Global",
  description:
    "Cria um novo módulo de código no Cofre Global do usuário autenticado via API key. Ideal para automações, scripts de CI/CD e agentes de IA que precisam salvar snippets programaticamente.",
  params: [
    {
      name: "title",
      type: "string",
      required: true,
      description: "Título descritivo do módulo",
      constraints: "5–150 caracteres",
    },
    {
      name: "code",
      type: "string",
      required: true,
      description: "Código-fonte do snippet",
      constraints: "Mínimo 10 caracteres",
    },
    {
      name: "language",
      type: "string",
      required: true,
      description: 'Linguagem de programação (ex: "typescript", "python", "bash")',
    },
    {
      name: "category",
      type: "string",
      required: true,
      description: "Categoria do módulo",
      constraints: '"frontend" | "backend" | "devops" | "security"',
    },
    {
      name: "description",
      type: "string",
      required: false,
      description: "Descrição curta do propósito do módulo",
    },
    {
      name: "tags",
      type: "string[]",
      required: false,
      description: "Array de tags para busca e organização",
      constraints: "Máximo 10 itens",
    },
    {
      name: "dependencies",
      type: "string",
      required: false,
      description: "Dependências externas necessárias (texto livre)",
    },
    {
      name: "context_markdown",
      type: "string",
      required: false,
      description: "Contexto adicional em Markdown (instruções de uso, notas, etc.)",
    },
    {
      name: "is_public",
      type: "boolean",
      required: false,
      description: "Se o módulo deve ser público. Padrão: false",
    },
  ],
  responses: [
    {
      status: 201,
      label: "Created",
      description: "Módulo criado com sucesso",
      body: JSON.stringify(
        {
          success: true,
          data: {
            module: {
              id: "uuid-do-modulo",
              title: "Hook useDebounce",
              category: "frontend",
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
      description: "JSON inválido no corpo da requisição",
      body: JSON.stringify(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
        null,
        2,
      ),
    },
    {
      status: 401,
      label: "Unauthorized",
      description: "API key ausente, inválida ou revogada",
      body: JSON.stringify(
        { success: false, error: { code: "INVALID_API_KEY", message: "Invalid or missing API key" } },
        null,
        2,
      ),
    },
    {
      status: 405,
      label: "Method Not Allowed",
      description: "Método HTTP diferente de POST",
      body: JSON.stringify(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Only POST allowed" } },
        null,
        2,
      ),
    },
    {
      status: 422,
      label: "Unprocessable Entity",
      description: "Payload válido como JSON mas com campos inválidos",
      body: JSON.stringify(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: 'title must be a string between 5-150 characters',
          },
        },
        null,
        2,
      ),
    },
    {
      status: 429,
      label: "Too Many Requests",
      description: "Rate limit excedido (60 req/min). IP bloqueado por 5 minutos",
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
      description: "Erro interno ao inserir no banco de dados",
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
    "category": "frontend",
    "description": "Custom hook para debounce de valores reativos",
    "tags": ["react", "hooks", "debounce"],
    "is_public": false
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
      category: "frontend",
      description: "Custom hook para debounce de valores reativos",
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
        "category": "frontend",
        "description": "Custom hook para debounce de valores reativos",
        "tags": ["react", "hooks", "debounce"],
    },
)

print(response.status_code)
print(response.json())`,
    },
  ],
};

export const allEndpoints: ApiEndpoint[] = [vaultIngestEndpoint];

export const allSections: ApiSection[] = [authSection, rateLimitSection, auditSection];
