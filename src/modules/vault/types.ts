export type VaultCategory = "frontend" | "backend" | "devops" | "security";

export interface VaultModule {
  id: string;
  title: string;
  description: string | null;
  category: VaultCategory;
  language: string;
  code: string;
  context_markdown: string | null;
  dependencies: string | null;
  tags: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}
