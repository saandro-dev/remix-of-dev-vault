/**
 * mcp-tools/register.ts — Central wiring for all MCP tools.
 *
 * Imports every tool registrar and calls them against the McpServer instance.
 * Adding a new tool = one import + one line in registerAllTools.
 *
 * Total tools: 11
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { AuthContext, McpServerLike } from "./types.ts";

import { registerBootstrapTool } from "./bootstrap.ts";
import { registerSearchTool } from "./search.ts";
import { registerGetTool } from "./get.ts";
import { registerListTool } from "./list.ts";
import { registerDomainsTool } from "./domains.ts";
import { registerIngestTool } from "./ingest.ts";
import { registerUpdateTool } from "./update.ts";
import { registerGetGroupTool } from "./get-group.ts";
import { registerValidateTool } from "./validate.ts";
import { registerDeleteTool } from "./delete.ts";
import { registerDiagnoseTool } from "./diagnose.ts";

export function registerAllTools(
  server: McpServerLike,
  client: SupabaseClient,
  auth: AuthContext,
): void {
  registerBootstrapTool(server, client, auth);
  registerSearchTool(server, client, auth);
  registerGetTool(server, client, auth);
  registerListTool(server, client, auth);
  registerDomainsTool(server, client, auth);
  registerIngestTool(server, client, auth);
  registerUpdateTool(server, client, auth);
  registerGetGroupTool(server, client, auth);
  registerValidateTool(server, client, auth);
  registerDeleteTool(server, client, auth);
  registerDiagnoseTool(server, client, auth);
}
