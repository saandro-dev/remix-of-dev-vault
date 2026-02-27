/**
 * mcp-tools/get-group.ts — devvault_get_group tool.
 *
 * Fetches all modules in a named group, ordered by implementation_order,
 * with dependencies pre-resolved. The "give me everything" tool.
 */

import { createLogger } from "../logger.ts";
import { enrichModuleDependencies } from "../dependency-helpers.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:get-group");

export const registerGetGroupTool: ToolRegistrar = (server, client) => {
  server.tool("devvault_get_group", {
    description:
      "Fetch all modules in a group, ordered by implementation_order, with dependencies " +
      "pre-resolved. This is the 'give me everything I need to implement X' tool. " +
      "Example: devvault_get_group({ group: 'whatsapp-integration' }) returns all " +
      "WhatsApp modules in the correct implementation sequence.",
    inputSchema: {
      type: "object",
      properties: {
        group: { type: "string", description: "The module_group name (e.g. 'whatsapp-integration')" },
      },
      required: ["group"],
    },
    handler: async (params: Record<string, unknown>) => {
      const groupName = params.group as string;

      const { data: modules, error } = await client
        .from("vault_modules")
        .select("id, slug, title, description, domain, module_type, language, tags, why_it_matters, code_example, module_group, implementation_order, validation_status")
        .eq("module_group", groupName)
        .order("implementation_order", { ascending: true, nullsFirst: false });

      if (error) {
        logger.error("get_group failed", { error: error.message });
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      if (!modules || modules.length === 0) {
        return { content: [{ type: "text", text: `No modules found in group: ${groupName}` }] };
      }

      const enriched = await Promise.all(
        (modules as Record<string, unknown>[]).map(async (mod) => {
          const deps = await enrichModuleDependencies(client, mod.id as string);
          return { ...mod, dependencies: deps };
        }),
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            group: groupName,
            total_modules: enriched.length,
            modules: enriched,
            _instructions:
              "Implement these modules in order (by implementation_order). " +
              "For each module, call devvault_get to fetch the full code before implementing. " +
              "Respect required dependencies — implement them first.",
          }, null, 2),
        }],
      };
    },
  });
};
