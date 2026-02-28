/**
 * mcp-tools/get.ts — devvault_get tool.
 *
 * Fetches a single module by ID or slug with full code, dependencies,
 * completeness score, group metadata, changelog, and resolved related_modules.
 */

import { createLogger } from "../logger.ts";
import { enrichModuleDependencies } from "../dependency-helpers.ts";
import { getCompleteness } from "./completeness.ts";
import { trackUsage } from "./usage-tracker.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:get");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const registerGetTool: ToolRegistrar = (server, client) => {
  server.tool("devvault_get", {
    description:
      "Fetch a specific module by ID or slug. Returns full code, context, dependencies, " +
      "completeness score, group metadata, prerequisites, common_errors, test_code, " +
      "solves_problems, difficulty, estimated_minutes, changelog, and resolved related_modules. " +
      "CRITICAL: If any dependency has dependency_type='required', you MUST call devvault_get " +
      "for each required dependency BEFORE implementing this module. " +
      "You can pass either a UUID id or a slug string — auto-detected.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Module UUID or slug (auto-detected)" },
        slug: { type: "string", description: "Module slug (alternative to id)" },
      },
      required: [],
    },
    handler: async (params: Record<string, unknown>) => {
      if (!params.id && !params.slug) {
        return { content: [{ type: "text", text: "Error: Provide either 'id' or 'slug'" }] };
      }

      // Auto-detect: if id is provided but not a valid UUID, treat as slug
      if (params.id && !UUID_RE.test(params.id as string)) {
        params.slug = params.id;
        params.id = undefined;
      }

      const rpcParams: Record<string, unknown> = {};
      if (params.id) rpcParams.p_id = params.id;
      if (params.slug) rpcParams.p_slug = params.slug;

      const { data, error } = await client.rpc("get_vault_module", rpcParams);
      if (error) {
        logger.error("get failed", { error: error.message });
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      if (!data || (data as unknown[]).length === 0) {
        return { content: [{ type: "text", text: "Module not found" }] };
      }

      const mod = (data as Record<string, unknown>[])[0];
      const moduleId = mod.id as string;

      // Parallel fetches: dependencies, completeness, group meta, changelog, related_modules
      const [dependencies, completeness, moduleRaw, changelogResult, resolvedRelated] = await Promise.all([
        enrichModuleDependencies(client, moduleId),
        getCompleteness(client, moduleId),
        client.from("vault_modules").select("module_group, implementation_order").eq("id", moduleId).single(),
        client.from("vault_module_changelog").select("version, changes, created_at").eq("module_id", moduleId).order("created_at", { ascending: false }).limit(10),
        resolveRelatedModules(client, mod.related_modules as string[] | null),
      ]);

      const hasRequired = dependencies.some(
        (d: Record<string, unknown>) => d.dependency_type === "required",
      );

      let groupMeta: Record<string, unknown> | null = null;
      if (moduleRaw.data?.module_group) {
        const { count } = await client
          .from("vault_modules")
          .select("id", { count: "exact", head: true })
          .eq("module_group", moduleRaw.data.module_group);

        groupMeta = {
          name: moduleRaw.data.module_group,
          position: moduleRaw.data.implementation_order,
          total: count ?? 0,
        };
      }

      trackUsage(client, auth, {
        event_type: "get",
        tool_name: "devvault_get",
        module_id: moduleId,
        result_count: 1,
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ...mod,
            related_modules: resolvedRelated,
            dependencies,
            _changelog: changelogResult.data ?? [],
            _completeness: completeness,
            _group: groupMeta,
            _instructions: hasRequired
              ? "⚠️ This module has REQUIRED dependencies. You MUST fetch and implement each required dependency (via devvault_get) BEFORE implementing this module."
              : "This module has no required dependencies. You can implement it directly.",
          }, null, 2),
        }],
      };
    },
  });
};

/**
 * Resolves an array of UUID related_modules into {id, slug, title} objects.
 */
async function resolveRelatedModules(
  client: Parameters<ToolRegistrar>[1],
  uuids: string[] | null,
): Promise<Array<{ id: string; slug: string | null; title: string }>> {
  if (!uuids || uuids.length === 0) return [];

  const { data } = await client
    .from("vault_modules")
    .select("id, slug, title")
    .in("id", uuids);

  return (data ?? []) as Array<{ id: string; slug: string | null; title: string }>;
}
