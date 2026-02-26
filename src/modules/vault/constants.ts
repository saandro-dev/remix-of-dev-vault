import type { VaultCategory } from "./types";

export const CATEGORY_LABELS: Record<VaultCategory, string> = {
  frontend: "Frontend",
  backend: "Backend",
  devops: "DevOps & Infra",
  security: "Segurança & Criptografia",
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label })
);
