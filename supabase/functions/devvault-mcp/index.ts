/**
 * devvault-mcp/index.ts — Universal MCP Server for AI Agents (v2).
 *
 * Exposes the DevVault Knowledge Graph as MCP tools via Streamable HTTP.
 * Authentication: X-DevVault-Key header validated against Supabase Vault.
 * Transport: Streamable HTTP (mcp-lite default).
 *
 * Tools (8): devvault_bootstrap, devvault_search, devvault_get,
 *            devvault_list, devvault_domains, devvault_ingest,
 *            devvault_update, devvault_get_group.
 */

import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { validateApiKey } from "../_shared/api-key-guard.ts";
import { getSupabaseClient } from "../_shared/supabase-client.ts";
import { checkRateLimit } from "../_shared/rate-limit-guard.ts";
import { enrichModuleDependencies, batchInsertDependencies } from "../_shared/dependency-helpers.ts";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("devvault-mcp");

const MCP_RATE_LIMIT = {
  maxAttempts: 120,
  windowSeconds: 60,
  blockSeconds: 120,
};

// ---------------------------------------------------------------------------
// Auth middleware
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
        error: { code: -32002, message: `Rate limited. Retry after ${rateCheck.retryAfterSeconds}s` },
      }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rateCheck.retryAfterSeconds) } },
    );
  }

  return { userId: result.userId, keyId: result.keyId };
}

// ---------------------------------------------------------------------------
// Completeness helper (calls DB function)
// ---------------------------------------------------------------------------

async function getCompleteness(client: ReturnType<typeof getSupabaseClient>, moduleId: string) {
  const { data, error } = await client.rpc("vault_module_completeness", { p_id: moduleId });
  if (error || !data || (data as unknown[]).length === 0) {
    return { score: 0, missing_fields: ["error_fetching_completeness"] };
  }
  const row = (data as Record<string, unknown>[])[0];
  return { score: row.score as number, missing_fields: row.missing_fields as string[] };
}

// ---------------------------------------------------------------------------
// MCP Server definition
// ---------------------------------------------------------------------------

function createMcpServer(auth: AuthContext): McpServer {
  const client = getSupabaseClient("general");

  const server = new McpServer({
    name: "devvault",
    version: "2.0.0",
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
      "Search the Knowledge Graph by intent/text. Returns modules matching your query " +
      "with relevance scoring. Supports full-text search in both PT and EN. " +
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
      "Fetch a specific module by ID or slug. Returns full code, context, dependencies, " +
      "completeness score, and group metadata. CRITICAL: If any dependency has " +
      "dependency_type='required', you MUST call devvault_get for each required " +
      "dependency BEFORE implementing this module.",
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

      // Completeness score
      const completeness = await getCompleteness(client, moduleId);

      // Group metadata
      const moduleRaw = await client
        .from("vault_modules")
        .select("module_group, implementation_order")
        .eq("id", moduleId)
        .single();

      let groupMeta: Record<string, unknown> | null = null;
      if (moduleRaw.data?.module_group) {
        const { count } = await client
          .from("vault_modules")
          .select("id", { count: "exact", head: true })
          .eq("module_group", moduleRaw.data.module_group);

        groupMeta = {
          name: moduleRaw.data.module_group,
          position: moduleRaw.data.implementation_order,
          total: count ?? 0,
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ...module,
            dependencies,
            _completeness: completeness,
            _group: groupMeta,
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
      "List modules with optional filters including text search, tags, and group. " +
      "For semantic/intent-based search with relevance scoring, prefer devvault_search.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Text search filter (searches title, description, tags)" },
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
        group: { type: "string", description: "Filter by module_group name (e.g. 'whatsapp-integration')" },
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
      if (params.query) rpcParams.p_query = params.query;
      if (params.domain) rpcParams.p_domain = params.domain;
      if (params.module_type) rpcParams.p_module_type = params.module_type;
      if (params.tags) rpcParams.p_tags = params.tags;

      const { data, error } = await client.rpc("query_vault_modules", rpcParams);
      if (error) {
        logger.error("list failed", { error: error.message });
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      // If group filter, apply post-filter (column not in RPC)
      let modules = data as Record<string, unknown>[];
      if (params.group) {
        const groupName = params.group as string;
        const { data: groupModules } = await client
          .from("vault_modules")
          .select("id")
          .eq("module_group", groupName);
        const groupIds = new Set((groupModules ?? []).map((m: Record<string, unknown>) => m.id as string));
        modules = modules.filter((m) => groupIds.has(m.id as string));
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            total_results: modules.length,
            offset,
            modules,
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
      "Save a new knowledge module to the vault. Slug is auto-generated from title if " +
      "not provided. You can attach dependencies and assign a module_group. " +
      "STRONGLY ENCOURAGED: always provide why_it_matters and code_example for maximum " +
      "agent utility. Missing these fields will trigger a warning in the response.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Module title (required, English preferred)" },
        code: { type: "string", description: "The code content (required)" },
        description: { type: "string", description: "Brief description (English preferred)" },
        slug: { type: "string", description: "Custom slug (auto-generated from title if omitted)" },
        domain: {
          type: "string",
          enum: ["security", "backend", "frontend", "architecture", "devops", "saas_playbook"],
        },
        module_type: {
          type: "string",
          enum: ["code_snippet", "full_module", "sql_migration", "architecture_doc", "playbook_phase", "pattern_guide"],
        },
        language: { type: "string", description: "Programming language (default: typescript)" },
        tags: { type: "array", items: { type: "string" }, description: "Tags for categorization (English)" },
        why_it_matters: { type: "string", description: "Why this knowledge is valuable (strongly encouraged)" },
        context_markdown: { type: "string", description: "Extended context in Markdown" },
        code_example: { type: "string", description: "Usage example showing how to use this module (strongly encouraged)" },
        source_project: { type: "string", description: "Source project name" },
        module_group: { type: "string", description: "Group name for related modules (e.g. 'whatsapp-integration')" },
        implementation_order: { type: "number", description: "Order within group (1-based)" },
        dependencies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              depends_on_id: { type: "string", description: "UUID of the dependency module" },
              dependency_type: { type: "string", enum: ["required", "recommended"], description: "Default: required" },
            },
            required: ["depends_on_id"],
          },
          description: "Array of module dependencies to link",
        },
      },
      required: ["title", "code"],
    },
    handler: async (params: Record<string, unknown>) => {
      const warnings: string[] = [];

      if (!params.why_it_matters) warnings.push("why_it_matters is empty — agents benefit greatly from knowing WHY this module exists.");
      if (!params.code_example) warnings.push("code_example is empty — agents need usage examples to implement correctly.");

      const insertData: Record<string, unknown> = {
        title: params.title,
        code: params.code,
        user_id: auth.userId,
        visibility: "global",
        validation_status: "draft",
        language: params.language ?? "typescript",
        tags: params.tags ?? [],
      };

      if (params.slug) insertData.slug = params.slug;
      if (params.description) insertData.description = params.description;
      if (params.domain) insertData.domain = params.domain;
      if (params.module_type) insertData.module_type = params.module_type;
      if (params.why_it_matters) insertData.why_it_matters = params.why_it_matters;
      if (params.context_markdown) insertData.context_markdown = params.context_markdown;
      if (params.code_example) insertData.code_example = params.code_example;
      if (params.source_project) insertData.source_project = params.source_project;
      if (params.module_group) insertData.module_group = params.module_group;
      if (params.implementation_order != null) insertData.implementation_order = params.implementation_order;

      const { data, error } = await client
        .from("vault_modules")
        .insert(insertData)
        .select("id, slug, title")
        .single();

      if (error) {
        logger.error("ingest failed", { error: error.message });
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      // Insert dependencies if provided
      const deps = params.dependencies as Array<{ depends_on_id: string; dependency_type?: string }> | undefined;
      if (deps && deps.length > 0) {
        try {
          await batchInsertDependencies(client, data.id, deps);
        } catch (depError) {
          warnings.push(`Dependencies partially failed: ${(depError as Error).message}`);
        }
      }

      // Get completeness score
      const completeness = await getCompleteness(client, data.id);

      logger.info("module ingested via MCP", { moduleId: data.id, userId: auth.userId });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            module: data,
            _completeness: completeness,
            _warnings: warnings.length > 0 ? warnings : undefined,
            _hint: "Module created as 'draft'. Use devvault_get to verify it was saved correctly.",
          }, null, 2),
        }],
      };
    },
  });

  // ── devvault_update ─────────────────────────────────────────────────────
  server.tool("devvault_update", {
    description:
      "Update an existing module by ID or slug. Supports partial updates — only the " +
      "fields you provide will be changed. Use this to fill missing fields like " +
      "why_it_matters, code_example, fix language, update tags, etc. Returns the " +
      "updated completeness score.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Module UUID (provide id or slug)" },
        slug: { type: "string", description: "Module slug (provide id or slug)" },
        title: { type: "string" },
        description: { type: "string" },
        code: { type: "string" },
        code_example: { type: "string" },
        why_it_matters: { type: "string" },
        context_markdown: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        domain: { type: "string", enum: ["security", "backend", "frontend", "architecture", "devops", "saas_playbook"] },
        module_type: { type: "string", enum: ["code_snippet", "full_module", "sql_migration", "architecture_doc", "playbook_phase", "pattern_guide"] },
        language: { type: "string" },
        source_project: { type: "string" },
        module_group: { type: "string" },
        implementation_order: { type: "number" },
        validation_status: { type: "string", enum: ["draft", "validated", "deprecated"] },
      },
      required: [],
    },
    handler: async (params: Record<string, unknown>) => {
      if (!params.id && !params.slug) {
        return { content: [{ type: "text", text: "Error: Provide either 'id' or 'slug'" }] };
      }

      // Resolve module ID
      let moduleId = params.id as string | undefined;
      if (!moduleId && params.slug) {
        const { data: found } = await client
          .from("vault_modules")
          .select("id")
          .eq("slug", params.slug as string)
          .single();
        if (!found) {
          return { content: [{ type: "text", text: `Module not found with slug: ${params.slug}` }] };
        }
        moduleId = found.id;
      }

      // Build update payload (exclude id/slug from update fields)
      const updateFields: Record<string, unknown> = {};
      const allowedFields = [
        "title", "description", "code", "code_example", "why_it_matters",
        "context_markdown", "tags", "domain", "module_type", "language",
        "source_project", "module_group", "implementation_order", "validation_status",
      ];
      for (const field of allowedFields) {
        if (params[field] !== undefined) updateFields[field] = params[field];
      }

      if (Object.keys(updateFields).length === 0) {
        return { content: [{ type: "text", text: "Error: No fields to update" }] };
      }

      const { data, error } = await client
        .from("vault_modules")
        .update(updateFields)
        .eq("id", moduleId!)
        .select("id, slug, title, updated_at")
        .single();

      if (error) {
        logger.error("update failed", { error: error.message });
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      const completeness = await getCompleteness(client, moduleId!);

      logger.info("module updated via MCP", { moduleId, userId: auth.userId, fields: Object.keys(updateFields) });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            module: data,
            _completeness: completeness,
            updated_fields: Object.keys(updateFields),
          }, null, 2),
        }],
      };
    },
  });

  // ── devvault_get_group ──────────────────────────────────────────────────
  server.tool("devvault_get_group", {
    description:
      "Fetch all modules in a group, ordered by implementation_order, with dependencies " +
      "pre-resolved. This is the 'give me everything I need to implement X' tool. " +
      "Example: devvault_get_group({ group: 'whatsapp-integration' }) returns all " +
      "WhatsApp modules in the correct implementation sequence.",
    inputSchema: {
      type: "object",
      properties: {
        group: { type: "string", description: "The module_group name (e.g. 'whatsapp-integration')" },
      },
      required: ["group"],
    },
    handler: async (params: Record<string, unknown>) => {
      const groupName = params.group as string;

      const { data: modules, error } = await client
        .from("vault_modules")
        .select("id, slug, title, description, domain, module_type, language, tags, why_it_matters, code_example, module_group, implementation_order, validation_status")
        .eq("module_group", groupName)
        .order("implementation_order", { ascending: true, nullsFirst: false });

      if (error) {
        logger.error("get_group failed", { error: error.message });
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      if (!modules || modules.length === 0) {
        return { content: [{ type: "text", text: `No modules found in group: ${groupName}` }] };
      }

      // Enrich each module with dependencies
      const enriched = await Promise.all(
        (modules as Record<string, unknown>[]).map(async (mod) => {
          const deps = await enrichModuleDependencies(client, mod.id as string);
          return { ...mod, dependencies: deps };
        }),
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            group: groupName,
            total_modules: enriched.length,
            modules: enriched,
            _instructions:
              "Implement these modules in order (by implementation_order). " +
              "For each module, call devvault_get to fetch the full code before implementing. " +
              "Respect required dependencies — implement them first.",
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

app.all("/*", async (c) => {
  if (c.req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const authResult = await authenticateRequest(c.req.raw);
  if (authResult instanceof Response) {
    return authResult;
  }

  const mcpServer = createMcpServer(authResult);
  const transport = new StreamableHttpTransport();
  const handler = transport.bind(mcpServer);

  return await handler(c.req.raw);
});

Deno.serve(app.fetch);
