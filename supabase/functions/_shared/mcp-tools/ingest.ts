/**
 * mcp-tools/ingest.ts — devvault_ingest tool.
 *
 * Saves a new knowledge module to the vault with optional dependencies,
 * module_group, and completeness warnings.
 */

import { createLogger } from "../logger.ts";
import { batchInsertDependencies } from "../dependency-helpers.ts";
import { getCompleteness } from "./completeness.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:ingest");

export const registerIngestTool: ToolRegistrar = (server, client, auth) => {
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
        code_example: { type: "string", description: "Usage example (strongly encouraged)" },
        source_project: { type: "string", description: "Source project name" },
        module_group: { type: "string", description: "Group name for related modules" },
        implementation_order: { type: "number", description: "Order within group (1-based)" },
        dependencies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              depends_on_id: { type: "string", description: "UUID of the dependency module" },
              dependency_type: { type: "string", enum: ["required", "recommended"] },
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

      const optionalFields = [
        "slug", "description", "domain", "module_type", "why_it_matters",
        "context_markdown", "code_example", "source_project", "module_group",
      ];
      for (const field of optionalFields) {
        if (params[field]) insertData[field] = params[field];
      }
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

      const deps = params.dependencies as Array<{ depends_on_id: string; dependency_type?: string }> | undefined;
      if (deps && deps.length > 0) {
        try {
          await batchInsertDependencies(client, data.id, deps);
        } catch (depError) {
          warnings.push(`Dependencies partially failed: ${(depError as Error).message}`);
        }
      }

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
};
