/**
 * devvault-mcp/index.ts — Universal MCP Server for AI Agents.
 *
 * Exposes the DevVault Knowledge Graph as MCP tools via Streamable HTTP.
 * Authentication: X-DevVault-Key header validated against Supabase Vault.
 * Transport: Streamable HTTP (mcp-lite default).
 *
 * Tools: devvault_bootstrap, devvault_search, devvault_get,
 *        devvault_list, devvault_domains, devvault_ingest.
 */

import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { validateApiKey } from "../_shared/api-key-guard.ts";
import { getSupabaseClient } from "../_shared/supabase-client.ts";
import { checkRateLimit } from "../_shared/rate-limit-guard.ts";
import { enrichModuleDependencies } from "../_shared/dependency-helpers.ts";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("devvault-mcp");

const MCP_RATE_LIMIT = {
  maxAttempts: 120,
  windowSeconds: 60,
  blockSeconds: 120,
};

// ---------------------------------------------------------------------------
// Auth middleware: extract & validate X-DevVault-Key before MCP processing
// ---------------------------------------------------------------------------

interface AuthContext {
  userId: string;
  keyId: string;
}

async function authenticateRequest(req: Request): Promise<AuthContext | Response> {
  const rawKey =
    req.headers.get("x-devvault-key") ??
    req.headers.get("x-api-key") ??
    req.headers.get("Authorization")?.replace("Bearer ", "").trim();

  if (!rawKey) {
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", error: { code: -32001, message: "Missing X-DevVault-Key header" } }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const client = getSupabaseClient("admin");
  const result = await validateApiKey(client, rawKey);

  if (!result.valid || !result.userId || !result.keyId) {
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", error: { code: -32001, message: "Invalid or revoked API key" } }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const rateCheck = await checkRateLimit(result.userId, "devvault-mcp", MCP_RATE_LIMIT);
  if (rateCheck.blocked) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32002,
          message: `Rate limited. Retry after ${rateCheck.retryAfterSeconds}s`,
        },
      }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rateCheck.retryAfterSeconds) } },
    );
  }

  return { userId: result.userId, keyId: result.keyId };
}

// ---------------------------------------------------------------------------
// MCP Server definition
// ---------------------------------------------------------------------------

function createMcpServer(auth: AuthContext): McpServer {
  const client = getSupabaseClient("general");

  const server = new McpServer({
    name: "devvault",
    version: "1.0.0",
  });

  // ── devvault_bootstrap ──────────────────────────────────────────────────
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

  // ── devvault_search ─────────────────────────────────────────────────────
  server.tool("devvault_search", {
    description:
      "Search the Knowledge Graph by intent. Returns modules matching your query " +
      "with relevance scoring. Use filters to narrow by domain or type. " +
      "For listing without text search, use devvault_list instead.",
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
      const limit = Math.min(Number(params.limit ?? 10), 50);
      const rpcParams: Record<string, unknown> = { p_limit: limit };

      if (params.query) rpcParams.p_query = params.query;
      if (params.domain) rpcParams.p_domain = params.domain;
      if (params.module_type) rpcParams.p_module_type = params.module_type;
      if (params.tags) rpcParams.p_tags = params.tags;

      const { data, error } = await client.rpc("query_vault_modules", rpcParams);
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
    },
  });

  // ── devvault_get ────────────────────────────────────────────────────────
  server.tool("devvault_get", {
    description:
      "Fetch a specific module by ID or slug. Returns full code, context, and a " +
      "dependencies array. CRITICAL: If any dependency has dependency_type='required', " +
      "you MUST call devvault_get for each required dependency BEFORE implementing " +
      "this module. This ensures all foundational code is in place.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Module UUID" },
        slug: { type: "string", description: "Module slug (alternative to id)" },
      },
      required: [],
    },
    handler: async (params: Record<string, unknown>) => {
      if (!params.id && !params.slug) {
        return { content: [{ type: "text", text: "Error: Provide either 'id' or 'slug'" }] };
      }

      const rpcParams: Record<string, unknown> = {};
      if (params.id) rpcParams.p_id = params.id;
      if (params.slug) rpcParams.p_slug = params.slug;

      const { data, error } = await client.rpc("get_vault_module", rpcParams);
      if (error) {
        logger.error("get failed", { error: error.message });
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      if (!data || (data as unknown[]).length === 0) {
        return { content: [{ type: "text", text: "Module not found" }] };
      }

      const module = (data as Record<string, unknown>[])[0];
      const moduleId = module.id as string;

      // Enrich with dependency graph
      const dependencies = await enrichModuleDependencies(client, moduleId);

      const hasRequired = dependencies.some(
        (d: Record<string, unknown>) => d.dependency_type === "required",
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ...module,
            dependencies,
            _instructions: hasRequired
              ? "⚠️ This module has REQUIRED dependencies. You MUST fetch and implement each required dependency (via devvault_get) BEFORE implementing this module."
              : "This module has no required dependencies. You can implement it directly.",
          }, null, 2),
        }],
      };
    },
  });

  // ── devvault_list ───────────────────────────────────────────────────────
  server.tool("devvault_list", {
    description:
      "List modules with optional filters. No text search — use devvault_search " +
      "for that. Good for browsing a specific domain or type.",
    inputSchema: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          enum: ["security", "backend", "frontend", "architecture", "devops", "saas_playbook"],
        },
        module_type: {
          type: "string",
          enum: ["code_snippet", "full_module", "sql_migration", "architecture_doc", "playbook_phase", "pattern_guide"],
        },
        limit: { type: "number", description: "Max results (default 20, max 50)" },
        offset: { type: "number", description: "Pagination offset (default 0)" },
      },
      required: [],
    },
    handler: async (params: Record<string, unknown>) => {
      const limit = Math.min(Number(params.limit ?? 20), 50);
      const offset = Number(params.offset ?? 0);

      const rpcParams: Record<string, unknown> = {
        p_limit: limit,
        p_offset: offset,
      };
      if (params.domain) rpcParams.p_domain = params.domain;
      if (params.module_type) rpcParams.p_module_type = params.module_type;

      const { data, error } = await client.rpc("query_vault_modules", rpcParams);
      if (error) {
        logger.error("list failed", { error: error.message });
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            total_results: (data as unknown[])?.length ?? 0,
            offset,
            modules: data,
          }, null, 2),
        }],
      };
    },
  });

  // ── devvault_domains ────────────────────────────────────────────────────
  server.tool("devvault_domains", {
    description:
      "List all available knowledge domains with module counts and types. " +
      "Use this to discover what areas of knowledge are available.",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => {
      const { data, error } = await client.rpc("list_vault_domains");
      if (error) {
        logger.error("domains failed", { error: error.message });
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  });

  // ── devvault_ingest ─────────────────────────────────────────────────────
  server.tool("devvault_ingest", {
    description:
      "Save a new knowledge module to the vault. Use after successfully implementing " +
      "a pattern worth preserving. The module will be created with visibility='global' " +
      "and validation_status='draft' by default.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Module title (required)" },
        code: { type: "string", description: "The code content (required)" },
        description: { type: "string", description: "Brief description" },
        domain: {
          type: "string",
          enum: ["security", "backend", "frontend", "architecture", "devops", "saas_playbook"],
        },
        module_type: {
          type: "string",
          enum: ["code_snippet", "full_module", "sql_migration", "architecture_doc", "playbook_phase", "pattern_guide"],
        },
        language: { type: "string", description: "Programming language (default: typescript)" },
        tags: { type: "array", items: { type: "string" }, description: "Tags for categorization" },
        why_it_matters: { type: "string", description: "Why this knowledge is valuable" },
        context_markdown: { type: "string", description: "Extended context in Markdown" },
        code_example: { type: "string", description: "Usage example" },
        source_project: { type: "string", description: "Source project name" },
      },
      required: ["title", "code"],
    },
    handler: async (params: Record<string, unknown>) => {
      const insertData: Record<string, unknown> = {
        title: params.title,
        code: params.code,
        user_id: auth.userId,
        visibility: "global",
        validation_status: "draft",
        language: params.language ?? "typescript",
        tags: params.tags ?? [],
      };

      if (params.description) insertData.description = params.description;
      if (params.domain) insertData.domain = params.domain;
      if (params.module_type) insertData.module_type = params.module_type;
      if (params.why_it_matters) insertData.why_it_matters = params.why_it_matters;
      if (params.context_markdown) insertData.context_markdown = params.context_markdown;
      if (params.code_example) insertData.code_example = params.code_example;
      if (params.source_project) insertData.source_project = params.source_project;

      const { data, error } = await client
        .from("vault_modules")
        .insert(insertData)
        .select("id, slug, title")
        .single();

      if (error) {
        logger.error("ingest failed", { error: error.message });
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      logger.info("module ingested via MCP", { moduleId: data.id, userId: auth.userId });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            module: data,
            _hint: "Module created as 'draft'. Use devvault_get to verify it was saved correctly.",
          }, null, 2),
        }],
      };
    },
  });

  return server;
}

// ---------------------------------------------------------------------------
// Hono Router + Transport
// ---------------------------------------------------------------------------

const app = new Hono();

app.all("/*", async (c) => {
  // CORS for browser-based MCP clients
  if (c.req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type, x-devvault-key, x-api-key, authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Authenticate before MCP processing
  const authResult = await authenticateRequest(c.req.raw);
  if (authResult instanceof Response) {
    return authResult;
  }

  const mcpServer = createMcpServer(authResult);
  const transport = new StreamableHttpTransport();

  return await transport.handleRequest(c.req.raw, mcpServer);
});

Deno.serve(app.fetch);
