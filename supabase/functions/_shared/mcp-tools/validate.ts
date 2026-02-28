/**
 * mcp-tools/validate.ts — devvault_validate tool.
 *
 * Exposes the vault_module_completeness DB function as an MCP tool.
 * Supports single-module validation (by id/slug) or batch mode (all global modules).
 */

import { createLogger } from "../logger.ts";
import { getCompleteness } from "./completeness.ts";
import { trackUsage } from "./usage-tracker.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:validate");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const registerValidateTool: ToolRegistrar = (server, client, auth) => {
  server.tool("devvault_validate", {
    description:
      "Validate module completeness. With id/slug: returns score (0-100) and missing fields " +
      "for that module. Without parameters: batch mode — returns scores for all global modules " +
      "(up to 50), sorted by lowest score first. Use batch mode for a vault-wide quality audit.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Module UUID or slug (auto-detected). Omit for batch mode." },
        limit: { type: "number", description: "Max modules in batch mode (default 50, max 100)" },
      },
      required: [],
    },
    handler: async (params: Record<string, unknown>) => {
      // ── Batch mode: no id provided ──
      if (!params.id) {
        const limit = Math.min(Number(params.limit ?? 50), 100);

        const { data: modules, error } = await client
          .from("vault_modules")
          .select("id, slug, title, validation_status")
          .eq("visibility", "global")
          .in("validation_status", ["validated", "draft"])
          .order("updated_at", { ascending: false })
          .limit(limit);

        if (error) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }

        const results = await Promise.all(
          (modules as Array<Record<string, unknown>>).map(async (m) => {
            const c = await getCompleteness(client, m.id as string);
            return {
              id: m.id,
              slug: m.slug,
              title: m.title,
              validation_status: m.validation_status,
              score: c.score,
              missing_fields: c.missing_fields,
            };
          }),
        );

        results.sort((a, b) => a.score - b.score);

        trackUsage(client, auth, {
          event_type: "validate_batch",
          tool_name: "devvault_validate",
          result_count: results.length,
        });

        logger.info("batch validation", { count: results.length });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              mode: "batch",
              total_modules: results.length,
              average_score: Math.round(results.reduce((s, r) => s + r.score, 0) / (results.length || 1)),
              modules: results,
              _hint: "Modules are sorted by lowest score first. Use devvault_update to fill missing fields.",
            }, null, 2),
          }],
        };
      }

      // ── Single module mode ──
      let moduleId = params.id as string;

      if (!UUID_RE.test(moduleId)) {
        const { data: found } = await client
          .from("vault_modules")
          .select("id")
          .eq("slug", moduleId)
          .single();

        if (!found) {
          return { content: [{ type: "text", text: `Module not found with slug: ${moduleId}` }] };
        }
        moduleId = found.id;
      }

      const completeness = await getCompleteness(client, moduleId);
      logger.info("module validated via MCP", { moduleId, score: completeness.score });

      trackUsage(client, auth, {
        event_type: "validate",
        tool_name: "devvault_validate",
        module_id: moduleId,
        result_count: 1,
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            mode: "single",
            module_id: moduleId,
            score: completeness.score,
            missing_fields: completeness.missing_fields,
            _hint: completeness.score === 100
              ? "Module is 100% complete. Ready to be marked as 'validated'."
              : `Module is ${completeness.score}% complete. Fill the missing fields using devvault_update to improve quality.`,
          }, null, 2),
        }],
      };
    },
  });
};
