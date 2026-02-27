/**
 * vault-ingest — Endpoint de escrita no Knowledge OS do DevVault
 *
 * Permite que agentes de IA criem, atualizem e deletem módulos
 * sem precisar de JWT, GitHub ou acesso direto ao Supabase.
 *
 * Autenticação: API Key do DevVault (header X-DevVault-Key ou x-api-key)
 *
 * Actions:
 *   POST {"action": "ingest", "modules": [...]}   — criar módulos (batch até 50)
 *   POST {"action": "ingest", "title": "..."}     — criar módulo único
 *   POST {"action": "update", "id": "uuid", ...}  — atualizar módulo existente
 *   POST {"action": "delete", "id": "uuid"}       — deletar módulo
 */

import { withSentry } from "../_shared/sentry.ts";
import { handleCorsV2 } from "../_shared/cors-v2.ts";
import { checkRateLimit, RATE_LIMIT_CONFIGS } from "../_shared/rate-limit-guard.ts";
import { getSupabaseClient } from "../_shared/supabase-client.ts";
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from "../_shared/api-helpers.ts";
import { validateApiKey } from "../_shared/api-key-guard.ts";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("vault-ingest");

Deno.serve(withSentry(async (req: Request) => {
  // 1. CORS
  const corsResponse = handleCorsV2(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Apenas POST é aceito.", 405);
  }

  // 2. Rate Limiting
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimit = await checkRateLimit(clientIp, "vault-ingest", RATE_LIMIT_CONFIGS.create.max, RATE_LIMIT_CONFIGS.create.window);
  if (!rateLimit.allowed) {
    return createErrorResponse(ERROR_CODES.RATE_LIMITED, "Rate limit excedido.", 429);
  }

  // 3. Autenticação via API Key
  const apiKeyHeader =
    req.headers.get("X-DevVault-Key") ??
    req.headers.get("x-devvault-key") ??
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!apiKeyHeader) {
    return createErrorResponse(
      ERROR_CODES.UNAUTHORIZED,
      "API Key obrigatória. Envie o header X-DevVault-Key com sua chave dvlt_...",
      401
    );
  }

  const supabase = getSupabaseClient("general");
  const keyValidation = await validateApiKey(supabase, apiKeyHeader);
  if (!keyValidation.valid) {
    logger.warn("API key inválida", { ip: clientIp, prefix: apiKeyHeader.substring(0, 8) });
    return createErrorResponse(ERROR_CODES.UNAUTHORIZED, "API Key inválida ou revogada.", 401);
  }

  const userId = keyValidation.user_id;

  // 4. Parse do body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Body JSON inválido.", 400);
  }

  // Detectar action — compatibilidade retroativa: se não tiver action, assume ingest
  const action = (body.action as string) ?? "ingest";

  logger.info("vault-ingest request", { action, ip: clientIp, userId });

  // 5. Roteamento por action
  switch (action) {

    // ── INGEST: criar módulos (individual ou batch) ──────────────────────
    case "ingest": {
      // Suporte a: {"action":"ingest","modules":[...]} ou {"action":"ingest","title":"..."}
      // ou retrocompatibilidade: array direto ou objeto direto sem action
      let rawModules: unknown[];
      if (Array.isArray(body.modules)) {
        rawModules = body.modules;
      } else if (Array.isArray(body)) {
        rawModules = body as unknown[];
      } else if (body.title) {
        rawModules = [body];
      } else {
        return createErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          "Informe 'modules' (array) ou os campos do módulo diretamente.",
          422
        );
      }

      if (rawModules.length === 0) {
        return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Payload vazio.", 422);
      }
      if (rawModules.length > 50) {
        return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Máximo 50 módulos por requisição.", 422);
      }

      const toInsert = rawModules.map((mod: unknown) => {
        const m = mod as Record<string, unknown>;
        if (!m.title) throw new Error(`Módulo sem campo obrigatório: title`);
        return {
          user_id:          userId,
          title:            m.title,
          description:      m.description ?? null,
          domain:           m.domain ?? m.category ?? "backend",
          module_type:      m.module_type ?? "code_snippet",
          language:         m.language ?? "typescript",
          code:             m.code ?? "",
          context_markdown: m.context_markdown ?? null,
          dependencies:     m.dependencies ?? null,
          tags:             m.tags ?? [],
          saas_phase:       m.saas_phase ?? null,
          phase_title:      m.phase_title ?? null,
          why_it_matters:   m.why_it_matters ?? null,
          code_example:     m.code_example ?? null,
          source_project:   m.source_project ?? null,
          validation_status: m.validation_status ?? "draft",
          related_modules:  m.related_modules ?? [],
          is_public:        m.is_public ?? false,
          slug:             m.slug ?? null,
        };
      });

      const { data, error } = await supabase
        .from("vault_modules")
        .insert(toInsert)
        .select("id, slug, title, domain, module_type, validation_status");

      if (error) {
        logger.error("Erro ao inserir módulos", { error: error.message });
        throw error;
      }

      logger.info(`Ingestão concluída`, { count: data.length, userId });
      return createSuccessResponse({ ingested: data.length, modules: data }, 201);
    }

    // ── UPDATE: atualizar módulo existente ───────────────────────────────
    case "update": {
      const id = body.id as string;
      if (!id) {
        return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Campo 'id' obrigatório para update.", 400);
      }

      // Verificar se o módulo pertence ao usuário
      const { data: existing, error: fetchError } = await supabase
        .from("vault_modules")
        .select("id, user_id")
        .eq("id", id)
        .single();

      if (fetchError || !existing) {
        return createErrorResponse(ERROR_CODES.NOT_FOUND, "Módulo não encontrado.", 404);
      }

      if (existing.user_id !== userId) {
        return createErrorResponse(ERROR_CODES.UNAUTHORIZED, "Sem permissão para editar este módulo.", 403);
      }

      // Campos permitidos para atualização
      const allowedFields = [
        "title", "description", "domain", "module_type", "language",
        "code", "context_markdown", "dependencies", "tags",
        "saas_phase", "phase_title", "why_it_matters", "code_example",
        "source_project", "validation_status", "related_modules",
        "is_public", "slug",
      ];

      const updates: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (field in body) {
          updates[field] = body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Nenhum campo para atualizar.", 400);
      }

      const { data, error } = await supabase
        .from("vault_modules")
        .update(updates)
        .eq("id", id)
        .select("id, slug, title, domain, module_type, validation_status, updated_at")
        .single();

      if (error) {
        logger.error("Erro ao atualizar módulo", { error: error.message, id });
        throw error;
      }

      logger.info("Módulo atualizado", { id, userId, fields: Object.keys(updates) });
      return createSuccessResponse({ updated: true, module: data });
    }

    // ── DELETE: deletar módulo ───────────────────────────────────────────
    case "delete": {
      const id = body.id as string;
      if (!id) {
        return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Campo 'id' obrigatório para delete.", 400);
      }

      // Verificar se o módulo pertence ao usuário
      const { data: existing, error: fetchError } = await supabase
        .from("vault_modules")
        .select("id, user_id, title")
        .eq("id", id)
        .single();

      if (fetchError || !existing) {
        return createErrorResponse(ERROR_CODES.NOT_FOUND, "Módulo não encontrado.", 404);
      }

      if (existing.user_id !== userId) {
        return createErrorResponse(ERROR_CODES.UNAUTHORIZED, "Sem permissão para deletar este módulo.", 403);
      }

      const { error } = await supabase
        .from("vault_modules")
        .delete()
        .eq("id", id);

      if (error) {
        logger.error("Erro ao deletar módulo", { error: error.message, id });
        throw error;
      }

      logger.info("Módulo deletado", { id, title: existing.title, userId });
      return createSuccessResponse({ deleted: true, id, title: existing.title });
    }

    // ── DEFAULT ──────────────────────────────────────────────────────────
    default:
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        `Action '${action}' inválida. Valores aceitos: ingest | update | delete`,
        400
      );
  }
}));
