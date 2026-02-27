// =============================================================================
// DevVault — Tipos do Sistema de Conhecimento Vivo
// =============================================================================

export type VaultDomain =
  | "security"       // Criptografia, Vault, RLS, autenticação
  | "backend"        // Edge Functions, banco de dados, SQL
  | "frontend"       // Componentes, hooks, UX patterns
  | "architecture"   // Padrões de arquitetura, decisões de design
  | "devops"         // Deploy, CI/CD, configuração
  | "saas_playbook"; // Playbooks de criação de SaaS por fases

export type VaultModuleType =
  | "code_snippet"    // Trecho de código reutilizável
  | "full_module"     // Módulo completo com código + documentação
  | "sql_migration"   // Migration SQL pronta para uso
  | "architecture_doc"// Documento de decisão arquitetural (ADR)
  | "playbook_phase"  // Uma fase de um playbook de criação de SaaS
  | "pattern_guide";  // Guia de padrão (ex: "Como usar o Vault")

export type VaultValidationStatus =
  | "draft"       // Em elaboração, não validado
  | "validated"   // Validado em produção
  | "deprecated"; // Não usar mais, substituído por outro

// Mantido para retrocompatibilidade
export type VaultCategory = "frontend" | "backend" | "devops" | "security";

export interface VaultModule {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  // Novos campos estruturais
  domain: VaultDomain;
  module_type: VaultModuleType;
  validation_status: VaultValidationStatus;
  saas_phase: number | null;
  phase_title: string | null;
  why_it_matters: string | null;
  code_example: string | null;
  source_project: string | null;
  related_modules: string[];
  // Campos existentes
  language: string;
  code: string;
  context_markdown: string | null;
  dependencies: string | null;
  tags: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// Versão resumida para listagens (sem code e context_markdown)
export type VaultModuleSummary = Omit<VaultModule, "code" | "context_markdown" | "dependencies">;

// Labels amigáveis para exibição
export const DOMAIN_LABELS: Record<VaultDomain, string> = {
  security: "Segurança",
  backend: "Backend",
  frontend: "Frontend",
  architecture: "Arquitetura",
  devops: "DevOps",
  saas_playbook: "Playbook SaaS",
};

export const MODULE_TYPE_LABELS: Record<VaultModuleType, string> = {
  code_snippet: "Snippet",
  full_module: "Módulo Completo",
  sql_migration: "Migration SQL",
  architecture_doc: "Decisão Arquitetural",
  playbook_phase: "Fase do Playbook",
  pattern_guide: "Guia de Padrão",
};

export const VALIDATION_STATUS_LABELS: Record<VaultValidationStatus, string> = {
  draft: "Rascunho",
  validated: "Validado",
  deprecated: "Depreciado",
};

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
