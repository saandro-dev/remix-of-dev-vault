import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCorsV2, createSuccessResponse, createErrorResponse, ERROR_CODES } from "../_shared/api-helpers.ts";
import { authenticateRequest, isResponse } from "../_shared/auth.ts";

serve(async (req) => {
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

    switch (action) {
      case "list": {
        const { data, error } = await client
          .from("projects")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return createSuccessResponse(req, { items: data });
      }

      case "get": {
        const { id } = body;
        if (!id) return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing id", 422);
        const { data, error } = await client
          .from("projects")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();
        if (error) throw error;
        return createSuccessResponse(req, data);
      }

      case "create": {
        const { name, description, color } = body;
        if (!name) return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing name", 422);
        const { data, error } = await client
          .from("projects")
          .insert({
            user_id: user.id,
            name,
            description: description || null,
            color: color || "#3B82F6",
          })
          .select()
          .single();
        if (error) throw error;
        return createSuccessResponse(req, data, 201);
      }

      case "update": {
        const { id, name, description, color } = body;
        if (!id) return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "Missing id", 422);
        const updateFields: Record<string, unknown> = {};
        if (name !== undefined) updateFields.name = name;
        if (description !== undefined) updateFields.description = description || null;
        if (color !== undefined) updateFields.color = color;

        const { data, error } = await client
          .from("projects")
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
          .from("projects")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        if (error) throw error;
        return createSuccessResponse(req, { success: true });
      }

      default:
        return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, `Unknown action: ${action}`, 422);
    }
  } catch (err) {
    console.error("[projects-crud]", err.message);
    return createErrorResponse(req, ERROR_CODES.INTERNAL_ERROR, err.message, 500);
  }
});
