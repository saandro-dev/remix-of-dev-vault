import { authenticateRequest, isResponse } from "../_shared/auth.ts";
import { createErrorResponse, createSuccessResponse, ERROR_CODES } from "../_shared/api-helpers.ts";
import { getCorsHeaders } from "../_shared/cors-v2.ts";

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

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

        if (error) return createErrorResponse(ERROR_CODES.INTERNAL, error.message, 500);
        return createSuccessResponse(data, cors);
      }

      case "update": {
        const { display_name, bio, avatar_url } = payload ?? {};

        if (!display_name || typeof display_name !== "string" || display_name.trim().length === 0) {
          return createErrorResponse(ERROR_CODES.BAD_REQUEST, "display_name is required", 400);
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

        if (error) return createErrorResponse(ERROR_CODES.INTERNAL, error.message, 500);
        return createSuccessResponse(data, cors);
      }

      default:
        return createErrorResponse(ERROR_CODES.BAD_REQUEST, `Unknown action: ${action}`, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return createErrorResponse(ERROR_CODES.INTERNAL, message, 500);
  }
});
