import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  handleCors,
  createSuccessResponse,
  createErrorResponse,
  ERROR_CODES,
} from "../_shared/api-helpers.ts";

function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randomPart = Array.from(
    crypto.getRandomValues(new Uint8Array(40)),
    (byte) => chars[byte % chars.length],
  ).join("");
  return `dvlt_${randomPart}`;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Only POST allowed", 405);
  }

  // JWT auth — user must be logged in
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return createErrorResponse(ERROR_CODES.UNAUTHORIZED, "Missing authorization", 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const publishableKey = Deno.env.get("DEVVAULT_PUBLISHABLE_KEY")!;
  const serviceKey = Deno.env.get("DEVVAULT_SECRET_KEY")!;

  // Verify the user via their JWT
  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await userClient.auth.getUser(token);
  if (authError || !user) {
    return createErrorResponse(ERROR_CODES.UNAUTHORIZED, "Invalid token", 401);
  }

  const userId = user.id;

  try {
    const { key_name } = await req.json();
    if (!key_name || typeof key_name !== "string" || key_name.length < 2 || key_name.length > 100) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "key_name must be a string between 2-100 characters",
        422,
      );
    }

    const rawKey = generateApiKey();

    // Call Vault-backed function to create the key
    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: keyId, error } = await serviceClient.rpc(
      "create_devvault_api_key",
      {
        p_user_id: userId,
        p_key_name: key_name,
        p_raw_key: rawKey,
      },
    );

    if (error) throw error;

    return createSuccessResponse({
      id: keyId,
      key_name,
      key: rawKey, // Returned ONLY once — never stored in plaintext
      prefix: rawKey.substring(0, 8),
      warning: "Save this key now. It will never be shown again.",
    }, 201);
  } catch (err) {
    return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, err.message, 500);
  }
});
