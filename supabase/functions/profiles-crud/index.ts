import { authenticateRequest, isResponse } from "../_shared/auth.ts";
import { handleCorsV2, createErrorResponse, createSuccessResponse, ERROR_CODES } from "../_shared/api-helpers.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCorsV2(req);
  if (corsResponse) return corsResponse;

  const authResult = await authenticateRequest(req);
  if (isResponse(authResult)) return authResult;

  const { user, client } = authResult;

  try {
    const { action, payload } = await req.json();

    switch (action) {
      case "get": {
        const { data, error } = await client
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) return createErrorResponse(req, ERROR_CODES.INTERNAL_ERROR, error.message, 500);
        return createSuccessResponse(req, data);
      }

      case "update": {
        const { display_name, bio, avatar_url } = payload ?? {};

        if (!display_name || typeof display_name !== "string" || display_name.trim().length === 0) {
          return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, "display_name is required", 400);
        }

        const { data, error } = await client
          .from("profiles")
          .update({
            display_name: display_name.trim(),
            bio: bio ?? null,
            avatar_url: avatar_url ?? null,
          })
          .eq("id", user.id)
          .select()
          .single();

        if (error) return createErrorResponse(req, ERROR_CODES.INTERNAL_ERROR, error.message, 500);
        return createSuccessResponse(req, data);
      }

      default:
        return createErrorResponse(req, ERROR_CODES.VALIDATION_ERROR, `Unknown action: ${action}`, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return createErrorResponse(req, ERROR_CODES.INTERNAL_ERROR, message, 500);
  }
});
