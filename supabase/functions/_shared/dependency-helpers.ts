/**
 * dependency-helpers.ts — Shared helpers for module dependency management.
 *
 * Supports both UUID and slug-based dependency references.
 * All slug→UUID resolution happens server-side in a single batch query.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "./logger.ts";
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from "./api-helpers.ts";

const logger = createLogger("dependency-helpers");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
 * Resolves a dependency reference (UUID or slug) to a UUID.
 * Returns null if the module is not found.
 */
async function resolveToUuid(
  client: SupabaseClient,
  ref: string,
): Promise<string | null> {
  if (UUID_RE.test(ref)) return ref;

  const { data } = await client
    .from("vault_modules")
    .select("id")
    .eq("slug", ref)
    .maybeSingle();

  return data?.id ?? null;
}

/**
 * Batch-inserts dependencies for a module.
 * Accepts depends_on_id (UUID) OR depends_on (slug or UUID).
 * Resolves slugs to UUIDs internally.
 */
export async function batchInsertDependencies(
  client: SupabaseClient,
  moduleId: string,
  dependencies: Array<{ depends_on_id?: string; depends_on?: string; dependency_type?: string }>
): Promise<{ inserted: number; failed: string[] }> {
  if (!dependencies || dependencies.length === 0) return { inserted: 0, failed: [] };

  const failed: string[] = [];
  const rows: Array<{ module_id: string; depends_on_id: string; dependency_type: string }> = [];

  // Collect all slugs that need resolution
  const slugsToResolve: string[] = [];
  for (const dep of dependencies) {
    const ref = dep.depends_on ?? dep.depends_on_id;
    if (!ref) continue;
    if (!UUID_RE.test(ref)) slugsToResolve.push(ref);
  }

  // Batch resolve slugs in one query
  const slugToId: Record<string, string> = {};
  if (slugsToResolve.length > 0) {
    const { data: resolved } = await client
      .from("vault_modules")
      .select("id, slug")
      .in("slug", slugsToResolve);
    for (const m of resolved ?? []) {
      const mod = m as Record<string, unknown>;
      slugToId[mod.slug as string] = mod.id as string;
    }
  }

  for (const dep of dependencies) {
    const ref = dep.depends_on ?? dep.depends_on_id;
    if (!ref) {
      failed.push("empty reference");
      continue;
    }

    let resolvedId: string;
    if (UUID_RE.test(ref)) {
      resolvedId = ref;
    } else {
      const mapped = slugToId[ref];
      if (!mapped) {
        failed.push(ref);
        continue;
      }
      resolvedId = mapped;
    }

    rows.push({
      module_id: moduleId,
      depends_on_id: resolvedId,
      dependency_type: dep.dependency_type ?? "required",
    });
  }

  if (rows.length > 0) {
    const { error } = await client
      .from("vault_module_dependencies")
      .insert(rows);

    if (error) {
      logger.error("batch insert dependencies failed", { error: error.message, moduleId });
      throw error;
    }
  }

  logger.info(`batch inserted ${rows.length} dependencies for module=${moduleId}`, {
    failed: failed.length > 0 ? failed : undefined,
  });

  return { inserted: rows.length, failed };
}

/**
 * Handles the "add_dependency" action for vault-crud.
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

  const { data: ownerCheck } = await client
    .from("vault_modules")
    .select("id")
    .eq("id", module_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!ownerCheck) {
    return createErrorResponse(req, ERROR_CODES.NOT_FOUND, "Module not found or not owned", 404);
  }

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
