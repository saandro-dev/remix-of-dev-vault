/**
 * devvault-mcp/index.ts — Universal MCP Server for AI Agents (v2.3).
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

/**
 * Injects CORS headers into any Response (including error responses from auth).
 */
function withCors(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

const app = new Hono();

app.all("/*", async (c) => {
  if (c.req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Diagnostic logging — headers received
  const hdrs = c.req.raw.headers;
  console.log("[MCP:DIAG] incoming request", {
    method: c.req.method,
    hasDevVaultKey: hdrs.has("x-devvault-key"),
    hasApiKey: hdrs.has("x-api-key"),
    hasAuthorization: hdrs.has("authorization"),
    url: c.req.url,
  });

  const authResult = await authenticateRequest(c.req.raw);

  if (authResult instanceof Response) {
    // Ensure CORS headers are present on error responses
    return withCors(authResult);
  }

  console.log("[MCP:DIAG] auth passed", { userId: authResult.userId });

  const client = getSupabaseClient("general");
  const server = new McpServer({ name: "devvault", version: "2.3.0" });

  registerAllTools(server, client, authResult);

  const transport = new StreamableHttpTransport();

  try {
    const handler = transport.bind(server);
    const mcpResponse = await handler(c.req.raw);
    console.log("[MCP:DIAG] transport response", { status: mcpResponse.status });
    return withCors(mcpResponse);
  } catch (err) {
    console.error("[MCP:DIAG] transport error", {
      message: String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return withCors(new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32603, message: `Internal MCP error: ${String(err)}` },
        id: null,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    ));
  }
});

Deno.serve(app.fetch);
