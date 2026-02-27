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
  /** key_value is never returned by the API — use useRevealApiKey to get the actual value */
  has_value: boolean;
  environment: ProjectEnvironment;
  created_at: string;
}
