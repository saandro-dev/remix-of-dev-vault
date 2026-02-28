/**
 * mcp-tools/search.ts — devvault_search tool.
 *
 * Full-text search across the Knowledge Graph with relevance scoring.
 * Supports PT and EN via dual tsvector columns.
 */

import { createLogger } from "../logger.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:search");

export const registerSearchTool: ToolRegistrar = (server, client) => {
  server.tool("devvault_search", {
    description:
      "Search the Knowledge Graph by intent/text. Returns modules matching your query " +
      "with relevance scoring. Uses full-text search (PT/EN) with automatic ILIKE " +
      "fallback when tsvector finds no matches. Also searches in solves_problems field, " +
      "so you can search by problem description (e.g. 'webhook not receiving events'). " +
      "Results include usage_hint field. " +
      "For structured browsing without text search, use devvault_list instead.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Full-text search query (PT or EN)" },
        domain: {
          type: "string",
          description: "Filter by domain",
          enum: ["security", "backend", "frontend", "architecture", "devops", "saas_playbook"],
        },
        module_type: {
          type: "string",
          description: "Filter by module type",
          enum: ["code_snippet", "full_module", "sql_migration", "architecture_doc", "playbook_phase", "pattern_guide"],
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags (AND match)",
        },
        limit: { type: "number", description: "Max results (default 10, max 50)" },
      },
      required: [],
    },
    handler: async (params: Record<string, unknown>) => {
      logger.info("invoked", { params });
      try {
        const limit = Math.min(Number(params.limit ?? 10), 50);
        const rpcParams: Record<string, unknown> = { p_limit: limit };

        if (params.query) rpcParams.p_query = params.query;
        if (params.domain) rpcParams.p_domain = params.domain;
        if (params.module_type) rpcParams.p_module_type = params.module_type;
        if (params.tags) rpcParams.p_tags = params.tags;

        const { data, error } = await client.rpc("query_vault_modules", rpcParams);
        logger.info("RPC result", {
          success: !error,
          resultCount: (data as unknown[])?.length ?? 0,
          error: error?.message,
        });

        if (error) {
          logger.error("search failed", { error: error.message });
          return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              total_results: (data as unknown[])?.length ?? 0,
              modules: data,
              _hint: "Use devvault_get with a module's id or slug to fetch full code and dependencies.",
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
