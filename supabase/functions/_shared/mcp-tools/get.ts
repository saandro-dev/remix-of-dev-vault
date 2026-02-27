/**
 * mcp-tools/get.ts — devvault_get tool.
 *
 * Fetches a single module by ID or slug with full code, dependencies,
 * completeness score, and group metadata.
 */

import { createLogger } from "../logger.ts";
import { enrichModuleDependencies } from "../dependency-helpers.ts";
import { getCompleteness } from "./completeness.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:get");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const registerGetTool: ToolRegistrar = (server, client) => {
  server.tool("devvault_get", {
    description:
      "Fetch a specific module by ID or slug. Returns full code, context, dependencies, " +
      "completeness score, and group metadata. CRITICAL: If any dependency has " +
      "dependency_type='required', you MUST call devvault_get for each required " +
      "dependency BEFORE implementing this module. " +
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

      const dependencies = await enrichModuleDependencies(client, moduleId);
      const hasRequired = dependencies.some(
        (d: Record<string, unknown>) => d.dependency_type === "required",
      );
      const completeness = await getCompleteness(client, moduleId);

      const moduleRaw = await client
        .from("vault_modules")
        .select("module_group, implementation_order")
        .eq("id", moduleId)
        .single();

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

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ...mod,
            dependencies,
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
