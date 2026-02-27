/**
 * devvault-mcp/index.ts — Universal MCP Server for AI Agents (v2.1).
 *
 * Thin shell: Hono router, CORS, auth middleware, MCP transport.
 * All tool logic lives in _shared/mcp-tools/ (one file per tool).
 *
 * Tools (8): devvault_bootstrap, devvault_search, devvault_get,
 *            devvault_list, devvault_domains, devvault_ingest,
 *            devvault_update, devvault_get_group.
 */

import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { getSupabaseClient } from "../_shared/supabase-client.ts";
import { authenticateRequest } from "../_shared/mcp-tools/auth.ts";
import { registerAllTools } from "../_shared/mcp-tools/register.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "content-type, accept, authorization, x-devvault-key, x-api-key, " +
    "mcp-session-id, mcp-protocol-version, " +
    "x-client-info, apikey, x-supabase-client-platform, x-supabase-client-platform-version, " +
    "x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const app = new Hono();

app.all("/*", async (c) => {
  if (c.req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const authResult = await authenticateRequest(c.req.raw);
  if (authResult instanceof Response) return authResult;

  const client = getSupabaseClient("general");
  const server = new McpServer({ name: "devvault", version: "2.1.0" });

  registerAllTools(server, client, authResult);

  const transport = new StreamableHttpTransport();
  return await transport.bind(server)(c.req.raw);
});

Deno.serve(app.fetch);
