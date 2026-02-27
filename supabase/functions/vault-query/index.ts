/**
 * vault-query — Endpoint público de busca no Knowledge OS do DevVault
 *
 * Permite que qualquer agente de IA consulte a biblioteca de módulos
 * sem precisar de JWT, GitHub ou acesso direto ao Supabase.
 *
 * Autenticação: API Key do DevVault (header X-DevVault-Key)
 *
 * Endpoints:
 *   POST {"action": "search", "query": "vault criptografia", "domain": "security"}
 *   POST {"action": "get", "id": "uuid"} ou {"action": "get", "slug": "supabase-vault-..."}
 *   POST {"action": "list_domains"}
 *   POST {"action": "list", "domain": "architecture", "module_type": "playbook_phase"}
 */

import { withSentry } from "../_shared/sentry.ts";
import { handleCorsV2 } from "../_shared/cors-v2.ts";
import { checkRateLimit, RATE_LIMIT_CONFIGS } from "../_shared/rate-limit-guard.ts";
import { getSupabaseClient } from "../_shared/supabase-client.ts";
import { createSuccessResponse, createErrorResponse } from "../_shared/api-helpers.ts";
import { validateApiKey } from "../_shared/api-key-guard.ts";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("vault-query");

Deno.serve(withSentry(async (req: Request) => {
  // 1. CORS
  const corsResponse = handleCorsV2(req);
  if (corsResponse) return corsResponse;

  // 2. Rate Limiting (mais permissivo para leitura)
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimit = await checkRateLimit(clientIp, "vault-query", 60, 60);
  if (!rateLimit.allowed) {
    return createErrorResponse("Rate limit excedido. Máximo 60 requisições por minuto.", 429);
  }

  // 3. Autenticação via API Key do DevVault
  const apiKeyHeader = req.headers.get("X-DevVault-Key") ?? req.headers.get("x-devvault-key");
  if (!apiKeyHeader) {
    return createErrorResponse(
      "API Key obrigatória. Envie o header X-DevVault-Key com sua chave dvlt_...",
      401
    );
  }

  const supabase = getSupabaseClient("general");
  const keyValidation = await validateApiKey(supabase, apiKeyHeader);
  if (!keyValidation.valid) {
    logger.warn("API key inválida", { ip: clientIp, prefix: apiKeyHeader.substring(0, 8) });
    return createErrorResponse("API Key inválida ou revogada.", 401);
  }

  // 4. Parse do body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse("Body JSON inválido.", 400);
  }

  const action = body.action as string;
  if (!action) {
    return createErrorResponse(
      "Campo 'action' obrigatório. Valores: search | get | list | list_domains",
      400
    );
  }

  logger.info("vault-query request", { action, ip: clientIp });

  // 5. Roteamento por action
  switch (action) {

    // ── SEARCH: busca full-text com filtros ──────────────────────────────
    case "search": {
      const query       = (body.query as string) ?? null;
      const domain      = (body.domain as string) ?? null;
      const moduleType  = (body.module_type as string) ?? null;
      const tags        = (body.tags as string[]) ?? null;
      const saasPhase   = (body.saas_phase as number) ?? null;
      const limit       = Math.min((body.limit as number) ?? 10, 50);
      const offset      = (body.offset as number) ?? 0;

      const { data, error } = await supabase.rpc("query_vault_modules", {
        p_query:       query,
        p_domain:      domain,
        p_module_type: moduleType,
        p_tags:        tags,
        p_saas_phase:  saasPhase,
        p_limit:       limit,
        p_offset:      offset,
      });

      if (error) {
        logger.error("Erro na busca", { error: error.message });
        return createErrorResponse("Erro ao buscar módulos.", 500);
      }

      return createSuccessResponse({
        modules: data ?? [],
        total: (data ?? []).length,
        query: { query, domain, module_type: moduleType, tags, saas_phase: saasPhase, limit, offset },
      });
    }

    // ── GET: buscar módulo por ID ou slug ────────────────────────────────
    case "get": {
      const id   = (body.id as string) ?? null;
      const slug = (body.slug as string) ?? null;

      if (!id && !slug) {
        return createErrorResponse("Informe 'id' (UUID) ou 'slug' do módulo.", 400);
      }

      const { data, error } = await supabase.rpc("get_vault_module", {
        p_id:   id,
        p_slug: slug,
      });

      if (error) {
        logger.error("Erro ao buscar módulo", { error: error.message });
        return createErrorResponse("Erro ao buscar módulo.", 500);
      }

      if (!data || data.length === 0) {
        return createErrorResponse("Módulo não encontrado.", 404);
      }

      return createSuccessResponse({ module: data[0] });
    }

    // ── LIST: listar módulos com filtros (sem busca textual) ─────────────
    case "list": {
      const domain      = (body.domain as string) ?? null;
      const moduleType  = (body.module_type as string) ?? null;
      const saasPhase   = (body.saas_phase as number) ?? null;
      const tags        = (body.tags as string[]) ?? null;
      const limit       = Math.min((body.limit as number) ?? 20, 100);
      const offset      = (body.offset as number) ?? 0;

      const { data, error } = await supabase.rpc("query_vault_modules", {
        p_query:       null,
        p_domain:      domain,
        p_module_type: moduleType,
        p_tags:        tags,
        p_saas_phase:  saasPhase,
        p_limit:       limit,
        p_offset:      offset,
      });

      if (error) {
        logger.error("Erro ao listar módulos", { error: error.message });
        return createErrorResponse("Erro ao listar módulos.", 500);
      }

      return createSuccessResponse({
        modules: data ?? [],
        total: (data ?? []).length,
        filters: { domain, module_type: moduleType, saas_phase: saasPhase, tags, limit, offset },
      });
    }

    // ── LIST_DOMAINS: listar domínios disponíveis com contagem ───────────
    case "list_domains": {
      const { data, error } = await supabase.rpc("list_vault_domains");

      if (error) {
        logger.error("Erro ao listar domínios", { error: error.message });
        return createErrorResponse("Erro ao listar domínios.", 500);
      }

      return createSuccessResponse({ domains: data ?? [] });
    }

    // ── DEFAULT ──────────────────────────────────────────────────────────
    default:
      return createErrorResponse(
        `Action '${action}' inválida. Valores aceitos: search | get | list | list_domains`,
        400
      );
  }
}));
