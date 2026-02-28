/**
 * mcp-tools/search.ts — devvault_search tool.
 *
 * Hybrid search across the Knowledge Graph combining full-text (PT/EN)
 * with semantic vector similarity via pgvector embeddings.
 * Falls back to full-text only when embedding generation fails.
 */

import { createLogger } from "../logger.ts";
import { generateEmbedding } from "../embedding-client.ts";
import { trackUsage } from "./usage-tracker.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:search");

export const registerSearchTool: ToolRegistrar = (server, client, auth) => {
  server.tool("devvault_search", {
    description:
      "Search the Knowledge Graph by intent/text. Returns modules matching your query " +
      "with relevance scoring. Uses hybrid search combining full-text (PT/EN) with " +
      "semantic vector similarity for best results. Also searches in solves_problems field, " +
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
        const queryText = params.query as string | undefined;

        // Generate embedding for semantic search (fire-and-forget safe)
        let queryEmbedding: string | null = null;
        if (queryText) {
          try {
            const embeddingArray = await generateEmbedding(queryText);
            queryEmbedding = `[${embeddingArray.join(",")}]`;
          } catch (embErr) {
            logger.warn("embedding generation failed, falling back to full-text only", {
              error: String(embErr),
            });
          }
        }

        // Use hybrid search RPC when we have a query
        if (queryText || queryEmbedding) {
          const rpcParams: Record<string, unknown> = {
            p_query_text: queryText ?? null,
            p_query_embedding: queryEmbedding,
            p_match_count: limit,
          };
          if (params.domain) rpcParams.p_domain = params.domain;
          if (params.module_type) rpcParams.p_module_type = params.module_type;
          if (params.tags) rpcParams.p_tags = params.tags;

          const { data, error } = await client.rpc("hybrid_search_vault_modules", rpcParams);

          if (error) {
            logger.error("hybrid search failed", { error: error.message });
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
          }

          const resultCount = (data as unknown[])?.length ?? 0;

          trackUsage(client, auth, {
            event_type: resultCount > 0 ? "search" : "search_miss",
            tool_name: "devvault_search",
            query_text: queryText,
            result_count: resultCount,
          });

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                total_results: resultCount,
                search_mode: queryEmbedding ? "hybrid" : "full_text",
                modules: data,
                _hint: "Use devvault_get with a module's id or slug to fetch full code and dependencies.",
              }, null, 2),
            }],
          };
        }

        // No query: list mode via existing RPC
        const rpcParams: Record<string, unknown> = { p_limit: limit };
        if (params.domain) rpcParams.p_domain = params.domain;
        if (params.module_type) rpcParams.p_module_type = params.module_type;
        if (params.tags) rpcParams.p_tags = params.tags;

        const { data, error } = await client.rpc("query_vault_modules", rpcParams);

        if (error) {
          logger.error("search failed", { error: error.message });
          return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }

        const resultCount = (data as unknown[])?.length ?? 0;

        trackUsage(client, auth, {
          event_type: resultCount > 0 ? "search" : "search_miss",
          tool_name: "devvault_search",
          query_text: queryText,
          result_count: resultCount,
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              total_results: resultCount,
              search_mode: "list",
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
