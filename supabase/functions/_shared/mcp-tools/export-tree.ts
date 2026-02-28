/**
 * mcp-tools/export-tree.ts — devvault_export_tree tool.
 *
 * Resolves the full dependency tree of a module using a recursive CTE,
 * returning all modules with complete code in a single response.
 * Eliminates N+1 queries for agents scaffolding complex features.
 */

import { createLogger } from "../logger.ts";
import { trackUsage } from "./usage-tracker.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:export-tree");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const registerExportTreeTool: ToolRegistrar = (server, client, auth) => {
  server.tool("devvault_export_tree", {
    description:
      "Export the full dependency tree of a module in a single call. " +
      "Returns all modules (root + all transitive dependencies) with complete code, " +
      "database_schema, tests, and metadata. Uses a recursive CTE — no N+1 queries. " +
      "Use this instead of multiple devvault_get calls when you need to scaffold " +
      "a complete feature with all its dependencies.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Root module UUID or slug (auto-detected)",
        },
      },
      required: ["id"],
    },
    handler: async (params: Record<string, unknown>) => {
      let rootId = params.id as string;

      // If not a UUID, resolve slug to UUID first
      if (!UUID_RE.test(rootId)) {
        const { data: found } = await client
          .from("vault_modules")
          .select("id")
          .eq("slug", rootId)
          .single();

        if (!found) {
          return {
            content: [{
              type: "text",
              text: `Module not found with slug: ${rootId}`,
            }],
          };
        }
        rootId = found.id;
      }

      const { data, error } = await client.rpc("export_module_tree", {
        p_root_id: rootId,
      });

      if (error) {
        logger.error("export_tree failed", { error: error.message });
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
        };
      }

      const tree = data as Record<string, unknown>;

      trackUsage(client, auth, {
        event_type: "export_tree",
        tool_name: "devvault_export_tree",
        module_id: rootId,
        result_count: (tree?.total_modules as number) ?? 0,
      });

      logger.info("tree exported via MCP", {
        rootId,
        totalModules: tree?.total_modules,
        maxDepth: tree?.max_depth,
        userId: auth.userId,
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ...tree,
            _hint:
              "All modules are ordered by depth (root first) then implementation_order. " +
              "Implement them in this order. Each module includes its database_schema " +
              "(SQL migration) if available.",
          }, null, 2),
        }],
      };
    },
  });
};
