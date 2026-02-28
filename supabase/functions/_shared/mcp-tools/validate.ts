/**
 * mcp-tools/validate.ts — devvault_validate tool.
 *
 * Exposes the vault_module_completeness DB function as an MCP tool,
 * allowing agents to check module quality and identify missing fields.
 */

import { createLogger } from "../logger.ts";
import { getCompleteness } from "./completeness.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:validate");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const registerValidateTool: ToolRegistrar = (server, client) => {
  server.tool("devvault_validate", {
    description:
      "Validate a module's completeness. Returns a score (0-100) and a list of missing " +
      "fields. Use this to check module quality before marking as 'validated'. " +
      "Accepts either a UUID id or a slug string — auto-detected.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Module UUID or slug (auto-detected)" },
      },
      required: ["id"],
    },
    handler: async (params: Record<string, unknown>) => {
      let moduleId = params.id as string;

      // Auto-detect slug vs UUID
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

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
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
