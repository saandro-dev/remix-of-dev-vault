import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "./logger.ts";
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from "./api-helpers.ts";

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

/**
 * Handles the "add_dependency" action for vault-crud.
 * Validates ownership, prevents self-referencing, and inserts the dependency row.
 */
export async function handleAddDependency(
  req: Request,
  client: SupabaseClient,
  userId: string,
  body: Record<string, unknown>
): Promise<Response> {
  const { module_id, depends_on_id, dependency_type } = body as {
    module_id?: string;
    depends_on_id?: string;
    dependency_type?: string;
  };

  if (!module_id || !depends_on_id) {
    return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing module_id or depends_on_id", 422);
  }

  if (module_id === depends_on_id) {
    return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "A module cannot depend on itself", 422);
  }

  // Verify the caller owns the source module
  const { data: ownerCheck } = await client
    .from("vault_modules")
    .select("id")
    .eq("id", module_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!ownerCheck) {
    return createErrorResponse(req, ERROR_CODES.NOT_FOUND, "Module not found or not owned", 404);
  }

  // Verify target module exists
  const { data: targetCheck } = await client
    .from("vault_modules")
    .select("id")
    .eq("id", depends_on_id)
    .maybeSingle();

  if (!targetCheck) {
    return createErrorResponse(req, ERROR_CODES.NOT_FOUND, "Target dependency module not found", 404);
  }

  const { data, error } = await client
    .from("vault_module_dependencies")
    .upsert(
      {
        module_id,
        depends_on_id,
        dependency_type: dependency_type ?? "required",
      },
      { onConflict: "module_id,depends_on_id" }
    )
    .select()
    .single();

  if (error) {
    logger.error("add dependency failed", { error: error.message });
    throw error;
  }

  logger.info(`added dependency module=${module_id} depends_on=${depends_on_id}`);
  return createSuccessResponse(req, data, 201);
}

/**
 * Handles the "remove_dependency" action for vault-crud.
 * Deletes a dependency row by its ID.
 */
export async function handleRemoveDependency(
  req: Request,
  client: SupabaseClient,
  body: Record<string, unknown>
): Promise<Response> {
  const { id } = body as { id?: string };

  if (!id) {
    return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing dependency id", 422);
  }

  const { error } = await client
    .from("vault_module_dependencies")
    .delete()
    .eq("id", id);

  if (error) {
    logger.error("remove dependency failed", { error: error.message });
    throw error;
  }

  logger.info(`removed dependency id=${id}`);
  return createSuccessResponse(req, { success: true });
}

/**
 * Handles the "list_dependencies" action for vault-crud.
 * Returns enriched dependencies for a given module.
 */
export async function handleListDependencies(
  req: Request,
  client: SupabaseClient,
  body: Record<string, unknown>
): Promise<Response> {
  const { module_id } = body as { module_id?: string };

  if (!module_id) {
    return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing module_id", 422);
  }

  const dependencies = await enrichModuleDependencies(client, module_id);
  return createSuccessResponse(req, { dependencies });
}
