import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, createSuccessResponse, createErrorResponse, ERROR_CODES } from "../_shared/api-helpers.ts";
import { authenticateRequest, isResponse } from "../_shared/auth.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Only POST allowed", 405);
  }

  const auth = await authenticateRequest(req);
  if (isResponse(auth)) return auth;
  const { user, client } = auth;

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "list": {
        const { data, error } = await client
          .from("bugs")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return createSuccessResponse({ items: data });
      }

      case "create": {
        const { title, symptom, cause_code, solution, project_id, vault_module_id, tags } = body;
        if (!title || !symptom) {
          return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Missing title or symptom", 422);
        }
        const { data, error } = await client
          .from("bugs")
          .insert({
            user_id: user.id,
            title,
            symptom,
            cause_code: cause_code || null,
            solution: solution || null,
            status: solution ? "resolved" : "open",
            project_id: project_id || null,
            vault_module_id: vault_module_id || null,
            tags: tags || [],
          })
          .select()
          .single();
        if (error) throw error;
        return createSuccessResponse(data, 201);
      }

      case "update": {
        const { id, status, title, symptom, cause_code, solution, tags } = body;
        if (!id) return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Missing id", 422);
        const updateFields: Record<string, unknown> = {};
        if (status !== undefined) updateFields.status = status;
        if (title !== undefined) updateFields.title = title;
        if (symptom !== undefined) updateFields.symptom = symptom;
        if (cause_code !== undefined) updateFields.cause_code = cause_code || null;
        if (solution !== undefined) updateFields.solution = solution || null;
        if (tags !== undefined) updateFields.tags = tags;

        const { data, error } = await client
          .from("bugs")
          .update(updateFields)
          .eq("id", id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) throw error;
        return createSuccessResponse(data);
      }

      case "delete": {
        const { id } = body;
        if (!id) return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Missing id", 422);
        const { error } = await client
          .from("bugs")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        if (error) throw error;
        return createSuccessResponse({ success: true });
      }

      default:
        return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, `Unknown action: ${action}`, 422);
    }
  } catch (err) {
    console.error("[bugs-crud]", err.message);
    return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, err.message, 500);
  }
});
