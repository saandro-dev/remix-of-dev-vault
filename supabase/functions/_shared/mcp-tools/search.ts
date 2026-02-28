/**
 * mcp-tools/search.ts — devvault_search tool.
 *
 * Hybrid search across the Knowledge Graph combining full-text (PT/EN)
 * with semantic vector similarity. Results include relationship metadata.
 */

import { createLogger } from "../logger.ts";
import { generateEmbedding } from "../embedding-client.ts";
import { trackUsage } from "./usage-tracker.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:search");

export const registerSearchTool: ToolRegistrar = (server, client, auth) => {
  server.tool("devvault_search", {
    description:
      "Search the Knowledge Graph by intent/text. Returns modules with relevance scoring. " +
      "Uses hybrid search combining full-text (PT/EN) with semantic vector similarity. " +
      "Also searches solves_problems field (e.g. 'webhook not receiving events'). " +
      "Results include has_dependencies and related_modules_count for navigation. " +
      "For structured browsing without text search, use devvault_list instead.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Full-text search query (PT or EN)" },
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
        limit: { type: "number", description: "Max results (default 10, max 50)" },
      },
      required: [],
    },
    handler: async (params: Record<string, unknown>) => {
      logger.info("invoked", { params });
      try {
        const limit = Math.min(Number(params.limit ?? 10), 50);
        const queryText = params.query as string | undefined;

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

        // Use hybrid search when we have a query
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

          const rawModules = data as Record<string, unknown>[];
          const modules = await enrichWithRelations(client, rawModules);

          trackUsage(client, auth, {
            event_type: modules.length > 0 ? "search" : "search_miss",
            tool_name: "devvault_search",
            query_text: queryText,
            result_count: modules.length,
          });

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                total_results: modules.length,
                search_mode: queryEmbedding ? "hybrid" : "full_text",
                modules,
                _hint: "Use devvault_get with a module's id or slug to fetch full code and dependencies.",
              }, null, 2),
            }],
          };
        }

        // No query: list mode
        const rpcParams: Record<string, unknown> = { p_limit: limit };
        if (params.domain) rpcParams.p_domain = params.domain;
        if (params.module_type) rpcParams.p_module_type = params.module_type;
        if (params.tags) rpcParams.p_tags = params.tags;

        const { data, error } = await client.rpc("query_vault_modules", rpcParams);

        if (error) {
          logger.error("search failed", { error: error.message });
          return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }

        const rawModules = data as Record<string, unknown>[];
        const modules = await enrichWithRelations(client, rawModules);

        trackUsage(client, auth, {
          event_type: modules.length > 0 ? "search" : "search_miss",
          tool_name: "devvault_search",
          query_text: queryText,
          result_count: modules.length,
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              total_results: modules.length,
              search_mode: "list",
              modules,
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

/**
 * Enrich search results with dependency/relationship metadata.
 */
async function enrichWithRelations(
  client: Parameters<ToolRegistrar>[1],
  modules: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  if (modules.length === 0) return modules;

  const ids = modules.map((m) => m.id as string);

  const [{ data: deps }, { data: dependents }] = await Promise.all([
    client.from("vault_module_dependencies").select("module_id").in("module_id", ids),
    client.from("vault_module_dependencies").select("depends_on_id").in("depends_on_id", ids),
  ]);

  const hasDepsSet = new Set(
    (deps as Array<{ module_id: string }> ?? []).map((d) => d.module_id),
  );
  const hasDependentsSet = new Set(
    (dependents as Array<{ depends_on_id: string }> ?? []).map((d) => d.depends_on_id),
  );

  return modules.map((m) => ({
    ...m,
    has_dependencies: hasDepsSet.has(m.id as string),
    is_depended_upon: hasDependentsSet.has(m.id as string),
    related_modules_count: (m.related_modules as string[] | null)?.length ?? 0,
  }));
}
