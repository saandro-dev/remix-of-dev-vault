/**
 * mcp-tools/domains.ts — devvault_domains tool.
 *
 * Lists all available knowledge domains with module counts and types.
 */

import { createLogger } from "../logger.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:domains");

export const registerDomainsTool: ToolRegistrar = (server, client) => {
  server.tool("devvault_domains", {
    description:
      "List all available knowledge domains with module counts and types. " +
      "Use this to discover what areas of knowledge are available.",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => {
      console.log("[MCP:TOOL] devvault_domains invoked");
      try {
        const { data, error } = await client.rpc("list_vault_domains");
        console.log("[MCP:TOOL] devvault_domains RPC result", JSON.stringify({
          success: !error,
          resultCount: Array.isArray(data) ? data.length : 0,
          error: error?.message,
        }));
        if (error) {
          logger.error("domains failed", { error: error.message });
          return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        console.error("[MCP:TOOL] devvault_domains UNCAUGHT", String(err));
        return { content: [{ type: "text", text: `Uncaught error: ${String(err)}` }] };
      }
    },
  });
};
