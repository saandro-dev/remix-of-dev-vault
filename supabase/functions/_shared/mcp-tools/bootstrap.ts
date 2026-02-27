/**
 * mcp-tools/bootstrap.ts — devvault_bootstrap tool.
 *
 * Returns the full index of the Knowledge Graph: domains, playbook phases,
 * and top validated modules.
 */

import { createLogger } from "../logger.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:bootstrap");

export const registerBootstrapTool: ToolRegistrar = (server, client) => {
  server.tool("devvault_bootstrap", {
    description:
      "ALWAYS call this first. Returns the full index of the DevVault Knowledge Graph: " +
      "domains, playbook phases, and top validated modules. Use this to understand what " +
      "knowledge is available before searching or getting specific modules.",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => {
      const { data, error } = await client.rpc("bootstrap_vault_context");
      if (error) {
        logger.error("bootstrap failed", { error: error.message });
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  });
};
