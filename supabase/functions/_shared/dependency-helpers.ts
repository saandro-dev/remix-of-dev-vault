import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "./logger.ts";

const logger = createLogger("dependency-helpers");

interface DepModuleInfo {
  title: string;
  slug: string | null;
}

/**
 * Fetches and enriches dependencies for a given module ID.
 * Returns an array of ModuleDependency objects with HATEOAS fetch_url.
 */
export async function enrichModuleDependencies(
  client: SupabaseClient,
  moduleId: string
): Promise<Array<Record<string, unknown>>> {
  const { data: deps } = await client
    .from("vault_module_dependencies")
    .select("id, depends_on_id, dependency_type, created_at")
    .eq("module_id", moduleId);

  const depModuleIds = (deps ?? []).map((d: Record<string, unknown>) => d.depends_on_id as string);
  const depModules: Record<string, DepModuleInfo> = {};

  if (depModuleIds.length > 0) {
    const { data: mods } = await client
      .from("vault_modules")
      .select("id, title, slug")
      .in("id", depModuleIds);
    for (const m of mods ?? []) {
      const mod = m as Record<string, unknown>;
      depModules[mod.id as string] = {
        title: mod.title as string,
        slug: mod.slug as string | null,
      };
    }
  }

  return (deps ?? []).map((d: Record<string, unknown>) => ({
    id: d.id,
    depends_on_id: d.depends_on_id,
    dependency_type: d.dependency_type,
    title: depModules[d.depends_on_id as string]?.title ?? "Unknown",
    slug: depModules[d.depends_on_id as string]?.slug ?? null,
    fetch_url: `/rest/v1/rpc/get_vault_module?p_id=${d.depends_on_id}`,
  }));
}

/**
 * Batch-inserts dependencies for a module.
 * Accepts an array of { depends_on_id, dependency_type? } objects.
 */
export async function batchInsertDependencies(
  client: SupabaseClient,
  moduleId: string,
  dependencies: Array<{ depends_on_id: string; dependency_type?: string }>
): Promise<void> {
  if (!dependencies || dependencies.length === 0) return;

  const rows = dependencies.map((dep) => ({
    module_id: moduleId,
    depends_on_id: dep.depends_on_id,
    dependency_type: dep.dependency_type ?? "required",
  }));

  const { error } = await client
    .from("vault_module_dependencies")
    .insert(rows);

  if (error) {
    logger.error("batch insert dependencies failed", { error: error.message, moduleId });
    throw error;
  }

  logger.info(`batch inserted ${rows.length} dependencies for module=${moduleId}`);
}
