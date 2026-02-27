/**
 * mcp-tools/auth.ts — MCP authentication middleware.
 *
 * Validates the X-DevVault-Key / X-API-Key / Bearer token
 * against Supabase Vault, then checks rate limits.
 * Returns AuthContext on success, or a JSON-RPC error Response on failure.
 */

import { validateApiKey } from "../api-key-guard.ts";
import { getSupabaseClient } from "../supabase-client.ts";
import { checkRateLimit } from "../rate-limit-guard.ts";
import type { AuthContext } from "./types.ts";

const MCP_RATE_LIMIT = {
  maxAttempts: 120,
  windowSeconds: 60,
  blockSeconds: 120,
};

export async function authenticateRequest(req: Request): Promise<AuthContext | Response> {
  const rawKey =
    req.headers.get("x-devvault-key") ??
    req.headers.get("x-api-key") ??
    req.headers.get("Authorization")?.replace("Bearer ", "").trim();

  if (!rawKey) {
    return jsonRpcError(401, -32001, "Missing X-DevVault-Key header");
  }

  const client = getSupabaseClient("admin");
  const result = await validateApiKey(client, rawKey);

  if (!result.valid || !result.userId || !result.keyId) {
    return jsonRpcError(401, -32001, "Invalid or revoked API key");
  }

  const rateCheck = await checkRateLimit(result.userId, "devvault-mcp", MCP_RATE_LIMIT);
  if (rateCheck.blocked) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32002, message: `Rate limited. Retry after ${rateCheck.retryAfterSeconds}s` },
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rateCheck.retryAfterSeconds),
        },
      },
    );
  }

  return { userId: result.userId, keyId: result.keyId };
}

function jsonRpcError(status: number, code: number, message: string): Response {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", error: { code, message } }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}
