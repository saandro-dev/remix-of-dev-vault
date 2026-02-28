/**
 * mcp-tools/list.ts — devvault_list tool.
 *
 * Lists modules with optional filters: text search, domain, module_type,
 * tags, and module_group.
 */

import { createLogger } from "../logger.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:list");

export const registerListTool: ToolRegistrar = (server, client) => {
  server.tool("devvault_list", {
    description:
      "List modules with optional filters including text search, tags, and group. " +
      "For semantic/intent-based search with relevance scoring, prefer devvault_search.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Text search filter (searches title, description, tags)" },
        domain: {
          type: "string",
          enum: ["security", "backend", "frontend", "architecture", "devops", "saas_playbook"],
        },
        module_type: {
          type: "string",
          enum: ["code_snippet", "full_module", "sql_migration", "architecture_doc", "playbook_phase", "pattern_guide"],
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags (AND match)",
        },
        group: { type: "string", description: "Filter by module_group name (e.g. 'whatsapp-integration')" },
        limit: { type: "number", description: "Max results (default 20, max 50)" },
        offset: { type: "number", description: "Pagination offset (default 0)" },
      },
      required: [],
    },
    handler: async (params: Record<string, unknown>) => {
      console.log("[MCP:TOOL] devvault_list invoked", JSON.stringify({ params }));
      try {
        const limit = Math.min(Number(params.limit ?? 20), 50);
        const offset = Number(params.offset ?? 0);

        const rpcParams: Record<string, unknown> = {
          p_limit: limit,
          p_offset: offset,
        };
        if (params.query) rpcParams.p_query = params.query;
        if (params.domain) rpcParams.p_domain = params.domain;
        if (params.module_type) rpcParams.p_module_type = params.module_type;
        if (params.tags) rpcParams.p_tags = params.tags;

        const { data, error } = await client.rpc("query_vault_modules", rpcParams);
        console.log("[MCP:TOOL] devvault_list RPC result", JSON.stringify({
          success: !error,
          resultCount: (data as unknown[])?.length ?? 0,
          error: error?.message,
        }));

        if (error) {
          logger.error("list failed", { error: error.message });
          return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }

        let modules = data as Record<string, unknown>[];
        if (params.group) {
          const groupName = params.group as string;
          const { data: groupModules } = await client
            .from("vault_modules")
            .select("id")
            .eq("module_group", groupName);
          const groupIds = new Set((groupModules ?? []).map((m: Record<string, unknown>) => m.id as string));
          modules = modules.filter((m) => groupIds.has(m.id as string));
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              total_results: modules.length,
              offset,
              modules,
            }, null, 2),
          }],
        };
      } catch (err) {
        console.error("[MCP:TOOL] devvault_list UNCAUGHT", String(err));
        return { content: [{ type: "text", text: `Uncaught error: ${String(err)}` }] };
      }
    },
  });
};
