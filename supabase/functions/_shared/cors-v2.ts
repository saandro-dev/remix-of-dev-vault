/**
 * cors-v2.ts — CORS handler com allowlist de origens seguras.
 *
 * Diferente do cors simples com "*", este módulo valida a origem
 * da requisição contra uma lista de domínios permitidos, bloqueando
 * requisições de origens desconhecidas.
 *
 * Padrão extraído do RiseCheckout (validado em produção).
 */

const ALLOWED_ORIGINS_RAW = Deno.env.get("ALLOWED_ORIGINS") ?? "";

/**
 * Origens permitidas. Em produção, configure a variável de ambiente
 * ALLOWED_ORIGINS com os domínios separados por vírgula.
 * Ex: "https://devvault.app,https://www.devvault.app"
 *
 * Em desenvolvimento (variável não configurada), permite localhost.
 */
const ALLOWED_ORIGINS: string[] = ALLOWED_ORIGINS_RAW
  ? ALLOWED_ORIGINS_RAW.split(",").map((o) => o.trim()).filter(Boolean)
  : [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://lovable.dev",
    ];

const BASE_CORS_HEADERS = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

/**
 * Retorna os headers CORS corretos para a origem da requisição.
 * Se a origem não for permitida, retorna headers sem Allow-Origin.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const isAllowed = ALLOWED_ORIGINS.some(
    (allowed) => allowed === origin || origin.endsWith(".lovable.app"),
  );

  if (isAllowed) {
    return {
      ...BASE_CORS_HEADERS,
      "Access-Control-Allow-Origin": origin,
      "Vary": "Origin",
    };
  }

  // Origem não permitida — retorna sem Allow-Origin para bloquear o browser
  return BASE_CORS_HEADERS;
}

/**
 * Trata requisições OPTIONS (preflight CORS).
 * Retorna null se não for OPTIONS, ou uma Response 204 se for.
 */
export function handleCorsV2(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}
