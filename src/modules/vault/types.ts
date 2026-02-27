// =============================================================================
// DevVault — Knowledge System Types
// =============================================================================

export type VisibilityLevel = "private" | "shared" | "global";

export type VaultDomain =
  | "security"
  | "backend"
  | "frontend"
  | "architecture"
  | "devops"
  | "saas_playbook";

export type VaultModuleType =
  | "code_snippet"
  | "full_module"
  | "sql_migration"
  | "architecture_doc"
  | "playbook_phase"
  | "pattern_guide";

export type VaultValidationStatus =
  | "draft"
  | "validated"
  | "deprecated";

export type DependencyType = "required" | "recommended";

export interface ModuleDependency {
  id: string;
  depends_on_id: string;
  title: string;
  slug: string | null;
  dependency_type: DependencyType;
  fetch_url: string;
}

export interface VaultModule {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  domain: VaultDomain;
  module_type: VaultModuleType;
  validation_status: VaultValidationStatus;
  visibility: VisibilityLevel;
  saas_phase: number | null;
  phase_title: string | null;
  why_it_matters: string | null;
  code_example: string | null;
  source_project: string | null;
  related_modules: string[];
  language: string;
  code: string;
  context_markdown: string | null;
  dependencies: string | null;
  tags: string[];
  module_dependencies?: ModuleDependency[];
  created_at: string;
  updated_at: string;
}

// Summary type for listings (excludes heavy fields)
export type VaultModuleSummary = Omit<VaultModule, "code" | "context_markdown" | "dependencies">;

// Scope for listing modules
export type VaultScope = "owned" | "shared_with_me" | "global" | "all";

// Visual style mappings (not labels — labels come from i18n)
export const DOMAIN_COLORS: Record<VaultDomain, string> = {
  security: "text-red-400 bg-red-400/10 border-red-400/20",
  backend: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  frontend: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  architecture: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  devops: "text-green-400 bg-green-400/10 border-green-400/20",
  saas_playbook: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
};

export const VALIDATION_COLORS: Record<VaultValidationStatus, string> = {
  validated: "text-green-400 bg-green-400/10 border-green-400/20",
  draft: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  deprecated: "text-gray-400 bg-gray-400/10 border-gray-400/20",
};

export const VISIBILITY_COLORS: Record<VisibilityLevel, string> = {
  private: "text-gray-400 bg-gray-400/10 border-gray-400/20",
  shared: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  global: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};
