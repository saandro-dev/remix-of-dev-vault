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
    const { data, error } = await client
      .from("devvault_api_keys")
      .select("id, key_name, key_prefix, created_at, last_used_at, revoked_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return createSuccessResponse({ items: data });
  } catch (err) {
    console.error("[list-devvault-keys]", err.message);
    return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, err.message, 500);
  }
});
