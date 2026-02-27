import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withSentry } from "../_shared/sentry.ts";
import { handleCorsV2, createSuccessResponse, createErrorResponse, ERROR_CODES, getClientIp, extractBearerToken } from "../_shared/api-helpers.ts";
import { getSupabaseClient, getUserFromToken } from "../_shared/supabase-client.ts";
import { checkRateLimit } from "../_shared/rate-limit-guard.ts";
import { createLogger } from "../_shared/logger.ts";

serve(
  withSentry("global-search", async (req) => {
    const log = createLogger("global-search");

    // 1. CORS preflight
    const corsResponse = handleCorsV2(req);
    if (corsResponse) return corsResponse;

    // 2. IP-based rate limiting (generous limit to preserve UX)
    const clientIp = getClientIp(req);
    const rl = await checkRateLimit(clientIp, "global-search");
    if (rl.blocked) {
      log.warn("Rate limit exceeded", { ip: clientIp });
      return createErrorResponse(
        req,
        ERROR_CODES.RATE_LIMITED,
        `Too many requests. Try again in ${rl.retryAfterSeconds}s.`,
        429,
      );
    }

    // 3. User authentication via JWT
    const token = extractBearerToken(req);
    if (!token) {
      return createErrorResponse(req, ERROR_CODES.UNAUTHORIZED, "Missing authorization", 401);
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return createErrorResponse(req, ERROR_CODES.UNAUTHORIZED, "Invalid token", 401);
    }

    // 4. Payload validation
    let body: { query?: unknown };
    try {
      body = await req.json();
    } catch {
      return createSuccessResponse(req, { results: [] });
    }

    const { query } = body;
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return createSuccessResponse(req, { results: [] });
    }

    // 5. Execute parallel search using "general" client
    const generalClient = getSupabaseClient("general");
    const searchTerm = `%${query.trim()}%`;

    const [modulesRes, projectsRes, bugsRes] = await Promise.all([
      generalClient
        .from("vault_modules")
        .select("id, title, domain, visibility")
        .or(`user_id.eq.${user.id},visibility.eq.global`)
        .ilike("title", searchTerm)
        .limit(10),
      generalClient
        .from("projects")
        .select("id, name, color")
        .eq("user_id", user.id)
        .ilike("name", searchTerm)
        .limit(10),
      generalClient
        .from("bugs")
        .select("id, title, status")
        .eq("user_id", user.id)
        .ilike("title", searchTerm)
        .limit(10),
    ]);

    const results = [
      ...(modulesRes.data ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        type: "module" as const,
        meta: m.domain,
      })),
      ...(projectsRes.data ?? []).map((p) => ({
        id: p.id,
        title: p.name,
        type: "project" as const,
        meta: p.color,
      })),
      ...(bugsRes.data ?? []).map((b) => ({
        id: b.id,
        title: b.title,
        type: "bug" as const,
        meta: b.status,
      })),
    ];

    log.info("Search completed", { userId: user.id, query: query.trim(), resultCount: results.length });
    return createSuccessResponse(req, { results });
  }),
);
