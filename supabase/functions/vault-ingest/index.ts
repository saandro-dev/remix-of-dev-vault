import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCorsV2 } from "../_shared/cors-v2.ts";
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from "../_shared/api-helpers.ts";
import { getSupabaseClient } from "../_shared/supabase-client.ts";
import { validateApiKey } from "../_shared/api-key-guard.ts";
import { withSentry } from "../_shared/sentry.ts";
import { log } from "../_shared/logger.ts";

// vault-ingest: endpoint público para ingestão de módulos via API Key
// Usado por agentes de IA para popular a biblioteca automaticamente
serve(withSentry("vault-ingest", async (req: Request) => {
  const corsResponse = handleCorsV2(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Only POST allowed", 405);
  }

  // Autenticação via API Key (não JWT)
  const apiKeyHeader = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!apiKeyHeader) {
    return createErrorResponse(ERROR_CODES.UNAUTHORIZED, "Missing API key", 401);
  }

  const client = getSupabaseClient("general");
  const keyValidation = await validateApiKey(client, apiKeyHeader);
  if (!keyValidation.valid) {
    log("warn", "vault-ingest", `Invalid API key attempt`);
    return createErrorResponse(ERROR_CODES.UNAUTHORIZED, "Invalid API key", 401);
  }

  const { user_id: userId } = keyValidation;

  try {
    const body = await req.json();

    // Suporte a ingestão em batch (array) ou individual (objeto)
    const modules = Array.isArray(body) ? body : [body];

    if (modules.length === 0) {
      return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Empty payload", 422);
    }

    if (modules.length > 50) {
      return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Max 50 modules per request", 422);
    }

    const toInsert = modules.map((mod) => {
      if (!mod.title) throw new Error(`Module missing required field: title`);
      return {
        user_id: userId,
        title: mod.title,
        description: mod.description || null,
        domain: mod.domain || mod.category || "backend",
        module_type: mod.module_type || "code_snippet",
        language: mod.language || "typescript",
        code: mod.code || "",
        context_markdown: mod.context_markdown || null,
        dependencies: mod.dependencies || null,
        tags: mod.tags || [],
        saas_phase: mod.saas_phase || null,
        phase_title: mod.phase_title || null,
        why_it_matters: mod.why_it_matters || null,
        code_example: mod.code_example || null,
        source_project: mod.source_project || null,
        validation_status: mod.validation_status || "draft",
        related_modules: mod.related_modules || [],
        is_public: mod.is_public ?? false,
      };
    });

    const { data, error } = await client
      .from("vault_modules")
      .insert(toInsert)
      .select("id, title, domain, module_type, validation_status");

    if (error) throw error;

    log("info", "vault-ingest", `Ingested ${data.length} modules for user=${userId}`);
    return createSuccessResponse({
      ingested: data.length,
      modules: data,
    }, 201);

  } catch (err) {
    log("error", "vault-ingest", err.message);
    return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, err.message, 500);
  }
}));
