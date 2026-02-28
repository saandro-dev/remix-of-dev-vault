/**
 * mcp-tools/load-context.ts — devvault_load_context tool.
 *
 * Loads all modules associated with a source_project in a single call,
 * returning complete code and metadata for project-scoped scaffolding.
 */

import { createLogger } from "../logger.ts";
import { trackUsage } from "./usage-tracker.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:load-context");

export const registerLoadContextTool: ToolRegistrar = (server, client, auth) => {
  server.tool("devvault_load_context", {
    description:
      "Load all modules for a specific project in a single call. Returns complete code, " +
      "metadata, and dependencies for every module associated with the given source_project. " +
      "Use this to bootstrap full project context instead of multiple devvault_get calls. " +
      "Call without parameters to list all available projects.",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "The source_project name (e.g. 'rise-zap'). Omit to list available projects.",
        },
        domain: {
          type: "string",
          enum: ["security", "backend", "frontend", "architecture", "devops", "saas_playbook"],
          description: "Optional domain filter within the project",
        },
        limit: { type: "number", description: "Max modules (default 50, max 100)" },
      },
      required: [],
    },
    handler: async (params: Record<string, unknown>) => {
      const project = params.project as string | undefined;
      const domain = params.domain as string | undefined;
      const limit = Math.min(Number(params.limit ?? 50), 100);

      // ── Discovery mode: list available projects ──
      if (!project) {
        const { data, error } = await client
          .from("vault_modules")
          .select("source_project")
          .eq("visibility", "global")
          .in("validation_status", ["validated", "draft"])
          .not("source_project", "is", null)
          .not("source_project", "eq", "");

        if (error) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }

        // Aggregate unique projects with counts
        const projectCounts: Record<string, number> = {};
        for (const row of (data ?? []) as Array<{ source_project: string }>) {
          projectCounts[row.source_project] = (projectCounts[row.source_project] ?? 0) + 1;
        }

        const projects = Object.entries(projectCounts)
          .map(([name, count]) => ({ name, module_count: count }))
          .sort((a, b) => b.module_count - a.module_count);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              mode: "discovery",
              total_projects: projects.length,
              projects,
              _hint: "Use devvault_load_context with a project name to load all its modules.",
            }, null, 2),
          }],
        };
      }

      // ── Load project context ──
      let query = client
        .from("vault_modules")
        .select(`
          id, slug, title, description, domain, module_type, language,
          code, code_example, context_markdown, tags, source_project,
          validation_status, related_modules, module_group,
          implementation_order, difficulty, estimated_minutes,
          why_it_matters, usage_hint, common_errors, prerequisites,
          solves_problems, test_code, created_at, updated_at
        `)
        .eq("visibility", "global")
        .in("validation_status", ["validated", "draft"])
        .eq("source_project", project)
        .order("implementation_order", { ascending: true, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (domain) query = query.eq("domain", domain);

      const { data: modules, error } = await query;

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      const moduleList = (modules ?? []) as Record<string, unknown>[];

      // Fetch dependencies for all modules in one query
      const moduleIds = moduleList.map((m) => m.id as string);
      const { data: allDeps } = await client
        .from("vault_module_dependencies")
        .select("module_id, depends_on_id, dependency_type")
        .in("module_id", moduleIds);

      // Group deps by module
      const depsMap = new Map<string, Array<Record<string, unknown>>>();
      for (const dep of (allDeps ?? []) as Array<Record<string, unknown>>) {
        const key = dep.module_id as string;
        if (!depsMap.has(key)) depsMap.set(key, []);
        depsMap.get(key)!.push(dep);
      }

      const enriched = moduleList.map((m) => ({
        ...m,
        dependencies: depsMap.get(m.id as string) ?? [],
      }));

      trackUsage(client, auth, {
        event_type: "load_context",
        tool_name: "devvault_load_context",
        query_text: project,
        result_count: enriched.length,
      });

      logger.info("context loaded", { project, count: enriched.length });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            mode: "project_context",
            project,
            total_modules: enriched.length,
            modules: enriched,
            _hint:
              "Modules are ordered by implementation_order. " +
              "Each module includes its dependencies — implement required deps first.",
          }, null, 2),
        }],
      };
    },
  });
};
