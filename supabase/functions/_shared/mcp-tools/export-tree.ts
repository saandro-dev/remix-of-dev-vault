/**
 * mcp-tools/export-tree.ts — devvault_export_tree tool.
 *
 * With id/slug: resolves full dependency tree using recursive CTE.
 * Without id: returns root modules (modules that have dependents but no dependencies).
 */

import { createLogger } from "../logger.ts";
import { trackUsage } from "./usage-tracker.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:export-tree");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const registerExportTreeTool: ToolRegistrar = (server, client, auth) => {
  server.tool("devvault_export_tree", {
    description:
      "Export dependency tree. With id/slug: returns all modules (root + transitive deps) " +
      "with complete code via recursive CTE. Without parameters: returns root modules " +
      "(modules that others depend on, but have no dependencies themselves) — useful to " +
      "discover entry points for scaffolding.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Root module UUID or slug (auto-detected). Omit to list root modules.",
        },
        limit: { type: "number", description: "Max root modules when no id (default 20, max 50)" },
      },
      required: [],
    },
    handler: async (params: Record<string, unknown>) => {
      // ── Discovery mode: no id ──
      if (!params.id) {
        const limit = Math.min(Number(params.limit ?? 20), 50);

        // Root modules: have dependents (someone depends on them) but no dependencies themselves
        const { data: roots, error } = await client
          .from("vault_modules")
          .select(`
            id, slug, title, description, domain, module_type,
            module_group, implementation_order, validation_status
          `)
          .eq("visibility", "global")
          .in("validation_status", ["validated", "draft"])
          .order("updated_at", { ascending: false })
          .limit(limit);

        if (error) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }

        // Filter: only modules that ARE depended upon but don't depend on others
        const moduleIds = (roots as Array<{ id: string }>).map((r) => r.id);

        const [{ data: dependents }, { data: dependencies }] = await Promise.all([
          client
            .from("vault_module_dependencies")
            .select("depends_on_id")
            .in("depends_on_id", moduleIds),
          client
            .from("vault_module_dependencies")
            .select("module_id")
            .in("module_id", moduleIds),
        ]);

        const hasDependents = new Set(
          (dependents as Array<{ depends_on_id: string }> ?? []).map((d) => d.depends_on_id),
        );
        const hasDependencies = new Set(
          (dependencies as Array<{ module_id: string }> ?? []).map((d) => d.module_id),
        );

        const rootModules = (roots as Array<Record<string, unknown>>).filter(
          (m) => hasDependents.has(m.id as string) && !hasDependencies.has(m.id as string),
        );

        trackUsage(client, auth, {
          event_type: "export_tree_roots",
          tool_name: "devvault_export_tree",
          result_count: rootModules.length,
        });

        logger.info("root modules listed", { count: rootModules.length });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              mode: "discovery",
              total_root_modules: rootModules.length,
              root_modules: rootModules,
              _hint:
                "These are entry-point modules (depended upon by others, but have no dependencies). " +
                "Use devvault_export_tree with a specific id to get the full dependency tree.",
            }, null, 2),
          }],
        };
      }

      // ── Full tree mode ──
      let rootId = params.id as string;

      if (!UUID_RE.test(rootId)) {
        const { data: found } = await client
          .from("vault_modules")
          .select("id")
          .eq("slug", rootId)
          .single();

        if (!found) {
          return {
            content: [{ type: "text", text: `Module not found with slug: ${rootId}` }],
          };
        }
        rootId = found.id;
      }

      const { data, error } = await client.rpc("export_module_tree", {
        p_root_id: rootId,
      });

      if (error) {
        logger.error("export_tree failed", { error: error.message });
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
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
            mode: "full_tree",
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
