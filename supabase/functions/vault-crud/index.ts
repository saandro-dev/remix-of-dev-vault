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
        const { domain, module_type, saas_phase, source_project, validation_status, tags, query, limit = 50, offset = 0 } = body;

        let q = client
          .from("vault_modules")
          .select("id,title,description,domain,module_type,language,tags,saas_phase,phase_title,why_it_matters,code_example,source_project,validation_status,related_modules,is_public,created_at,updated_at")
          .or(`user_id.eq.${user.id},is_public.eq.true`)
          .order("saas_phase", { ascending: true, nullsFirst: false })
          .order("updated_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (domain)             q = q.eq("domain", domain);
        if (module_type)        q = q.eq("module_type", module_type);
        if (saas_phase != null) q = q.eq("saas_phase", saas_phase);
        if (source_project)     q = q.eq("source_project", source_project);
        if (validation_status)  q = q.eq("validation_status", validation_status);
        if (tags?.length)       q = q.overlaps("tags", tags);
        if (query)              q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%,why_it_matters.ilike.%${query}%`);

        const { data, error } = await q;
        if (error) throw error;
        return createSuccessResponse(req, { items: data, total: data.length });
      }

      case "get": {
        const { id } = body;
        if (!id) return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing id", 422);
        const { data, error } = await client
          .from("vault_modules")
          .select("*")
          .or(`user_id.eq.${user.id},is_public.eq.true`)
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return createErrorResponse(req, ERROR_CODES.NOT_FOUND, "Module not found", 404);
        return createSuccessResponse(req, data);
      }

      case "create": {
        const { title, description, category, domain, module_type, language, code, context_markdown, dependencies, tags, saas_phase, phase_title, why_it_matters, code_example, source_project, validation_status, related_modules, is_public } = body;
        if (!title) return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing title", 422);
        const { data, error } = await client
          .from("vault_modules")
          .insert({
            user_id: user.id,
            title,
            description: description || null,
            domain: domain || category || "backend",
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
            is_public: is_public ?? false,
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
        const allowed = ["title","description","domain","module_type","language","code","context_markdown","dependencies","tags","saas_phase","phase_title","why_it_matters","code_example","source_project","validation_status","related_modules","is_public"];
        const updateFields: Record<string, unknown> = {};
        for (const key of allowed) {
          if (fields[key] !== undefined) updateFields[key] = fields[key];
        }
        if (Object.keys(updateFields).length === 0) return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "No fields to update", 422);
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
          p_user_id:     user.id,
          p_query:       query || null,
          p_domain:      domain || null,
          p_module_type: module_type || null,
          p_saas_phase:  saas_phase ?? null,
          p_source:      source_project || null,
          p_validated:   validated ?? null,
          p_limit:       limit,
          p_offset:      offset,
        });
        if (error) throw error;
        return createSuccessResponse(req, { items: data, total: data.length });
      }

      case "get_playbook": {
        const { data, error } = await client
          .from("vault_modules")
          .select("id,title,description,domain,module_type,saas_phase,phase_title,why_it_matters,code_example,tags,validation_status,source_project,language")
          .or(`user_id.eq.${user.id},is_public.eq.true`)
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

      default:
        return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, `Unknown action: ${action}`, 422);
    }
  } catch (err) {
    log("error", "vault-crud", err.message);
    return createErrorResponse(req, ERROR_CODES.INTERNAL_ERROR, err.message, 500);
  }
}));
