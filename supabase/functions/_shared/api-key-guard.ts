import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ApiKeyAuthResult {
  keyId: string;
  userId: string;
}

/**
 * Validates an API key by calling the Vault-backed SQL function.
 * Returns the key ID and owner user ID if valid, null otherwise.
 */
export async function requireApiKeyAuth(
  req: Request,
): Promise<ApiKeyAuthResult | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const rawKey = authHeader.replace("Bearer ", "");
  if (!rawKey || rawKey.length < 10) {
    return null;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const serviceClient = createClient(supabaseUrl, serviceKey);

  const { data, error } = await serviceClient.rpc(
    "validate_devvault_api_key",
    { p_raw_key: rawKey },
  );

  if (error || !data || data.length === 0) {
    return null;
  }

  return {
    keyId: data[0].key_id,
    userId: data[0].owner_id,
  };
}
