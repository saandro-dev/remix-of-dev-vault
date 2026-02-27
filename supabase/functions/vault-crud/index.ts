import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCorsV2, createSuccessResponse, createErrorResponse, ERROR_CODES } from "../_shared/api-helpers.ts";
import { authenticateRequest, isResponse } from "../_shared/auth.ts";
import { withSentry } from "../_shared/sentry.ts";
import { log } from "../_shared/logger.ts";

serve(withSentry("vault-crud", async (req: Request) => {
  const corsResponse = handleCorsV2(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Only POST allowed", 405);
  }

  const auth = await authenticateRequest(req);
  if (isResponse(auth)) return auth;
  const { user, client } = auth;

  try {
    const body = await req.json();
    const { action } = body;
    log("info", "vault-crud", `action=${action} user=${user.id}`);

    switch (action) {

      case "list": {
        const { scope = "owned", domain, module_type, query, limit = 50, offset = 0 } = body;

        const { data, error } = await client.rpc("get_visible_modules", {
          p_user_id: user.id,
          p_scope: scope,
          p_domain: domain || null,
          p_module_type: module_type || null,
          p_query: query || null,
          p_limit: limit,
          p_offset: offset,
        });
        if (error) throw error;
        return createSuccessResponse(req, { items: data ?? [], total: (data ?? []).length });
      }

      case "get": {
        const { id } = body;
        if (!id) return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing id", 422);

        const { data, error } = await client
          .from("vault_modules")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return createErrorResponse(req, ERROR_CODES.NOT_FOUND, "Module not found", 404);

        const isOwner = data.user_id === user.id;
        const isGlobal = data.visibility === "global";
        if (!isOwner && !isGlobal) {
          const { data: share } = await client
            .from("vault_module_shares")
            .select("module_id")
            .eq("module_id", id)
            .eq("shared_with_user_id", user.id)
            .maybeSingle();
          if (!share) {
            return createErrorResponse(req, ERROR_CODES.NOT_FOUND, "Module not found", 404);
          }
        }

        // Enrich with module dependencies (HATEOAS)
        const { data: deps } = await client
          .from("vault_module_dependencies")
          .select("id, depends_on_id, dependency_type, created_at")
          .eq("module_id", id);

        const depModuleIds = (deps ?? []).map((d: Record<string, unknown>) => d.depends_on_id as string);
        let depModules: Record<string, { title: string; slug: string | null }> = {};
        if (depModuleIds.length > 0) {
          const { data: mods } = await client
            .from("vault_modules")
            .select("id, title, slug")
            .in("id", depModuleIds);
          for (const m of mods ?? []) {
            depModules[(m as Record<string, unknown>).id as string] = {
              title: (m as Record<string, unknown>).title as string,
              slug: (m as Record<string, unknown>).slug as string | null,
            };
          }
        }

        const module_dependencies = (deps ?? []).map((d: Record<string, unknown>) => ({
          id: d.id,
          depends_on_id: d.depends_on_id,
          dependency_type: d.dependency_type,
          title: depModules[d.depends_on_id as string]?.title ?? "Unknown",
          slug: depModules[d.depends_on_id as string]?.slug ?? null,
          fetch_url: `/rest/v1/rpc/get_vault_module?p_id=${d.depends_on_id}`,
        }));

        return createSuccessResponse(req, { ...data, module_dependencies });
      }

      case "create": {
        const {
          title, description, domain, module_type, language, code,
          context_markdown, dependencies, tags, saas_phase, phase_title,
          why_it_matters, code_example, source_project, validation_status,
          related_modules, visibility,
        } = body;
        if (!title) return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing title", 422);

        const { data, error } = await client
          .from("vault_modules")
          .insert({
            user_id: user.id,
            title,
            description: description || null,
            domain: domain || "backend",
            module_type: module_type || "code_snippet",
            language: language || "typescript",
            code: code || "",
            context_markdown: context_markdown || null,
            dependencies: dependencies || null,
            tags: tags || [],
            saas_phase: saas_phase || null,
            phase_title: phase_title || null,
            why_it_matters: why_it_matters || null,
            code_example: code_example || null,
            source_project: source_project || null,
            validation_status: validation_status || "draft",
            related_modules: related_modules || [],
            visibility: visibility || "private",
          })
          .select()
          .single();
        if (error) throw error;
        log("info", "vault-crud", `created module=${data.id} domain=${data.domain}`);
        return createSuccessResponse(req, data, 201);
      }

      case "update": {
        const { id, ...fields } = body;
        if (!id) return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing id", 422);
        const allowed = [
          "title", "description", "domain", "module_type", "language",
          "code", "context_markdown", "dependencies", "tags", "saas_phase",
          "phase_title", "why_it_matters", "code_example", "source_project",
          "validation_status", "related_modules", "visibility",
        ];
        const updateFields: Record<string, unknown> = {};
        for (const key of allowed) {
          if (fields[key] !== undefined) updateFields[key] = fields[key];
        }
        if (Object.keys(updateFields).length === 0) {
          return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "No fields to update", 422);
        }
        const { data, error } = await client
          .from("vault_modules")
          .update(updateFields)
          .eq("id", id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) throw error;
        return createSuccessResponse(req, data);
      }

      case "delete": {
        const { id } = body;
        if (!id) return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing id", 422);
        const { error } = await client
          .from("vault_modules")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        if (error) throw error;
        return createSuccessResponse(req, { success: true });
      }

      case "search": {
        const { query, domain, module_type, saas_phase, source_project, validated, limit = 20, offset = 0 } = body;
        const { data, error } = await client.rpc("search_vault_modules", {
          p_user_id: user.id,
          p_query: query || null,
          p_domain: domain || null,
          p_module_type: module_type || null,
          p_saas_phase: saas_phase ?? null,
          p_source: source_project || null,
          p_validated: validated ?? null,
          p_limit: limit,
          p_offset: offset,
        });
        if (error) throw error;
        return createSuccessResponse(req, { items: data, total: data.length });
      }

      case "get_playbook": {
        const { data, error } = await client
          .from("vault_modules")
          .select("id,title,description,domain,module_type,saas_phase,phase_title,why_it_matters,code_example,tags,validation_status,source_project,language,visibility")
          .or(`user_id.eq.${user.id},visibility.eq.global`)
          .eq("module_type", "playbook_phase")
          .order("saas_phase", { ascending: true });
        if (error) throw error;
        const phases: Record<number, unknown[]> = {};
        for (const mod of data ?? []) {
          const phase = (mod as Record<string, unknown>).saas_phase as number ?? 0;
          if (!phases[phase]) phases[phase] = [];
          phases[phase].push(mod);
        }
        return createSuccessResponse(req, { phases, total: data?.length ?? 0 });
      }

      // -- Share a module with another user by email --
      case "share": {
        const { module_id, email } = body;
        if (!module_id || !email) {
          return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing module_id or email", 422);
        }

        // Verify ownership
        const { data: mod, error: modErr } = await client
          .from("vault_modules")
          .select("id, user_id, visibility")
          .eq("id", module_id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (modErr) throw modErr;
        if (!mod) return createErrorResponse(req, ERROR_CODES.NOT_FOUND, "Module not found or not owned", 404);

        // Find target user by email via profiles + auth
        const { data: targetProfile, error: profileErr } = await client
          .from("profiles")
          .select("id")
          .eq("id", (
            await client.rpc("get_user_id_by_email", { p_email: email })
          ).data)
          .maybeSingle();

        // Fallback: use service client to look up user
        // Since we can't query auth.users, we need a helper RPC
        // For now, return validation error if user not found
        if (profileErr || !targetProfile) {
          return createErrorResponse(req, ERROR_CODES.NOT_FOUND, "User not found with that email", 404);
        }

        if (targetProfile.id === user.id) {
          return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Cannot share with yourself", 422);
        }

        // Update visibility to shared if currently private
        if (mod.visibility === "private") {
          await client
            .from("vault_modules")
            .update({ visibility: "shared" })
            .eq("id", module_id)
            .eq("user_id", user.id);
        }

        // Insert share record
        const { error: shareErr } = await client
          .from("vault_module_shares")
          .upsert({
            module_id,
            shared_with_user_id: targetProfile.id,
            shared_by_user_id: user.id,
          }, { onConflict: "module_id,shared_with_user_id" });
        if (shareErr) throw shareErr;

        log("info", "vault-crud", `shared module=${module_id} with=${targetProfile.id}`);
        return createSuccessResponse(req, { shared: true });
      }

      // -- Remove a share --
      case "unshare": {
        const { module_id, user_id: target_user_id } = body;
        if (!module_id || !target_user_id) {
          return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing module_id or user_id", 422);
        }

        const { error } = await client
          .from("vault_module_shares")
          .delete()
          .eq("module_id", module_id)
          .eq("shared_by_user_id", user.id)
          .eq("shared_with_user_id", target_user_id);
        if (error) throw error;

        return createSuccessResponse(req, { unshared: true });
      }

      // -- List shares for a module --
      case "list_shares": {
        const { module_id } = body;
        if (!module_id) {
          return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing module_id", 422);
        }

        const { data, error } = await client
          .from("vault_module_shares")
          .select("shared_with_user_id, created_at")
          .eq("module_id", module_id)
          .eq("shared_by_user_id", user.id);
        if (error) throw error;

        return createSuccessResponse(req, { shares: data ?? [] });
      }

      // -- Add a dependency between modules --
      case "add_dependency": {
        const { module_id, depends_on_id, dependency_type = "required" } = body;
        if (!module_id || !depends_on_id) {
          return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing module_id or depends_on_id", 422);
        }

        // Ownership validated by RLS INSERT policy
        const { data, error } = await client
          .from("vault_module_dependencies")
          .insert({
            module_id,
            depends_on_id,
            dependency_type,
          })
          .select()
          .single();
        if (error) throw error;

        log("info", "vault-crud", `added dependency module=${module_id} depends_on=${depends_on_id}`);
        return createSuccessResponse(req, data, 201);
      }

      // -- Remove a dependency --
      case "remove_dependency": {
        const { module_id, depends_on_id } = body;
        if (!module_id || !depends_on_id) {
          return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing module_id or depends_on_id", 422);
        }

        // Ownership validated by RLS DELETE policy
        const { error } = await client
          .from("vault_module_dependencies")
          .delete()
          .eq("module_id", module_id)
          .eq("depends_on_id", depends_on_id);
        if (error) throw error;

        return createSuccessResponse(req, { removed: true });
      }

      // -- List dependencies for a module --
      case "list_dependencies": {
        const { module_id } = body;
        if (!module_id) {
          return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing module_id", 422);
        }

        const { data: deps, error } = await client
          .from("vault_module_dependencies")
          .select("id, depends_on_id, dependency_type, created_at")
          .eq("module_id", module_id);
        if (error) throw error;

        const depIds = (deps ?? []).map((d: Record<string, unknown>) => d.depends_on_id as string);
        let depMods: Record<string, { title: string; slug: string | null }> = {};
        if (depIds.length > 0) {
          const { data: mods } = await client
            .from("vault_modules")
            .select("id, title, slug")
            .in("id", depIds);
          for (const m of mods ?? []) {
            depMods[(m as Record<string, unknown>).id as string] = {
              title: (m as Record<string, unknown>).title as string,
              slug: (m as Record<string, unknown>).slug as string | null,
            };
          }
        }

        const dependencies = (deps ?? []).map((d: Record<string, unknown>) => ({
          id: d.id,
          depends_on_id: d.depends_on_id,
          dependency_type: d.dependency_type,
          title: depMods[d.depends_on_id as string]?.title ?? "Unknown",
          slug: depMods[d.depends_on_id as string]?.slug ?? null,
          fetch_url: `/rest/v1/rpc/get_vault_module?p_id=${d.depends_on_id}`,
        }));

        return createSuccessResponse(req, { dependencies });
      }

      default:
        return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, `Unknown action: ${action}`, 422);
    }
  } catch (err) {
    log("error", "vault-crud", err.message);
    return createErrorResponse(req, ERROR_CODES.INTERNAL_ERROR, err.message, 500);
  }
}));
