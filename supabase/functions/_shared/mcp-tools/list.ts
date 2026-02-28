/**
 * mcp-tools/list.ts — devvault_list tool.
 *
 * Lists modules with optional filters: text search, domain, module_type,
 * tags, and module_group. Filtering is fully delegated to the SQL RPC
 * (zero in-memory filtering).
 */

import { createLogger } from "../logger.ts";
import { trackUsage } from "./usage-tracker.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:list");

export const registerListTool: ToolRegistrar = (server, client, auth) => {
  server.tool("devvault_list", {
    description:
      "List modules with optional filters including text search, tags, group, and domain. " +
      "All filtering is done server-side in SQL for efficiency. " +
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
      logger.info("invoked", { params });
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
        if (params.group) rpcParams.p_group = params.group;

        const { data, error } = await client.rpc("query_vault_modules", rpcParams);
        logger.info("RPC result", {
          success: !error,
          resultCount: (data as unknown[])?.length ?? 0,
          error: error?.message,
        });

        if (error) {
          logger.error("list failed", { error: error.message });
          return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }

        // Trim heavy fields from list results, keep useful metadata
        const modules = (data as Record<string, unknown>[]).map((m) => {
          const { code, context_markdown, ...rest } = m;
          return rest;
        });

        // Track analytics
        trackUsage(client, auth, {
          event_type: "list",
          tool_name: "devvault_list",
          query_text: params.query as string | undefined,
          result_count: modules.length,
        });

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
        logger.error("uncaught error", { error: String(err) });
        return { content: [{ type: "text", text: `Uncaught error: ${String(err)}` }] };
      }
    },
  });
};
