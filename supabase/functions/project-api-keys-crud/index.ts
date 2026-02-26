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
        const { folder_id } = body;
        if (!folder_id) return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Missing folder_id", 422);
        const { data, error } = await client
          .from("api_keys")
          .select("*")
          .eq("folder_id", folder_id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return createSuccessResponse({ items: data });
      }

      case "create": {
        const { project_id, folder_id, label, key_value, environment } = body;
        if (!project_id || !folder_id || !label || !key_value) {
          return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Missing required fields", 422);
        }
        const { data, error } = await client
          .from("api_keys")
          .insert({
            user_id: user.id,
            project_id,
            folder_id,
            label,
            key_value,
            environment: environment || "dev",
          })
          .select()
          .single();
        if (error) throw error;
        return createSuccessResponse(data, 201);
      }

      case "delete": {
        const { id } = body;
        if (!id) return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Missing id", 422);
        const { error } = await client
          .from("api_keys")
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
    console.error("[project-api-keys-crud]", err.message);
    return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, err.message, 500);
  }
});
