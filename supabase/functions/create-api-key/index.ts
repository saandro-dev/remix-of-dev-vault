import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withSentry } from "../_shared/sentry.ts";
import { handleCorsV2, createSuccessResponse, createErrorResponse, ERROR_CODES, getClientIp, extractBearerToken } from "../_shared/api-helpers.ts";
import { getSupabaseClient, getUserFromToken } from "../_shared/supabase-client.ts";
import { checkRateLimit } from "../_shared/rate-limit-guard.ts";
import { createLogger } from "../_shared/logger.ts";

function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randomPart = Array.from(
    crypto.getRandomValues(new Uint8Array(40)),
    (byte) => chars[byte % chars.length],
  ).join("");
  return `dvlt_${randomPart}`;
}

serve(
  withSentry("create-api-key", async (req) => {
    const log = createLogger("create-api-key");

    // 1. CORS preflight
    const corsResponse = handleCorsV2(req);
    if (corsResponse) return corsResponse;

    if (req.method !== "POST") {
      return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Only POST allowed", 405);
    }

    // 2. Rate limiting por IP (proteção contra abuso)
    const clientIp = getClientIp(req);
    const rl = await checkRateLimit(clientIp, "create-api-key");
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
    let body: { key_name?: unknown };
    try {
      body = await req.json();
    } catch {
      return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body", 400);
    }

    const { key_name } = body;
    if (!key_name || typeof key_name !== "string" || key_name.length < 2 || key_name.length > 100) {
      return createErrorResponse(
        req,
        ERROR_CODES.VALIDATION_ERROR,
        "key_name must be a string between 2-100 characters",
        422,
      );
    }

    // 5. Criar a chave via função SQL vault-backed
    const adminClient = getSupabaseClient("admin");
    const rawKey = generateApiKey();

    const { data: keyId, error } = await adminClient.rpc("create_devvault_api_key", {
      p_user_id: user.id,
      p_key_name: key_name,
      p_raw_key: rawKey,
    });

    if (error) {
      log.error("Failed to create API key", { userId: user.id, error: error.message });
      throw error;
    }

    log.info("API key created", { userId: user.id, keyId });

    return createSuccessResponse(req, {
      id: keyId,
      key_name,
      key: rawKey,
      prefix: rawKey.substring(0, 8),
      warning: "Save this key now. It will never be shown again.",
    }, 201);
  }),
);
