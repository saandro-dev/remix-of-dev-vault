/**
 * devvault-mcp/index.ts — Universal MCP Server for AI Agents (v2.4).
 *
 * Thin shell: Hono router, CORS, auth middleware, MCP transport.
 * All tool logic lives in _shared/mcp-tools/ (one file per tool).
 *
 * IMPORTANT: McpServer, transport, and tools are singletons (module-level).
 * Auth is a mutable object updated per-request — safe because Edge Functions
 * are single-threaded.
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
import type { AuthContext } from "../_shared/mcp-tools/types.ts";

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

// ─── MODULE-LEVEL SINGLETONS ────────────────────────────────────────────────
const client = getSupabaseClient("general");
const mcp = new McpServer({ name: "devvault", version: "2.4.0" });

// Mutable auth — updated per-request, captured by reference in tool handlers.
// Edge Functions are single-threaded, so no race conditions.
const requestAuth: AuthContext = { userId: "", keyId: "" };
registerAllTools(mcp, client, requestAuth);

const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcp);
// ─────────────────────────────────────────────────────────────────────────────

const app = new Hono();

app.all("/*", async (c) => {
  if (c.req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  console.log("[MCP:DIAG] incoming request", {
    method: c.req.method,
    hasDevVaultKey: c.req.raw.headers.has("x-devvault-key"),
    hasApiKey: c.req.raw.headers.has("x-api-key"),
    hasAuthorization: c.req.raw.headers.has("authorization"),
    url: c.req.url,
  });

  const authResult = await authenticateRequest(c.req.raw);

  if (authResult instanceof Response) {
    return withCors(authResult);
  }

  console.log("[MCP:DIAG] auth passed", { userId: authResult.userId });

  // GET requests seek an SSE stream, which requires persistent sessions.
  // Edge Functions are stateless (fresh boot per request), so SSE is impossible.
  // Return 405 so the client falls back to POST-only (stateless) mode.
  if (c.req.method === "GET") {
    return withCors(new Response("Method Not Allowed", {
      status: 405,
      headers: { "Allow": "POST, DELETE, OPTIONS" },
    }));
  }

  // Mutate shared reference — tools see updated values
  requestAuth.userId = authResult.userId;
  requestAuth.keyId = authResult.keyId;

  try {
    const mcpResponse = await httpHandler(c.req.raw);
    const cloned = mcpResponse.clone();
    const bodyText = await cloned.text();
    console.log("[MCP:DIAG] transport response", {
      status: mcpResponse.status,
      contentType: mcpResponse.headers.get("content-type"),
      bodyLength: bodyText.length,
      bodyPreview: bodyText.substring(0, 500),
    });
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
