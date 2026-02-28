/**
 * mcp-tools/bootstrap.ts — devvault_bootstrap tool.
 *
 * Returns the full index of the Knowledge Graph (domains, playbook phases,
 * top validated modules) PLUS an _agent_guide with workflow instructions,
 * tool catalog, behavioral rules, and anti-patterns.
 *
 * This is the ONLY entry point an AI agent needs — no external docs required.
 */

import { createLogger } from "../logger.ts";
import type { ToolRegistrar } from "./types.ts";

const logger = createLogger("mcp-tool:bootstrap");

// ─── AGENT GUIDE (inline workflow documentation) ────────────────────────────
// Lives here so it's impossible to desynchronize from the actual tool set.
// Update this object whenever a tool is added, removed, or renamed.

const AGENT_GUIDE = {
  _purpose:
    "This guide teaches AI agents how to use DevVault's 22 MCP tools effectively. " +
    "Read it once after bootstrap, then follow the workflow.",

  recommended_workflow: [
    "1. BOOTSTRAP — You already called this. Review domains, phases, and top modules below.",
    "2. DISCOVER — Use devvault_search (semantic + full-text) or devvault_list (browsing with filters) to find relevant modules.",
    "3. RETRIEVE — Use devvault_get (by id or slug) to fetch full code, dependencies, and context_markdown.",
    "4. CHECK DEPENDENCIES — If the module has prerequisites, fetch each one with devvault_get before implementing.",
    "5. IMPLEMENT — Apply the code. If you encounter problems, use devvault_diagnose or devvault_diary_bug.",
    "6. REPORT OUTCOME — Use devvault_report_success on success, or devvault_diary_bug on failure.",
    "7. CONTRIBUTE BACK — Use devvault_ingest to add new reusable knowledge you created during implementation.",
  ],

  tool_catalog: {
    discovery: {
      devvault_bootstrap:
        "Returns knowledge graph index + this guide. ALWAYS call first.",
      devvault_search:
        "Hybrid search (semantic + full-text). Use for finding modules by problem description or keywords.",
      devvault_list:
        "Paginated listing with filters (domain, module_type, saas_phase, tags). Use for browsing.",
      devvault_domains:
        "Lists all domains with module counts and available module_types.",
      devvault_get:
        "Fetches a single module's full content (code, dependencies, context_markdown). Use after search/list.",
      devvault_get_group:
        "Fetches all modules in a module_group. Useful for multi-part implementations.",
      devvault_load_context:
        "Loads a module's context_markdown — rich implementation guide with architecture decisions.",
      devvault_quickstart:
        "Returns a curated onboarding sequence for a specific domain.",
    },
    crud: {
      devvault_ingest:
        "Creates a new module. MUST include: title, code, language, why_it_matters, code_example.",
      devvault_update:
        "Updates an existing module's fields. Supports ai_metadata, tags, code, description, etc.",
      devvault_delete:
        "Permanently deletes a module by id. Ownership enforced.",
      devvault_validate:
        "Returns completeness score and missing fields for a module. Use before marking as validated.",
      devvault_changelog:
        "Records a version bump with a list of changes for a module.",
    },
    diagnostics: {
      devvault_diagnose:
        "Analyzes an error message against the knowledge base. Returns matching modules and suggested fixes.",
      devvault_check_updates:
        "Checks if modules used in a project have newer versions available.",
      devvault_export_tree:
        "Exports the full module dependency tree as a structured object.",
    },
    bug_diary: {
      devvault_report_bug:
        "Reports a bug found in a vault module (not user project bugs — use diary_bug for those).",
      devvault_resolve_bug:
        "Marks a vault module bug as resolved with a solution.",
      devvault_diary_bug:
        "Records a bug in the user's personal bug diary. Auto-sets status based on whether solution is provided.",
      devvault_diary_resolve:
        "Resolves an existing bug diary entry with cause_code and solution. Ownership enforced.",
      devvault_diary_list:
        "Lists and searches the user's bug diary entries. Filter by status, tags, project, or text. Use to find bug_ids for resolving and to avoid duplicates.",
    },
    reporting: {
      devvault_report_success:
        "Records that a module was successfully used. Helps track which modules are battle-tested.",
    },
  },

  behavioral_rules: [
    "ALWAYS call devvault_bootstrap first to understand available knowledge before searching.",
    "ALWAYS fetch required dependencies (prerequisites) before implementing a module.",
    "ALWAYS check devvault_validate before marking a module as validated.",
    "Use devvault_diary_bug to document ANY problem encountered during implementation — this builds institutional memory.",
    "ALWAYS search existing bugs with devvault_diary_list before creating new ones to avoid duplicates.",
    "Use devvault_report_success after successful implementation — this tracks module reliability.",
    "Prefer devvault_search over devvault_list when you know what problem you're solving.",
    "Prefer devvault_list over devvault_search when browsing a domain or exploring available knowledge.",
    "When a module has context_markdown, ALWAYS load it with devvault_load_context — it contains critical architecture decisions.",
    "When ingesting new modules, include why_it_matters and code_example — modules without these are considered incomplete.",
  ],

  anti_patterns: [
    "Do NOT ingest modules without why_it_matters and code_example — they will fail validation.",
    "Do NOT implement a module without first fetching its dependencies — you will miss required context.",
    "Do NOT skip devvault_diagnose when encountering errors — the knowledge base likely has a solution.",
    "Do NOT create duplicate modules — always search first to check if similar knowledge exists.",
    "Do NOT ignore _hint and _instructions fields in tool responses — they guide your next action.",
    "Do NOT use devvault_report_bug for user project bugs — use devvault_diary_bug instead.",
  ],
};

export const registerBootstrapTool: ToolRegistrar = (server, client) => {
  server.tool("devvault_bootstrap", {
    description:
      "ALWAYS call this first. Returns the full index of the DevVault Knowledge Graph: " +
      "domains, playbook phases, top validated modules, AND a complete workflow guide " +
      "explaining how to use all 22 tools effectively.",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => {
      logger.info("invoked");
      try {
        const { data, error } = await client.rpc("bootstrap_vault_context");
        logger.info("RPC result", {
          success: !error,
          error: error?.message,
        });
        if (error) {
          logger.error("bootstrap failed", { error: error.message });
          return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }

        const response = {
          _agent_guide: AGENT_GUIDE,
          knowledge_graph: data,
        };

        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (err) {
        logger.error("uncaught error", { error: String(err) });
        return { content: [{ type: "text", text: `Uncaught error: ${String(err)}` }] };
      }
    },
  });
};
