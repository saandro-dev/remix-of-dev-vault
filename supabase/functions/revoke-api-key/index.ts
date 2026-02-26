import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  handleCors,
  createSuccessResponse,
  createErrorResponse,
  ERROR_CODES,
} from "../_shared/api-helpers.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Only POST allowed", 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return createErrorResponse(ERROR_CODES.UNAUTHORIZED, "Missing authorization", 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("DEVVAULT_SECRET_KEY")!;

  const serviceClient = createClient(supabaseUrl, serviceKey);

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);

  if (authError || !user) {
    console.error("[revoke-api-key] Auth failed:", authError?.message ?? "no user");
    return createErrorResponse(ERROR_CODES.UNAUTHORIZED, "Invalid token", 401);
  }

  const userId = user.id;

  try {
    const { key_id } = await req.json();
    if (!key_id || typeof key_id !== "string") {
      return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "key_id is required", 422);
    }

    const { data: revoked, error } = await serviceClient.rpc(
      "revoke_devvault_api_key",
      {
        p_key_id: key_id,
        p_user_id: userId,
      },
    );

    if (error) throw error;

    if (!revoked) {
      return createErrorResponse(ERROR_CODES.NOT_FOUND, "Key not found or already revoked", 404);
    }

    return createSuccessResponse({ revoked: true });
  } catch (err) {
    console.error("[revoke-api-key] Error:", err.message);
    return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, err.message, 500);
  }
});
