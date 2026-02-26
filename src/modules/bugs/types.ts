export type BugStatus = "open" | "resolved";

export interface Bug {
  id: string;
  title: string;
  symptom: string;
  cause_code: string | null;
  solution: string | null;
  status: BugStatus;
  project_id: string | null;
  vault_module_id: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
}
