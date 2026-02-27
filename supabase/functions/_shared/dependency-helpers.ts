import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from "./api-helpers.ts";
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
 * Handles the add_dependency action.
 */
export async function handleAddDependency(
  req: Request,
  client: SupabaseClient,
  userId: string,
  body: Record<string, unknown>
): Promise<Response> {
  const { module_id, depends_on_id, dependency_type = "required" } = body;
  if (!module_id || !depends_on_id) {
    return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing module_id or depends_on_id", 422);
  }

  const { data, error } = await client
    .from("vault_module_dependencies")
    .insert({ module_id, depends_on_id, dependency_type })
    .select()
    .single();
  if (error) throw error;

  logger.info(`added dependency module=${module_id} depends_on=${depends_on_id}`);
  return createSuccessResponse(req, data, 201);
}

/**
 * Handles the remove_dependency action.
 */
export async function handleRemoveDependency(
  req: Request,
  client: SupabaseClient,
  body: Record<string, unknown>
): Promise<Response> {
  const { module_id, depends_on_id } = body;
  if (!module_id || !depends_on_id) {
    return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing module_id or depends_on_id", 422);
  }

  const { error } = await client
    .from("vault_module_dependencies")
    .delete()
    .eq("module_id", module_id as string)
    .eq("depends_on_id", depends_on_id as string);
  if (error) throw error;

  return createSuccessResponse(req, { removed: true });
}

/**
 * Handles the list_dependencies action.
 */
export async function handleListDependencies(
  req: Request,
  client: SupabaseClient,
  body: Record<string, unknown>
): Promise<Response> {
  const { module_id } = body;
  if (!module_id) {
    return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing module_id", 422);
  }

  const dependencies = await enrichModuleDependencies(client, module_id as string);
  return createSuccessResponse(req, { dependencies });
}
