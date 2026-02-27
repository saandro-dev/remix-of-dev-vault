/**
 * vault-query — Public query endpoint for the DevVault Knowledge OS.
 *
 * Allows any AI agent to query the module library
 * without needing JWT, GitHub, or direct Supabase access.
 *
 * Authentication: DevVault API Key (header X-DevVault-Key)
 *
 * Actions:
 *   POST {"action": "search", "query": "vault encryption", "domain": "security"}
 *   POST {"action": "get", "id": "uuid"} or {"action": "get", "slug": "supabase-vault-..."}
 *   POST {"action": "list_domains"}
 *   POST {"action": "list", "domain": "architecture", "module_type": "playbook_phase"}
 *   POST {"action": "bootstrap"}
 */

import { withSentry } from "../_shared/sentry.ts";
import { handleCorsV2 } from "../_shared/cors-v2.ts";
import { checkRateLimit } from "../_shared/rate-limit-guard.ts";
import { getSupabaseClient } from "../_shared/supabase-client.ts";
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from "../_shared/api-helpers.ts";
import { validateApiKey } from "../_shared/api-key-guard.ts";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("vault-query");

Deno.serve(withSentry("vault-query", async (req: Request) => {
  // 1. CORS
  const corsResponse = handleCorsV2(req);
  if (corsResponse) return corsResponse;

  // 2. Rate Limiting
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimit = await checkRateLimit(clientIp, "vault-query", 60, 60);
  if (!rateLimit.allowed) {
    return createErrorResponse(req, ERROR_CODES.RATE_LIMITED, "Rate limit exceeded. Maximum 60 requests per minute.", 429);
  }

  // 3. Authentication via DevVault API Key
  const apiKeyHeader = req.headers.get("X-DevVault-Key") ?? req.headers.get("x-devvault-key");
  if (!apiKeyHeader) {
    return createErrorResponse(
      req,
      ERROR_CODES.UNAUTHORIZED,
      "API Key required. Send header X-DevVault-Key with your dvlt_... key.",
      401
    );
  }

  const supabase = getSupabaseClient("general");
  const keyValidation = await validateApiKey(supabase, apiKeyHeader);
  if (!keyValidation.valid) {
    logger.warn("Invalid API key", { ip: clientIp, prefix: apiKeyHeader.substring(0, 8) });
    return createErrorResponse(req, ERROR_CODES.UNAUTHORIZED, "Invalid or revoked API Key.", 401);
  }

  // 4. Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Invalid JSON body.", 400);
  }

  const action = body.action as string;
  if (!action) {
    return createErrorResponse(
      req,
      ERROR_CODES.VALIDATION_ERROR,
      "Field 'action' is required. Values: search | get | list | list_domains | bootstrap",
      400
    );
  }

  logger.info("vault-query request", { action, ip: clientIp });

  // 5. Route by action
  switch (action) {

    // ── BOOTSTRAP: full context for AI agents in one call ────────────────
    case "bootstrap": {
      const { data, error } = await supabase.rpc("bootstrap_vault_context");

      if (error) {
        logger.error("Bootstrap error", { error: error.message });
        return createErrorResponse(req, ERROR_CODES.INTERNAL_ERROR, "Error bootstrapping vault context.", 500);
      }

      return createSuccessResponse(req, data ?? { domains: [], playbook_phases: [], top_modules: [] });
    }

    // ── SEARCH: full-text bilingual search with filters ──────────────────
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
        logger.error("Search error", { error: error.message });
        return createErrorResponse(req, ERROR_CODES.INTERNAL_ERROR, "Error searching modules.", 500);
      }

      return createSuccessResponse(req, {
        modules: data ?? [],
        total: (data ?? []).length,
        query: { query, domain, module_type: moduleType, tags, saas_phase: saasPhase, limit, offset },
      });
    }

    // ── GET: fetch module by ID or slug ──────────────────────────────────
    case "get": {
      const id   = (body.id as string) ?? null;
      const slug = (body.slug as string) ?? null;

      if (!id && !slug) {
        return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Provide 'id' (UUID) or 'slug' of the module.", 400);
      }

      const { data, error } = await supabase.rpc("get_vault_module", {
        p_id:   id,
        p_slug: slug,
      });

      if (error) {
        logger.error("Get module error", { error: error.message });
        return createErrorResponse(req, ERROR_CODES.INTERNAL_ERROR, "Error fetching module.", 500);
      }

      if (!data || data.length === 0) {
        return createErrorResponse(req, ERROR_CODES.NOT_FOUND, "Module not found.", 404);
      }

      const mod = data[0] as Record<string, unknown>;

      // Enrich with dependencies (HATEOAS links)
      const { data: deps } = await supabase
        .from("vault_module_dependencies")
        .select("id, depends_on_id, dependency_type")
        .eq("module_id", mod.id);

      const depIds = (deps ?? []).map((d: Record<string, unknown>) => d.depends_on_id as string);
      let depMods: Record<string, { title: string; slug: string | null }> = {};
      if (depIds.length > 0) {
        const { data: mods } = await supabase
          .from("vault_modules")
          .select("id, title, slug")
          .in("id", depIds);
        for (const m of mods ?? []) {
          depMods[(m as Record<string, unknown>).id as string] = {
            title: (m as Record<string, unknown>).title as string,
            slug: (m as Record<string, unknown>).slug as string | null,
          };
        }
      }

      const dependencies = (deps ?? []).map((d: Record<string, unknown>) => ({
        id: d.id,
        module_id: d.depends_on_id,
        title: depMods[d.depends_on_id as string]?.title ?? "Unknown",
        dependency_type: d.dependency_type,
        fetch_url: `/rest/v1/rpc/get_vault_module?p_id=${d.depends_on_id}`,
      }));

      return createSuccessResponse(req, { module: { ...mod, dependencies } });
    }

    // ── LIST: list modules with filters (no text search) ─────────────────
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
        logger.error("List modules error", { error: error.message });
        return createErrorResponse(req, ERROR_CODES.INTERNAL_ERROR, "Error listing modules.", 500);
      }

      return createSuccessResponse(req, {
        modules: data ?? [],
        total: (data ?? []).length,
        filters: { domain, module_type: moduleType, saas_phase: saasPhase, tags, limit, offset },
      });
    }

    // ── LIST_DOMAINS: list available domains with counts ─────────────────
    case "list_domains": {
      const { data, error } = await supabase.rpc("list_vault_domains");

      if (error) {
        logger.error("List domains error", { error: error.message });
        return createErrorResponse(req, ERROR_CODES.INTERNAL_ERROR, "Error listing domains.", 500);
      }

      return createSuccessResponse(req, { domains: data ?? [] });
    }

    // ── DEFAULT ──────────────────────────────────────────────────────────
    default:
      return createErrorResponse(
        req,
        ERROR_CODES.VALIDATION_ERROR,
        `Invalid action '${action}'. Accepted values: search | get | list | list_domains | bootstrap`,
        400
      );
  }
}));
