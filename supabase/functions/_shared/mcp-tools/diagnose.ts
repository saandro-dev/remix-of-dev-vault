/**
 * mcp-tools/diagnose.ts — devvault_diagnose tool (orchestrator).
 *
 * With error_message: delegates to diagnose-troubleshoot.ts.
 * Without parameters: health check — returns open knowledge gaps + low-score modules.
 */

import { createLogger } from "../logger.ts";
import { getCompleteness } from "./completeness.ts";
import { trackUsage } from "./usage-tracker.ts";
import { handleTroubleshooting } from "./diagnose-troubleshoot.ts";
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

      // ── Troubleshooting Mode ──
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
