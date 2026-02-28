/**
 * mcp-tools/diagnose.ts — devvault_diagnose tool.
 *
 * With error_message: troubleshooting — finds modules that solve the error.
 * Without parameters: health check — returns open knowledge gaps + low-score modules.
 */

import { createLogger } from "../logger.ts";
import { generateEmbedding } from "../embedding-client.ts";
import { getCompleteness } from "./completeness.ts";
import { trackUsage } from "./usage-tracker.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:diagnose");

export const registerDiagnoseTool: ToolRegistrar = (server, client, auth) => {
  server.tool("devvault_diagnose", {
    description:
      "Troubleshooting & health check tool. With error_message: finds modules that solve " +
      "the problem (searches common_errors, solves_problems, knowledge gaps, and hybrid search). " +
      "Without parameters: returns a vault health check with open knowledge gaps and " +
      "modules with low completeness scores (<60%).",
    inputSchema: {
      type: "object",
      properties: {
        error_message: {
          type: "string",
          description: "Error message or problem description. Omit for health check mode.",
        },
        domain: {
          type: "string",
          enum: ["security", "backend", "frontend", "architecture", "devops", "saas_playbook"],
          description: "Optional domain filter",
        },
        limit: { type: "number", description: "Max results (default 5, max 20)" },
      },
      required: [],
    },
    handler: async (params: Record<string, unknown>) => {
      const errorMsg = params.error_message as string | undefined;
      const domain = params.domain as string | undefined;
      const limit = Math.min(Number(params.limit ?? 5), 20);

      // ── Health Check Mode ──
      if (!errorMsg) {
        return await handleHealthCheck(client, auth, domain, limit);
      }

      // ── Troubleshooting Mode (original logic) ──
      return await handleTroubleshooting(client, auth, errorMsg, domain, limit);
    },
  });
};

async function handleHealthCheck(
  client: Parameters<ToolRegistrar>[1],
  auth: Parameters<ToolRegistrar>[2],
  domain: string | undefined,
  limit: number,
) {
  logger.info("health check mode", { domain });

  // Parallel: open gaps + low-score modules
  const [gapsResult, modulesResult] = await Promise.all([
    (() => {
      let q = client
        .from("vault_knowledge_gaps")
        .select("id, error_message, context, domain, hit_count, status, created_at")
        .eq("status", "open")
        .order("hit_count", { ascending: false })
        .limit(limit);
      if (domain) q = q.eq("domain", domain);
      return q;
    })(),
    (() => {
      let q = client
        .from("vault_modules")
        .select("id, slug, title, domain, validation_status")
        .eq("visibility", "global")
        .in("validation_status", ["validated", "draft"])
        .order("updated_at", { ascending: false })
        .limit(50);
      if (domain) q = q.eq("domain", domain);
      return q;
    })(),
  ]);

  const gaps = (gapsResult.data ?? []) as Array<Record<string, unknown>>;

  // Calculate completeness for modules and filter low scores
  const modules = (modulesResult.data ?? []) as Array<Record<string, unknown>>;
  const lowScoreModules: Array<Record<string, unknown>> = [];

  for (const mod of modules) {
    const c = await getCompleteness(client, mod.id as string);
    if (c.score < 60) {
      lowScoreModules.push({
        id: mod.id,
        slug: mod.slug,
        title: mod.title,
        domain: mod.domain,
        score: c.score,
        missing_fields: c.missing_fields,
      });
      if (lowScoreModules.length >= limit) break;
    }
  }

  trackUsage(client, auth, {
    event_type: "health_check",
    tool_name: "devvault_diagnose",
    result_count: gaps.length + lowScoreModules.length,
  });

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        mode: "health_check",
        open_knowledge_gaps: {
          total: gaps.length,
          gaps,
        },
        low_completeness_modules: {
          total: lowScoreModules.length,
          threshold: 60,
          modules: lowScoreModules,
        },
        _hint:
          "Open gaps represent unsolved problems reported by agents. " +
          "Low-score modules need more fields filled via devvault_update. " +
          "Use devvault_resolve_bug to close gaps, devvault_validate for details.",
      }, null, 2),
    }],
  };
}

async function handleTroubleshooting(
  client: Parameters<ToolRegistrar>[1],
  auth: Parameters<ToolRegistrar>[2],
  errorMsg: string,
  domain: string | undefined,
  limit: number,
) {
  logger.info("troubleshooting", { errorMsg: errorMsg.substring(0, 100), domain });

  try {
    // Strategy 1: common_errors JSONB
    let query1 = client
      .from("vault_modules")
      .select("id, slug, title, description, domain, common_errors, solves_problems, usage_hint, why_it_matters, difficulty, estimated_minutes")
      .eq("visibility", "global")
      .in("validation_status", ["validated", "draft"])
      .not("common_errors", "eq", "[]")
      .not("common_errors", "is", null);
    if (domain) query1 = query1.eq("domain", domain);
    const { data: commonErrorModules } = await query1.limit(50);

    const errorLower = errorMsg.toLowerCase();
    const errorMatches: Array<Record<string, unknown>> = [];

    for (const mod of (commonErrorModules ?? []) as Record<string, unknown>[]) {
      const errors = mod.common_errors as Array<Record<string, string>> | null;
      if (!errors || !Array.isArray(errors)) continue;
      for (const entry of errors) {
        if (
          entry.error?.toLowerCase().includes(errorLower) ||
          errorLower.includes(entry.error?.toLowerCase() ?? "")
        ) {
          errorMatches.push({
            id: mod.id, slug: mod.slug, title: mod.title, domain: mod.domain,
            match_type: "common_errors", relevance: 0.95,
            quick_fix: entry.fix, error_cause: entry.cause, matched_error: entry.error,
            difficulty: mod.difficulty, estimated_minutes: mod.estimated_minutes,
          });
          break;
        }
      }
    }

    // Strategy 2: solves_problems
    let query2 = client
      .from("vault_modules")
      .select("id, slug, title, description, domain, solves_problems, usage_hint, difficulty, estimated_minutes")
      .eq("visibility", "global")
      .in("validation_status", ["validated", "draft"])
      .not("solves_problems", "eq", "{}");
    if (domain) query2 = query2.eq("domain", domain);
    const { data: solvesModules } = await query2.limit(50);

    const solvesMatches: Array<Record<string, unknown>> = [];
    const matchedIds = new Set(errorMatches.map((m) => m.id));

    for (const mod of (solvesModules ?? []) as Record<string, unknown>[]) {
      if (matchedIds.has(mod.id as string)) continue;
      const problems = mod.solves_problems as string[] | null;
      if (!problems) continue;
      const matchedProblem = problems.find(
        (p) => p.toLowerCase().includes(errorLower) || errorLower.includes(p.toLowerCase()),
      );
      if (matchedProblem) {
        solvesMatches.push({
          id: mod.id, slug: mod.slug, title: mod.title, domain: mod.domain,
          match_type: "solves_problems", relevance: 0.8, matched_problem: matchedProblem,
          difficulty: mod.difficulty, estimated_minutes: mod.estimated_minutes,
        });
        matchedIds.add(mod.id as string);
      }
    }

    // Strategy 3: resolved knowledge gaps
    const { data: resolvedGaps } = await client
      .from("vault_knowledge_gaps")
      .select("id, error_message, resolution, resolution_code, domain, resolved_at, promoted_module_id")
      .in("status", ["resolved", "promoted_to_module"])
      .ilike("error_message", `%${errorMsg.substring(0, 100)}%`)
      .limit(5);

    const gapMatches: Array<Record<string, unknown>> = [];
    for (const gap of (resolvedGaps ?? []) as Record<string, unknown>[]) {
      gapMatches.push({
        id: gap.id, match_type: "resolved_gap", relevance: 0.7,
        error_message: gap.error_message, resolution: gap.resolution,
        resolution_code: gap.resolution_code, domain: gap.domain,
        promoted_module_id: gap.promoted_module_id, resolved_at: gap.resolved_at,
      });
    }

    // Strategy 4: Hybrid search fallback
    let queryEmbedding: string | null = null;
    try {
      const embArr = await generateEmbedding(errorMsg);
      queryEmbedding = `[${embArr.join(",")}]`;
    } catch {
      logger.warn("diagnose: embedding generation failed, using full-text only");
    }

    const { data: ilikeFallback } = await client.rpc("hybrid_search_vault_modules", {
      p_query_text: errorMsg,
      p_query_embedding: queryEmbedding,
      p_domain: domain ?? null,
      p_match_count: limit,
    });

    const ilikeMatches: Array<Record<string, unknown>> = [];
    for (const mod of (ilikeFallback ?? []) as Record<string, unknown>[]) {
      if (matchedIds.has(mod.id as string)) continue;
      ilikeMatches.push({
        id: mod.id, slug: mod.slug, title: mod.title, domain: mod.domain,
        match_type: "text_search", relevance: Number(mod.relevance_score ?? 0.5),
        difficulty: mod.difficulty, estimated_minutes: mod.estimated_minutes,
      });
      matchedIds.add(mod.id as string);
    }

    const allMatches = [...errorMatches, ...solvesMatches, ...gapMatches, ...ilikeMatches]
      .sort((a, b) => (b.relevance as number) - (a.relevance as number))
      .slice(0, limit);

    trackUsage(client, auth, {
      event_type: allMatches.length > 0 ? "diagnose" : "search_miss",
      tool_name: "devvault_diagnose",
      query_text: errorMsg,
      result_count: allMatches.length,
    });

    logger.info("diagnosis complete", {
      total: allMatches.length,
      errorMatches: errorMatches.length,
      solvesMatches: solvesMatches.length,
      gapMatches: gapMatches.length,
      ilikeMatches: ilikeMatches.length,
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          mode: "troubleshooting",
          diagnosis: {
            query: errorMsg,
            total_matches: allMatches.length,
            match_breakdown: {
              common_errors: errorMatches.length,
              solves_problems: solvesMatches.length,
              resolved_gaps: gapMatches.length,
              text_search: ilikeMatches.length,
            },
          },
          matching_modules: allMatches,
          _hint: allMatches.length > 0
            ? "Use devvault_get with a module's slug to fetch the full code and implementation details."
            : "No solution found. Use devvault_report_bug to register this gap. " +
              "When you solve it, call devvault_resolve_bug to document the solution.",
        }, null, 2),
      }],
    };
  } catch (err) {
    logger.error("uncaught error", { error: String(err) });
    return { content: [{ type: "text", text: `Uncaught error: ${String(err)}` }] };
  }
}
