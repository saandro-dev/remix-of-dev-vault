/**
 * mcp-tools/diagnose.ts — devvault_diagnose tool.
 *
 * The troubleshooting tool: given an error message or problem description,
 * finds modules that solve it by searching common_errors[].error,
 * solves_problems[], and fallback ILIKE in usage_hint/why_it_matters.
 */

import { createLogger } from "../logger.ts";
import { trackUsage } from "./usage-tracker.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:diagnose");

export const registerDiagnoseTool: ToolRegistrar = (server, client, auth) => {
  server.tool("devvault_diagnose", {
    description:
      "Troubleshooting tool: send an error message or problem description and get " +
      "modules that solve it. Searches in common_errors[].error, solves_problems[], " +
      "and falls back to ILIKE in usage_hint/why_it_matters. Returns matching modules " +
      "with relevance context and quick_fix suggestions from common_errors.",
    inputSchema: {
      type: "object",
      properties: {
        error_message: {
          type: "string",
          description: "The error message or problem description to diagnose",
        },
        domain: {
          type: "string",
          enum: ["security", "backend", "frontend", "architecture", "devops", "saas_playbook"],
          description: "Optional domain filter to narrow results",
        },
        limit: { type: "number", description: "Max results (default 5, max 20)" },
      },
      required: ["error_message"],
    },
    handler: async (params: Record<string, unknown>) => {
      const errorMsg = params.error_message as string;
      const domain = params.domain as string | undefined;
      const limit = Math.min(Number(params.limit ?? 5), 20);

      logger.info("invoked", { errorMsg: errorMsg.substring(0, 100), domain });

      try {
        // Strategy 1: Search common_errors JSONB for matching error text
        let query1 = client
          .from("vault_modules")
          .select("id, slug, title, description, domain, common_errors, solves_problems, usage_hint, why_it_matters, difficulty, estimated_minutes")
          .eq("visibility", "global")
          .in("validation_status", ["validated", "draft"])
          .not("common_errors", "eq", "[]")
          .not("common_errors", "is", null);

        if (domain) query1 = query1.eq("domain", domain);

        const { data: commonErrorModules } = await query1.limit(50);

        // Filter common_errors matches in-memory (JSONB text matching)
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
                id: mod.id,
                slug: mod.slug,
                title: mod.title,
                domain: mod.domain,
                match_type: "common_errors",
                relevance: 0.95,
                quick_fix: entry.fix,
                error_cause: entry.cause,
                matched_error: entry.error,
                difficulty: mod.difficulty,
                estimated_minutes: mod.estimated_minutes,
              });
              break; // one match per module is enough
            }
          }
        }

        // Strategy 2: Search solves_problems array
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
              id: mod.id,
              slug: mod.slug,
              title: mod.title,
              domain: mod.domain,
              match_type: "solves_problems",
              relevance: 0.8,
              matched_problem: matchedProblem,
              difficulty: mod.difficulty,
              estimated_minutes: mod.estimated_minutes,
            });
            matchedIds.add(mod.id as string);
          }
        }

        // Strategy 3: ILIKE fallback in usage_hint and why_it_matters via RPC
        const { data: ilikeFallback } = await client.rpc("query_vault_modules", {
          p_query: errorMsg,
          p_domain: domain ?? null,
          p_limit: limit,
        });

        const ilikeMatches: Array<Record<string, unknown>> = [];
        for (const mod of (ilikeFallback ?? []) as Record<string, unknown>[]) {
          if (matchedIds.has(mod.id as string)) continue;
          ilikeMatches.push({
            id: mod.id,
            slug: mod.slug,
            title: mod.title,
            domain: mod.domain,
            match_type: "text_search",
            relevance: Number(mod.relevance_score ?? 0.5),
            difficulty: mod.difficulty,
            estimated_minutes: mod.estimated_minutes,
          });
          matchedIds.add(mod.id as string);
        }

        // Combine and sort by relevance
        const allMatches = [...errorMatches, ...solvesMatches, ...ilikeMatches]
          .sort((a, b) => (b.relevance as number) - (a.relevance as number))
          .slice(0, limit);

        // Track analytics
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
          ilikeMatches: ilikeMatches.length,
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              diagnosis: {
                query: errorMsg,
                total_matches: allMatches.length,
                match_breakdown: {
                  common_errors: errorMatches.length,
                  solves_problems: solvesMatches.length,
                  text_search: ilikeMatches.length,
                },
              },
              matching_modules: allMatches,
              _hint: allMatches.length > 0
                ? "Use devvault_get with a module's slug to fetch the full code and implementation details."
                : "No matching modules found. Consider rephrasing the error or broadening the search. " +
                  "You can also use devvault_search with keywords from the error.",
            }, null, 2),
          }],
        };
      } catch (err) {
        logger.error("uncaught error", { error: String(err) });
        return { content: [{ type: "text", text: `Uncaught error: ${String(err)}` }] };
      }
    },
  });
};
