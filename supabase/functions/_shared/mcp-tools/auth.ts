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
import { createLogger } from "../logger.ts";
import type { AuthContext } from "./types.ts";

const logger = createLogger("mcp-auth");

const MCP_RATE_LIMIT = {
  maxAttempts: 120,
  windowSeconds: 60,
  blockSeconds: 120,
};

export async function authenticateRequest(req: Request): Promise<AuthContext | Response> {
  const devvaultHeader = req.headers.get("x-devvault-key");
  const apiKeyHeader = req.headers.get("x-api-key");
  const authHeader = req.headers.get("Authorization");
  const bearerValue = authHeader?.replace("Bearer ", "").trim() || null;

  const rawKey = devvaultHeader ?? apiKeyHeader ?? bearerValue;

  const source = devvaultHeader
    ? "x-devvault-key"
    : apiKeyHeader
      ? "x-api-key"
      : bearerValue
        ? "authorization"
        : "none";

  logger.info("Key extraction", {
    source,
    keyPrefix: rawKey ? rawKey.substring(0, 12) + "..." : "null",
    hasDevVaultKey: !!devvaultHeader,
    hasApiKey: !!apiKeyHeader,
    hasAuthorization: !!authHeader,
  });

  if (!rawKey) {
    logger.warn("Rejected — no key found in any header");
    return jsonRpcError(401, -32001, "Missing X-DevVault-Key header");
  }

  const client = getSupabaseClient("admin");
  const result = await validateApiKey(client, rawKey);

  logger.info("Validation result", {
    valid: result.valid,
    hasUserId: !!result.userId,
    hasKeyId: !!result.keyId,
  });

  if (!result.valid || !result.userId || !result.keyId) {
    logger.warn("Rejected — invalid or revoked key");
    return jsonRpcError(401, -32001, "Invalid or revoked API key");
  }

  const rateCheck = await checkRateLimit(result.userId, "devvault-mcp", MCP_RATE_LIMIT);
  if (rateCheck.blocked) {
    logger.warn("Rejected — rate limited", {
      retryAfter: rateCheck.retryAfterSeconds,
    });
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

  logger.info("Accepted", { userId: result.userId });
  return { userId: result.userId, keyId: result.keyId };
}

function jsonRpcError(status: number, code: number, message: string): Response {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", error: { code, message } }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}
