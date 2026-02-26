import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  handleCors,
  createSuccessResponse,
  createErrorResponse,
  ERROR_CODES,
  getClientIp,
} from "../_shared/api-helpers.ts";
import { requireApiKeyAuth } from "../_shared/api-key-guard.ts";
import { logApiCall } from "../_shared/api-audit-logger.ts";
import { checkRateLimit } from "../_shared/rate-limit-guard.ts";

const VALID_CATEGORIES = ["frontend", "backend", "devops", "security"] as const;

interface IngestPayload {
  title: string;
  code: string;
  language: string;
  category: (typeof VALID_CATEGORIES)[number];
  description?: string;
  tags?: string[];
  dependencies?: string;
  context_markdown?: string;
  is_public?: boolean;
}

function validatePayload(body: unknown): { valid: true; data: IngestPayload } | { valid: false; message: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, message: "Request body must be a JSON object" };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.title !== "string" || b.title.length < 5 || b.title.length > 150) {
    return { valid: false, message: "title must be a string between 5-150 characters" };
  }
  if (typeof b.code !== "string" || b.code.length < 10) {
    return { valid: false, message: "code must be a string with at least 10 characters" };
  }
  if (typeof b.language !== "string" || b.language.length < 1) {
    return { valid: false, message: "language is required" };
  }
  if (!VALID_CATEGORIES.includes(b.category as typeof VALID_CATEGORIES[number])) {
    return { valid: false, message: `category must be one of: ${VALID_CATEGORIES.join(", ")}` };
  }
  if (b.description !== undefined && typeof b.description !== "string") {
    return { valid: false, message: "description must be a string" };
  }
  if (b.tags !== undefined) {
    if (!Array.isArray(b.tags) || b.tags.length > 10 || !b.tags.every((t) => typeof t === "string")) {
      return { valid: false, message: "tags must be an array of strings (max 10)" };
    }
  }
  if (b.dependencies !== undefined && typeof b.dependencies !== "string") {
    return { valid: false, message: "dependencies must be a string" };
  }
  if (b.context_markdown !== undefined && typeof b.context_markdown !== "string") {
    return { valid: false, message: "context_markdown must be a string" };
  }

  return {
    valid: true,
    data: {
      title: b.title as string,
      code: b.code as string,
      language: b.language as string,
      category: b.category as IngestPayload["category"],
      description: (b.description as string) ?? null,
      tags: (b.tags as string[]) ?? [],
      dependencies: (b.dependencies as string) ?? null,
      context_markdown: (b.context_markdown as string) ?? null,
      is_public: b.is_public === true,
    },
  };
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Only POST allowed", 405);
  }

  const startTime = Date.now();
  const clientIp = getClientIp(req);

  const rateResult = await checkRateLimit(clientIp, "vault-ingest");
  if (rateResult.blocked) {
    return createErrorResponse(
      ERROR_CODES.RATE_LIMITED,
      `Too many requests. Retry after ${rateResult.retryAfterSeconds}s`,
      429,
    );
  }

  const auth = await requireApiKeyAuth(req);
  if (!auth) {
    logApiCall({
      userId: "unknown",
      ipAddress: clientIp,
      action: "vault-ingest",
      success: false,
      httpStatus: 401,
      errorCode: ERROR_CODES.INVALID_API_KEY,
      errorMessage: "Invalid or missing API key",
    });
    return createErrorResponse(ERROR_CODES.INVALID_API_KEY, "Invalid or missing API key", 401);
  }

  try {
    const body = await req.json();
    const validation = validatePayload(body);

    if (!validation.valid) {
      logApiCall({
        apiKeyId: auth.keyId,
        userId: auth.userId,
        ipAddress: clientIp,
        action: "vault-ingest",
        success: false,
        httpStatus: 422,
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        errorMessage: validation.message,
        requestBody: body,
        processingTimeMs: Date.now() - startTime,
      });
      return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, validation.message, 422);
    }

    const { data } = validation;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("DEVVAULT_SECRET_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { data: inserted, error } = await serviceClient
      .from("vault_modules")
      .insert({
        user_id: auth.userId,
        title: data.title,
        code: data.code,
        language: data.language,
        category: data.category,
        description: data.description,
        tags: data.tags ?? [],
        dependencies: data.dependencies,
        context_markdown: data.context_markdown,
        is_public: data.is_public ?? false,
      })
      .select("id, title, category, created_at")
      .single();

    if (error) throw error;

    logApiCall({
      apiKeyId: auth.keyId,
      userId: auth.userId,
      ipAddress: clientIp,
      action: "vault-ingest",
      success: true,
      httpStatus: 201,
      requestBody: { title: data.title, category: data.category },
      processingTimeMs: Date.now() - startTime,
    });

    return createSuccessResponse({ module: inserted }, 201);
  } catch (err) {
    logApiCall({
      apiKeyId: auth.keyId,
      userId: auth.userId,
      ipAddress: clientIp,
      action: "vault-ingest",
      success: false,
      httpStatus: 500,
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      errorMessage: err.message,
      processingTimeMs: Date.now() - startTime,
    });
    return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, "Internal server error", 500);
  }
});
