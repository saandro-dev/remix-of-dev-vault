export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface KeyFolder {
  id: string;
  name: string;
  color: string;
  project_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export type ProjectEnvironment = "dev" | "staging" | "prod";

export interface ProjectApiKey {
  id: string;
  label: string;
  /** key_value nunca é retornado pela API — usar useRevealApiKey para obter o valor real */
  has_value: boolean;
  environment: ProjectEnvironment;
  created_at: string;
}
