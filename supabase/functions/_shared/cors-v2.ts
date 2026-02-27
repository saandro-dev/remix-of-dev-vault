/**
 * cors-v2.ts — CORS handler with origin allowlist.
 *
 * Unlike a simple wildcard CORS ("*"), this module validates the request
 * origin against a list of allowed domains, blocking requests from
 * unknown origins.
 */

const ALLOWED_ORIGINS_RAW = Deno.env.get("ALLOWED_ORIGINS") ?? "";

/**
 * Allowed origins. In production, set the ALLOWED_ORIGINS environment
 * variable with comma-separated domains.
 * E.g.: "https://devvault.app,https://www.devvault.app"
 *
 * In development (variable not set), localhost is allowed by default.
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
 * Returns the correct CORS headers for the request origin.
 * If the origin is not in the allowlist, returns headers without Allow-Origin,
 * causing the browser to block the response.
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

  // Origin not allowed — return without Allow-Origin to let the browser block it
  return BASE_CORS_HEADERS;
}

/**
 * Handles OPTIONS preflight CORS requests.
 * Returns null if not OPTIONS, or a 204 Response if it is.
 */
export function handleCorsV2(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}
