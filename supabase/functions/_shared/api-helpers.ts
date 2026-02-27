/**
 * api-helpers.ts — Standardized response helpers for Edge Functions.
 *
 * Centralizes the creation of success and error responses, ensuring
 * consistent JSON format and secure CORS headers across the entire API.
 *
 * All responses use origin-validated CORS from cors-v2.ts (allowlist-based).
 */

import { getCorsHeaders } from "./cors-v2.ts";
export { handleCorsV2 } from "./cors-v2.ts";

export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_API_KEY: "INVALID_API_KEY",
  RATE_LIMITED: "RATE_LIMITED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Creates a standardized success response with secure origin-validated CORS.
 *
 * @param req    - The incoming request (used to determine CORS origin)
 * @param data   - The response payload (will be JSON-serialized)
 * @param status - HTTP status code (default: 200)
 */
export function createSuccessResponse(
  req: Request,
  data: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

/**
 * Creates a standardized error response with secure origin-validated CORS.
 *
 * @param req     - The incoming request (used to determine CORS origin)
 * @param code    - Machine-readable error code from ERROR_CODES
 * @param message - Human-readable error description
 * @param status  - HTTP status code
 */
export function createErrorResponse(
  req: Request,
  code: ErrorCode,
  message: string,
  status: number,
): Response {
  return new Response(
    JSON.stringify({ error: { code, message } }),
    {
      status,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    },
  );
}

/**
 * Extracts the real client IP address, considering proxies and Cloudflare.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Extracts the Bearer token from the Authorization header.
 * Returns null if the header is absent or malformed.
 */
export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  return token.length > 0 ? token : null;
}
