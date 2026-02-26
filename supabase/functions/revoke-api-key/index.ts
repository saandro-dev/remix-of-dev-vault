import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withSentry } from "../_shared/sentry.ts";
import { handleCorsV2, createSuccessResponse, createErrorResponse, ERROR_CODES, getClientIp, extractBearerToken } from "../_shared/api-helpers.ts";
import { getSupabaseClient, getUserFromToken } from "../_shared/supabase-client.ts";
import { checkRateLimit } from "../_shared/rate-limit-guard.ts";
import { createLogger } from "../_shared/logger.ts";

serve(
  withSentry("revoke-api-key", async (req) => {
    const log = createLogger("revoke-api-key");

    // 1. CORS preflight
    const corsResponse = handleCorsV2(req);
    if (corsResponse) return corsResponse;

    if (req.method !== "POST") {
      return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Only POST allowed", 405);
    }

    // 2. Rate limiting por IP
    const clientIp = getClientIp(req);
    const rl = await checkRateLimit(clientIp, "revoke-api-key");
    if (rl.blocked) {
      log.warn("Rate limit exceeded", { ip: clientIp });
      return createErrorResponse(
        req,
        ERROR_CODES.RATE_LIMITED,
        `Too many requests. Try again in ${rl.retryAfterSeconds}s.`,
        429,
      );
    }

    // 3. Autenticação do usuário via JWT
    const token = extractBearerToken(req);
    if (!token) {
      return createErrorResponse(req, ERROR_CODES.UNAUTHORIZED, "Missing authorization", 401);
    }

    const user = await getUserFromToken(token);
    if (!user) {
      log.warn("Auth failed", { ip: clientIp });
      return createErrorResponse(req, ERROR_CODES.UNAUTHORIZED, "Invalid token", 401);
    }

    // 4. Validação do payload
    let body: { key_id?: unknown };
    try {
      body = await req.json();
    } catch {
      return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body", 400);
    }

    const { key_id } = body;
    if (!key_id || typeof key_id !== "string") {
      return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "key_id is required", 422);
    }

    // 5. Revogar a chave via função SQL vault-backed (remove do Vault também)
    const adminClient = getSupabaseClient("admin");
    const { data: revoked, error } = await adminClient.rpc("revoke_devvault_api_key", {
      p_key_id: key_id,
      p_user_id: user.id,
    });

    if (error) {
      log.error("Failed to revoke API key", { userId: user.id, keyId: key_id, error: error.message });
      throw error;
    }

    if (!revoked) {
      return createErrorResponse(req, ERROR_CODES.NOT_FOUND, "Key not found or already revoked", 404);
    }

    log.info("API key revoked", { userId: user.id, keyId: key_id });
    return createSuccessResponse(req, { revoked: true });
  }),
);
